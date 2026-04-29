<template>
  <div class="charts-analysis-module">
    <div ref="chartGridRef" class="charts-grid">
      <div class="chart-item">
        <div class="chart-header">
          <span class="chart-title app-section-title">烈度随时间变化</span>
          <span class="chart-unit special-font-color vib-trend-unit">（单位：mm/s）</span>
        </div>
        <div class="chart">
          <CommonEcharts :option="vibOption" :enable-data-zoom="false" :not-merge="true" :tooltip-follow-mouse="true"
            :linkage-group="normalLinkageGroup" :enable-linkage-zoom="true" :enable-wheel-zoom="true"
            :auto-y-axis-on-zoom="true" />
        </div>
      </div>

      <div class="chart-item">
        <div class="chart-header">
          <span class="chart-title app-section-title">偏差值随时间变化</span>
        </div>
        <div class="chart">
          <CommonEcharts :option="soundOption" :enable-data-zoom="false" :not-merge="true" :tooltip-follow-mouse="true"
            :linkage-group="normalLinkageGroup" :enable-linkage-zoom="true" :enable-wheel-zoom="true"
            :auto-y-axis-on-zoom="true" />
        </div>
      </div>

      <div class="chart-item chart-item--wide">
        <div class="chart-header">
          <span class="chart-title app-section-title">温度随时间变化</span>
          <div class="chart-header-right">
            <span class="realtime-temp-inline">
              实时温度：<span class="realtime-temp-value special-font-color">{{ realtimeTempValueText }}</span>
            </span>
            <span class="chart-unit special-font-color">（单位：℃）</span>
            <el-button class="temp-fullscreen-btn" text size="small" :disabled="!hasAnyChartData"
              @click="openDeviceChartsFullscreen">
              全屏显示
              <el-icon>
                <FullScreen />
              </el-icon>
            </el-button>
          </div>
        </div>
        <div class="chart">
          <CommonEcharts :option="tempOption" :enable-data-zoom="false" :not-merge="true" :tooltip-follow-mouse="true"
            :linkage-group="normalLinkageGroup" :enable-linkage-zoom="true" :enable-wheel-zoom="true"
            :auto-y-axis-on-zoom="true" />
        </div>
      </div>
    </div>

    <el-dialog v-model="deviceChartsFullscreenVisible" title="随时间变化曲线" fullscreen destroy-on-close append-to-body
      :modal-append-to-body="true" align-center class="device-detail-charts-fullscreen-dialog"
      modal-class="common-echarts-fullscreen-modal" @opened="onDeviceChartsFullscreenOpened"
      @closed="onDeviceChartsFullscreenClosed">
      <div class="device-detail-charts-fullscreen-content">
        <div class="device-detail-charts-fullscreen-toolbar" @mousedown.stop @wheel.stop>
          <el-checkbox v-model="fullscreenChartVisible.vib">烈度随时间变化</el-checkbox>
          <el-checkbox v-model="fullscreenChartVisible.sound">偏差值随时间变化</el-checkbox>
          <el-checkbox v-model="fullscreenChartVisible.temp">温度随时间变化</el-checkbox>
        </div>

        <div class="device-detail-charts-fullscreen-stack">
          <template v-if="hasAnyFullscreenChartSelected">
            <div v-if="fullscreenChartVisible.vib" class="device-detail-chart-fs-pane">
              <div class="chart-header">
                <span class="chart-title app-section-title">烈度随时间变化</span>
                <span class="chart-unit special-font-color vib-trend-unit">（单位：mm/s）</span>
              </div>
              <div class="chart-host">
                <CommonEcharts ref="vibFullscreenChartRef" :option="vibOption" :enable-data-zoom="false"
                  :not-merge="true" :tooltip-follow-mouse="true" :linkage-group="fullscreenLinkageGroup"
                  :enable-linkage-zoom="true" :enable-wheel-zoom="true" :auto-y-axis-on-zoom="true" />
              </div>
            </div>

            <div v-if="fullscreenChartVisible.sound" class="device-detail-chart-fs-pane">
              <div class="chart-header">
                <span class="chart-title app-section-title">偏差值随时间变化</span>
              </div>
              <div class="chart-host">
                <CommonEcharts ref="soundFullscreenChartRef" :option="soundOption" :enable-data-zoom="false"
                  :not-merge="true" :tooltip-follow-mouse="true" :linkage-group="fullscreenLinkageGroup"
                  :enable-linkage-zoom="true" :enable-wheel-zoom="true" :auto-y-axis-on-zoom="true" />
              </div>
            </div>

            <div v-if="fullscreenChartVisible.temp" class="device-detail-chart-fs-pane">
              <div class="chart-header">
                <span class="chart-title app-section-title">温度随时间变化</span>
                <div class="chart-header-right">
                  <span class="realtime-temp-inline">
                    实时温度：<span class="special-font-color">{{ realtimeTempValueText }}</span>
                  </span>
                  <span class="chart-unit special-font-color">（单位：℃）</span>
                </div>
              </div>
              <div class="chart-host">
                <CommonEcharts ref="tempFullscreenChartRef" :option="tempOption" :enable-data-zoom="false"
                  :not-merge="true" :tooltip-follow-mouse="true" :linkage-group="fullscreenLinkageGroup"
                  :enable-linkage-zoom="true" :enable-wheel-zoom="true" :auto-y-axis-on-zoom="true" />
              </div>
            </div>
          </template>

          <div v-else class="device-detail-charts-empty">
            请至少选择一个图表
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { ElButton, ElDialog, ElCheckbox, ElIcon } from 'element-plus'
import { FullScreen } from '@element-plus/icons-vue'
import type { Ref } from 'vue'
import {
  getTemperatureRealTime,
  getTemperatureTrend,
  getVibrationTrend,
  getSoundTrend,
} from '@/api/modules/hardware'
import { CommonEcharts } from '@/components/common/chart'
import type { EChartsOption } from 'echarts'

interface PointInfo {
  id: string
  name: string
  lastAlarmTime: string
  alarmType: string
  alarmValue: string
  hasAlarm: boolean
}

interface AnalysisResult {
  deviation: string
  pointName: string
}

export type DateRange = [string, string] | null

const props = defineProps<{
  pointList: PointInfo[]
  selectedPointId?: string
}>()

interface ChartDataPoint {
  timeLabels: string[]
  values: number[]
  yMin?: number
  yMax?: number
}
const tempChartData = ref<ChartDataPoint | null>(null)
const vibChartData = ref<ChartDataPoint | null>(null)
const soundChartData = ref<ChartDataPoint | null>(null)

const realtimeTempValue = ref<number | null>(null)
const realtimeTempReqSeq = ref(0)
const lastRealtimeReceiverId = ref<string>('')

const realtimeTempValueText = computed(() => {
  if (realtimeTempValue.value == null) return '—'
  const num = Number(realtimeTempValue.value)
  if (Number.isNaN(num)) return '—'
  // 直接使用接口返回值，不再对小数点后位数做截断/四舍五入
  return String(num)
})

const chartAxisColor = computed(() => '#fff')
const chartSplitLineColor = computed(() => 'rgba(150,150,150, 0.2)')
const TEMP_COLOR = '#ff4d4f'
const VIB_COLOR = '#1890ff'
const SOUND_COLOR = '#fadb14'

// 全屏弹窗里/页面上的图表同时存在于 DOM 时，如果使用同一个 linkage-group，
// ECharts 会把同组图表联动 tooltip（你看到的“3个图却显示5/4个 tooltip”就是这个原因）。
const normalLinkageGroup = 'device-detail-charts-normal'
const fullscreenLinkageGroup = 'device-detail-charts-fullscreen'

const deviceChartsFullscreenVisible = ref(false)
const fullscreenChartVisible = ref({
  vib: true,
  sound: true,
  temp: true,
})

const FULLSCREEN_DATAZOOM_SLIDER_HEIGHT_PX = 20 // 如需更大手柄/刻度，可改成 50
const fullscreenDataZoomSliderHeight = computed(() => {
  // 全屏时 slider 高度固定，避免随容器比例变化导致图表区域被挤压
  return deviceChartsFullscreenVisible.value ? FULLSCREEN_DATAZOOM_SLIDER_HEIGHT_PX : '10%'
})

const isDeviceChartsFullscreen = computed(() => deviceChartsFullscreenVisible.value)
const fullscreenGridTop = computed(() => (isDeviceChartsFullscreen.value ? 30 : '10%'))
const fullscreenGridBottom = computed(() => (isDeviceChartsFullscreen.value ? 35 : '15%'))
const fullscreenDataZoomBottom = computed(() => (isDeviceChartsFullscreen.value ? 10 : '5%'))

const hasAnyChartData = computed(() => {
  const vibLen = vibChartData.value?.values?.length ?? 0
  const soundLen = soundChartData.value?.values?.length ?? 0
  const tempLen = tempChartData.value?.values?.length ?? 0
  return vibLen > 0 || soundLen > 0 || tempLen > 0
})

const hasAnyFullscreenChartSelected = computed(
  () =>
    fullscreenChartVisible.value.vib
    || fullscreenChartVisible.value.sound
    || fullscreenChartVisible.value.temp,
)

const openDeviceChartsFullscreen = () => {
  fullscreenChartVisible.value = { vib: true, sound: true, temp: true }
  deviceChartsFullscreenVisible.value = true
}

watch(
  () => fullscreenChartVisible.value,
  async () => {
    if (!deviceChartsFullscreenVisible.value) return
    await nextTick()
    resizeVisibleFullscreenCharts()
  },
  { deep: true },
)

const vibFullscreenChartRef = ref<InstanceType<typeof CommonEcharts> | null>(null)
const soundFullscreenChartRef = ref<InstanceType<typeof CommonEcharts> | null>(null)
const tempFullscreenChartRef = ref<InstanceType<typeof CommonEcharts> | null>(null)

const resizeVisibleFullscreenCharts = () => {
  // 防止弹窗打开瞬间容器高度尚未稳定，导致 ECharts 画布高度计算不正确（顶部被裁切）
  requestAnimationFrame(() => {
    try {
      if (fullscreenChartVisible.value.vib) {
        ; (vibFullscreenChartRef.value as any)?.chartInstance?.resize?.()
      }
      if (fullscreenChartVisible.value.sound) {
        ; (soundFullscreenChartRef.value as any)?.chartInstance?.resize?.()
      }
      if (fullscreenChartVisible.value.temp) {
        ; (tempFullscreenChartRef.value as any)?.chartInstance?.resize?.()
      }
    } catch {
      // ignore
    }
  })
}

const onDeviceChartsFullscreenOpened = async () => {
  await nextTick()
  resizeVisibleFullscreenCharts()
  // 再补一次，给字体/布局收敛留余量
  setTimeout(resizeVisibleFullscreenCharts, 50)
}

const onDeviceChartsFullscreenClosed = () => {
  // nothing
}

// y 轴刻度最多保留小数点后两位（同时去掉无意义的尾随 0）
const formatYAxisTick = (v: number | string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(2)))
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => `${i}`)

const activeReceiverId = computed(() => props.selectedPointId || props.pointList?.[0]?.id || '')

const loadTemperatureRealTime = async (receiverId: string) => {
  if (!receiverId) {
    realtimeTempValue.value = null
    return
  }

  const seq = ++realtimeTempReqSeq.value
  try {
    const res = await getTemperatureRealTime({ receiverId })
    if (seq !== realtimeTempReqSeq.value) return

    if (res?.rc === 0) {
      const raw: any = res.ret
      const value = typeof raw === 'number' ? raw : Number(raw?.temperature)
      realtimeTempValue.value = Number.isFinite(value) ? value : null
    } else {
      realtimeTempValue.value = null
    }
  } catch (e) {
    if (seq !== realtimeTempReqSeq.value) return
    realtimeTempValue.value = null
  }
}

const tempOption = computed<EChartsOption>(() => {
  const c = chartAxisColor.value
  const s = chartSplitLineColor.value
  const d = tempChartData.value
  const timeLabels = d?.timeLabels ?? []
  const values = d?.values ?? []
  const yMin = d?.yMin
  const yMax = d?.yMax
  return {
    tooltip: {
      trigger: 'axis',
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50,50,50,0.8)',
      borderColor: 'rgba(50,50,50,0.8)',
      textStyle: { color: '#fff' },
    },
    grid: {
      left: '3%',
      right: '6%',
      bottom: fullscreenGridBottom.value,
      top: fullscreenGridTop.value,
      containLabel: true,
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
      {
        type: 'slider',
        xAxisIndex: [0],
        bottom: fullscreenDataZoomBottom.value,
        height: fullscreenDataZoomSliderHeight.value,
        fillerColor: 'rgba(255, 77, 79, 0.3)',
        borderColor: 'rgba(255, 77, 79, 0.5)',
        handleStyle: { color: TEMP_COLOR },
        filterMode: 'none',
      },
    ],
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: {
        fontSize: 10,
        color: c,
        margin: 8,
        showMaxLabel: true,
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: c }, onZero: false },
      axisTick: { lineStyle: { color: c }, alignWithLabel: true },
    },
    yAxis: {
      type: 'value',
      scale: true,
      ...(yMin != null && yMax != null
        ? { min: yMin, max: yMax }
        : { min: 'dataMin', max: 'dataMax' }),
      axisLabel: { fontSize: 10, color: c, formatter: formatYAxisTick },
      axisLine: { lineStyle: { color: c } },
      axisTick: { lineStyle: { color: c } },
      splitLine: { lineStyle: { color: s } },
      splitNumber: 4,
    },
    series: values.length
      ? [
        {
          data: values,
          type: 'line',
          smooth: true,
          symbolSize: 1,
          itemStyle: { color: TEMP_COLOR },
          lineStyle: { color: TEMP_COLOR, width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 77, 79, 0.5)' },
                { offset: 1, color: 'rgba(255, 77, 79, 0.1)' },
              ],
            },
            opacity: 0.3,
          },
        },
      ]
      : [],
    backgroundColor: 'transparent',
  } as EChartsOption
})

const vibOption = computed<EChartsOption>(() => {
  const c = chartAxisColor.value
  const s = chartSplitLineColor.value
  const d = vibChartData.value
  const timeLabels = d?.timeLabels ?? []
  const values = d?.values ?? []
  const yMin = d?.yMin
  const yMax = d?.yMax
  return {
    tooltip: {
      trigger: 'axis',
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50,50,50,0.8)',
      borderColor: 'rgba(50,50,50,0.8)',
      textStyle: { color: '#fff' },
    },
    grid: {
      left: '3%',
      right: '6%',
      bottom: fullscreenGridBottom.value,
      top: fullscreenGridTop.value,
      containLabel: true,
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
      {
        type: 'slider',
        xAxisIndex: [0],
        bottom: fullscreenDataZoomBottom.value,
        height: fullscreenDataZoomSliderHeight.value,
        fillerColor: 'rgba(24, 144, 255, 0.3)',
        borderColor: 'rgba(24, 144, 255, 0.5)',
        handleStyle: { color: VIB_COLOR },
        filterMode: 'none',
      },
    ],
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: {
        fontSize: 10,
        color: c,
        margin: 8,
        showMaxLabel: true,
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: c }, onZero: false },
      axisTick: { lineStyle: { color: c }, alignWithLabel: true },
    },
    yAxis: {
      type: 'value',
      ...(yMin != null && yMax != null ? { min: yMin, max: yMax } : {}),
      axisLabel: { fontSize: 10, color: c, formatter: formatYAxisTick },
      axisLine: { lineStyle: { color: c } },
      axisTick: { lineStyle: { color: c } },
      splitLine: { lineStyle: { color: s } },
      splitNumber: 4,
    },
    series: values.length
      ? [
        {
          data: values,
          type: 'line',
          smooth: true,
          symbolSize: 1,
          itemStyle: { color: VIB_COLOR },
          lineStyle: { color: VIB_COLOR, width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.5)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.1)' },
              ],
            },
            opacity: 0.3,
          },
        },
      ]
      : [],
    backgroundColor: 'transparent',
  } as EChartsOption
})

const soundOption = computed<EChartsOption>(() => {
  const c = chartAxisColor.value
  const s = chartSplitLineColor.value
  const d = soundChartData.value
  const timeLabels = d?.timeLabels ?? []
  const values = d?.values ?? []
  const yMin = d?.yMin
  const yMax = d?.yMax
  return {
    tooltip: {
      trigger: 'axis',
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50,50,50,0.8)',
      borderColor: 'rgba(50,50,50,0.8)',
      textStyle: { color: '#fff' },
    },
    grid: {
      left: '3%',
      right: '6%',
      bottom: fullscreenGridBottom.value,
      top: fullscreenGridTop.value,
      containLabel: true,
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
      {
        type: 'slider',
        xAxisIndex: [0],
        bottom: fullscreenDataZoomBottom.value,
        height: fullscreenDataZoomSliderHeight.value,
        fillerColor: 'rgba(250, 219, 20, 0.3)',
        borderColor: 'rgba(250, 219, 20, 0.5)',
        handleStyle: { color: SOUND_COLOR },
        filterMode: 'none',
      },
    ],
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: {
        fontSize: 10,
        color: c,
        margin: 8,
        showMaxLabel: true,
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: c }, onZero: false },
      axisTick: { lineStyle: { color: c }, alignWithLabel: true },
    },
    yAxis: {
      type: 'value',
      scale: true,
      ...(yMin != null && yMax != null ? { min: yMin, max: yMax } : {}),
      axisLabel: { fontSize: 10, color: c, formatter: formatYAxisTick },
      axisLine: { lineStyle: { color: c } },
      axisTick: { lineStyle: { color: c } },
      splitLine: { lineStyle: { color: s } },
      splitNumber: 4,
    },
    series: values.length
      ? [
        {
          data: values,
          type: 'line',
          smooth: true,
          symbolSize: 1,
          itemStyle: { color: SOUND_COLOR },
          lineStyle: { color: SOUND_COLOR, width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(250, 219, 20, 0.5)' },
                { offset: 1, color: 'rgba(250, 219, 20, 0.1)' },
              ],
            },
            opacity: 0.3,
          },
        },
      ]
      : [],
    backgroundColor: 'transparent',
  } as EChartsOption
})

function computeTempYAxisRange(dataMin: number, dataMax: number): { min: number; max: number } {
  const span = dataMax - dataMin
  const padding = Math.max(span * 0.1, 2)
  let min = dataMin - padding
  let max = dataMax + padding
  const range = max - min
  const step = range <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(range)))
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  return { min, max }
}

const loadTemperatureData = async (receiverId: string) => {
  if (!receiverId) return

  try {
    const response = await getTemperatureTrend({
      receiverId,
    })

    if (
      response.rc === 0 &&
      response.ret &&
      Array.isArray(response.ret) &&
      response.ret.length > 0
    ) {
      const timeData = response.ret.map((item: { dateTime?: string; time?: string }) => {
        const dt = item.dateTime || item.time || ''
        if (dt.includes(' ')) return (dt.split(' ')[1] || dt).trim().substring(0, 8)
        if (dt.includes('T')) return (dt.split('T')[1] || dt).substring(0, 8)
        return dt || ''
      })
      const tempData = response.ret.map((item) => item.temperature)
      const dataMin = tempData.length ? Math.min(...tempData) : 0
      const dataMax = tempData.length ? Math.max(...tempData) : 100
      const { min: yMin, max: yMax } = computeTempYAxisRange(dataMin, dataMax)
      tempChartData.value = { timeLabels: timeData, values: tempData, yMin, yMax }
    } else {
      console.warn('温度趋势数据格式错误:', response)
      tempChartData.value = null
    }
  } catch (error) {
    console.error('加载温度趋势数据失败:', error)
    tempChartData.value = null
  }
}

function computeVibYAxisRange(dataMin: number, dataMax: number): { min: number; max: number } {
  const span = dataMax - dataMin
  const padding = Math.max(span * 0.1, 0.5)
  let min = Math.min(0, dataMin - padding)
  let max = dataMax + padding
  const range = max - min
  const step = range <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(range)))
  const safeStep = step < 0.1 ? 0.1 : step
  min = Math.floor(min / safeStep) * safeStep
  max = Math.ceil(max / safeStep) * safeStep
  return { min, max }
}

const loadVibrationData = async (receiverId: string) => {
  if (!receiverId) return

  try {
    const response = await getVibrationTrend({
      receiverId,
    })

    const list = Array.isArray(response)
      ? response
      : response.ret && Array.isArray(response.ret)
        ? response.ret
        : []
    if (list.length > 0) {
      const timeData = list.map((item) => {
        const dt = item.time || ''
        if (dt.includes(' ')) return (dt.split(' ')[1] || dt).trim().substring(0, 8)
        if (dt.includes('T')) return (dt.split('T')[1] || dt).substring(0, 8)
        return dt
      })
      const vibData = list.map((item) => item.sumRms)
      const dataMin = vibData.length ? Math.min(...vibData) : 0
      const dataMax = vibData.length ? Math.max(...vibData) : 20
      const { min: yMin, max: yMax } = computeVibYAxisRange(dataMin, dataMax)
      vibChartData.value = { timeLabels: timeData, values: vibData, yMin, yMax }
    } else {
      console.warn('振动趋势数据格式错误:', response)
      vibChartData.value = null
    }
  } catch (error) {
    console.error('加载振动趋势数据失败:', error)
    vibChartData.value = null
  }
}

function computeSoundYAxisRange(dataMin: number, dataMax: number): { min: number; max: number } {
  const span = Math.max(dataMax - dataMin, 1)
  const padding = Math.max(span * 0.1, 2)
  let min = Math.min(0, dataMin - padding)
  let max = dataMax + padding
  const range = max - min
  const step = range <= 0 ? 10 : Math.pow(10, Math.floor(Math.log10(range)))
  const safeStep = step < 1 ? 1 : step
  min = Math.floor(min / safeStep) * safeStep
  max = Math.ceil(max / safeStep) * safeStep
  return { min, max }
}

const loadSoundData = async (receiverId: string) => {
  if (!receiverId) return
  try {
    const response = await getSoundTrend({
      receiverId,
    })

    const list = Array.isArray(response)
      ? response
      : response.ret && Array.isArray(response.ret)
        ? response.ret
        : []
    if (list.length > 0) {
      const timeData = list.map((item) => {
        const dt = item.time || item.dateTime || ''
        if (dt.includes(' ')) return (dt.split(' ')[1] || dt).trim().substring(0, 8)
        if (dt.includes('T')) return (dt.split('T')[1] || dt).substring(0, 8)
        return dt
      })
      const soundData = list.map((item) => item.value ?? item.soundLevel ?? 0)
      const dataMin = soundData.length ? Math.min(...soundData) : 0
      const dataMax = soundData.length ? Math.max(...soundData) : 100
      const { min: yMin, max: yMax } = computeSoundYAxisRange(dataMin, dataMax)
      soundChartData.value = { timeLabels: timeData, values: soundData, yMin, yMax }
    } else {
      console.warn('响度趋势数据格式错误或为空:', response)
      soundChartData.value = null
    }
  } catch (error) {
    console.error('加载响度趋势数据失败:', error)
    soundChartData.value = null
  }
}

const chartGridRef = ref<HTMLDivElement>()

const chartsInitialized = ref(false)

watch(
  () => props.pointList,
  (newList, oldList) => {
    if (!chartsInitialized.value || !newList?.length) return
    const oldListLength = oldList ? oldList.length : 0
    const newListLength = newList.length
    if (oldListLength === 0 && newListLength > 0) {
      const receiverId = newList[0]?.id
      if (receiverId) {
        loadTemperatureData(receiverId)
        loadVibrationData(receiverId)
        loadSoundData(receiverId)
      }
    } else if (!props.selectedPointId && newListLength > 0) {
      const receiverId = newList[0]?.id
      if (receiverId) {
        loadTemperatureData(receiverId)
        loadVibrationData(receiverId)
        loadSoundData(receiverId)
      }
    }
  },
  { immediate: false, deep: true },
)

watch(
  () => props.selectedPointId,
  (newPointId, oldPointId) => {
    if (chartsInitialized.value && newPointId && newPointId !== oldPointId) {
      loadTemperatureData(newPointId)
      loadVibrationData(newPointId)
      loadSoundData(newPointId)
    }
  },
  { immediate: false },
)

watch(
  () => activeReceiverId.value,
  (receiverId) => {
    if (!receiverId) return
    if (receiverId === lastRealtimeReceiverId.value) return
    lastRealtimeReceiverId.value = receiverId
    loadTemperatureRealTime(receiverId)
  },
  { immediate: true },
)

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      chartsInitialized.value = true
      const firstPoint = props.pointList?.[0]
      if (firstPoint) {
        const receiverId = props.selectedPointId || firstPoint.id
        if (receiverId) {
          loadTemperatureData(receiverId)
          loadVibrationData(receiverId)
          loadSoundData(receiverId)
        }
      }
    }, 150)
  })
})
</script>

<style lang="scss" scoped>
.charts-analysis-module {
  height: 50%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .charts-grid {
    height: 100%;
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 10px;
    min-height: 0;
    overflow: auto;

    .chart-item {
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      min-height: 0;

      min-width: 0;

      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        flex: 0 0 auto;

        gap: 10px;

        .chart-title {
          font-size: 1rem;
          font-weight: 500;
          color: #fff;
        }

        .chart-unit {
          font-size: 0.9rem;
          color: #fff;
        }

        /* 烈度随时间变化：单位字号固定 0.8rem */
        .vib-trend-unit {
          font-size: 0.8rem;
          color: #fff;
        }

        .chart-header-right {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          min-width: 0;
          flex: 0 0 auto;
          white-space: nowrap;
        }

        .realtime-temp-inline {
          font-size: 0.8rem;
          font-weight: 500;
          color: #fff;
        }

        .realtime-temp-unit {
          font-size: 0.8rem;
          font-weight: 500;
          color: #fff;
        }

        /* 仅温度标题栏右侧单位：固定 0.8rem */
        .chart-header-right .chart-unit {
          font-size: 0.8rem;
          color: #fff;
        }
      }

      .chart {
        flex: 1;
        min-height: 0;
        min-width: 0;

        :deep(.common-echarts-wrapper) {
          height: 100%;
          min-height: inherit;
        }

        :deep(.common-echarts-inner) {
          min-height: inherit;
        }
      }
    }

    .chart-item--wide {
      grid-column: 1 / -1;
    }

    .analysis-item {
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;

      min-height: 0;

      min-width: 0;

      .module-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        flex: 0 0 auto;

        .module-title {
          font-weight: 500;
          font-size: 1rem;
          color: white;
        }
      }

      .module-content {
        flex: 1;
        min-height: 0;

        overflow-y: auto;

        .analysis-form {
          flex: 1;
          min-height: 0;

          .form-row {
            display: flex;
            gap: 10px;
          }

          .el-form {
            .el-form-item {
              margin-bottom: 12px;

              :deep(.el-form-item__label) {
                color: #fff;
                font-size: 0.8rem;
              }
            }
          }
        }

        .analysis-result {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e4e7ed;

          .result-row {
            display: flex;
            justify-content: flex-start;
            margin-bottom: 8px;

            .result-label {
              font-size: 0.8rem;
              color: #fff;
              font-weight: 500;
            }

            .result-value {
              font-size: 0.8rem;
              color: white;
              font-weight: 500;

              &.clickable {
                cursor: pointer;
                text-decoration: underline;

                &:hover {
                  color: #409eff;
                }
              }
            }
          }
        }
      }

      .trend-charts-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-height: 400px;

        .chart-wrapper {
          flex-shrink: 0;

          .chart-title {
            font-size: 1rem !important;
            text-align: center;
            font-weight: 500;
            color: #fff;
            margin-bottom: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
          }

          .chart-box {
            width: 100%;
            height: 350px;
            min-height: 300px;
            background: transparent;
            border-radius: 4px;
            border: 1px solid #e4e7ed;
          }
        }
      }
    }
  }
}

@media (max-width: 800px) {
  .charts-analysis-module {
    height: auto;

    .charts-grid {
      display: flex;
      flex-direction: column;
      overflow: visible;
    }

    .charts-grid .chart-item {
      height: 220px;
      min-height: 220px;
    }

    .charts-grid .chart-item .chart-header .chart-title {
      font-size: 1.1rem;
    }

    .charts-grid .chart-item--wide {
      grid-column: auto;
    }


  }

  /* 全屏多图：移动端排版（toolbar/表头换行） */
  .device-detail-charts-fullscreen-toolbar {
    justify-content: flex-start !important;
    flex-wrap: wrap !important;
    gap: 12px !important;
    margin-bottom: 8px !important;
  }

  .device-detail-chart-fs-pane {
    .chart-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 6px !important;
    }

    .chart-header-right {
      white-space: normal !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
    }
  }
}

/*
:global(.page-layout--gray) .charts-analysis-module {
    .analysis-form {
        :deep(.el-form-item__label) {
            color: #000 !important;
        }
    }
}*/

:global(.trend-chart-dialog) {
  width: 70vw !important;
  height: 95vh !important;
  margin-top: 2.5vh !important;
  display: flex;
  flex-direction: column;
  background-color: #ffffff !important;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

  .el-dialog__body {
    flex: 1;
    overflow: hidden;
    padding: 0 20px 20px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background-color: #ffffff;
  }

  .trend-charts-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }

  .chart-wrapper {
    flex: 0 0 40vh;
    min-height: 40vh;
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
  }

  .chart-wrapper .chart-box {
    flex: 1;
    min-height: 0;
    width: 100%;
    background: transparent;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
  }

  :deep(.el-dialog__header.show-close) {
    font-weight: 500 !important;
    letter-spacing: 1.22px !important;
    color: #333333 !important;
    background-color: #ffffff !important;
    border-bottom: 1px solid #e4e7ed;
  }
}

/* Fullscreen multi-chart dialog (device detail) */
.temp-fullscreen-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  padding: 0 !important;
  color: rgba(255, 255, 255, 0.95) !important;
  font-size: 0.8rem;

  /* element-plus：text button hover/focus/active 的底色（避免出现白底） */
  &:hover,
  &:focus,
  &:active,
  &.is-disabled:hover {
    background-color: transparent !important;
    background: transparent !important;
  }

  &:hover::before,
  &:hover::after,
  &:focus::before,
  &:focus::after,
  &:active::before,
  &:active::after {
    background-color: transparent !important;
    background: transparent !important;
  }

  :deep(.el-button__content),
  :deep(.el-button__text) {
    color: rgba(255, 255, 255, 0.95) !important;
  }

  :deep(.el-icon) {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.95) !important;
    margin-left: 4px;
  }

  &:hover :deep(.el-icon),
  &:focus :deep(.el-icon),
  &:active :deep(.el-icon) {
    color: #ffffff !important;
  }
}

.device-detail-charts-fullscreen-content {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.device-detail-charts-fullscreen-toolbar {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;

  :deep(.el-checkbox__label) {
    color: rgba(255, 255, 255, 0.92);
  }

  :deep(.el-checkbox__inner) {
    border-color: rgba(255, 255, 255, 0.65);
  }
}

.device-detail-charts-fullscreen-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.device-detail-chart-fs-pane {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.1);

  /* 全屏内：单位/实时温度强制白色 */
  .realtime-temp-inline {
    font-size: 0.8rem;
    font-weight: 500;
    color: #fff;
  }

  .realtime-temp-unit {
    font-size: 0.8rem;
    font-weight: 500;
    color: #fff;
  }

  .realtime-temp-value {
    color: #fff !important;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    gap: 10px;
    flex: 0 0 auto;
    min-width: 0;

    .chart-title {
      font-size: 1rem !important;
    }
  }

  .chart-header-right {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    min-width: 0;
    flex: 0 0 auto;
    white-space: nowrap;
  }

  /* 全屏：烈度标题栏单位仍保持白色/0.8rem */
  .vib-trend-unit {
    font-size: 0.8rem;
    color: #fff !important;
  }

  /* 全屏：温度标题栏右侧单位强制白色/字号一致 */
  .chart-header-right .chart-unit {
    font-size: 0.8rem;
    color: #fff !important;
  }

  .chart-host {
    flex: 1;
    min-height: 0;
    min-width: 0;

    :deep(.common-echarts-wrapper) {
      height: 100%;
      min-height: inherit;
    }

    :deep(.common-echarts-inner) {
      min-height: inherit;
    }
  }
}

.device-detail-charts-empty {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.3);
}

:global(.device-detail-charts-fullscreen-dialog .el-dialog__body) {
  /* 防止 body padding 挤压/覆盖全屏图表顶部区域 */
  padding: 0 !important;
}
</style>

<style lang="scss">
:root {
  --dialog-title-weight: 500;
  --dialog-title-spacing: 1.22px;
  --dialog-title-color: #333333;
  --dialog-title-size: clamp(22px, 3vw, 26px);
}

.trend-chart-dialog,
.el-dialog.trend-chart-dialog,
.el-overlay-dialog .trend-chart-dialog {

  .el-dialog__header,
  .el-dialog__header.show-close {
    .el-dialog__title {
      font-weight: var(--dialog-title-weight) !important;
      letter-spacing: var(--dialog-title-spacing) !important;
      color: var(--dialog-title-color) !important;
      font-size: var(--dialog-title-size) !important;
    }
  }
}

.el-dialog__title {
  &.trend-chart-title {
    font-weight: 500 !important;
    letter-spacing: 1.22px !important;
    color: #333333 !important;
  }
}

.trend-chart-dialog-header {
  .trend-chart-title {
    font-weight: 500 !important;
    letter-spacing: 1.22px !important;
    color: #333333 !important;
  }
}
</style>
