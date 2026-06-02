<template>
  <div class="device-waterfall-embed">
    <VibrationWaterfall
      embedded
      :receiver-id="receiverId"
      :equipment-id="equipmentId"
      :date-range="dateRange"
    />
  </div>
</template>

<script setup lang="ts">
import VibrationWaterfall from '@/components/business/vibration-point/VibrationWaterfall.vue'

defineProps<{
  receiverId: string
  equipmentId?: string
  dateRange?: [string, string] | null
}>()
</script>

<style lang="scss" scoped>
.device-waterfall-embed {
  height: 100%;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;

  :deep(.waterfall-card) {
    width: 100% !important;
    height: 100%;
    min-height: 0;
    flex: 1;
  }

  :deep(.chart-container) {
    flex: 1;
    min-height: 320px;
  }
}
</style>
