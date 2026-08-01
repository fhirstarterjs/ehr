/** Ambient declaration for side-effect SCSS imports in components. */
declare module "*.scss"

/** Allow importing single-file components as typed Vue modules. */
declare module "*.vue" {
   const component: import("vue").DefineComponent<Record<string, unknown>, unknown, unknown>
   export default component
}


/** Launch-phase lifecycle status, derived from the URL on each page load.
    `standalone` means the page was opened outside any EHR launch (no `iss`). */
type EhrStatus =
   | "initializing"
   | "authorizing"
   | "authorized"
   | "authenticated"
   | "standalone"
   | "invalid"
   | "expired"

/** How the authorization round-trip is completed. */
type EhrMode = "iframe" | "redirect"

/** Context passed to `resolveClientId` for per-launch client resolution. */
interface EhrLaunchContext {
   iss: string
   launch: string
}

/** Options for the EHR launch flow. All are optional; sensible defaults apply. */
interface EhrLaunchOptions {
   /** Static client_id, or provide `resolveClientId` for per-launch schemes. */
   clientId?: string
   /** Async resolver for the client_id, given the launch context. */
   resolveClientId?: (context: EhrLaunchContext) => string | Promise<string>
   /** Scopes to request; space-delimited string or array. */
   scopes?: string | string[]
   /** PKCE policy. `required` (default) fails without S256; `ifSupported`/`disabled` relax it. */
   pkce?: PkceMode
   /** Redirect URI; defaults to the current origin + path (`location.origin +
       location.pathname`) so it matches the registered launch route. */
   redirectUri?: string
   /** `false` uses a full top-level redirect instead of the hidden iframe. */
   iframe?: boolean
   /** Enable `console.info` diagnostics. */
   debug?: boolean
   /** Show the auth iframe (debugging framed EHRs). */
   showIframe?: boolean
   /** Expected authorize-phase duration (ms) used to pace progress. */
   authorizeMs?: number
   /** Expected token-exchange duration (ms) used to pace progress. */
   exchangeMs?: number
   /** Grace (ms) after the auth iframe loads a non-callback page before it's
       treated as a failed authorize (provider returned a 200 error/consent page
       instead of redirecting). Default 2.5 seconds. */
   authorizeStallMs?: number
   /** Parent for the auth iframe (element or selector). Default `document.body`. */
   iframeParent?: HTMLElement | string
   /** Extra class(es) for the auth iframe. */
   iframeClass?: string | string[]
   /** Inline styles applied after defaults, overriding them. */
   iframeStyle?: string | Partial<CSSStyleDeclaration>
   /** Extra authorization request parameters; reserved OAuth/SMART keys are ignored. */
   params?: Record<string, unknown>
   /** Progress callback (0–100), subscribed for this launch. */
   onProgress?: ProgressListener
   /** Status callback, subscribed for this launch. */
   onStatus?: StatusListener
}

/** Structured OAuth error surfaced when the EHR denies authorization. */
interface EhrAuthError extends Error {
   error?: string
   error_description?: string
   error_uri?: string
}

/** Listener receiving progress percentages (0–100). */
type ProgressListener = (percent: number) => void

/** Listener receiving lifecycle status transitions. */
type StatusListener = (status: EhrStatus) => void

/** Unsubscribe function returned by subscription calls. */
type Unsubscribe = () => void

/** Launch result exposed to a consumer's content (Vue slot props / React
    render-prop args). Framework-agnostic; reused by both wrappers. */
interface EhrLaunchResult {
   handoff: EhrHandoff | null
   state: EhrStatus
   error: EhrAuthError | null
}

/** Scalar props common to both framework `EhrLaunch` components; framework-
    specific slot/render-prop typing is layered on top per wrapper. */
interface EhrLaunchBaseProps {
   options?: EhrLaunchOptions
   completionDelayMs?: number
   showStatus?: boolean
   showProgress?: boolean
   showPercentage?: boolean
}

/** Props for the shared `LaunchModal` (Vue + React). */
interface LaunchModalProps {
   percent: number
   label?: string
   showStatus?: boolean
   showProgress?: boolean
   showPercentage?: boolean
   panelClass?: string
   fillClass?: string
}
