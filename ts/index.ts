import { onProgress, getProgress, trickle, stopProgress, resetProgress } from "./progress.js"
import { resolveClientId, mountIframe, forwardCallback } from "./iframe.js"
import { classify, authError, completeSession, restoreSession } from "./callback.js"
import { onStatus, getStatus, setStatus, watchExpiry, resetStatus } from "./status.js"

export { onProgress, getProgress, onStatus, getStatus }

/** Begin (or reuse) the one-shot launch for this page load. Idempotent. */
export const launch = (opts: EhrLaunchOptions = {}): Promise<SmartClient | null> => {
   if (started) return started
   options = opts, opts.onProgress && onProgress(opts.onProgress), opts.onStatus && onStatus(opts.onStatus)
   return (started = run().then((client) => (client && watchExpiry(client), client)).catch(fail))
}

/** Reset all module state (progress, status, listeners, iframe, expiry timer). */
export const destroy = (): void => {
   stopProgress()
   removeFrame?.(), (removeFrame = null)
   resetStatus()
   resetProgress()
   options = {}
   started = null
}

let
   options: EhrLaunchOptions = {},
   started: Promise<SmartClient | null> | null = null,
   removeFrame: (() => void) | null = null

const
   log = (message: string, detail?: unknown): void =>
      void (options.debug && console.info(`[fhirstarter:ehr] ${message}`, detail ?? "")),

   scopeString = (): string | undefined => {
      const raw = options.scopes
      if (raw === undefined) return undefined
      const list = [...new Set((Array.isArray(raw) ? raw : raw.split(/\s+/)).filter(Boolean))]
      return list.length ? list.join(" ") : undefined
   },

   fail = (err: unknown): never => {
      stopProgress()
      removeFrame?.()
      removeFrame = null
      started = null
      setStatus("invalid")
      log("auth failed", err)
      throw err
   },

   authorize = async (search: URLSearchParams): Promise<SmartClient | null> => {
      const
         { oauth2 } = await import("fhirclient"),
         iss = search.get("iss") ?? "",
         launch = search.get("launch") ?? "",
         clientId = await resolveClientId(options, { iss, launch }),
         redirectUri = options.redirectUri ?? window.location.origin,
         scope = scopeString(),
         useIframe = options.iframe !== false
      setStatus("authorizing")
      trickle(5, 50, options.authorizeMs ?? 4_000)
      log("redirect_uri", redirectUri)
      const params: Record<string, unknown> = {
         client_id: clientId,
         redirect_uri: redirectUri,
         ...(scope ? { scope } : {}),
         ...options.fhir,
      }
      if (useIframe) {
         const frame = mountIframe(options, log)
         removeFrame = frame.remove
         params.completeInTarget = true
         params.target = frame.target
         await oauth2.authorize(params as Parameters<typeof oauth2.authorize>[0])
         const callbackUrl = await frame.callback
         if (classify(callbackUrl.searchParams) === "error")
            return fail(authError(callbackUrl.searchParams))
         return completeSession(callbackUrl.searchParams, options, setStatus)
      }
      await oauth2.authorize(params as Parameters<typeof oauth2.authorize>[0])
      return null
   },

   run = async (): Promise<SmartClient | null> => {
      const search = new URL(window.location.href).searchParams
      switch (classify(search)) {
         case "error":
            return window.parent !== window && options.iframe !== false
               ? forwardCallback()
               : fail(authError(search))
         case "callback":
            return window.parent !== window && options.iframe !== false
               ? forwardCallback()
               : completeSession(search, options, setStatus)
         case "launch": return authorize(search)
         default: {
            const client = await restoreSession(setStatus, log)
            client && setStatus("authenticated")
            return client
         }
      }
   }