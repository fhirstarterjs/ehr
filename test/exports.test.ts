// EHR public export surface. Runs against BUILT dist output — what consumers actually
// import — locking the named exports and the new default/named `fhirStarter` primary.
// `launch` is intentionally removed (breaking rename). Requires `npm run build` first (the
// test script does this). Browser-flow is not executed here.
import { test } from "node:test"
import assert from "node:assert/strict"
import fhirStarterDefault, * as core from "@fhirstarter/ehr"

test("core exports the named public surface", () => {
   for (const name of ["fhirStarter", "onStatus", "getStatus", "destroy", "onProgress", "getProgress"])
      assert.equal(typeof (core as Record<string, unknown>)[name], "function", `${name} is exported`)
})

test("fhirStarter is exported as both default and named — identical", () => {
   assert.equal(fhirStarterDefault, core.fhirStarter, "default === named fhirStarter")
})

test("launch is NOT exported (breaking rename)", () => {
   assert.equal((core as Record<string, unknown>).launch, undefined, "launch removed")
})

test("getStatus starts at 'initializing' and destroy resets it", () => {
   core.destroy()
   assert.equal(core.getStatus(), "initializing")
})

test("onStatus immediately emits current status and returns an unsubscribe", () => {
   core.destroy()
   const seen: string[] = []
   const off = core.onStatus((s) => seen.push(s))
   assert.deepEqual(seen, ["initializing"], "emits current status synchronously")
   assert.equal(typeof off, "function")
   off()
})

test("onProgress immediately emits current percent and getProgress reads it", () => {
   core.destroy()
   const seen: number[] = []
   const off = core.onProgress((p) => seen.push(p))
   assert.equal(seen[0], core.getProgress(), "first emit equals getProgress()")
   off()
})

test("fhirStarter is a function (browser flow not executed)", () => {
   assert.equal(typeof core.fhirStarter, "function")
   assert.equal(core.fhirStarter.length, 0, "fhirStarter takes an optional single arg (arity 0)")
})
