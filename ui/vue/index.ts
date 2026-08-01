/** Vue entry: the `useEhrLaunch` composable plus component re-exports. */

import { ref, shallowRef, onMounted, onUnmounted } from "vue"
import type { ShallowRef } from "vue"
import { fhirStarter, onStatus, onProgress, initialStatus } from "../../ts/index.js"
// EhrHandoff is an ambient global type from ../../types

/** Vue progress component. */
export { default as ProgressBar } from "./ProgressBar.vue"

/** Turnkey Vue EHR-launch component. */
export { default as EhrLaunch } from "./EhrLaunch.vue"

/**
 * Reactive SMART EHR-launch composable. Runs the core on mount and exposes
 * `{ state, handoff, percent, error, loading }` refs. Unsubscribes on unmount
 * without destroying the shared one-shot launch.
 */
export const useEhrLaunch = (options: EhrLaunchOptions = {}) => {
   const
      // Seed synchronously from the URL so the first render already knows
      // `standalone`/`launch`/etc. — no `initializing` flash before the async run.
      state = ref<EhrStatus>(initialStatus()),
      handoff = shallowRef(null) as unknown as ShallowRef<EhrHandoff | null>,
      percent = ref(0),
      error = ref<EhrAuthError | null>(null),
      loading = ref(true)

   let alive = true

   onMounted(() => {
      const
         offStatus = onStatus((s) => alive && (state.value = s)),
         offProgress = onProgress((p) => alive && (percent.value = p))
      onUnmounted(() => (alive = false, offStatus(), offProgress()))
      fhirStarter(options)
         .then((h) => alive && ((handoff.value = h), (loading.value = false)))
         .catch((e) => alive && ((error.value = e as EhrAuthError), (loading.value = false)))
   })

   return { state, handoff, percent, error, loading }
}
