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

const equipmentIdFromQuery = computed(() => {
  const q = route.query.equipmentId
  if (typeof q === 'string') return q
  if (Array.isArray(q) && q[0]) return String(q[0])
  return ''
})

const pointNameFromQuery = computed(() => {
  const q = route.query.pointName
  if (typeof q === 'string') return q
  if (Array.isArray(q) && q[0]) return String(q[0])
  return ''
})

const syncTreeSelectionFromRoute = () => {
  const rid = receiverId.value.trim()
  if (!rid) return
  const eid = equipmentIdFromQuery.value.trim()
  const pname = pointNameFromQuery.value.trim()
  const treeKey =
    deviceTreeStore.resolveTreeKeyForPoint(rid, eid || undefined, {
      pointName: pname || undefined
    }) ?? rid
  deviceTreeStore.setSelectedDeviceId(treeKey)
}

watch(
  () => route.params.receiverId,
  () => {
    syncTreeSelectionFromRoute()
  }
)

watch(equipmentIdFromQuery, () => {
  syncTreeSelectionFromRoute()
})

watch(pointNameFromQuery, () => {
  syncTreeSelectionFromRoute()
})

watch(
  () => deviceTreeStore.deviceTreeData.length,
  () => {
    syncTreeSelectionFromRoute()
  }
)

watch(
  () => deviceTreeStore.loading,
  (loading) => {
    if (!loading) syncTreeSelectionFromRoute()
  }
)

onMounted(() => {
  syncTreeSelectionFromRoute()
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