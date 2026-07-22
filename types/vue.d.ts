/**
 * Ambient types for the Vue wrapper. `VueEhrLaunch` is a `ReturnType` inference
 * alias over the composable so there is a single source of truth and no
 * class-vs-public shape divergence with Vue's ref unwrapping.
 */

/** Reactive result returned by the Vue `useEhrLaunch` composable. */
type VueEhrLaunch = ReturnType<typeof import("../ui/vue/index.js").useEhrLaunch>
