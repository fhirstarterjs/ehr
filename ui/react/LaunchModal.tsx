/** React auth-launch modal mirroring the Vue component's markup and ARIA semantics. */

/** Overlay modal with a progress track/fill, optional header and label nodes. */
export const LaunchModal = ({
   percent,
   label,
   showStatus = true,
   showProgress = true,
   showPercentage = false,
   header,
   footer,
   panelClass,
   fillClass,
}: ReactLaunchModalProps) => (
   <div className="fs-ehr-overlay">
      <div className={`fs-ehr-panel${panelClass ? ` ${panelClass}` : ""}`}>
         {header ? <div className="fs-ehr-header">{header}</div> : null}
         {showProgress || showPercentage ? (
            <div
               className={`fs-ehr-track${showProgress ? "" : " fs-ehr-track--bare"}`}
               role="progressbar"
               aria-valuenow={Math.round(percent)}
               aria-valuemin={0}
               aria-valuemax={100}
            >
               <div
                  className={`fs-ehr-fill${fillClass ? ` ${fillClass}` : ""}`}
                  style={{ width: `${percent}%` }}
               />
               {showPercentage ? <span className="fs-ehr-percent">{Math.round(percent)}%</span> : null}
            </div>
         ) : null}
         {showStatus ? <div className="fs-ehr-label">{label ?? "Loading…"}</div> : null}
         {footer}
      </div>
   </div>
)
