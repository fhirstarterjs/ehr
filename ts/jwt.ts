/**
 * Decode a JWT payload without verifying its signature. Launch and id tokens are
 * read only for context the authorization server already vouched for, so this is
 * a parser, never a trust boundary. Returns null for anything unparseable.
 */
export const decodeJwt = (jwt: string): Record<string, unknown> | null => {
   const payload = jwt.split(".")[1]
   if (!payload) return null
   try {
      return JSON.parse(decodeURIComponent(
         atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
            .split("")
            .map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
            .join("")))
   } catch {
      return null
   }
}
