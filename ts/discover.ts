const
   KEY_PREFIX = "fhirstarter:ehr:",
   SESSION_KEY = `${KEY_PREFIX}session`,
   RESERVED_AUTH = new Set([
      "response_type", "client_id", "redirect_uri", "scope", "state",
      "aud", "launch", "code_challenge", "code_challenge_method",
   ]),

   preAuthKey = (state: string): string => `${KEY_PREFIX}pre:${state}`,

   parseMetadata = (cap: FhirCapabilityStatement): SmartConfig => {
      const ext = cap.rest?.[0]?.security?.extension?.find(
         (e) => e.url === "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
      )?.extension
      const pick = (u: string): string | undefined =>
         ext?.find((e) => e.url === u)?.valueUri
      const authorizeUrl = pick("authorize"), tokenUrl = pick("token")
      if (!authorizeUrl || !tokenUrl)
         throw new Error("EhrLaunch: CapabilityStatement is missing SMART oauth-uris")
      return { authorizeUrl, tokenUrl }
   }

/** Build the SMART authorize URL, protecting reserved OAuth/SMART keys from `params`. */
export const buildAuthorizeUrl = (authorizeUrl: string, req: AuthorizeParams): string => {
   const url = new URL(authorizeUrl)
   const set = (k: string, v: string | undefined): void => void (v && url.searchParams.set(k, v))
   set("response_type", "code")
   set("client_id", req.clientId)
   set("redirect_uri", req.redirectUri)
   set("scope", req.scope)
   set("state", req.state)
   set("aud", req.aud)
   set("launch", req.launch)
   set("code_challenge", req.codeChallenge)
   req.codeChallenge && set("code_challenge_method", "S256")
   for (const [k, v] of Object.entries(req.params ?? {}))
      !RESERVED_AUTH.has(k) && url.searchParams.set(k, String(v))
   return url.href
}

/** Persist the one pre-auth blob under a state-namespaced sessionStorage key. */
export const savePreAuth = (blob: PreAuthState): void =>
   sessionStorage.setItem(preAuthKey(blob.state), JSON.stringify(blob))

/** Read and remove the pre-auth blob for a returned `state`, or null if absent. */
export const takePreAuth = (state: string): PreAuthState | null => {
   const key = preAuthKey(state), raw = sessionStorage.getItem(key)
   if (!raw) return null
   sessionStorage.removeItem(key)
   try {
      return JSON.parse(raw) as PreAuthState
   } catch {
      return null
   }
}

/** Persist the authenticated handoff snapshot for same-page session restore. */
export const saveSession = (handoff: EhrHandoff): void =>
   sessionStorage.setItem(SESSION_KEY, JSON.stringify(handoff))

/** Read the persisted handoff snapshot, or null when none exists or it is expired. */
export const loadSession = (): EhrHandoff | null => {
   const raw = sessionStorage.getItem(SESSION_KEY)
   if (!raw) return null
   try {
      const h = JSON.parse(raw) as EhrHandoff
      return h.expiresAt && Date.now() < h.expiresAt ? h : (sessionStorage.removeItem(SESSION_KEY), null)
   } catch {
      return null
   }
}

/**
 * Discover SMART authorize/token endpoints for an issuer. Tries
 * `.well-known/smart-configuration` first, then the CapabilityStatement fallback.
 */
export const discover = async (iss: string): Promise<SmartConfig> => {
   const base = iss.replace(/\/+$/, "")
   const wk = await fetch(`${base}/.well-known/smart-configuration`, {
      headers: { accept: "application/json" },
   }).catch(() => null)
   if (wk?.ok) {
      const c = (await wk.json()) as SmartWellKnown
      if (c.authorization_endpoint && c.token_endpoint)
         return {
            authorizeUrl: c.authorization_endpoint,
            tokenUrl: c.token_endpoint,
            pkceMethods: c.code_challenge_methods_supported,
         }
   }
   const meta = await fetch(`${base}/metadata`, { headers: { accept: "application/json" } })
   if (!meta.ok) throw new Error(`EhrLaunch: SMART discovery failed for ${iss}`)
   return parseMetadata((await meta.json()) as FhirCapabilityStatement)
}
