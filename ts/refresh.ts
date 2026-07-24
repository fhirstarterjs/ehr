import { applyToken } from "./token.js"
import { clearSession, saveSession } from "./discover.js"
import { setStatus } from "./status.js"

let
   timer: ReturnType<typeof setTimeout> | null = null,
   inFlight: Promise<void> | null = null,
   token: string | null = null,
   generation = 0,
   retryMs = 5_000

const
   BUFFER_MS = 60_000,
   MAX_RETRY_MS = 60_000,

   clear = (): void => void (timer && (clearTimeout(timer), (timer = null))),

   schedule = (ctx: RefreshContext, at: number, current: number): void => {
      clear()
      const ttl = Math.max(0, at - Date.now()), lead = Math.min(BUFFER_MS, ttl / 2)
      timer = setTimeout(() => void run(ctx, current), Math.max(0, ttl - lead))
   },

   retry = (ctx: RefreshContext, current: number): void => {
      clear()
      const remaining = ctx.handoff.expiresAt - Date.now()
      if (remaining <= 0) return void setStatus("expired")
      timer = setTimeout(() => void run(ctx, current), Math.min(retryMs, remaining))
      retryMs = Math.min(MAX_RETRY_MS, retryMs * 2)
   },

   post = async (ctx: RefreshContext): Promise<SmartTokenResponse> => {
      const body = new URLSearchParams({
         grant_type: "refresh_token",
         refresh_token: token ?? "",
         client_id: ctx.clientId,
      })
      const res = await fetch(ctx.tokenUrl, {
         method: "POST",
         headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
         body,
      })
      const data = (await res.json().catch(() => ({}))) as SmartTokenResponse
      if (data.error === "invalid_grant") throw new Error("invalid_grant")
      if (!res.ok || !data.access_token) throw new Error(`refresh failed (${res.status})`)
      return data
   },

   run = (ctx: RefreshContext, current: number): Promise<void> =>
      (inFlight ??= (async () => {
         try {
            const data = await post(ctx)
            if (current !== generation) return
            applyToken(ctx.handoff, data)
            data.refresh_token && (token = data.refresh_token)
            retryMs = 5_000
            saveSession(ctx.handoff)
            schedule(ctx, ctx.handoff.expiresAt, current)
         } catch (err) {
            if (current !== generation) return
            const terminal = (err as Error).message === "invalid_grant"
            terminal
               ? (clear(), (token = null), clearSession(), setStatus("invalid"))
               : retry(ctx, current)
         } finally {
            inFlight = null
         }
      })())

/**
 * Begin native proactive refresh when the token response carries a refresh_token
 * (only issued when `offline_access`/`online_access` was requested). No client secret
 * is sent (public client). Browser refresh also requires the EHR to enable CORS on its
 * token endpoint for this origin; when it does not, refresh fails and the session
 * degrades to `expired` at token expiry. Mutates the retained handoff in place on success.
 */
export const startRefresh = (ctx: RefreshContext, refreshToken: string | undefined): void => {
   if (!refreshToken) return
   token = refreshToken
   retryMs = 5_000
   schedule(ctx, ctx.handoff.expiresAt, generation)
}

/** Cancel refresh work and forget the private refresh token. */
export const stopRefresh = (): void => {
   generation++
   clear()
   token = null
}
