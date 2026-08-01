<template>
   <div class="fs-ehr-overlay">
      <div class="fs-ehr-panel" :class="panelClass">
         <div v-if="$slots.header" class="fs-ehr-header">
            <slot name="header" />
         </div>
         <div
            v-if="showProgress || showPercentage"
            class="fs-ehr-track"
            :class="{ 'fs-ehr-track--bare': !showProgress }"
            role="progressbar"
            :aria-valuenow="Math.round(percent)"
            aria-valuemin="0"
            aria-valuemax="100"
         >
            <div class="fs-ehr-fill" :class="fillClass" :style="{ width: `${percent}%` }" />
            <span v-if="showPercentage" class="fs-ehr-percent">{{ Math.round(percent) }}%</span>
         </div>
         <div v-if="showStatus" class="fs-ehr-label">
            <slot name="label">{{ label ?? "Loading…" }}</slot>
         </div>
         <slot name="footer" />
      </div>
   </div>
</template>

<script setup lang="ts">
withDefaults(
   defineProps<{
      percent: number
      label?: string
      showStatus?: boolean
      showProgress?: boolean
      showPercentage?: boolean
      panelClass?: string
      fillClass?: string
   }>(),
   { showStatus: true, showProgress: true, showPercentage: false })
</script>
