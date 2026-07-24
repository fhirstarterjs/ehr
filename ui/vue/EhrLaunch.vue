<template>
   <ProgressBar v-if="showBar" :percent="percent" :show-status="showStatus">
      <template v-if="$slots.header" #header><slot name="header" /></template>
      <template #label>
         <slot name="label" :state="state">
            {{ state.charAt(0).toUpperCase() + state.slice(1) }}
         </slot>
      </template>
   </ProgressBar>

   <div v-if="error" class="fs-ehr-error">
      <slot name="error" :error="error">{{ error.message }}</slot>
   </div>

   <slot v-if="handoff && !showBar" :handoff="handoff" :state="state" :error="error" />

   <div v-if="expired" class="fs-ehr-expired">
      <div class="fs-ehr-expired__pill" role="alert" :title="EXPIRED_HINT">
         <slot name="expired">⚠️ Session has expired!</slot>
      </div>
   </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useEhrLaunch } from "./index.js"
import ProgressBar from "./ProgressBar.vue"
import "../../scss/progress.scss"

const
   EXPIRED_HINT =
      "Data shown may be out of date and unsafe to act on. Close this window and relaunch from the EHR to continue.",
   props = withDefaults(
      defineProps<{ options?: EhrLaunchOptions, completionDelayMs?: number, showStatus?: boolean }>(),
      { options: () => ({}), completionDelayMs: 500, showStatus: true }),
   { state, handoff, percent, error, loading } = useEhrLaunch(props.options),
   showBar = ref(true),
   expired = ref(false)

watch(loading, (isLoading) => {
   if (!isLoading) setTimeout(() => (showBar.value = false), props.completionDelayMs)
})

watch(state, (next) => next === "expired" && (expired.value = true))
</script>
