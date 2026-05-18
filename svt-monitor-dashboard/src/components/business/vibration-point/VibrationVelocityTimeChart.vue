<template>
  <div class="card-item time-card" :class="{ 'time-card--inline-light': inlineChartTheme === 'light' }">
    <div class="card-header">
      <div class="card-header-leading">
        <div class="card-title app-section-title">{{ chartTitle }}</div>
        <el-select v-model="timeAxis" class="vibration-axis-select" size="small" teleported :show-arrow="false"
          popper-class="vibration-axis-select-dropdown vibration-axis-select-dropdown--inline">
          <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>
      <div class="card-header-spacer" aria-hidden="true" />
      <div class="card-header-actions">
        <el-button class="time-fullscreen-btn" text size="large" @click="openTimeFullscreen">
          全屏显示
          <el-icon>
            <FullScreen />
          </el-icon>
        </el-button>
      </div>
    </div>
    <div class="chart-container">
      <CommonEcharts ref="timeChartRef" :option="timeOption" :enable-data-zoom="false" :not-merge="true"
        enable-fullscreen :fullscreen-title="fullscreenTitle" fullscreen-background="#142060"
        @chart-ready="onTimeChartReady" @fullscreen-chart-ready="onTimeFullscreenChartReady"
        @fullscreen-closed="onTimeFullscreenClosed">
        <template #fullscreen-body-top>
          <div class="time-fullscreen-top">
            <el-select v-model="timeAxis" class="vibration-axis-select" size="small" teleported :show-arrow="false"
              popper-class="vibration-axis-select-dropdown vibration-axis-select-dropdown--fullscreen">
              <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </div>
        </template>
      </CommonEcharts>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { CommonEcharts } from '@/components/common/chart'
import { getVibrationTimeDomainData, type VibrationAxis } from '@/api/modules/device'
import { FullScreen } from '@element-plus/icons-vue'
import { enableMouseWheelZoom } from '@/utils/chart'

const props = withDefaults(
  defineProps<{
    receiverId: string
    pointDeviceId: string
    alarmTime?: number
    chartTitle?: string
    fullscreenTitle?: string
    /** 小图坐标轴配色：light 适合白底卡片内嵌；全屏仍为深色底白字 */
    inlineChartTheme?: 'dark' | 'light'
  }>(),
  {
    alarmTime: 0,
    chartTitle: '振动速度时域图',
    fullscreenTitle: '振动速度时域图',
    inlineChartTheme: 'dark',
  },
)

const emit = defineEmits<{
  (e: 'time-data-state', payload: { hasData: boolean }): void
}>()

const timeChartRef = ref<InstanceType<typeof CommonEcharts>>()
const timeFullscreenUiActive = ref(false)

const openTimeFullscreen = () => {
  ; (timeChartRef.value as any)?.openFullscreen?.()
}

const timeDomainData = ref<number[]>([])
const totalTime = ref<number>(0)

const axisOptions: { label: string; value: VibrationAxis }[] = [
  { label: 'X轴(A)', value: 'X' },
  { label: 'Y轴(H)', value: 'Y' },
  { label: 'Z轴(V)', value: 'Z' },
]

const timeAxis = ref<VibrationAxis>('X')

const chartAxisColor = computed(() => {
  if (timeFullscreenUiActive.value) return '#fff'
  return props.inlineChartTheme === 'light' ? '#303133' : '#fff'
})

const chartSplitLineColor = computed(() => {
  if (timeFullscreenUiActive.value) return 'rgba(255,255,255,0.1)'
  return props.inlineChartTheme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)'
})

const formatYAxisTick = (v: number | string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(2)))
}

const timeOption = computed<EChartsOption>(() => {
  if (timeDomainData.value.length === 0) return {}

  const dataPoints = timeDomainData.value.length
  const step = dataPoints > 1 ? totalTime.value / (dataPoints - 1) : 0

  const chartData = timeDomainData.value.map((value, index) => [
    dataPoints > 1 ? index * step : 0,
    value,
  ])

  const c = chartAxisColor.value
  const s = chartSplitLineColor.value

  return {
    tooltip: {
      trigger: 'axis',
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: 'rgba(50, 50, 50, 0.9)',
      textStyle: { color: '#fff' },
    },
    grid: { top: 30, left: 40, right: 50, bottom: 35, containLabel: true },
    xAxis: {
      type: 'value',
      name: 's',
      min: 0,
      max: totalTime.value,
      nameTextStyle: { color: c },
      axisLabel: {
        color: c,
        margin: 8,
        showMaxLabel: true,
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: c } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'mm/s',
      nameTextStyle: { color: c },
      axisLabel: {
        color: c,
        formatter: formatYAxisTick,
      },
      axisLine: { lineStyle: { color: c } },
      splitLine: { lineStyle: { color: s } },
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
      {
        type: 'slider',
        xAxisIndex: [0],
        bottom: 10,
        height: 20,
        fillerColor: 'rgba(126, 203, 161, 0.3)',
        borderColor: 'rgba(126, 203, 161, 0.5)',
        handleStyle: { color: '#7ecba1' },
        filterMode: 'none',
      },
    ],
    series: [
      {
        type: 'line',
        smooth: false,
        showSymbol: false,
        sampling: 'lttb',
        data: chartData,
        lineStyle: { color: '#7ecba1', width: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(126, 203, 161, 0.8)' },
            { offset: 1, color: 'rgba(126, 203, 161, 0.2)' },
          ]),
        },
      },
    ],
  } as EChartsOption
})

const notifyTimeDataState = () => {
  const hasData = timeDomainData.value.length > 0 && totalTime.value > 0
  emit('time-data-state', { hasData })
}

const loadTimeData = async () => {
  if (!props.pointDeviceId || !props.receiverId) {
    timeDomainData.value = []
    totalTime.value = 0
    notifyTimeDataState()
    return
  }

  try {
    const timeResponse = await getVibrationTimeDomainData(
      props.pointDeviceId,
      props.receiverId,
      timeAxis.value,
      props.alarmTime > 0 ? props.alarmTime : undefined,
    )
    if (timeResponse.rc === 0 && timeResponse.ret) {
      try {
        const raw = (timeResponse.ret as any).timedomaindata
        const timeDomainArray: number[] = Array.isArray(raw)
          ? raw
            .map((v: any) => (typeof v === 'number' ? v : parseFloat(String(v).trim())))
            .filter((n: number) => Number.isFinite(n))
          : String(raw ?? '')
            .split(',')
            .map((s) => parseFloat(s.trim()))
            .filter((n) => Number.isFinite(n))
        if (
          Array.isArray(timeDomainArray) &&
          timeDomainArray.length > 0 &&
          typeof timeResponse.ret.time === 'number' &&
          timeResponse.ret.time > 0
        ) {
          timeDomainData.value = timeDomainArray
          totalTime.value = timeResponse.ret.time
        } else {
          console.warn('时域图数据为空或格式不正确')
          timeDomainData.value = []
          totalTime.value = 0
        }
      } catch (parseError) {
        console.error('解析时域图数据失败:', parseError)
        timeDomainData.value = []
        totalTime.value = 0
      }
    } else {
      console.warn('时域图接口返回错误或无数据:', timeResponse)
      timeDomainData.value = []
      totalTime.value = 0
    }
  } catch (error) {
    console.error('获取振动时域数据失败:', error)
    timeDomainData.value = []
    totalTime.value = 0
  }
  notifyTimeDataState()
}

const onTimeChartReady = (inst: echarts.ECharts) => {
  enableMouseWheelZoom(inst)
}

const onTimeFullscreenChartReady = () => {
  timeFullscreenUiActive.value = true
}

const onTimeFullscreenClosed = () => {
  timeFullscreenUiActive.value = false
}

watch(
  [() => props.receiverId, () => props.pointDeviceId, () => props.alarmTime],
  ([rid, pid]) => {
    if (!rid || !pid) return
    void loadTimeData()
  },
  { immediate: true },
)

watch(timeAxis, () => {
  if (!props.receiverId || !props.pointDeviceId) return
  void loadTimeData()
})
</script>

<style lang="scss" scoped>
.card-item.time-card {
  width: 100%;
  min-height: 0;
}

.card-item.time-card.time-card--inline-light {
  flex: 1;
  min-height: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;

  .card-title {
    color: rgba(0, 0, 0, 0.72);
  }

  :deep(.time-fullscreen-btn) {
    color: rgba(0, 0, 0, 0.78) !important;
  }

  :deep(.time-fullscreen-btn:hover),
  :deep(.time-fullscreen-btn:focus),
  :deep(.time-fullscreen-btn:active) {
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }

  :deep(.time-fullscreen-btn .el-icon) {
    color: rgba(0, 0, 0, 0.78) !important;
  }
}

.card-item {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .card-header {
    display: flex;
    align-items: center;
    padding: 10px 10px 0 20px;
    gap: 0;
    min-height: 40px;

    .card-header-leading {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .card-title {
      color: #fff;
      flex: 0 1 auto;
      min-width: 0;
      line-height: 1.25;
    }

    .card-header-spacer {
      flex: 1 1 0;
      min-width: 0;
    }

    .card-header-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    :deep(.time-fullscreen-btn) {
      color: #fff !important;
      padding: 0 !important;
      gap: 4px;
      font-size: 0.8rem;
    }

    :deep(.time-fullscreen-btn:hover),
    :deep(.time-fullscreen-btn:focus),
    :deep(.time-fullscreen-btn:active) {
      background-color: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }

    :deep(.time-fullscreen-btn .el-icon) {
      color: #fff !important;
      margin-left: 4px;
      font-size: 0.8rem;
    }
  }

  .chart-container {
    flex: 1;
    width: 100%;
    min-height: 0;
    padding: 10px 10px 20px 20px;
    position: relative;
  }
}

/* 振动实时报警弹窗内嵌小图：更紧凑边距 */
.card-item.alarm-vibration-time-chart {
  .card-header {
    padding: 10px 10px 0 10px;
  }

  .chart-container {
    padding: 10px 10px 10px 10px;
  }
}

@media (max-width: 800px) {
  .card-item .chart-container {
    height: 250px;
    min-height: 250px;
  }

  .card-item .chart-container :deep(.common-echarts-wrapper),
  .card-item .chart-container :deep(.common-echarts-inner) {
    height: 100%;
    min-height: 250px;
  }
}
</style>

<style lang="scss">
$vibration-axis-font-size: 12px;

.vibration-axis-select {
  width: 90px;
  vertical-align: middle;
}

.vibration-axis-select .el-select__wrapper {
  font-size: $vibration-axis-font-size;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  min-height: 30px;
  padding: 0 10px;
}

.vibration-axis-select .el-select__placeholder,
.vibration-axis-select .el-select__selected-item {
  color: rgba(255, 255, 255, 0.92);
  font-size: inherit;
}

.vibration-axis-select .el-select__caret {
  color: rgba(255, 255, 255, 0.65);
}

.time-card--inline-light .vibration-axis-select .el-select__wrapper {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.time-card--inline-light .vibration-axis-select .el-select__placeholder,
.time-card--inline-light .vibration-axis-select .el-select__selected-item {
  color: rgba(0, 0, 0, 0.88);
}

.time-card--inline-light .vibration-axis-select .el-select__caret {
  color: rgba(0, 0, 0, 0.45);
}

.time-fullscreen-top {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.vibration-axis-select-dropdown.el-popper {
  font-size: $vibration-axis-font-size;
  z-index: 10000 !important;
}

.vibration-axis-select-dropdown--inline.el-popper {
  background: #f5f5f5 !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
}

.vibration-axis-select-dropdown--inline .el-select-dropdown__item {
  color: #000000e0;
  font-size: $vibration-axis-font-size;
}

.vibration-axis-select-dropdown--inline .el-select-dropdown__item.is-hovering,
.vibration-axis-select-dropdown--inline .el-select-dropdown__item:hover {
  background: rgba(0, 0, 0, 0.06);
}

.vibration-axis-select-dropdown--fullscreen.el-popper {
  background: #1a2a6e !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.vibration-axis-select-dropdown--fullscreen .el-select-dropdown__item {
  color: rgba(255, 255, 255, 0.9);
  font-size: $vibration-axis-font-size;
}

.vibration-axis-select-dropdown--fullscreen .el-select-dropdown__item.is-hovering,
.vibration-axis-select-dropdown--fullscreen .el-select-dropdown__item:hover {
  background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 800px) {
  .common-echarts-fullscreen-modal .el-dialog {
    height: 500px !important;
    max-height: 500px !important;
  }

  .common-echarts-fullscreen-wrap {
    height: 300px !important;
    min-height: 300px !important;
    max-height: 300px !important;
  }

  .common-echarts-fullscreen-inner {
    height: 300px !important;
    min-height: 300px !important;
  }
}
</style>
