<template>
  <div class="vibration-point-page">
    <div class="main-layout">
      <div class="top-row">
        <VibrationStats />
        <VibrationWaterfall />
      </div>
      <VibrationChartComparison />
    </div>
  </div>
</template>

<script setup lang="ts">
import VibrationStats from '@/components/business/vibration-point/VibrationStats.vue'
import VibrationWaterfall from '@/components/business/vibration-point/VibrationWaterfall.vue'
import VibrationChartComparison from '@/components/business/vibration-point/VibrationChartComparison.vue'
import { usePointPageRoute } from '@/composables/usePointPageRoute'

usePointPageRoute()
</script>

<style lang="scss" scoped>
.vibration-point-page {
  height: 100%;
  display: flex;
  flex-direction: column;

  .main-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 10px;
    box-sizing: border-box;
  }

  .top-row {
    display: flex;
    height: 55%;
    gap: 10px;
    min-height: 0;
  }
}

@media (max-width: 800px) {
  .vibration-point-page {
    .top-row {
      flex-direction: column;
      height: auto;
    }
  }
}
</style>
