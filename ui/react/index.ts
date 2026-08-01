/** React entry: the `useEhrLaunch` hook plus component re-exports. */

import { useState, useEffect, useRef } from "react"
import { fhirStarter, onStatus, onProgress, initialStatus } from "../../ts/index.js"

/** React auth-launch modal (progress track, status, header/footer nodes). */
export { LaunchModal } from "./LaunchModal.js"

/** Turnkey React EHR-launch component. */
export { EhrLaunch } from "./EhrLaunch.js"

/**
 * React SMART EHR-launch hook. Subscribes to core status/progress and returns
 * `{ state, handoff, percent, error, loading }`. Guards post-unmount updates and
 * reuses the same core promise across Strict Mode's setup-cleanup-setup cycle.
 */
export const useEhrLaunch = (options: EhrLaunchOptions = {}) => {
   const
      // Seed synchronously from the URL so the first render already knows
      // `standalone`/`launch`/etc. — no `initializing` flash before the async run.
      [state, setState] = useState<EhrStatus>(initialStatus),
      [handoff, setHandoff] = useState<EhrHandoff | null>(null),
      [percent, setPercent] = useState(0),
      [error, setError] = useState<EhrAuthError | null>(null),
      [loading, setLoading] = useState(true),
      opts = useRef(options)

   useEffect(() => {
      let alive = true
      const
         offStatus = onStatus((s) => alive && setState(s)),
         offProgress = onProgress((p) => alive && setPercent(p))
      fhirStarter(opts.current)
         .then((h) => alive && (setHandoff(h), setLoading(false)))
         .catch((e) => alive && (setError(e as EhrAuthError), setLoading(false)))
      return () => void (alive = false, offStatus(), offProgress())
   }, [])

   return { state, handoff, percent, error, loading }
}
