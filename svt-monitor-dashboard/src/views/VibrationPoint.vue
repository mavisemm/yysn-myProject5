<!-- 振动点位监控页面：包含基本指标和各类振动图表 -->
<template>
  <div class="vibration-point-page">
    <div class="main-layout">
      <!-- 基本指标和频域瀑布图 -->
      <div class="top-row">
        <!-- 基本指标卡片 -->
        <VibrationStats />

        <!-- 频域瀑布图卡片 -->
        <VibrationWaterfall />
      </div>

      <!-- 振动频域图和时域图 -->
      <VibrationChartComparison />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

// 导入新组件
import VibrationStats from '@/components/business/vibration-point/VibrationStats.vue'
import VibrationWaterfall from '@/components/business/vibration-point/VibrationWaterfall.vue'
import VibrationChartComparison from '@/components/business/vibration-point/VibrationChartComparison.vue'

const route = useRoute()
const router = useRouter()

const goBack = () => {
  router.back()
}
</script>

<style lang="scss" scoped>
.vibration-point-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .main-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 15px;
    box-sizing: border-box;
  }

  .top-row {
    display: flex;
    height: 60%;
    gap: 15px;
    min-height: 0;
  }
}
</style>