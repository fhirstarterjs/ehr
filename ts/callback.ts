import { setProgress, trickle, stopProgress } from "./progress.js"
import { takePreAuth, saveSession, loadSession } from "./discover.js"
import { exchange, toHandoff } from "./token.js"

/** Launch-flow phase inferred purely from the current URL's query params. */
export const classify = (search: URLSearchParams): "launch" | "callback" | "error" | "none" => {
   if (search.get("error") || search.get("error_description")) return "error"
   if (search.get("code") && search.get("state")) return "callback"
   if (search.get("iss") && search.get("launch")) return "launch"
   return "none"
}

/** Build a structured `EhrAuthError` from an OAuth error-callback URL. */
export const authError = (search: URLSearchParams, cause?: unknown): EhrAuthError => {
   const
      error = search.get("error") ?? undefined,
      description = search.get("error_description") ?? undefined,
      uri = search.get("error_uri") ?? undefined,
      err = new Error(
         [error, description].filter(Boolean).join(": ") || "EHR authorization denied",
      ) as EhrAuthError
   err.name = "EhrAuthError"
   err.error = error
   err.error_description = description
   err.error_uri = uri
   if (cause !== undefined) err.cause = cause
   return err
}

/** Complete a native callback: validate `state`, exchange the code, build the handoff. */
export const completeSession = async (
   search: URLSearchParams,
   options: EhrLaunchOptions,
   setStatus: (status: EhrStatus) => void,
): Promise<EhrHandoff> => {
   const pre = takePreAuth(search.get("state") ?? "")
   if (!pre) throw authError(search, "unknown or missing state (possible CSRF)")
   setStatus("authorized")
   setProgress(50)
   trickle(50, 95, options.exchangeMs ?? 3_000)
   const
      res = await exchange(search, pre),
      handoff = toHandoff(res, pre.serverUrl, pre.params)
   saveSession(handoff)
   stripCallbackParams()
   setProgress(100)
   setStatus("authenticated")
   return handoff
}

/** Restore a persisted (unexpired) session snapshot, or null when none exists. */
export const restoreSession = async (
   setStatus: (status: EhrStatus) => void,
   log: (message: string, detail?: unknown) => void,
): Promise<EhrHandoff | null> => {
   const handoff = loadSession()
   if (handoff) return handoff
   stopProgress()
   setStatus("idle")
   log("no existing session")
   return null
}

const stripCallbackParams = (): void => {
   const url = new URL(window.location.href)
   for (const p of ["iss", "launch", "code", "state"]) url.searchParams.delete(p)
   history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`)
}