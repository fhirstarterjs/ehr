/** React progress bar mirroring the Vue component's markup and ARIA semantics. */

/** Overlay modal with a progress track/fill, optional header and label nodes. */
export const ProgressBar = ({
   percent,
   label,
   showStatus = true,
   header,
   panelClass,
   fillClass,
}: ReactProgressBarProps) => (
   <div className="fs-ehr-overlay">
      <div className={`fs-ehr-panel${panelClass ? ` ${panelClass}` : ""}`}>
         {header ? <div className="fs-ehr-header">{header}</div> : null}
         <div
            className="fs-ehr-track"
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
         >
            <div
               className={`fs-ehr-fill${fillClass ? ` ${fillClass}` : ""}`}
               style={{ width: `${percent}%` }}
            />
         </div>
         {showStatus ? <div className="fs-ehr-label">{label ?? "Loading…"}</div> : null}
      </div>
   </div>
)
