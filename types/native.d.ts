/**
 * Public ambient types for the native SMART App Launch handoff. Source files reference
 * these names directly; no import. Internal flow types live in native.internal.d.ts.
 */

/** PKCE policy: require S256 (default), use if advertised, or disable entirely. */
type PkceMode = "required" | "ifSupported" | "disabled"

/** Live token response exposed through the optional `fhirclient` adapter. */
interface EhrFhirTokenResponse {
   readonly access_token: string | undefined
   readonly expires_in: number
   readonly token_type: "Bearer" | "bearer" | undefined
   readonly scope: string | undefined
   readonly patient: string | undefined
   readonly encounter: string | undefined
   readonly id_token: string | undefined
}

/** Minimal writable `fhirclient` state with a live nested token response. */
interface EhrFhirClientState {
   serverUrl: string
   tokenResponse: EhrFhirTokenResponse
}

/**
 * Flat living handoff returned by `fhirStarter()`. Core auth fields plus available
 * SMART launch context and own vendor token fields; reserved keys are never clobbered.
 */
interface EhrHandoff {
   serverUrl: string
   accessToken: string | undefined
   expiresAt: number
   readonly fhirClient: EhrFhirClientState
   readonly authHeaders: Record<string, string>
   scope?: string
   tokenType?: string
   patient?: string
   encounter?: string
   idToken?: string
   needPatientBanner?: boolean
   smartStyleUrl?: string
   params?: Record<string, unknown>
   [key: string]: unknown
}
