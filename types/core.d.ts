/**
 * Ambient public types for the framework-agnostic core. Source files reference
 * these names directly; no import is needed.
 */

/** fhirclient `Client` instance returned on a successful launch. */
type SmartClient = ReturnType<typeof import("fhirclient").client>

/** Launch-phase lifecycle status, derived from the URL on each page load. */
type EhrStatus =
   | "initializing"
   | "authorizing"
   | "authorized"
   | "authenticated"
   | "idle"
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
   /** Redirect URI; defaults to the current window origin. */
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
   /** Parent for the auth iframe (element or selector). Default `document.body`. */
   iframeParent?: HTMLElement | string
   /** Extra class(es) for the auth iframe. */
   iframeClass?: string | string[]
   /** Inline styles applied after defaults, overriding them. */
   iframeStyle?: string | Partial<CSSStyleDeclaration>
   /** Passthrough fhirclient options merged into the authorize call. */
   fhir?: Record<string, unknown>
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
