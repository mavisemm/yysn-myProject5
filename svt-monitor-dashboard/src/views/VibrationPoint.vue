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
import { computed, onMounted, watch } from 'vue'
import { useDeviceTreeStore } from '@/stores/deviceTree'

// 导入新组件
import VibrationStats from '@/components/business/vibration-point/VibrationStats.vue'
import VibrationWaterfall from '@/components/business/vibration-point/VibrationWaterfall.vue'
import VibrationChartComparison from '@/components/business/vibration-point/VibrationChartComparison.vue'

const route = useRoute()
const router = useRouter()
const deviceTreeStore = useDeviceTreeStore()

const receiverId = computed(() => {
  const rid = route.params.receiverId
  const resolved = Array.isArray(rid) ? rid[0] : rid
  return (typeof resolved === 'string' ? resolved : '') || ''
})

// 设备树切换点位时路由 query 会变，需更新选中状态
watch(
  () => route.params.receiverId,
  (newId) => {
    if (newId) {
      const resolved = Array.isArray(newId) ? newId[0] : newId
      if (typeof resolved === 'string' && resolved) deviceTreeStore.setSelectedDeviceId(resolved)
    }
  }
)

onMounted(() => {
  if (receiverId.value) {
    deviceTreeStore.setSelectedDeviceId(receiverId.value)
  }
})

const goBack = () => {
  router.back()
}
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
    height: 60%;
    gap: 10px;
    min-height: 0;
  }
}
</style>