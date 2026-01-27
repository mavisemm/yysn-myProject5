<template>
  <div class="device-detail">
    <!-- 左侧设备信息模块 (25vw) -->
    <DeviceInfoModule :device-info="deviceInfo" @update:device-info="handleUpdateDeviceInfo" />

    <!-- 右侧内容模块 (75vw) -->
    <div class="right-content">
      <!-- 点位列表 (40%高度) -->
      <PointListModule ref="pointListModuleRef" :point-list="pointList" :selected-point-id="selectedPointId"
        @point-selected="selectedPointId = $event" />

      <!-- 图表和趋势分析 (60%高度) -->
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

// 引入点位列表模块类型
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

// 处理设备信息更新
const handleUpdateDeviceInfo = (updatedInfo: DeviceInfo) => {
  Object.assign(deviceInfo.value, updatedInfo);
  ElMessage.success('设备信息已更新');
};

// 监听设备ID变化并通知设备树选中相应设备
watch(
  () => route.params.id,
  (newId, oldId) => {
    // 更新状态管理中的选中设备ID
    if (newId) {
      const id = Array.isArray(newId) ? newId[0] : newId;
      if (id) {
        deviceTreeStore.setSelectedDeviceId(id);
        // 当设备ID变化时，重新初始化设备数据
        initDeviceData();
      }
    }
  }
)

// 组件挂载时也触发一次设备选中
onMounted(() => {
  deviceTreeStore.setSelectedDeviceId(deviceId.value);
  // 初始化数据
  initDeviceData()
})

// 定义设备信息类型
interface DeviceInfo {
  deviceName: string,
  model: string,
  manufacturer: string,
  installationLocation: string,
  operatingSpeed: string,
  designFlow: string,
  pressure: string,
  lastAlarmTime: string
}

// 设备信息
const deviceInfo = ref<DeviceInfo>({
  deviceName: '设备a',
  model: 'PUMP-500',
  manufacturer: '厂家A',
  installationLocation: '车间A',
  operatingSpeed: '1500',
  designFlow: '50',
  pressure: '1.2',
  lastAlarmTime: '2025-12-12 10:30:00'
})

// 编辑状态
const isEditing = ref(false)
const editForm = ref<DeviceInfo>({ ...deviceInfo.value })

// 健康度相关
const healthType = ref('声音')
const currentHealthScore = ref(85)
const gaugeRef = ref<HTMLDivElement>()
let gaugeChart: echarts.ECharts | null = null

// 设备图片
const deviceImage = ref('https://cube.elemecdn.com/6/94/4d395b316ae0a58e9e9e97b18bd89.jpg')

// 定义点位信息类型
interface PointInfo {
  id: string,
  name: string,
  lastAlarmTime: string,
  alarmType: string,
  alarmValue: string,
  hasAlarm: boolean
}

// 点位列表
const pointList = ref<PointInfo[]>([
  { id: '1', name: '进风口位置', lastAlarmTime: '2025-12-12 10:30:00', alarmType: '温度', alarmValue: '500℃', hasAlarm: true },
  { id: '2', name: '出风口位置', lastAlarmTime: '2025-12-12 09:45:00', alarmType: '振动', alarmValue: '65mm/s', hasAlarm: true },
  { id: '3', name: '变速箱前轴承', lastAlarmTime: '2025-12-11 16:20:00', alarmType: '声音', alarmValue: '600dB', hasAlarm: false },
  { id: '4', name: '变速箱后轴承', lastAlarmTime: '2025-12-11 14:15:00', alarmType: '温度', alarmValue: '180℃', hasAlarm: false },
  { id: '5', name: '电机前端盖', lastAlarmTime: '2025-12-10 12:10:00', alarmType: '振动', alarmValue: '45mm/s', hasAlarm: false },
])

// 点位列表模块引用
const pointListModuleRef = ref<ComponentPublicInstance & PointListModuleType>()

// 选中的点位ID
const selectedPointId = ref<string>('')

// 图表相关
const tempChartRef = ref<HTMLDivElement>()
const soundChartRef = ref<HTMLDivElement>()
const vibChartRef = ref<HTMLDivElement>()

let tempChart: echarts.ECharts | null = null
let soundChart: echarts.ECharts | null = null
let vibChart: echarts.ECharts | null = null

// 趋势分析相关
const analysisForm = ref({
  pointId: '',
  days: 7,
  dateRange: [] as [Date, Date] | []
})

// 定义分析结果类型
interface AnalysisResult {
  deviation: string,
  pointName: string
}

const analysisResult = ref<AnalysisResult>({
  deviation: '0.25',
  pointName: '进风口位置'
})

// 初始化设备数据
const initDeviceData = () => {
  // 查找当前设备信息和点位数据
  const findDeviceInTree = (nodes: any[]) => {
    if (!deviceId.value) return;
    for (const node of nodes) {
      if (node.id === deviceId.value && node.type === 'device') {
        deviceInfo.value.deviceName = node.name || '未知设备'
        deviceInfo.value.installationLocation = node.workshopName || '未知位置'

        // 根据设备的子节点（点位）更新点位列表
        if (node.children && node.children.length > 0) {
          pointList.value = node.children.map((point: any, index: number) => ({
            id: String(point.id || ''),
            name: String(point.name || '未知点位'),
            lastAlarmTime: String(point.lastAlarmTime || '2025-12-12 10:30:00'),
            alarmType: String(point.alarmType || getRandomAlarmType()),
            alarmValue: String(point.alarmValue || getRandomAlarmValue(String(point.alarmType || getRandomAlarmType()))),
            hasAlarm: Boolean(point.status === 'alarm' || point.status === 'warning')
          }))
        } else {
          // 如果设备没有关联的点位数据，使用默认的10个点位
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

  // 初始化图表
  nextTick(() => {
    initGaugeChart()
    // 确保图表容器存在后再初始化图表
    nextTick(() => {
      initTempChart()
      initSoundChart()
      initVibChart()
    })
  })

  // 数据加载完成后，自动选中第一行
  nextTick(async () => {
    await nextTick(); // 确保DOM完全更新
    const pointListModule = pointListModuleRef.value
    if (pointList.value.length > 0 && pointListModule && typeof pointListModule.setCurrentRow === 'function') {
      pointListModule.setCurrentRow(0)
      selectedPointId.value = pointList.value[0].id
    }
  })

}

// 辅助函数：随机获取报警类型
const getRandomAlarmType = (): string => {
  const types = ['温度', '振动', '声音']
  const index = Math.floor(Math.random() * types.length)
  return types[index] || '温度'
}

// 辅助函数：根据报警类型生成随机报警值
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

// 切换编辑状态
const toggleEdit = () => {
  if (isEditing.value) {
    // 保存编辑
    Object.assign(deviceInfo.value, editForm.value)
    ElMessage.success('设备信息已更新')
  } else {
    // 进入编辑模式
    Object.assign(editForm.value, deviceInfo.value)
  }
  isEditing.value = !isEditing.value
}

// 切换健康度类型
const toggleHealthType = () => {
  healthType.value = healthType.value === '声音' ? '震动' : '声音'
  // 更新分数，模拟不同健康度的分数
  currentHealthScore.value = healthType.value === '声音' ? 85 : 78
  initGaugeChart()
}

// 初始化仪表盘
const initGaugeChart = () => {
  if (!gaugeRef.value) return

  if (gaugeChart) {
    gaugeChart.dispose()
  }

  gaugeChart = echarts.init(gaugeRef.value)

  const score = currentHealthScore.value

  let healthColor = ''
  if (score >= 80) {
    healthColor = '#2E7D32' // 深绿色
  } else if (score >= 60) {
    healthColor = '#8bf58fff' // 淡绿色
  } else if (score >= 40) {
    healthColor = '#FFC107' // 黄色
  } else if (score >= 20) {
    healthColor = '#FF9800' // 橙色
  } else {
    healthColor = '#FF5722' // 红色
  }

  const option = {
    series: [
      {
        type: 'gauge',
        center: ['50%', '60%'],
        radius: '60%',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 5,
        progress: {
          show: false,
          width: 12,
          roundCap: true,
        },
        pointer: {
          show: true,
          length: '80%',
          width: 6,
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.2, '#FF5722'], // 0-20 红色
              [0.4, '#FF9800'], // 20-40 橙色
              [0.6, '#FFC107'], // 40-60 黄色
              [0.8, '#8bf58fff'], // 60-80 淡绿色
              [1, '#2E7D32'] // 80-100 深绿色
            ]
          }
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        anchor: {
          show: true,
          size: 10,
          itemStyle: {
            color: '#fff'
          }
        },
        title: {
          show: false
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '0%'],
          fontSize: 20,
          fontWeight: 'bolder',
          formatter: '{value}',
          color: healthColor,
          fontFamily: 'Arial',
          textBorderColor: 'rgba(0,0,0,0.3)',
          textBorderWidth: 1
        },
        data: [
          {
            value: score,
            name: '设备健康度'
          }
        ]
      }
    ]
  };

  gaugeChart.setOption(option)
}

// 初始化温度图表
const initTempChart = () => {
  if (!tempChartRef.value) return

  if (tempChart) {
    tempChart.dispose()
  }

  tempChart = echarts.init(tempChartRef.value)

  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const tempData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 50) + 30) // 30-80℃

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: {
        fontSize: 10,
        color: '#fff'
      },
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisTick: {
        lineStyle: {
          color: '#fff'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '℃',
      axisLabel: {
        fontSize: 10,
        color: '#fff'
      },
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      }
    },
    series: [{
      data: tempData,
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#FF6384'
      },
      lineStyle: {
        color: '#FF6384',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(255, 99, 132, 0.5)' // color with opacity
          }, {
            offset: 1, color: 'rgba(255, 99, 132, 0.1)' // color with opacity
          }]
        },
        opacity: 0.3
      }
    }],
    backgroundColor: 'transparent'
  }

  tempChart.setOption(option)
}

// 初始化响度图表
const initSoundChart = () => {
  if (!soundChartRef.value) return

  if (soundChart) {
    soundChart.dispose()
  }

  soundChart = echarts.init(soundChartRef.value)

  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const soundData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 30) + 50) // 50-80 dB

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: {
        fontSize: 10,
        color: '#fff'
      },
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisTick: {
        lineStyle: {
          color: '#fff'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'dB',
      axisLabel: {
        fontSize: 10,
        color: '#fff'
      },
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      }
    },
    series: [{
      data: soundData,
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#36A2EB'
      },
      lineStyle: {
        color: '#36A2EB',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(54, 162, 235, 0.5)' // color with opacity
          }, {
            offset: 1, color: 'rgba(54, 162, 235, 0.1)' // color with opacity
          }]
        },
        opacity: 0.3
      }
    }],
    backgroundColor: 'transparent'
  }

  soundChart.setOption(option)
}

// 初始化振动图表
const initVibChart = () => {
  if (!vibChartRef.value) return

  if (vibChart) {
    vibChart.dispose()
  }

  vibChart = echarts.init(vibChartRef.value)

  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const vibData = Array.from({ length: 24 }, () => (Math.random() * 20).toFixed(1)) // 0-20 mm/s

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: {
        fontSize: 10,
        color: '#fff'
      },
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisTick: {
        lineStyle: {
          color: '#fff'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'mm/s',
      axisLabel: {
        fontSize: 10,
        color: '#fff'
      },
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      }
    },
    series: [{
      data: vibData,
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#FFCE56'
      },
      lineStyle: {
        color: '#FFCE56',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(255, 206, 86, 0.5)' // color with opacity
          }, {
            offset: 1, color: 'rgba(255, 206, 86, 0.1)' // color with opacity
          }]
        },
        opacity: 0.3
      }
    }],
    backgroundColor: 'transparent'
  }

  vibChart.setOption(option)
}

// 获取预警类型标签
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

// 分析趋势
const analyzeTrend = () => {
  // 模拟分析结果
  analysisResult.value.deviation = (Math.random() * 0.5).toFixed(2)
  const selectedPoint = pointList.value.find(p => p.id === analysisForm.value.pointId)
  analysisResult.value.pointName = selectedPoint ? String(selectedPoint.name) : '未知点位'

  ElMessage.success('趋势分析完成')
}

// 窗口大小改变时，重新调整图表大小
window.addEventListener('resize', () => {
  if (gaugeChart) gaugeChart.resize()
  if (tempChart) tempChart.resize()
  if (soundChart) soundChart.resize()
  if (vibChart) vibChart.resize()
})

// 组件卸载时清理资源
onUnmounted(() => {
  if (gaugeChart) gaugeChart.dispose()
  if (tempChart) tempChart.dispose()
  if (soundChart) soundChart.dispose()
  if (vibChart) vibChart.dispose()
})
</script>

<style lang="scss" scoped>
.device-detail {
  display: flex;
  height: 100%;
  gap: 15px;
  box-sizing: border-box;
  color: white;

  .right-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 15px;
    height: 100%;
  }
}
</style>