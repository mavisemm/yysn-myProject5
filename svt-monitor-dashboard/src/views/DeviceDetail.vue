<template>
  <div class="device-detail">
    <DeviceInfoModule
      v-if="equipmentId"
      :device-id="equipmentId"
      @edit-status-change="handleEditStatusChange"
    />

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
        panel-mode="realtimeTemperature"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { watch, ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { getSelectCheckPointIn } from '@/api/modules/hardware'
import DeviceInfoModule from '@/components/business/device-detail/DeviceInfoModule.vue'
import PointListModule from '@/components/business/device-detail/PointListModule.vue'
import ChartsAnalysisModule from '@/components/business/device-detail/ChartsAnalysisModule.vue'
import type { DeviceNode } from '@/types/device'

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

interface PointInfo {
  id: string
  name: string
  lastAlarmTime: string
  alarmType: string
  alarmValue: string
  matchMesureValue?: string | number
  thresholdValue?: string | number
  deviceId?: string
  hasAlarm: boolean
}

const pointList = ref<PointInfo[]>([])
const pointListModuleRef = ref<ComponentPublicInstance & PointListModuleType>()
const selectedPointId = ref<string>('')
const pagination = ref({
  pageNum: 1,
  pageSize: 10 as const,
  total: 0,
})

const isEditing = ref(false)
const hasUnsavedChanges = ref(false)

const analysisForm = ref({
  receiverId: '',
  days: 7,
  dateRange: [] as [Date, Date] | [],
})

interface AnalysisResult {
  deviation: string
  pointName: string
}

const analysisResult = ref<AnalysisResult>({
  deviation: '0.25',
  pointName: '进风口位置',
})

const initDeviceData = async () => {
  if (!equipmentId.value) return

  try {
    const resolvePointDeviceId = (rid: string): string | undefined => {
      for (const factory of deviceTreeStore.deviceTreeData) {
        for (const workshop of factory.children ?? []) {
          for (const device of workshop.children ?? []) {
            if (device.type !== 'device') continue
            const hit = (device.children ?? []).find((p) => p.type === 'point' && p.id === rid)
            if (hit && hit.deviceId) return hit.deviceId
          }
        }
      }
      return undefined
    }

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
    const rawList = Array.isArray(res.ret)
      ? res.ret
      : (res.ret.items ?? res.ret.records ?? res.ret.list ?? [])
    if (!Array.isArray(rawList)) {
      pointList.value = []
      pagination.value.total = 0
      return
    }
    const total = Array.isArray(res.ret)
      ? rawList.length
      : Number(res.ret.total ?? res.ret.rowCount ?? rawList.length)
    pagination.value.total = Number.isFinite(total) ? total : rawList.length
    const typeStrToDisplay = (t: string) => {
      const s = String(t || '').toLowerCase()
      if (s === 'vibration') return '振动'
      if (s === 'temperature') return '温度'
      if (s === 'sound') return '声音'
      return t || '无'
    }
    const list: PointInfo[] = rawList.map((item) => ({
      id: item.receiverId,
      name: item.receiverName || '未知点位',
      lastAlarmTime: item.warningTime != null && item.warningTime !== '' ? item.warningTime : '无',
      alarmType: typeStrToDisplay(item.warningType),
      alarmValue:
        item.warningValue != null && Number(item.warningValue) !== 0
          ? String(item.warningValue)
          : '无',
      matchMesureValue: (item as any).matchMesureValue,
      thresholdValue: (item as any).thresholdValue,
      deviceId: (item as any).deviceId,
      hasAlarm: item.isAlarm === 0,
    }))
    pointList.value = list.sort((a, b) => {
      if (a.lastAlarmTime === '无' && b.lastAlarmTime === '无') return 0
      if (a.lastAlarmTime === '无') return 1
      if (b.lastAlarmTime === '无') return -1
      const timeA = new Date(a.lastAlarmTime).getTime()
      const timeB = new Date(b.lastAlarmTime).getTime()
      return timeB - timeA
    })
  } catch {
    pointList.value = []
  }

  nextTick(async () => {
    await nextTick()
    const pointListModule = pointListModuleRef.value
    if (pointList.value.length > 0) {
      if (!selectedPointId.value || !pointList.value.find((p) => p.id === selectedPointId.value)) {
        const firstPoint = pointList.value[0]
        selectedPointId.value = firstPoint ? firstPoint.id : ''
      }
      if (pointListModule && typeof pointListModule.setCurrentRow === 'function') {
        const currentIndex = pointList.value.findIndex((p) => p.id === selectedPointId.value)
        if (currentIndex >= 0) {
          pointListModule.setCurrentRow(currentIndex)
        } else {
          pointListModule.setCurrentRow(0)
        }
      }
    } else {
      selectedPointId.value = ''
    }
  })
}

watch(
  () => equipmentId.value,
  (id) => {
    if (id && typeof id === 'string') {
      pagination.value.pageNum = 1
      deviceTreeStore.setSelectedDeviceId(id)
      initDeviceData()
    }
  },
  { immediate: true },
)

onMounted(() => {
  deviceTreeStore.setSelectedDeviceId(equipmentId.value)
  setupPageResizeObserver()
  window.addEventListener('resize', resizeAllCharts)
})

const handlePageChange = (pageNum: number) => {
  pagination.value.pageNum = pageNum
  initDeviceData()
}

let resizeObserver: ResizeObserver | null = null

const resizeAllCharts = () => {
  document.body.offsetHeight
}

const setupPageResizeObserver = () => {
  const pageContainer = document.querySelector('.device-detail') as HTMLDivElement
  if (pageContainer) {
    resizeObserver = new ResizeObserver(resizeAllCharts)
    resizeObserver.observe(pageContainer)
  }
}

const handleEditStatusChange = (status: { isEditing: boolean; hasChanges: boolean }) => {
  isEditing.value = status.isEditing
  hasUnsavedChanges.value = status.hasChanges
}

onBeforeRouteLeave(async (to, from, next) => {
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm('您有未保存的编辑内容，是否保存后再离开？', '确认离开', {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true,
      })

      next()
    } catch (action) {
      if (action === 'cancel') {
        next(false)
      } else {
        next(false)
      }
    }
  } else {
    next()
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  window.removeEventListener('resize', resizeAllCharts)
})
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
