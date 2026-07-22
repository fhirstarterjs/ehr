<template>
   <div class="fs-ehr-overlay">
      <div class="fs-ehr-panel" :class="panelClass">
         <div v-if="$slots.header" class="fs-ehr-header">
            <slot name="header" />
         </div>
         <div
            class="fs-ehr-track"
            role="progressbar"
            :aria-valuenow="Math.round(percent)"
            aria-valuemin="0"
            aria-valuemax="100"
         >
            <div class="fs-ehr-fill" :class="fillClass" :style="{ width: `${percent}%` }" />
         </div>
         <div v-if="showStatus" class="fs-ehr-label">
            <slot name="label">{{ label ?? "Loading…" }}</slot>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
withDefaults(
   defineProps<{
      percent: number
      label?: string
      showStatus?: boolean
      panelClass?: string
      fillClass?: string
   }>(),
   { showStatus: true })
</script>
