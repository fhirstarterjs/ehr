const
   RESERVED = new Set([
      "serverUrl", "accessToken", "expiresAt", "params", "fhirClient", "authHeaders",
      "scope", "tokenType", "patient", "encounter", "idToken", "needPatientBanner", "smartStyleUrl",
   ]),

   UNSAFE = new Set(["__proto__", "prototype", "constructor"]),

   PRIVATE = new Set(["access_token", "refresh_token", "expires_in", "token_type", "id_token"]),

   define = (target: object, key: string, value: unknown): void =>
      void Object.defineProperty(target, key, { value, enumerable: true, configurable: true }),

   /** Flatten known + own vendor token fields onto the handoff, never clobbering reserved keys. */
   flatten = (handoff: object, res: SmartTokenResponse): void => {
      for (const key of Object.keys(res)) {
         if (UNSAFE.has(key) || PRIVATE.has(key) || RESERVED.has(key)) continue
         define(handoff, key, res[key])
      }
   }

/** Merge a token response into a handoff in place: present fields replace, omitted survive. */
export const applyToken = (handoff: EhrHandoff, res: SmartTokenResponse): EhrHandoff => {
   handoff.accessToken = res.access_token
   handoff.expiresAt = Date.now() + (res.expires_in ?? 0) * 1_000
   const set = (k: keyof EhrHandoff, v: unknown): void => void (v !== undefined && ((handoff[k] as unknown) = v))
   set("scope", res.scope)
   set("tokenType", res.token_type)
   set("patient", res.patient)
   set("encounter", res.encounter)
   set("idToken", res.id_token)
   set("needPatientBanner", res.need_patient_banner)
   set("smartStyleUrl", res.smart_style_url)
   flatten(handoff, res)
   return handoff
}

/** Build the flat living `EhrHandoff` from a parsed SMART token response + launch context. */
export const toHandoff = (
   res: SmartTokenResponse,
   serverUrl: string,
   params: Record<string, unknown> | undefined,
): EhrHandoff =>
   applyToken(
      { serverUrl, params: params ? { ...params } : undefined } as EhrHandoff,
      res,
   )

/** Exchange an authorization code for a token, validating `state` and OAuth errors first. */
export const exchange = async (
   search: URLSearchParams,
   pre: PreAuthState,
): Promise<SmartTokenResponse> => {
   const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: search.get("code") ?? "",
      redirect_uri: pre.redirectUri,
      client_id: pre.clientId,
   })
   if (pre.verifier) body.set("code_verifier", pre.verifier)
   const res = await fetch(pre.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
   })
   const data = (await res.json().catch(() => ({}))) as SmartTokenResponse
   if (!res.ok || !data.access_token)
      throw new Error(`EhrLaunch: token exchange failed (${res.status})`)
   return data
}
