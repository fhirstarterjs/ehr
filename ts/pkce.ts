/** Base64url-encode raw bytes (no padding, URL-safe alphabet). */
const base64url = (bytes: Uint8Array): string => {
   let bin = ""
   for (const b of bytes) bin += String.fromCharCode(b)
   return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** Generate a high-entropy PKCE `code_verifier` (RFC 7636, 43-128 chars). */
export const verifier = (): string => {
   const bytes = new Uint8Array(32)
   crypto.getRandomValues(bytes)
   return base64url(bytes)
}

/** Derive the S256 `code_challenge` for a verifier via SHA-256 + base64url. */
export const challenge = async (codeVerifier: string): Promise<string> => {
   const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))
   return base64url(new Uint8Array(digest))
}

/**
 * Decide whether to use PKCE given the caller's mode and server support.
 * `required` (default) throws when S256 is unsupported; `ifSupported` uses it only
 * when advertised; `disabled` never uses it.
 */
export const usePkce = (mode: PkceMode | undefined, methods: string[] | undefined): boolean => {
   const supported = (methods ?? []).includes("S256")
   if (mode === "disabled") return false
   if (mode === "ifSupported") return supported
   if (!supported)
      throw new Error(
         "EhrLaunch: server does not advertise PKCE S256; set `pkce: \"ifSupported\"` or \"disabled\" to proceed",
      )
   return true
}
