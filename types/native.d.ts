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
   /** FHIR base (resource server) URL to issue API calls against. */
   serverUrl: string
   /** Current bearer access token, or undefined before/without one. */
   accessToken: string | undefined
   /** Access-token expiry as epoch milliseconds. */
   expiresAt: number
   /** Adapter-shaped state for seeding `fhir-kit-client`/`fhirclient`. */
   readonly fhirClient: EhrFhirClientState
   /** Ready-to-spread request headers carrying the bearer token. */
   readonly authHeaders: Record<string, string>
   /** Granted scopes (space-delimited), if the server returned them. */
   scope?: string
   /** Token type from the token response (typically `Bearer`). */
   tokenType?: string
   /** Launch patient context id, when present. */
   patient?: string
   /** Launch encounter context id, when present. */
   encounter?: string
   /** Raw OpenID Connect id_token, when `openid` was granted. */
   idToken?: string
   /** The `client_id` this session authorized with, as resolved at launch. */
   clientId?: string
   /** FHIR reference to the launching user, from the `fhirUser` (or `profile`) claim. */
   fhirUser?: string
   /** SMART flag: host expects the app to show its own patient banner. */
   needPatientBanner?: boolean
   /** SMART style URL for matching the host EHR's look and feel. */
   smartStyleUrl?: string
   /** Extra token-response params passed through from the server. */
   params?: Record<string, unknown>
   /** Passthrough for any additional vendor token fields. */
   [key: string]: unknown
}
