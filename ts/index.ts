import { onProgress, getProgress, trickle, stopProgress, resetProgress } from "./progress.js"
import { resolveClientId, mountIframe, forwardCallback } from "./iframe.js"
import { classify, completeSession, rejectSession, restoreSession } from "./callback.js"
import { onStatus, getStatus, setStatus, watchExpiry, resetStatus } from "./status.js"
import { discover, buildAuthorizeUrl, savePreAuth } from "./discover.js"
import { verifier, challenge, usePkce } from "./pkce.js"
import { stopRefresh } from "./refresh.js"

/** Progress and status subscriptions plus their current snapshots. */
export { onProgress, getProgress, onStatus, getStatus }

/** Begin (or reuse) the one-shot SMART EHR launch for this page load. Idempotent. */
export const fhirStarter = (opts: EhrLaunchOptions = {}): Promise<EhrHandoff | null> => {
   if (started) return started
   options = opts, opts.onProgress && onProgress(opts.onProgress), opts.onStatus && onStatus(opts.onStatus)
   return (started = run().then((h) => (h && watchExpiry(h), h)).catch(fail))
}

/** Default SMART EHR-launch entrypoint. */
export default fhirStarter

/** Reset all module state (progress, status, listeners, iframe, expiry + refresh timers). */
export const destroy = (): void => {
   stopProgress()
   stopRefresh()
   removeFrame?.(), (removeFrame = null)
   resetStatus()
   resetProgress()
   options = {}
   started = null
}

let
   options: EhrLaunchOptions = {},
   started: Promise<EhrHandoff | null> | null = null,
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

   authorizeUrl = async (search: URLSearchParams): Promise<string> => {
      const
         iss = search.get("iss") ?? "",
         launch = search.get("launch") ?? "",
         clientId = await resolveClientId(options, { iss, launch }),
         redirectUri = options.redirectUri ?? window.location.origin,
         scope = scopeString(),
         config = await discover(iss),
         pkce = usePkce(options.pkce, config.pkceMethods),
         codeVerifier = pkce ? verifier() : undefined,
         codeChallenge = codeVerifier ? await challenge(codeVerifier) : undefined,
         state = crypto.randomUUID()
      savePreAuth({
         tokenUrl: config.tokenUrl, state, redirectUri, clientId, serverUrl: iss,
         scope, verifier: codeVerifier, params: options.params,
      })
      return buildAuthorizeUrl(config.authorizeUrl, {
         clientId, redirectUri, state, aud: iss, scope, launch, codeChallenge, params: options.params,
      })
   },

   authorize = async (search: URLSearchParams): Promise<EhrHandoff | null> => {
      setStatus("authorizing")
      trickle(5, 50, options.authorizeMs ?? 4_000)
      const url = await authorizeUrl(search)
      if (options.iframe !== false) {
         const frame = mountIframe(options, log)
         removeFrame = frame.remove
         frame.navigate(url)
         const callbackUrl = await frame.callback
         if (classify(callbackUrl.searchParams) === "error")
            return fail(rejectSession(callbackUrl.searchParams))
         return completeSession(callbackUrl.searchParams, options, setStatus)
      }
      window.location.assign(url)
      return null
   },

   run = async (): Promise<EhrHandoff | null> => {
      const search = new URL(window.location.href).searchParams
      switch (classify(search)) {
         case "error":
            return window.parent !== window && options.iframe !== false
               ? forwardCallback()
               : fail(rejectSession(search))
         case "callback":
            return window.parent !== window && options.iframe !== false
               ? forwardCallback()
               : completeSession(search, options, setStatus)
         case "launch": return authorize(search)
         default: {
            const handoff = await restoreSession(setStatus, log)
            handoff && setStatus("authenticated")
            return handoff
         }
      }
   }