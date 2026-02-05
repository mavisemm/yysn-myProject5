<!-- 设备详情页面：展示设备信息和数据分析 -->
<template>
  <div class="device-detail">
    <!-- 左侧设备信息模块：显示设备基本信息 -->
    <DeviceInfoModule v-if="deviceId" :device-id="deviceId" />

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
import { useRoute } from 'vue-router'
import { watch, ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useDeviceTreeStore } from '@/stores/deviceTree'
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

/**
 * 监听设备ID变化并通知设备树选中相应设备
 */
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId) {
      const id = Array.isArray(newId) ? newId[0] : newId;
      if (id) {
        deviceTreeStore.setSelectedDeviceId(id);
        initDeviceData();
      }
    }
  }
)

/**
 * 监听设备树数据变化，当数据加载完成后重新初始化点位列表
 */
watch(
  () => deviceTreeStore.deviceTreeData,
  (newData) => {
    if (newData && newData.length > 0 && deviceId.value) {
      initDeviceData();
    }
  },
  { deep: true }
)

/**
 * 组件挂载时触发设备选中和数据初始化
 */
onMounted(() => {
  deviceTreeStore.setSelectedDeviceId(deviceId.value);
  
  // 如果设备树数据已加载，立即初始化；否则等待数据加载完成
  if (deviceTreeStore.deviceTreeData && deviceTreeStore.deviceTreeData.length > 0) {
    initDeviceData()
  }

  setupPageResizeObserver();

  window.addEventListener('resize', resizeAllCharts);
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

const initDeviceData = () => {
  // 如果设备树数据还未加载，等待加载完成
  if (!deviceTreeStore.deviceTreeData || deviceTreeStore.deviceTreeData.length === 0) {
    return
  }

  const findDeviceInTree = (nodes: DeviceNode[]) => {
    if (!deviceId.value) return;
    for (const node of nodes) {
      if (deviceId.value && node.id === deviceId.value && node.type === 'device') {
        // 设备信息现在由 DeviceInfoModule 组件通过 API 获取

        if (node.children && node.children.length > 0) {
          // 使用设备树中的点位数据
          // 注意：point.id 对应设备树的 pointId，point.name 对应设备树的 pointName
          // (通过 transformDeviceTreeData 函数转换：point.pointId -> point.id, point.pointName -> point.name)
          pointList.value = node.children
            .filter((point: DeviceNode) => point.type === 'point') // 确保只取点位类型的数据
            .map((point: DeviceNode) => ({
              id: String(point.id || ''), // 来自设备树的 pointId
              name: String(point.name || '未知点位'), // 来自设备树的 pointName
              lastAlarmTime: String(point.lastAlarmTime || ''),
              alarmType: String(point.alarmType || ''),
              alarmValue: String(point.alarmValue || ''),
              hasAlarm: Boolean(point.status === 'alarm' || point.status === 'warning')
            }))
        } else {
          // 如果没有点位数据，设置为空数组
          pointList.value = []
        }
        return
      }
      if (node.children && node.children.length > 0) {
        findDeviceInTree(node.children)
      }
    }
  }

  findDeviceInTree(deviceTreeStore.deviceTreeData)

  nextTick(async () => {
    await nextTick();
    const pointListModule = pointListModuleRef.value
    if (pointList.value.length > 0) {
      // 如果当前没有选中点位，或者选中的点位不在列表中，选择第一个点位
      if (!selectedPointId.value || !pointList.value.find(p => p.id === selectedPointId.value)) {
        const firstPoint = pointList.value[0]
        selectedPointId.value = firstPoint ? firstPoint.id : ''
      }
      
      // 设置点位列表模块的当前行
      if (pointListModule && typeof pointListModule.setCurrentRow === 'function') {
        const currentIndex = pointList.value.findIndex(p => p.id === selectedPointId.value)
        if (currentIndex >= 0) {
          pointListModule.setCurrentRow(currentIndex)
        } else {
          pointListModule.setCurrentRow(0)
        }
      }
    } else {
      // 如果没有点位数据，清空选中点位
      selectedPointId.value = ''
    }
  })
}


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