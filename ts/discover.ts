const
   KEY_PREFIX = "fhirstarter:ehr:",

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
