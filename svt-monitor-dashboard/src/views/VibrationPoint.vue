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
import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted, watch } from 'vue'
import { useDeviceTreeStore } from '@/stores/deviceTree'


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