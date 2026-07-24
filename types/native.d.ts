/**
 * Ambient types for the native SMART App Launch flow (discovery, PKCE, token
 * exchange, handoff). Source files reference these names directly; no import.
 */

/** PKCE policy: require S256 (default), use if advertised, or disable entirely. */
type PkceMode = "required" | "ifSupported" | "disabled"

/** Discovered SMART authorize/token endpoints (+ advertised PKCE methods). */
interface SmartConfig {
   authorizeUrl: string
   tokenUrl: string
   pkceMethods?: string[]
}

/** Relevant fields of a `.well-known/smart-configuration` document. */
interface SmartWellKnown {
   authorization_endpoint?: string
   token_endpoint?: string
   code_challenge_methods_supported?: string[]
}

/** Minimal CapabilityStatement shape for the SMART oauth-uris fallback. */
interface FhirCapabilityStatement {
   rest?: {
      security?: {
         extension?: { url: string, extension?: { url: string, valueUri?: string }[] }[]
      }
   }[]
}

/** Inputs for building the SMART authorize URL. Reserved keys override `params`. */
interface AuthorizeParams {
   clientId: string
   redirectUri: string
   state: string
   aud: string
   scope?: string
   launch?: string
   codeChallenge?: string
   params?: Record<string, unknown>
}

/** Context the refresh loop needs: the live handoff to mutate and the token endpoint. */
interface RefreshContext {
   handoff: EhrHandoff
   tokenUrl: string
   clientId: string
}

/** The single pre-auth blob persisted (keyed by `state`) between authorize and callback. */
interface PreAuthState {
   tokenUrl: string
   state: string
   redirectUri: string
   clientId: string
   serverUrl: string
   scope?: string
   verifier?: string
   params?: Record<string, unknown>
}

/** Parsed SMART token-endpoint response; standard fields plus arbitrary vendor keys. */
interface SmartTokenResponse {
   access_token?: string
   token_type?: string
   expires_in?: number
   scope?: string
   patient?: string
   encounter?: string
   id_token?: string
   refresh_token?: string
   need_patient_banner?: boolean
   smart_style_url?: string
   [key: string]: unknown
}

/**
 * Flat living handoff returned by `fhirStarter()`. Core auth fields plus available
 * SMART launch context and own vendor token fields; reserved keys are never clobbered.
 */
interface EhrHandoff {
   serverUrl: string
   accessToken: string | undefined
   expiresAt: number
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
