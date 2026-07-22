/** Vue entry: the `useEhrLaunch` composable plus component re-exports. */

import { ref, shallowRef, onMounted, onUnmounted } from "vue"
import type { ShallowRef } from "vue"
import { launch, onStatus, onProgress } from "../../ts/index.js"

export { default as ProgressBar } from "./ProgressBar.vue"
export { default as EhrLaunch } from "./EhrLaunch.vue"

/**
 * Reactive SMART EHR-launch composable. Runs the core on mount and exposes
 * `{ state, client, percent, error, loading }` refs. Unsubscribes on unmount
 * without destroying the shared one-shot launch.
 */
export const useEhrLaunch = (options: EhrLaunchOptions = {}) => {
   const
      state = ref<EhrStatus>("initializing"),
      client = shallowRef(null) as unknown as ShallowRef<SmartClient | null>,
      percent = ref(0),
      error = ref<EhrAuthError | null>(null),
      loading = ref(true)

   let alive = true

   onMounted(() => {
      const
         offStatus = onStatus((s) => alive && (state.value = s)),
         offProgress = onProgress((p) => alive && (percent.value = p))
      onUnmounted(() => (alive = false, offStatus(), offProgress()))
      launch(options)
         .then((c) => alive && ((client.value = c), (loading.value = false)))
         .catch((e) => alive && ((error.value = e as EhrAuthError), (loading.value = false)))
   })

   return { state, client, percent, error, loading }
}
