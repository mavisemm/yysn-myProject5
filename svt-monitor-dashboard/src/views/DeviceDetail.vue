<template>
  <div class="device-detail">
    <DeviceInfoModule v-if="equipmentId" :device-id="equipmentId" />

    <div class="right-content">
      <PointListModule
        ref="pointListModuleRef"
        :point-list="pointList"
        :selected-point-id="selectedPointId"
        :current-page="pagination.pageNum"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        @point-selected="selectedPointId = $event"
        @page-change="handlePageChange"
      />

      <ChartsAnalysisModule
        :point-list="pointList"
        :selected-point-id="selectedPointId"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { watch, ref, computed, nextTick, onMounted } from 'vue'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { getSelectCheckPointIn } from '@/api/modules/hardware'
import DeviceInfoModule from '@/components/business/device-detail/DeviceInfoModule.vue'
import PointListModule from '@/components/business/device-detail/PointListModule.vue'
import ChartsAnalysisModule from '@/components/business/device-detail/ChartsAnalysisModule.vue'
import type { DeviceDetailPointInfo } from '@/components/business/device-detail/deviceDetailTypes'
import {
  extractPointListFromResponse,
  extractPointListTotal,
  mapCheckPointsFromApi,
  sortPointsByAlarmTime,
} from '@/components/business/device-detail/deviceDetailPoints'

import type { ComponentPublicInstance } from 'vue'
type PointListModuleType = InstanceType<typeof PointListModule>

const route = useRoute()
const deviceTreeStore = useDeviceTreeStore()

const equipmentId = computed<string | null>(() => {
  const q = route.query.equipmentId
  const qId = Array.isArray(q) ? q[0] : q
  if (typeof qId === 'string' && qId) return qId

  const p = route.params.id
  const pId = Array.isArray(p) ? p[0] : p
  if (typeof pId === 'string' && pId) return pId

  return null
})

const pointList = ref<DeviceDetailPointInfo[]>([])
const pointListModuleRef = ref<ComponentPublicInstance & PointListModuleType>()
const selectedPointId = ref<string>('')
const pagination = ref({
  pageNum: 1,
  pageSize: 10 as const,
  total: 0,
})

const syncPointTableSelection = async () => {
  await nextTick()
  await nextTick()
  const pointListModule = pointListModuleRef.value
  if (pointList.value.length === 0) {
    selectedPointId.value = ''
    return
  }
  if (!selectedPointId.value || !pointList.value.find((p) => p.id === selectedPointId.value)) {
    selectedPointId.value = pointList.value[0]?.id ?? ''
  }
  if (pointListModule && typeof pointListModule.setCurrentRow === 'function') {
    const currentIndex = pointList.value.findIndex((p) => p.id === selectedPointId.value)
    pointListModule.setCurrentRow(currentIndex >= 0 ? currentIndex : 0)
  }
}

const initDeviceData = async () => {
  if (!equipmentId.value) return

  try {
    const res = await getSelectCheckPointIn(
      equipmentId.value,
      pagination.value.pageSize,
      pagination.value.pageNum,
    )
    if (res.rc !== 0 || !res.ret) {
      pointList.value = []
      pagination.value.total = 0
      return
    }
    const rawList = extractPointListFromResponse(res.ret)
    if (!Array.isArray(rawList)) {
      pointList.value = []
      pagination.value.total = 0
      return
    }
    pagination.value.total = extractPointListTotal(res.ret, rawList.length)
    pointList.value = sortPointsByAlarmTime(mapCheckPointsFromApi(rawList))
  } catch {
    pointList.value = []
    pagination.value.total = 0
  }

  await syncPointTableSelection()
}

watch(
  () => equipmentId.value,
  (id) => {
    if (id && typeof id === 'string') {
      pagination.value.pageNum = 1
      deviceTreeStore.setSelectedDeviceId(id)
      void initDeviceData()
    }
  },
  { immediate: true },
)

onMounted(() => {
  deviceTreeStore.setSelectedDeviceId(equipmentId.value)
})

const handlePageChange = (pageNum: number) => {
  pagination.value.pageNum = pageNum
  void initDeviceData()
}
</script>

<style lang="scss" scoped>
.device-detail {
  display: flex;
  height: 100%;
  gap: 10px;
  box-sizing: border-box;
  color: white;
  min-width: 0;

  .right-content {
    width: 50vw !important;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    min-width: 0;
  }
}

@media (max-width: 800px) {
  .device-detail {
    flex-direction: column;
    height: auto;
    gap: 8px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 10px;

    .right-content {
      width: 100% !important;
      flex: 0 0 auto;
      height: auto;
      min-height: 0;
    }
  }
}
</style>
