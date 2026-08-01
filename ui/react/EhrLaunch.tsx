/** Turnkey React component mirroring the Vue `EhrLaunch`: auth + progress + render-prop. */

import { useState, useEffect } from "react"
import { useEhrLaunch } from "./index.js"
import { LaunchModal } from "./LaunchModal.js"
import "../../scss/ehr-launch.scss"

const EXPIRED_HINT =
   "Data shown may be out of date and unsafe to act on. Close this window and relaunch from the EHR to continue."

/**
 * Runs the launch, shows the progress bar until `completionDelayMs` after
 * completion, then renders `children({ handoff, state, error })`. Errors render
 * via the `error` render prop or a default message.
 */
export const EhrLaunch = ({
   options = {},
   completionDelayMs = 500,
   header,
   label,
   showStatus = true,
   showProgress = true,
   showPercentage = false,
   error: errorRender,
   expired: expiredRender,
   children,
}: EhrLaunchBaseProps & { header?: any; label?: any; error?: any; expired?: any; children?: any }) => {
   const
      { state, handoff, percent, error, loading } = useEhrLaunch(options),
      [showBar, setShowBar] = useState(true),
      [expired, setExpired] = useState(false)

   useEffect(() => {
      // On error keep the bar visible, stopped at its current percent.
      if (loading || error) return
      const id = setTimeout(() => setShowBar(false), completionDelayMs)
      return () => clearTimeout(id)
   }, [loading, error, completionDelayMs])

   useEffect(() => void (state === "expired" && setExpired(true)), [state])

   return (
      <>
         {showBar || error ? (
            <LaunchModal
               percent={percent}
               header={header}
               showStatus={showStatus}
               showProgress={showProgress}
               showPercentage={showPercentage}
               label={label ?? state.charAt(0).toUpperCase() + state.slice(1)}
               footer={error ? (
                  <div className="fs-ehr-error">
                     {errorRender ? errorRender(error) : `Error: ${error.message.replace(/^EhrLaunch:\s*/, "")}`}
                  </div>
               ) : null}
            />
         ) : null}
         {children?.({ handoff, state, error })}
         {expired ? (
            <div className="fs-ehr-expired">
               <div className="fs-ehr-expired__pill" role="alert" title={EXPIRED_HINT}>
                  {expiredRender ?? "⚠️ Session has expired!"}
               </div>
            </div>
         ) : null}
      </>
   )
}
