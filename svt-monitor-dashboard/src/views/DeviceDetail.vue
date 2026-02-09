<!-- 设备详情页面：展示设备信息和数据分析 -->
<template>
  <div class="device-detail">
    <!-- 左侧设备信息模块：显示设备基本信息 -->
    <DeviceInfoModule v-if="deviceId" :device-id="deviceId" @edit-status-change="handleEditStatusChange" />

    <!-- 右侧内容模块：包含点位列表和图表分析 -->
    <div class="right-content">
      <!-- 点位列表：显示设备的各个监测点 -->
      <PointListModule ref="pointListModuleRef" :point-list="pointList" :selected-point-id="selectedPointId"
        @point-selected="selectedPointId = $event" />

      <!-- 图表和趋势分析：展示点位数据的图表 -->
      <ChartsAnalysisModule :point-list="pointList" :selected-point-id="selectedPointId" />
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

const deviceId = computed<string | null>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) {
    return id[0] || null;
  }
  if (typeof id !== 'string' || !id) {
    return null;
  }
  return id;
})

interface PointInfo {
  id: string,
  name: string,
  lastAlarmTime: string,
  alarmType: string,
  alarmValue: string,
  hasAlarm: boolean
}

const pointList = ref<PointInfo[]>([])
const pointListModuleRef = ref<ComponentPublicInstance & PointListModuleType>()
const selectedPointId = ref<string>('')

// 编辑状态跟踪
const isEditing = ref(false)
const hasUnsavedChanges = ref(false)

const analysisForm = ref({
  pointId: '',
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
  if (!deviceId.value) return

  try {
    const res = await getSelectCheckPointIn(deviceId.value)
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
      id: item.pointId,
      name: item.pointName || '未知点位',
      lastAlarmTime: item.warningTime != null && item.warningTime !== '' ? item.warningTime : '无',
      alarmType: typeStrToDisplay(item.warningType),
      alarmValue: item.warningValue != null && Number(item.warningValue) !== 0 ? String(item.warningValue) : '无',
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
  () => route.params.id,
  (newId) => {
    const id = newId ? (Array.isArray(newId) ? newId[0] : newId) : null;
    if (id) {
      deviceTreeStore.setSelectedDeviceId(id);
      initDeviceData();
    }
  },
  { immediate: true }
)

onMounted(() => {
  deviceTreeStore.setSelectedDeviceId(deviceId.value);
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
  gap: 15px;
  box-sizing: border-box;
  color: white;
  min-width: 0;

  .right-content {
    width: 50vw !important;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 15px;
    height: 100%;
    min-width: 0;
  }
}
</style>