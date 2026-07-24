/**
 * Ambient types for the React wrapper. Kept separate so the core carries no
 * React dependency.
 */

/** Result returned by the React `useEhrLaunch` hook. */
interface ReactEhrLaunch {
   state: EhrStatus
   handoff: EhrHandoff | null
   percent: number
   error: EhrAuthError | null
   loading: boolean
}

/** Props for the React `ProgressBar` component. */
interface ReactProgressBarProps {
   percent: number
   label?: import("react").ReactNode
   showStatus?: boolean
   header?: import("react").ReactNode
   panelClass?: string
   fillClass?: string
}

/** Props for the turnkey React `EhrLaunch` component. */
interface ReactEhrLaunchProps {
   options?: EhrLaunchOptions
   completionDelayMs?: number
   header?: import("react").ReactNode
   label?: import("react").ReactNode
   showStatus?: boolean
   error?: (error: EhrAuthError) => import("react").ReactNode
   expired?: import("react").ReactNode
   children?: (result: {
      handoff: EhrHandoff
      state: EhrStatus
      error: EhrAuthError | null
   }) => import("react").ReactNode
}
