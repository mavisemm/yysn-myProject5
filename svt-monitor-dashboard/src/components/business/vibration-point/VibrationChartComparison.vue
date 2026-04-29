<template>
  <div class="bottom-row">
    <div class="card-item freq-card">
      <div class="card-header">
        <div class="card-header-leading">
          <div class="card-title app-section-title">振动速度频域图</div>
          <el-select v-model="freqAxis" class="vibration-axis-select" size="small" teleported :show-arrow="false"
            popper-class="vibration-axis-select-dropdown">
            <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
        <div class="card-header-spacer" aria-hidden="true" />
        <div class="card-header-actions">
          <el-button class="freq-fullscreen-btn" text size="large" @click="openFreqFullscreen">
            全屏显示
            <el-icon>
              <FullScreen />
            </el-icon>
          </el-button>
        </div>
      </div>
      <div class="chart-container">
        <CommonEcharts ref="freqChartRef" :option="freqOption" :enable-data-zoom="false" :not-merge="true"
          enable-fullscreen fullscreen-title="振动速度频域图" fullscreen-background="#142060" @chart-ready="onFreqChartReady"
          @fullscreen-chart-ready="onFreqFullscreenChartReady" @fullscreen-closing="onFreqFullscreenClosing"
          @fullscreen-closed="onFreqFullscreenClosed">
          <template #fullscreen-body-top>
            <div class="freq-fullscreen-top">
              <el-select v-model="freqAxis" class="vibration-axis-select" size="small" teleported :show-arrow="false"
                popper-class="vibration-axis-select-dropdown">
                <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <span class="freq-fullscreen-divider" aria-hidden="true" />
              <div class="freq-filter-inline">
                <span class="freq-filter-label">频率筛选：</span>
                <el-input-number v-model="fullscreenRangeMin" :min="safeFullscreenRangeDataMin"
                  :max="safeFullscreenRangeDataMax" :step="FREQ_FILTER_STEP" size="small" placeholder="最小"
                  controls-position="right" class="freq-filter-num" @blur="confirmFullscreenRange" />
                <span class="freq-filter-sep">~</span>
                <el-input-number v-model="fullscreenRangeMax" :min="safeFullscreenRangeDataMin"
                  :max="safeFullscreenRangeDataMax" :step="FREQ_FILTER_STEP" size="small" placeholder="最大"
                  controls-position="right" class="freq-filter-num" @blur="confirmFullscreenRange" />
                <el-button size="small" type="primary" @click="confirmFullscreenRange">确认</el-button>
                <el-button size="small" @click="resetFullscreenRange"> 重置 </el-button>
                <span class="freq-filter-divider" aria-hidden="true" />
                <span class="freq-filter-label">打标功能：</span>
                <el-button size="small" :disabled="!currentPinnedPointId" @click="clearCurrentPinnedPoint">
                  清除当前标记
                </el-button>
                <el-button size="small" :disabled="!pinnedFreqPoints.length" @click="clearAllPinnedPoints">
                  清除全部标记
                </el-button>
              </div>
            </div>
          </template>
        </CommonEcharts>
      </div>
    </div>
    <div class="card-item time-card">
      <div class="card-header">
        <div class="card-header-leading">
          <div class="card-title app-section-title">振动速度时域图</div>
          <el-select v-model="timeAxis" class="vibration-axis-select" size="small" teleported :show-arrow="false"
            popper-class="vibration-axis-select-dropdown">
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
          enable-fullscreen fullscreen-title="振动速度时域图" fullscreen-background="#142060">
          <template #fullscreen-body-top>
            <div class="time-fullscreen-top">
              <el-select v-model="timeAxis" class="vibration-axis-select" size="small" teleported :show-arrow="false"
                popper-class="vibration-axis-select-dropdown">
                <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </div>
          </template>
        </CommonEcharts>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, shallowRef, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { CommonEcharts } from '@/components/common/chart'
import { useRangeControls } from '@/composables/useRangeControls'
import {
  getVibrationFrequencyData,
  getVibrationTimeDomainData,
  type VibrationAxis,
} from '@/api/modules/device'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { FullScreen } from '@element-plus/icons-vue'
import {
  buildPersistentMarkPointData,
  removeCurrentPersistentPoint,
  upsertPersistentPoint,
  type EchartsPersistentPoint,
} from '@/utils/echartsPointMarker'

const route = useRoute()
const receiverIdFromParams = computed(() => {
  const rid = route.params.receiverId
  const resolved = Array.isArray(rid) ? rid[0] : rid
  return (typeof resolved === 'string' ? resolved : '') || ''
})
const deviceTreeStore = useDeviceTreeStore()

const resolvePointDeviceId = (rid: string): string => {
  if (!rid) return ''
  for (const factory of deviceTreeStore.deviceTreeData) {
    for (const workshop of factory.children ?? []) {
      for (const device of workshop.children ?? []) {
        if (device.type !== 'device') continue
        const hit = (device.children ?? []).find((p) => p.type === 'point' && p.id === rid)
        if (hit?.deviceId) return hit.deviceId
      }
    }
  }
  return ''
}

const pointDeviceId = computed(() => resolvePointDeviceId(receiverIdFromParams.value))

const chartAxisColor = computed(() => '#fff')
const chartSplitLineColor = computed(() => 'rgba(255,255,255,0.1)')

const freqChartRef = ref<InstanceType<typeof CommonEcharts>>()
const timeChartRef = ref<InstanceType<typeof CommonEcharts>>()
const freqChartInstance = shallowRef<echarts.ECharts | null>(null)
const fullscreenFreqChartInstance = shallowRef<echarts.ECharts | null>(null)
let freqChartCleanup: (() => void) | null = null
let fullscreenFreqPointerCleanup: (() => void) | null = null
let fullscreenFreqClickCleanup: (() => void) | null = null
let fullscreenFreqZrClickCleanup: (() => void) | null = null
let markLineRafId: number | null = null
let lastHarmonicBaseFreq: number | null = null
const pinnedFreqPoints = ref<EchartsPersistentPoint[]>([])
const currentPinnedPointId = ref<string>('')

const openFreqFullscreen = () => {
  ; (freqChartRef.value as any)?.openFullscreen?.()
}
const openTimeFullscreen = () => {
  ; (timeChartRef.value as any)?.openFullscreen?.()
}

const freqData = ref<{ frequency: number[]; freqSpeedData: number[] }>({
  frequency: [],
  freqSpeedData: [],
})
const timeDomainData = ref<number[]>([])
const totalTime = ref<number>(0)

const axisOptions: { label: string; value: VibrationAxis }[] = [
  { label: 'X轴', value: 'X' },
  { label: 'Y轴', value: 'Y' },
  { label: 'Z轴', value: 'Z' },
]

const freqAxis = ref<VibrationAxis>('X')
const timeAxis = ref<VibrationAxis>('X')

const pointerBaseFreq = ref<number | null>(null)
const FREQ_MATCH_DECIMALS = 6
const FREQ_FILTER_PRECISION = 6
const FREQ_FILTER_STEP = 1

// y 轴刻度：最多保留小数点后两位（并去掉无意义的尾随 0）
const formatYAxisTick = (v: number | string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(2)))
}
// 频域图 y 轴刻度：固定显示到小数点后 5 位
const formatFreqYAxisTick = (v: number | string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(5)
}

// 频率显示：保留原始小数特征，最多 6 位，去除尾随 0
const formatFrequency = (v: number | string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(FREQ_MATCH_DECIMALS)))
}

const formatPinnedY = (v: number | string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(10)
}

const toFreqKey = (v: number) => v.toFixed(FREQ_MATCH_DECIMALS)

const getSortedFreqChartData = () => {
  const chartData = freqData.value.frequency
    .map((freq, index) => [freq, freqData.value.freqSpeedData[index] ?? 0] as [number, number])
    .sort((a, b) => a[0] - b[0])
  const xMin = chartData.length > 0 ? Math.min(...freqData.value.frequency) : 0
  const xMax = chartData.length > 0 ? Math.max(...freqData.value.frequency) : 0
  const pointMap = new Map<string, [number, number]>()
  for (const item of chartData) {
    pointMap.set(toFreqKey(item[0]), item)
  }
  return { chartData, xMin, xMax, pointMap }
}

const buildHarmonicMarkLineData = (baseFreq: number) => {
  if (!Number.isFinite(baseFreq) || baseFreq <= 0) return []
  const { xMax, pointMap } = getSortedFreqChartData()
  const hasExactPoint = (x: number) => pointMap.has(toFreqKey(x))

  const candidates: Array<{ name: string; x: number; color: string; requirePoint: boolean }> = [
    { name: '', x: baseFreq, color: '#7ecba1', requirePoint: false },
    { name: '', x: baseFreq * 2, color: '#60a5fa', requirePoint: true },
    { name: '', x: baseFreq * 3, color: '#f59e0b', requirePoint: true },
    { name: '', x: baseFreq * 4, color: '#f472b6', requirePoint: true },
  ]

  return candidates
    .filter((item) => item.x > 0 && item.x <= xMax)
    .filter((item) => (item.requirePoint ? hasExactPoint(item.x) : true))
    .map((item) => ({
      name: item.name,
      xAxis: item.x,
      lineStyle: {
        type: 'dashed',
        width: 1,
        color: item.color,
        opacity: 0.9,
      },
      label: {
        show: true,
        formatter: item.name,
        color: item.color,
        fontSize: 11,
        position: 'insideEndTop',
      },
    }))
}

const freqOption = computed<EChartsOption>(() => {
  if (!freqData.value.frequency.length) return {}

  const { chartData, xMin, xMax } = getSortedFreqChartData()
  const yValues = chartData.map((item) => item[1])
  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 1
  const yMargin = (yMax - yMin) * 0.1
  const yMinWithMargin = Math.max(0, yMin - yMargin)
  const yMaxWithMargin = yMax + yMargin

  const c = chartAxisColor.value
  const s = chartSplitLineColor.value

  return {
    tooltip: {
      trigger: 'axis',
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: 'rgba(50, 50, 50, 0.9)',
      textStyle: { color: '#fff' },

      confine: false,
      position: function (pos: any, _params: any, _el: any, _elRect: any, size: any) {
        const [mouseX, mouseY] = pos as [number, number]
        const [contentWidth, contentHeight] = size.contentSize as [number, number]

        const gap = 18
        const hitMargin = 10

        const inst = freqChartInstance.value
        const base = pointerBaseFreq.value
        const avoidPixels: number[] = []
        if (inst && typeof base === 'number' && Number.isFinite(base) && base > 0) {
          const lines = buildHarmonicMarkLineData(base)
          for (const l of lines as any[]) {
            const v = (l as any)?.xAxis
            const n = typeof v === 'number' ? v : Number(v)
            if (!Number.isFinite(n)) continue
            try {
              const px = inst.convertToPixel({ xAxisIndex: 0 }, n) as number
              if (typeof px === 'number' && Number.isFinite(px)) avoidPixels.push(px)
            } catch { }
          }
        }

        const overlapCount = (x: number) => {
          const left = x
          const right = x + contentWidth
          return avoidPixels.reduce(
            (acc, px) => (px >= left - hitMargin && px <= right + hitMargin ? acc + 1 : acc),
            0,
          )
        }

        const candidatesRaw = [
          { x0: mouseX + gap, y0: mouseY - contentHeight / 2 },
          { x0: mouseX - contentWidth - gap, y0: mouseY - contentHeight / 2 },
          { x0: mouseX - contentWidth / 2, y0: mouseY - contentHeight - gap },
          { x0: mouseX - contentWidth / 2, y0: mouseY + gap },
        ]
        const candidates = candidatesRaw.map((c) => {
          const x = c.x0
          const y = c.y0
          const dx = x + contentWidth / 2 - mouseX
          const dy = y + contentHeight / 2 - mouseY
          return {
            x,
            y,
            overlaps: overlapCount(x),
            dist2: dx * dx + dy * dy,
          }
        })

        candidates.sort((a, b) => a.overlaps - b.overlaps || a.dist2 - b.dist2)
        const best = candidates[0] ?? { x: mouseX + gap, y: mouseY - contentHeight / 2 }
        return [best.x, best.y]
      },
      formatter: function (params: any) {
        if (!params?.length || !params[0]?.value) return ''
        const data = params[0]
        const currentX = data.value[0]
        const currentY = data.value[1]
        const minX = xMin
        const maxX = xMax
        const pointMap = new Map<string, [number, number]>(
          chartData.map((item) => [toFreqKey(item[0]), item] as [string, [number, number]]),
        )
        const findExactPoint = (x: number) => pointMap.get(toFreqKey(x))

        let tooltipContent = `${formatFrequency(currentX)}Hz：${currentY.toFixed(10)}`

        const doubleFreq = currentX * 2
        if (doubleFreq >= minX && doubleFreq <= maxX) {
          const doublePoint = findExactPoint(doubleFreq)
          if (doublePoint) {
            tooltipContent += `<br/>二倍频：${formatFrequency(doubleFreq)}Hz：${doublePoint[1].toFixed(10)}`
          }
        }

        const tripleFreq = currentX * 3
        if (tripleFreq >= minX && tripleFreq <= maxX) {
          const triplePoint = findExactPoint(tripleFreq)
          if (triplePoint) {
            tooltipContent += `<br/>三倍频：${formatFrequency(tripleFreq)}Hz：${triplePoint[1].toFixed(10)}`
          }
        }

        const quadrupleFreq = currentX * 4
        if (quadrupleFreq >= minX && quadrupleFreq <= maxX) {
          const quadruplePoint = findExactPoint(quadrupleFreq)
          if (quadruplePoint) {
            tooltipContent += `<br/>四倍频：${formatFrequency(quadrupleFreq)}Hz：${quadruplePoint[1].toFixed(10)}`
          }
        }

        return tooltipContent
      },
    },
    grid: { top: 30, left: 40, right: 50, bottom: 35, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Hz',
      min: xMin,
      max: xMax,
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
      min: yMinWithMargin,
      max: yMaxWithMargin,
      nameTextStyle: { color: c },
      axisLabel: {
        color: c,
        formatter: formatFreqYAxisTick,
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
        id: 'freq-series',
        type: 'line',
        smooth: false,
        showSymbol: false,
        animation: false,
        data: chartData,
        lineStyle: { color: '#7ecba1', width: 1 },
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          precision: 2,
          animation: false,
          label: { show: false },
          lineStyle: { type: 'dashed', width: 1, opacity: 0.9 },
          data: [],
        },
        markPoint: {
          animation: false,
          data: [],
        },
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

const scheduleHarmonicMarkLines = (baseFreq: number) => {
  if (markLineRafId) cancelAnimationFrame(markLineRafId)
  markLineRafId = requestAnimationFrame(() => {
    markLineRafId = null
    if (lastHarmonicBaseFreq !== null && Math.abs(lastHarmonicBaseFreq - baseFreq) < 1e-6) return
    lastHarmonicBaseFreq = baseFreq
    const data = buildHarmonicMarkLineData(baseFreq)
    try {
      if (freqChartInstance.value) {
        freqChartInstance.value.setOption(
          { series: [{ id: 'freq-series', markLine: { data } }] } as any,
          { notMerge: false, lazyUpdate: true },
        )
      }
      freqChartRef.value?.patchFullscreenSeriesMarkLine?.('freq-series', data)
    } catch { }
  })
}

const onUpdateAxisPointer = (params: any) => {
  const axesInfo = Array.isArray(params?.axesInfo) ? params.axesInfo : []
  const info0 = axesInfo[0]
  const v = info0?.value
  const n = typeof v === 'number' ? v : Number(v)
  if (Number.isFinite(n)) {
    pointerBaseFreq.value = n
    scheduleHarmonicMarkLines(n)
  }
}

const getPinnedMarkPointData = () =>
  buildPersistentMarkPointData(
    pinnedFreqPoints.value,
    currentPinnedPointId.value,
    {
      formatX: (v) => `${formatFrequency(v)}Hz`,
      formatY: formatPinnedY,
    },
    {
      activeSymbolSize: 9,
      inactiveSymbolSize: 7,
      activeColor: '#ffd166',
      inactiveColor: '#ff6b6b',
      borderColor: '#fff',
      borderWidth: 1,
    },
  )

const patchInlinePinnedMarkPoints = () => {
  if (!freqChartInstance.value) return
  try {
    freqChartInstance.value.setOption(
      {
        series: [
          {
            id: 'freq-series',
            markPoint: {
              animation: false,
              data: getPinnedMarkPointData(),
            },
          },
        ],
      } as any,
      { notMerge: false, lazyUpdate: true },
    )
  } catch { }
}

const patchFullscreenPinnedMarkPoints = () => {
  if (!fullscreenFreqChartInstance.value) return
  try {
    fullscreenFreqChartInstance.value.setOption(
      {
        series: [
          {
            id: 'freq-series',
            markPoint: {
              animation: false,
              data: getPinnedMarkPointData(),
            },
          },
        ],
      } as any,
      { notMerge: false, lazyUpdate: true },
    )
  } catch { }
}

const refreshFullscreenPinnedMarkPoints = () => {
  patchInlinePinnedMarkPoints()
  patchFullscreenPinnedMarkPoints()
  // 频率范围变更会触发全屏图 setOption，下一帧再补一次，避免被覆盖
  void nextTick(() => {
    patchInlinePinnedMarkPoints()
    patchFullscreenPinnedMarkPoints()
  })
}

const clearCurrentPinnedPoint = () => {
  if (!currentPinnedPointId.value) return
  const nextState = removeCurrentPersistentPoint(pinnedFreqPoints.value, currentPinnedPointId.value)
  pinnedFreqPoints.value = nextState.points
  currentPinnedPointId.value = nextState.currentId
  refreshFullscreenPinnedMarkPoints()
}

const clearAllPinnedPoints = () => {
  pinnedFreqPoints.value = []
  currentPinnedPointId.value = ''
  refreshFullscreenPinnedMarkPoints()
}

const addPinnedFreqPoint = (x: number, y: number) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  console.log('[freq-pin] addPinnedFreqPoint', { x, y })
  const nextState = upsertPersistentPoint(pinnedFreqPoints.value, x, y, currentPinnedPointId.value)
  pinnedFreqPoints.value = nextState.points
  currentPinnedPointId.value = nextState.currentId
  refreshFullscreenPinnedMarkPoints()
}

const pickNearestFreqPointByX = (x: number): [number, number] | null => {
  const { chartData } = getSortedFreqChartData()
  if (!chartData.length || !Number.isFinite(x)) return null
  let nearest: [number, number] | null = null
  let minDist = Number.POSITIVE_INFINITY
  for (const point of chartData) {
    const dist = Math.abs(point[0] - x)
    if (dist < minDist) {
      minDist = dist
      nearest = point
    }
  }
  return nearest
}

const addPinnedByPixel = (offsetX: number, offsetY: number) => {
  const inst = fullscreenFreqChartInstance.value
  if (!inst || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return
  // 优先使用轴指针的 x（不依赖点击的 y），满足“按 x 轴打标”
  if (Number.isFinite(pointerBaseFreq.value)) {
    const nearestByPointer = pickNearestFreqPointByX(Number(pointerBaseFreq.value))
    console.log('[freq-pin] use pointerBaseFreq', {
      pointerBaseFreq: pointerBaseFreq.value,
      nearestByPointer,
    })
    if (nearestByPointer) {
      addPinnedFreqPoint(nearestByPointer[0], nearestByPointer[1])
      return
    }
  }

  let axisValue: unknown
  try {
    // 某些场景下 [x,y] 会返回 NaN，这里先按 x 轴单值转换
    axisValue = inst.convertFromPixel({ xAxisIndex: 0 }, offsetX as any)
    if (!Number.isFinite(Array.isArray(axisValue) ? Number(axisValue[0]) : Number(axisValue))) {
      axisValue = inst.convertFromPixel({ xAxisIndex: 0 }, [offsetX, offsetY])
    }
    if (!Number.isFinite(Array.isArray(axisValue) ? Number(axisValue[0]) : Number(axisValue))) {
      axisValue = inst.convertFromPixel({ gridIndex: 0 }, [offsetX, offsetY])
    }
    console.log('[freq-pin] convertFromPixel', { axisValue, offsetX, offsetY })
  } catch {
    console.log('[freq-pin] convertFromPixel failed')
    return
  }
  const x = Array.isArray(axisValue) ? Number(axisValue[0]) : Number(axisValue)
  if (!Number.isFinite(x)) return
  const nearest = pickNearestFreqPointByX(x)
  console.log('[freq-pin] nearest point by x', { x, nearest })
  if (!nearest) return
  addPinnedFreqPoint(nearest[0], nearest[1])
}

const onFreqFullscreenChartClick = (params: any) => {
  console.log('[freq-pin] click event', {
    componentType: params?.componentType,
    seriesId: params?.seriesId,
    value: params?.value,
    offsetX: params?.event?.offsetX,
    offsetY: params?.event?.offsetY,
  })
  const value = params?.value
  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0])
    const y = Number(value[1])
    if (Number.isFinite(x) && Number.isFinite(y)) {
      console.log('[freq-pin] use direct series value', { x, y })
      addPinnedFreqPoint(x, y)
      return
    }
  }
  const offsetX = Number(params?.event?.offsetX)
  const offsetY = Number(params?.event?.offsetY)
  addPinnedByPixel(offsetX, offsetY)
}

const onFreqChartReady = (instance: echarts.ECharts) => {
  freqChartInstance.value = instance
  if (freqChartCleanup) {
    freqChartCleanup()
    freqChartCleanup = null
  }

  instance.on('updateAxisPointer', onUpdateAxisPointer)
  instance.on('datazoom', handleInlineDataZoom)
  freqChartCleanup = () => {
    try {
      instance.off('updateAxisPointer', onUpdateAxisPointer)
      instance.off('datazoom', handleInlineDataZoom)
    } catch { }
    if (markLineRafId) {
      cancelAnimationFrame(markLineRafId)
      markLineRafId = null
    }
  }
}

const onFreqFullscreenChartReady = (inst: echarts.ECharts) => {
  console.log('[freq-pin] fullscreen chart ready')
  fullscreenFreqChartInstance.value = inst
  if (fullscreenFreqPointerCleanup) {
    fullscreenFreqPointerCleanup()
    fullscreenFreqPointerCleanup = null
  }
  if (fullscreenFreqClickCleanup) {
    fullscreenFreqClickCleanup()
    fullscreenFreqClickCleanup = null
  }
  if (fullscreenFreqZrClickCleanup) {
    fullscreenFreqZrClickCleanup()
    fullscreenFreqZrClickCleanup = null
  }
  inst.on('updateAxisPointer', onUpdateAxisPointer)
  inst.on('datazoom', handleFullscreenDataZoom)
  inst.on('click', onFreqFullscreenChartClick)
  const zr = inst.getZr?.()
  const onZrClick = (evt: any) => {
    const offsetX = Number(evt?.offsetX)
    const offsetY = Number(evt?.offsetY)
    console.log('[freq-pin] zr click', { offsetX, offsetY })
    addPinnedByPixel(offsetX, offsetY)
  }
  zr?.on?.('click', onZrClick)
  fullscreenFreqPointerCleanup = () => {
    try {
      inst.off('updateAxisPointer', onUpdateAxisPointer)
      inst.off('datazoom', handleFullscreenDataZoom)
    } catch { }
  }
  fullscreenFreqClickCleanup = () => {
    try {
      inst.off('click', onFreqFullscreenChartClick)
    } catch { }
  }
  fullscreenFreqZrClickCleanup = () => {
    try {
      zr?.off?.('click', onZrClick)
    } catch { }
  }
  console.log('[freq-pin] fullscreen click handlers attached')

  const base = pointerBaseFreq.value
  if (typeof base === 'number' && Number.isFinite(base) && base > 0) {
    const data = buildHarmonicMarkLineData(base)
    try {
      freqChartRef.value?.patchFullscreenSeriesMarkLine?.('freq-series', data)
    } catch { }
  }

  patchFullscreenPinnedMarkPoints()
}

const onFreqFullscreenClosed = () => {
  fullscreenFreqChartInstance.value = null
  if (fullscreenFreqPointerCleanup) {
    fullscreenFreqPointerCleanup()
    fullscreenFreqPointerCleanup = null
  }
  if (fullscreenFreqClickCleanup) {
    fullscreenFreqClickCleanup()
    fullscreenFreqClickCleanup = null
  }
  if (fullscreenFreqZrClickCleanup) {
    fullscreenFreqZrClickCleanup()
    fullscreenFreqZrClickCleanup = null
  }
}

const onFreqFullscreenClosing = () => {
  // 关闭动画开始前就清空，避免小图短暂闪现打标
  clearAllPinnedPoints()
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

const loadFreqData = async () => {
  if (!pointDeviceId.value || !receiverIdFromParams.value) return

  try {
    const freqResponse = await getVibrationFrequencyData(
      pointDeviceId.value,
      receiverIdFromParams.value,
      freqAxis.value,
    )
    if (freqResponse.rc === 0 && freqResponse.ret) {
      const { frequency, freqSpeedData } = freqResponse.ret
      if (
        Array.isArray(frequency) &&
        Array.isArray(freqSpeedData) &&
        frequency.length > 0 &&
        freqSpeedData.length > 0
      ) {
        freqData.value = { frequency, freqSpeedData }
      } else {
        console.warn('频域图数据为空或格式不正确')
        freqData.value = { frequency: [], freqSpeedData: [] }
      }
    } else {
      console.warn('频域图接口返回错误或无数据:', freqResponse)
      freqData.value = { frequency: [], freqSpeedData: [] }
    }
  } catch (error) {
    console.error('获取振动频域数据失败:', error)
    freqData.value = { frequency: [], freqSpeedData: [] }
  }
}

const loadTimeData = async () => {
  if (!pointDeviceId.value || !receiverIdFromParams.value) return

  try {
    const timeResponse = await getVibrationTimeDomainData(
      pointDeviceId.value,
      receiverIdFromParams.value,
      timeAxis.value,
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
}

const loadVibrationChartsData = async () => {
  await Promise.all([loadFreqData(), loadTimeData()])
}

watch(
  [receiverIdFromParams, pointDeviceId],
  ([rid, pid]) => {
    if (!rid || !pid) return
    clearAllPinnedPoints()
    void loadVibrationChartsData()
  },
  { immediate: true },
)

watch(freqAxis, () => {
  if (!receiverIdFromParams.value || !pointDeviceId.value) return
  clearAllPinnedPoints()
  void loadFreqData()
})

watch(
  freqOption,
  () => {
    // CommonEcharts 会在下一帧对全屏图 applyOption，这里再延后一帧补写 markPoint，防止被覆盖
    requestAnimationFrame(() => {
      refreshFullscreenPinnedMarkPoints()
    })
  },
  { deep: false },
)

watch(timeAxis, () => {
  if (!receiverIdFromParams.value || !pointDeviceId.value) return
  void loadTimeData()
})

onUnmounted(() => {
  if (freqChartCleanup) {
    freqChartCleanup()
    freqChartCleanup = null
  }
  if (fullscreenFreqPointerCleanup) {
    fullscreenFreqPointerCleanup()
    fullscreenFreqPointerCleanup = null
  }
  if (fullscreenFreqClickCleanup) {
    fullscreenFreqClickCleanup()
    fullscreenFreqClickCleanup = null
  }
  if (fullscreenFreqZrClickCleanup) {
    fullscreenFreqZrClickCleanup()
    fullscreenFreqZrClickCleanup = null
  }
  disposeInlineRangeControls()
  disposeFullscreenRangeControls()
})

const {
  handleDataZoom: handleInlineDataZoom,
  dispose: disposeInlineRangeControls,
} = useRangeControls({
  option: freqOption,
  showRangeControls: computed(() => true),
  rangeControlsData: computed(() => freqData.value.frequency || []),
  rangeControlsXAxisIndex: computed(() => 0),
  rangeControlsMin: computed(() => undefined),
  rangeControlsMax: computed(() => undefined),
  rangeControlsStep: computed(() => FREQ_FILTER_STEP),
  rangeControlsPrecision: computed(() => FREQ_FILTER_PRECISION),
  rangeControlsDebounceMs: computed(() => 600),
  preserveDataZoom: computed(() => true),
  doDataZoom: ({ startValue, endValue }) => {
    const action: any = { type: 'dataZoom', startValue, endValue, xAxisIndex: 0 }
    const inst = freqChartInstance.value
    if (!inst) return
    try {
      if (typeof inst.isDisposed === 'function' && inst.isDisposed()) return
      inst.dispatchAction(action)
    } catch { }
  },
})

const {
  rangeMin: fullscreenRangeMin,
  rangeMax: fullscreenRangeMax,
  rangeDataMin: fullscreenRangeDataMin,
  rangeDataMax: fullscreenRangeDataMax,
  applyRange: applyFullscreenRange,
  resetRange: resetFullscreenRange,
  handleDataZoom: handleFullscreenDataZoom,
  dispose: disposeFullscreenRangeControls,
} = useRangeControls({
  option: freqOption,
  showRangeControls: computed(() => true),
  rangeControlsData: computed(() => freqData.value.frequency || []),
  rangeControlsXAxisIndex: computed(() => 0),
  rangeControlsMin: computed(() => undefined),
  rangeControlsMax: computed(() => undefined),
  rangeControlsStep: computed(() => FREQ_FILTER_STEP),
  rangeControlsPrecision: computed(() => FREQ_FILTER_PRECISION),
  rangeControlsDebounceMs: computed(() => 600),
  preserveDataZoom: computed(() => true),
  doDataZoom: ({ startValue, endValue }) => {
    const action: any = { type: 'dataZoom', startValue, endValue, xAxisIndex: 0 }
    const inst = fullscreenFreqChartInstance.value
    if (!inst) return
    try {
      if (typeof inst.isDisposed === 'function' && inst.isDisposed()) return
      inst.dispatchAction(action)
    } catch { }
  },
})

const confirmFullscreenRange = () => {
  applyFullscreenRange()
}

const safeFullscreenRangeDataMin = computed(() => {
  const v = Number(fullscreenRangeDataMin.value)
  return Number.isFinite(v) ? v : 0
})

const safeFullscreenRangeDataMax = computed(() => {
  const v = Number(fullscreenRangeDataMax.value)
  if (Number.isFinite(v) && v >= safeFullscreenRangeDataMin.value) return v
  return safeFullscreenRangeDataMin.value
})
</script>

<style lang="scss" scoped>
.bottom-row {
  display: flex;
  height: 40%;
  gap: 10px;
  min-height: 0;
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

    :deep(.freq-fullscreen-btn) {
      color: #fff !important;
      padding: 0 !important;
      gap: 4px;
      font-size: 0.8rem;
    }

    :deep(.time-fullscreen-btn) {
      color: #fff !important;
      padding: 0 !important;
      gap: 4px;
      font-size: 0.8rem;
    }

    :deep(.freq-fullscreen-btn:hover),
    :deep(.freq-fullscreen-btn:focus),
    :deep(.freq-fullscreen-btn:active),
    :deep(.time-fullscreen-btn:hover),
    :deep(.time-fullscreen-btn:focus),
    :deep(.time-fullscreen-btn:active) {
      background-color: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }

    :deep(.freq-fullscreen-btn .el-icon) {
      color: #fff !important;
      margin-left: 4px;
      font-size: 0.8rem;
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

:global(.freq-fullscreen-modal .el-dialog) {
  background: #142060 !important;
}

:global(.freq-fullscreen-modal .el-dialog__header) {
  background: #142060 !important;
  margin-right: 0;
}

:global(.freq-fullscreen-modal .el-dialog__title) {
  color: rgba(255, 255, 255, 0.92) !important;
}

:global(.freq-fullscreen-modal .el-dialog__body) {
  background: #142060 !important;
}

:global(.freq-fullscreen-modal .el-dialog__headerbtn .el-dialog__close) {
  color: rgba(255, 255, 255, 0.92) !important;
}

:deep(.freq-fullscreen-dialog .el-dialog) {
  background: #142060;
}

:deep(.freq-fullscreen-dialog .el-dialog__header) {
  background: #142060;
  margin-right: 0;
}

:deep(.freq-fullscreen-dialog .el-dialog__title) {
  color: rgba(255, 255, 255, 0.92);
}

:deep(.freq-fullscreen-dialog .el-dialog__body) {
  background: #142060;
}

:deep(.freq-fullscreen-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: rgba(255, 255, 255, 0.92);
}

.freq-card,
.time-card {
  width: 50%;
}

@media (max-width: 800px) {
  .bottom-row {
    height: auto;
    min-height: 0;
    flex-direction: column;
  }

  .freq-card,
  .time-card {
    width: 100%;
  }

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
  width: 72px;
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

.freq-fullscreen-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: nowrap;
  width: 100%;
}

.time-fullscreen-top {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.freq-filter-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.freq-filter-inline .freq-filter-label {
  color: #fff;
  font-size: 0.8rem;
}

.freq-filter-inline .freq-filter-num {
  width: 110px;
}

.freq-filter-inline .freq-filter-sep {
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
}

.freq-filter-inline .freq-filter-divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.28);
  flex: 0 0 auto;
}

.freq-fullscreen-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background: rgba(255, 255, 255, 0.28);
  flex: 0 0 auto;
}

.freq-fullscreen-top .freq-filter-inline .el-button+.el-button {
  margin-left: 0;
}

/* teleported 到 body 时必须高于全屏 Dialog，否则展开列表被挡在弹窗后面 */
.vibration-axis-select-dropdown.el-popper {
  background: #1a2a6e !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  font-size: $vibration-axis-font-size;
  z-index: 10000 !important;
}

.vibration-axis-select-dropdown .el-select-dropdown__item {
  color: rgba(255, 255, 255, 0.9);
  font-size: $vibration-axis-font-size;
}

.vibration-axis-select-dropdown .el-select-dropdown__item.is-hovering,
.vibration-axis-select-dropdown .el-select-dropdown__item:hover {
  background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 800px) {
  .common-echarts-fullscreen-modal .el-dialog {
    height: 500px !important;
    max-height: 500px !important;
  }

  .freq-fullscreen-top {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .freq-filter-inline {
    flex-wrap: wrap;
    white-space: normal;
  }

  /* 振动点位页：弹窗内图表高度固定（仅手机端） */
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
