<!-- 设备详情页面：展示设备信息和数据分析 -->
<template>
  <div class="device-detail">
    <!-- 左侧设备信息模块：显示设备基本信息 -->
    <DeviceInfoModule v-if="equipmentId" :device-id="equipmentId" @edit-status-change="handleEditStatusChange" />

    <!-- 右侧内容模块：包含点位列表和图表分析 -->
    <div class="right-content">
      <!-- 点位列表：显示设备的各个监测点 -->
      <PointListModule ref="pointListModuleRef" :point-list="pointList" :selected-point-id="selectedPointId"
        @point-selected="selectedPointId = $event" />

      <!-- 图表与右下角面板：右下角改为“实时温度” -->
      <ChartsAnalysisModule :point-list="pointList" :selected-point-id="selectedPointId" panel-mode="realtimeTemperature" />
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
  // 新地址：/device-detail?equipmentId=xxx
  const q = route.query.equipmentId
  const qId = Array.isArray(q) ? q[0] : q
  if (typeof qId === 'string' && qId) return qId

  // 兼容旧地址：/device-detail/:id
  const p = route.params.id
  const pId = Array.isArray(p) ? p[0] : p
  if (typeof pId === 'string' && pId) return pId

  return null
})

interface PointInfo {
  id: string,
  name: string,
  lastAlarmTime: string,
  alarmType: string,
  alarmValue: string,
  /** 点位级 deviceId（用于振动接口入参） */
  deviceId?: string,
  hasAlarm: boolean
}

const pointList = ref<PointInfo[]>([])
const pointListModuleRef = ref<ComponentPublicInstance & PointListModuleType>()
const selectedPointId = ref<string>('')

// 编辑状态跟踪
const isEditing = ref(false)
const hasUnsavedChanges = ref(false)

const analysisForm = ref({
  receiverId: '',
  days: 7,
  dateRange: [] as [Date, Date] | []
})

interface AnalysisResult {
  deviation: string,
  pointName: string
}

const analysisResult = ref<AnalysisResult>({
  deviation: '0.25',
  pointName: '进风口位置'
})

const initDeviceData = async () => {
  if (!equipmentId.value) return

  try {
    const resolvePointDeviceId = (rid: string): string | undefined => {
      for (const factory of deviceTreeStore.deviceTreeData) {
        for (const workshop of (factory.children ?? [])) {
          for (const device of (workshop.children ?? [])) {
            if (device.type !== 'device') continue
            const hit = (device.children ?? []).find(p => p.type === 'point' && p.id === rid)
            if (hit && hit.deviceId) return hit.deviceId
          }
        }
      }
      return undefined
    }

    const res = await getSelectCheckPointIn(equipmentId.value)
    if (res.rc !== 0 || !Array.isArray(res.ret)) {
      pointList.value = []
      return
    }
    const typeStrToDisplay = (t: string) => {
      const s = String(t || '').toLowerCase()
      if (s === 'vibration') return '振动'
      if (s === 'temperature') return '温度'
      if (s === 'sound') return '声音'
      return t || '无'
    }
    const list: PointInfo[] = res.ret.map((item) => ({
      id: item.receiverId,
      name: (item as any).receiverName || item.pointName || '未知点位',
      lastAlarmTime: item.warningTime != null && item.warningTime !== '' ? item.warningTime : '无',
      alarmType: typeStrToDisplay(item.warningType),
      alarmValue: item.warningValue != null && Number(item.warningValue) !== 0 ? String(item.warningValue) : '无',
      deviceId: (item as any).deviceId ?? resolvePointDeviceId(item.receiverId),
      hasAlarm: item.isAlarm === 0  // 0=有预警(未处理)，1=没预警(已处理)
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
    await nextTick();
    const pointListModule = pointListModuleRef.value
    if (pointList.value.length > 0) {
      if (!selectedPointId.value || !pointList.value.find(p => p.id === selectedPointId.value)) {
        const firstPoint = pointList.value[0]
        selectedPointId.value = firstPoint ? firstPoint.id : ''
      }
      if (pointListModule && typeof pointListModule.setCurrentRow === 'function') {
        const currentIndex = pointList.value.findIndex(p => p.id === selectedPointId.value)
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

/**
 * 仅由设备ID（路由）变化触发点位列表加载，避免重复请求
 */
watch(
  () => equipmentId.value,
  (id) => {
    if (id && typeof id === 'string') {
      deviceTreeStore.setSelectedDeviceId(id)
      initDeviceData()
    }
  },
  { immediate: true }
)

onMounted(() => {
  deviceTreeStore.setSelectedDeviceId(equipmentId.value);
  setupPageResizeObserver();
  window.addEventListener('resize', resizeAllCharts);
})


let resizeObserver: ResizeObserver | null = null

const resizeAllCharts = () => {
  document.body.offsetHeight;
}

const setupPageResizeObserver = () => {
  const pageContainer = document.querySelector('.device-detail') as HTMLDivElement;
  if (pageContainer) {
    resizeObserver = new ResizeObserver(resizeAllCharts);
    resizeObserver.observe(pageContainer);
  }
}

// 监听DeviceInfoModule的编辑状态
const handleEditStatusChange = (status: { isEditing: boolean; hasChanges: boolean }) => {
  isEditing.value = status.isEditing;
  hasUnsavedChanges.value = status.hasChanges;
}

// 路由离开前的确认对话框
onBeforeRouteLeave(async (to, from, next) => {
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm(
        '您有未保存的编辑内容，是否保存后再离开？',
        '确认离开',
        {
          confirmButtonText: '保存',
          cancelButtonText: '取消',
          type: 'warning',
          distinguishCancelAndClose: true
        }
      )
      // 用户点击保存
      // 这里可以触发保存操作
      next()
    } catch (action) {
      if (action === 'cancel') {
        // 用户点击取消，阻止跳转
        next(false)
      } else {
        // 用户关闭对话框，也阻止跳转
        next(false)
      }
    }
  } else {
    next()
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  window.removeEventListener('resize', resizeAllCharts);
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
</style>