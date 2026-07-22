import { setProgress, trickle, stopProgress } from "./progress.js"

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

/** Complete a callback in the current window without requiring URL navigation. */
export const completeSession = async (
   search: URLSearchParams,
   options: EhrLaunchOptions,
   setStatus: (status: EhrStatus) => void,
): Promise<SmartClient> => {
   const { oauth2 } = await import("fhirclient")
   setStatus("authorized")
   setProgress(50)
   trickle(50, 95, options.exchangeMs ?? 3_000)
   const client = await oauth2.ready({
      code: search.get("code") ?? undefined,
      stateKey: search.get("state") ?? undefined,
   })
   stripLaunchParams()
   setProgress(100)
   setStatus("authenticated")
   return client
}

/** Restore fhirclient's persisted session, returning null when none exists. */
export const restoreSession = async (
   setStatus: (status: EhrStatus) => void,
   log: (message: string, detail?: unknown) => void,
): Promise<SmartClient | null> => {
   try {
      const { oauth2 } = await import("fhirclient")
      return await oauth2.ready()
   } catch (err) {
      stopProgress()
      setStatus("idle")
      log("no existing session", err)
      return null
   }
}

const stripLaunchParams = (): void => {
   const url = new URL(window.location.href)
   if (!url.searchParams.has("iss") && !url.searchParams.has("launch")) return
   url.searchParams.delete("iss")
   url.searchParams.delete("launch")
   history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`)
}