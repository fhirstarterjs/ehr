/**
 * Internal ambient types for the native SMART App Launch flow. Used only by source
 * files during the build; never published, so they cannot leak into consumers.
 */

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
