/** Shared debug logger. Silent unless `options.debug` is set (via {@link setDebug})
    or the URL carries `?debug` — the latter propagates into the auth iframe (it
    inherits the redirect_uri query), so every frame logs consistently. */
export const log = (message: string, detail?: unknown): void =>
   void (debug() && console.info(`[fhirstarter:ehr ${frameTag()}] ${message}`, detail ?? ""))

/** Force-enable debug logging regardless of URL (mirrors `options.debug`). */
export const setDebug = (on: boolean): void => void (forced ||= on)

/** Frame identity for a log line: `top`/`framed@N`, window name, and query. */
export const frameTag = (): string => {
   const
      depth = frameDepth(),
      where = depth === 0 ? "top" : `framed@${depth}`
   return `${where}:${window.name || "-"}${window.location.search}`
}

let forced = false

const
   debug = (): boolean =>
      forced || (typeof window !== "undefined" && new URL(window.location.href).searchParams.has("debug")),

   frameDepth = (): number => {
      let n = 0, w: Window = window
      try { while (w.parent && w.parent !== w) (w = w.parent, n++) } catch { /* cross-origin ancestor */ }
      return n
   }
