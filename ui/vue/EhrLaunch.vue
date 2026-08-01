<template>
   <ProgressBar v-if="showBar || error" :percent="percent" :show-status="showStatus">
      <template v-if="$slots.header" #header><slot name="header" /></template>
      <template #label>
         <slot name="label" :state="state">
            {{ state.charAt(0).toUpperCase() + state.slice(1) }}
         </slot>
      </template>
      <template v-if="error" #footer>
         <div class="fs-ehr-error">
            <slot name="error" :error="error">Error: {{ message }}</slot>
         </div>
      </template>
   </ProgressBar>

   <slot :handoff="handoff" :state="state" :error="error" />

   <div v-if="expired" class="fs-ehr-expired">
      <div class="fs-ehr-expired__pill" role="alert" :title="EXPIRED_HINT">
         <slot name="expired">⚠️ Session has expired!</slot>
      </div>
   </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useEhrLaunch } from "./index.js"
import ProgressBar from "./ProgressBar.vue"

defineSlots<{
   default(props: { handoff: EhrHandoff | null, state: EhrStatus, error: EhrAuthError | null }): unknown
   header(): unknown
   label(props: { state: EhrStatus }): unknown
   error(props: { error: EhrAuthError }): unknown
   expired(): unknown
}>()

const
   EXPIRED_HINT =
      "Data shown may be out of date and unsafe to act on. Close this window and relaunch from the EHR to continue.",
   props = withDefaults(
      defineProps<{ options?: EhrLaunchOptions, completionDelayMs?: number, showStatus?: boolean }>(),
      { options: () => ({}), completionDelayMs: 500, showStatus: true }),
   { state, handoff, percent, error, loading } = useEhrLaunch(props.options),
   showBar = ref(true),
   expired = ref(false),
   // Strip the internal `EhrLaunch:` prefix for display.
   message = computed(() => error.value?.message.replace(/^EhrLaunch:\s*/, "") ?? "")

watch(loading, (isLoading) => {
   // On error keep the bar visible, stopped at its current percent.
   if (!isLoading && !error.value) setTimeout(() => (showBar.value = false), props.completionDelayMs)
})

watch(state, (next) => next === "expired" && (expired.value = true))
</script>

<style src="../../scss/ehr-launch.scss" lang="scss"></style>
