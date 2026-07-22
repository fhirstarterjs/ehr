/** React entry: the `useEhrLaunch` hook plus component re-exports. */

import { useState, useEffect, useRef } from "react"
import { launch, onStatus, onProgress } from "../../ts/index.js"

export { ProgressBar } from "./ProgressBar.js"
export { EhrLaunch } from "./EhrLaunch.js"

/**
 * React SMART EHR-launch hook. Subscribes to core status/progress and returns
 * `{ state, client, percent, error, loading }`. Guards post-unmount updates and
 * reuses the same core promise across Strict Mode's setup-cleanup-setup cycle.
 */
export const useEhrLaunch = (options: EhrLaunchOptions = {}): ReactEhrLaunch => {
   const
      [state, setState] = useState<EhrStatus>("initializing"),
      [client, setClient] = useState<SmartClient | null>(null),
      [percent, setPercent] = useState(0),
      [error, setError] = useState<EhrAuthError | null>(null),
      [loading, setLoading] = useState(true),
      opts = useRef(options)

   useEffect(() => {
      let alive = true
      const
         offStatus = onStatus((s) => alive && setState(s)),
         offProgress = onProgress((p) => alive && setPercent(p))
      launch(opts.current)
         .then((c) => alive && (setClient(c), setLoading(false)))
         .catch((e) => alive && (setError(e as EhrAuthError), setLoading(false)))
      return () => void (alive = false, offStatus(), offProgress())
   }, [])

   return { state, client, percent, error, loading }
}
