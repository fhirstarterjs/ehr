import { applyToken } from "./token.js"
import { saveSession } from "./discover.js"
import { setStatus } from "./status.js"

let
   timer: ReturnType<typeof setTimeout> | null = null,
   inFlight: Promise<void> | null = null,
   token: string | null = null

const
   BUFFER_MS = 60_000,
   RETRY_MS = 5_000,

   clear = (): void => void (timer && (clearTimeout(timer), (timer = null))),

   schedule = (ctx: RefreshContext, at: number): void => {
      clear()
      timer = setTimeout(() => void run(ctx), Math.max(0, at - BUFFER_MS - Date.now()))
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
      if (res.status === 400 || res.status === 401) throw new Error("invalid_grant")
      if (!res.ok || !data.access_token) throw new Error(`refresh failed (${res.status})`)
      return data
   },

   run = (ctx: RefreshContext): Promise<void> =>
      (inFlight ??= (async () => {
         try {
            const data = await post(ctx)
            applyToken(ctx.handoff, data)
            data.refresh_token && (token = data.refresh_token)
            saveSession(ctx.handoff)
            schedule(ctx, ctx.handoff.expiresAt)
         } catch (err) {
            const terminal = (err as Error).message === "invalid_grant"
            terminal
               ? (clear(), setStatus("invalid"))
               : Date.now() < ctx.handoff.expiresAt
                  ? schedule(ctx, Date.now() + RETRY_MS + BUFFER_MS)
                  : (clear(), setStatus("expired"))
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
   schedule(ctx, ctx.handoff.expiresAt)
}

/** Cancel refresh work and forget the private refresh token. */
export const stopRefresh = (): void => {
   clear()
   inFlight = null
   token = null
}
