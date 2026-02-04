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
      <ChartsAnalysisModule :point-list="pointList" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { watch, ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { List } from '@element-plus/icons-vue'
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
 * 组件挂载时触发设备选中和数据初始化
 */
onMounted(() => {
  deviceTreeStore.setSelectedDeviceId(deviceId.value);
  initDeviceData()

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

const pointList = ref<PointInfo[]>([
  { id: '1', name: '进风口位置', lastAlarmTime: '2025-12-12 10:30:00', alarmType: '温度', alarmValue: '500℃', hasAlarm: true },
  { id: '2', name: '出风口位置', lastAlarmTime: '2025-12-12 09:45:00', alarmType: '振动', alarmValue: '65mm/s', hasAlarm: true },
  { id: '3', name: '变速箱前轴承', lastAlarmTime: '2025-12-11 16:20:00', alarmType: '声音', alarmValue: '600dB', hasAlarm: false },
  { id: '4', name: '变速箱后轴承', lastAlarmTime: '2025-12-11 14:15:00', alarmType: '温度', alarmValue: '180℃', hasAlarm: false },
  { id: '5', name: '电机前端盖', lastAlarmTime: '2025-12-10 12:10:00', alarmType: '振动', alarmValue: '45mm/s', hasAlarm: false },
])

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
  const findDeviceInTree = (nodes: DeviceNode[]) => {
    if (!deviceId.value) return;
    for (const node of nodes) {
      if (deviceId.value && node.id === deviceId.value && node.type === 'device') {
        // 设备信息现在由 DeviceInfoModule 组件通过 API 获取

        if (node.children && node.children.length > 0) {
          pointList.value = node.children.map((point: DeviceNode, index: number) => ({
            id: String(point.id || ''),
            name: String(point.name || '未知点位'),
            lastAlarmTime: String(point.lastAlarmTime || '2025-12-12 10:30:00'),
            alarmType: String(point.alarmType || getRandomAlarmType()),
            alarmValue: String(point.alarmValue || getRandomAlarmValue(String(point.alarmType || getRandomAlarmType()))),
            hasAlarm: Boolean(point.status === 'alarm' || point.status === 'warning')
          }))
        } else {
          pointList.value = Array.from({ length: 10 }, (_, i) => ({
            id: String(i + 1),
            name: `点位${i + 1}`,
            lastAlarmTime: '2025-12-12 10:30:00',
            alarmType: getRandomAlarmType(),
            alarmValue: getRandomAlarmValue(getRandomAlarmType()),
            hasAlarm: Boolean(Math.random() > 0.7)
          }))
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
    if (pointList.value.length > 0 && pointListModule && typeof pointListModule.setCurrentRow === 'function') {
      pointListModule.setCurrentRow(0)
      const firstPoint = pointList.value[0]
      selectedPointId.value = firstPoint ? firstPoint.id : ''
    }
  })

}

const getRandomAlarmType = (): string => {
  const types = ['温度', '振动', '声音']
  const index = Math.floor(Math.random() * types.length)
  return types[index] || '温度'
}

const getRandomAlarmValue = (type?: string): string => {
  switch (type) {
    case '温度':
      return String(`${Math.floor(Math.random() * 100) + 50}℃`)
    case '振动':
      return String(`${(Math.random() * 30).toFixed(1)}mm/s`)
    case '声音':
      return String(`${Math.floor(Math.random() * 20) + 60}dB`)
    default:
      return 'N/A'
  }
}



const getAlarmTypeTag = (type: string) => {
  switch (type) {
    case '温度':
      return 'danger'
    case '振动':
      return 'warning'
    case '声音':
      return 'primary'
    default:
      return 'info'
  }
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

onMounted(() => {
  deviceTreeStore.setSelectedDeviceId(deviceId.value);
  initDeviceData()

  setupPageResizeObserver();

  window.addEventListener('resize', resizeAllCharts);
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