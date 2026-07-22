/** Turnkey React component mirroring the Vue `EhrLaunch`: auth + progress + render-prop. */

import { useState, useEffect } from "react"
import { useEhrLaunch } from "./index.js"
import { ProgressBar } from "./ProgressBar.js"
import "../../scss/progress.scss"

const EXPIRED_HINT =
   "Data shown may be out of date and unsafe to act on. Close this window and relaunch from the EHR to continue."

/**
 * Runs the launch, shows the progress bar until `completionDelayMs` after
 * completion, then renders `children({ client, state, error })`. Errors render
 * via the `error` render prop or a default message.
 */
export const EhrLaunch = ({
   options = {},
   completionDelayMs = 500,
   header,
   label,
   showStatus = true,
   error: errorRender,
   expired: expiredRender,
   children,
}: ReactEhrLaunchProps) => {
   const
      { state, client, percent, error, loading } = useEhrLaunch(options),
      [showBar, setShowBar] = useState(true),
      [expired, setExpired] = useState(false)

   useEffect(() => {
      if (loading) return
      const id = setTimeout(() => setShowBar(false), completionDelayMs)
      return () => clearTimeout(id)
   }, [loading, completionDelayMs])

   useEffect(() => void (state === "expired" && setExpired(true)), [state])

   return (
      <>
         {showBar ? (
            <ProgressBar
               percent={percent}
               header={header}
               showStatus={showStatus}
               label={label ?? state.charAt(0).toUpperCase() + state.slice(1)}
            />
         ) : null}
         {error ? (
            <div className="fs-ehr-error">{errorRender ? errorRender(error) : error.message}</div>
         ) : null}
         {client && !showBar ? children?.({ client, state, error }) : null}
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
