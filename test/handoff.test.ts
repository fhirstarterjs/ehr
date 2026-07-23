// Locks the documented "Other FHIR clients" handoff recipe: the selected client.state
// fields (serverUrl, tokenResponse?.access_token, expiresAt) must remain type-safe against
// the real return type. Compile-only — no browser flow is executed. If fhirclient's state
// shape changes, this fails and the README recipe must be updated in lockstep.
import { test } from "node:test"
import assert from "node:assert/strict"
import { fhirStarter } from "@fhirstarter/ehr"

test("handoff recipe fields are type-safe on the returned client state", () => {
   const handoff = (client: NonNullable<Awaited<ReturnType<typeof fhirStarter>>>) => ({
      serverUrl: client.state.serverUrl,
      token: client.state.tokenResponse?.access_token,
      expiresAt: client.state.expiresAt,
   })
   // The recipe never spreads full state; it selects exactly three fields.
   assert.equal(typeof handoff, "function")
})
