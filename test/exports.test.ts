// Characterization of the EHR public export surface BEFORE the fhirStarter alias is added
// (slice 5). Runs against BUILT dist output — what consumers actually import — locking the
// current named exports so the alias addition is provably additive. Requires `npm run build`
// first (the test script does this). Browser-flow (`launch`) is not executed here.
import { test } from "node:test"
import assert from "node:assert/strict"
import * as core from "@fhirstarter/ehr"

test("core exports the current named public surface", () => {
   for (const name of ["launch", "onStatus", "getStatus", "destroy", "onProgress", "getProgress"])
      assert.equal(typeof (core as Record<string, unknown>)[name], "function", `${name} is exported`)
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

test("launch is a function (browser flow not executed)", () => {
   assert.equal(typeof core.launch, "function")
   assert.equal(core.launch.length, 0, "launch takes an optional single arg (arity 0)")
})
