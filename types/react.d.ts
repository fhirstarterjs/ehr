/**
 * Ambient types for the React wrapper. Kept separate so the core carries no
 * React dependency.
 */

/** Result returned by the React `useEhrLaunch` hook. */
interface ReactEhrLaunch extends EhrLaunchResult {
   percent: number
   loading: boolean
}

/** Props for the React `LaunchModal` component. */
interface ReactLaunchModalProps {
   percent: number
   label?: import("react").ReactNode
   showStatus?: boolean
   showProgress?: boolean
   showPercentage?: boolean
   header?: import("react").ReactNode
   footer?: import("react").ReactNode
   panelClass?: string
   fillClass?: string
}

/** Props for the turnkey React `EhrLaunch` component. */
interface ReactEhrLaunchProps extends EhrLaunchBaseProps {
   header?: import("react").ReactNode
   label?: import("react").ReactNode
   error?: (error: EhrAuthError) => import("react").ReactNode
   expired?: import("react").ReactNode
   children?: (result: EhrLaunchResult) => import("react").ReactNode
}
