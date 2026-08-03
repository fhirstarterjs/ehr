import { onProgress, getProgress, trickle, stopProgress, resetProgress } from "./progress.js"
import { resolveClientId, mountIframe, forwardCallback } from "./iframe.js"
import { classify, completeSession, rejectSession, restoreSession } from "./callback.js"
import { onStatus, getStatus, setStatus, watchExpiry, resetStatus } from "./status.js"
import { discover, buildAuthorizeUrl, savePreAuth, loadSession } from "./discover.js"
import { verifier, challenge, usePkce } from "./pkce.js"
import { stopRefresh } from "./refresh.js"
import { log, setDebug } from "./log.js"

/** Progress and status subscriptions plus their current snapshots. */
export { onProgress, getProgress, onStatus, getStatus }

/** The status derivable synchronously from the URL + saved session, before the
    async run — so UIs pick the initial view with no `initializing` flash. */
export const initialStatus = (): EhrStatus => {
   if (typeof window === "undefined") return "initializing"
   switch (classify(new URL(window.location.href).searchParams)) {
      case "error": return "invalid"
      case "callback": return "authorizing"
      case "launch": return "initializing"
      default: return loadSession() ? "authenticated" : "standalone"
   }
}

/** Begin (or reuse) the one-shot SMART EHR launch for this page load. Idempotent. */
export const fhirStarter = (opts: EhrLaunchOptions = {}): Promise<EhrHandoff | null> => {
   opts.debug && setDebug(true)
   log("fhirStarter() called", { reused: Boolean(started), href: location.href })
   if (started) return started
   options = opts, opts.onProgress && onProgress(opts.onProgress), opts.onStatus && onStatus(opts.onStatus)
   return (started = run().then((h) => (h && watchExpiry(h), h)).catch(fail).finally(() => (settled = true)))
}

/** True once the shared launch settled — lets late mounts skip the modal replay. */
export const isSettled = (): boolean => settled

/** Default SMART EHR-launch entrypoint. */
export default fhirStarter

/** Reset all module state (progress, status, listeners, iframe, expiry + refresh timers). */
export const destroy = (): void => {
   stopProgress()
   stopRefresh()
   removeFrame?.(), (removeFrame = null)
   resetStatus()
   resetProgress()
   options = {}, started = null, settled = false
}

let
   options: EhrLaunchOptions = {},
   started: Promise<EhrHandoff | null> | null = null,
   settled = false,
   removeFrame: (() => void) | null = null

const
   scopeString = (): string => {
      const
         raw = options.scopes ?? [],
         list = [...new Set(["launch", ...(Array.isArray(raw) ? raw : raw.split(/\s+/))].filter(Boolean))]
      return list.join(" ")
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
         redirectUri = options.redirectUri ?? `${location.origin}${location.pathname}`,
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
      const authorizeTarget = buildAuthorizeUrl(config.authorizeUrl, {
         clientId, redirectUri, state, aud: iss, scope, launch, codeChallenge, params: options.params,
      })
      log("authorizeUrl built", { authorizeEndpoint: config.authorizeUrl, redirectUri, scope, state })
      return authorizeTarget
   },

   authorize = async (search: URLSearchParams): Promise<EhrHandoff | null> => {
      setStatus("authorizing")
      trickle(5, 50, options.authorizeMs ?? 4_000)
      const url = await authorizeUrl(search)
      if (options.iframe !== false) {
         log("authorize: mounting child iframe → navigating to authorize URL", url)
         const frame = mountIframe(options)
         removeFrame = frame.remove
         frame.navigate(url)
         log("authorize: awaiting child-iframe callback (postMessage from child)…")
         const callbackUrl = await frame.callback
         log("authorize: child callback RECEIVED", { url: callbackUrl.href, phase: classify(callbackUrl.searchParams) })
         if (classify(callbackUrl.searchParams) === "error")
            return fail(rejectSession(callbackUrl.searchParams))
         log("authorize: completing session from child callback")
         return completeSession(callbackUrl.searchParams, options, setStatus)
      }
      log("authorize: iframe disabled → TOP-LEVEL window.location.assign", url)
      window.location.assign(url)
      return null
   },

   run = async (): Promise<EhrHandoff | null> => {
      const
         search = new URL(window.location.href).searchParams,
         phase = classify(search)
      log("run ENTER", { phase, href: window.location.href })
      switch (phase) {
         case "error":
            return window.parent !== window && options.iframe !== false
               ? (log("run: error in child frame → forwardCallback to parent"), forwardCallback())
               : (log("run: error → fail"), fail(rejectSession(search)))
         case "callback":
            return window.parent !== window && options.iframe !== false
               ? (log("run: callback in child frame → forwardCallback (postMessage to parent)"), forwardCallback())
               : (log("run: callback → completeSession"), completeSession(search, options, setStatus))
         case "launch":
            return (log("run: launch → authorize()"), authorize(search))
         default: {
            log("run: no phase → restoreSession")
            const handoff = await restoreSession(setStatus)
            handoff && setStatus("authenticated")
            return handoff
         }
      }
   }