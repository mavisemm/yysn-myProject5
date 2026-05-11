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
          :fullscreen-auto-y-axis-on-zoom="!freqFullscreenYUseCustom" enable-fullscreen fullscreen-title="振动速度频域图"
          fullscreen-background="#142060" @chart-ready="onFreqChartReady"
          @fullscreen-chart-ready="onFreqFullscreenChartReady" @fullscreen-closing="onFreqFullscreenClosing"
          @fullscreen-closed="onFreqFullscreenClosed">
          <template #fullscreen-body-top>
            <div class="freq-fullscreen-top freq-filter-inline">
              <el-select v-model="freqAxis" class="vibration-axis-select" size="small" teleported :show-arrow="false"
                popper-class="vibration-axis-select-dropdown">
                <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <span class="freq-filter-divider" aria-hidden="true" />
              <span class="freq-filter-label">频率范围：</span>
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
              <span class="freq-filter-label">Y 轴范围：</span>
              <el-input-number v-model="freqFullscreenYMinInput" :step="FREQ_Y_AXIS_STEP"
                :precision="FREQ_Y_AXIS_PRECISION" size="small" controls-position="right"
                class="freq-filter-num freq-y-axis-num" />
              <span class="freq-filter-sep">~</span>
              <el-input-number v-model="freqFullscreenYMaxInput" :step="FREQ_Y_AXIS_STEP"
                :precision="FREQ_Y_AXIS_PRECISION" size="small" controls-position="right"
                class="freq-filter-num freq-y-axis-num" />
              <el-button size="small" type="primary" @click="confirmFreqFullscreenYAxisRange">确认</el-button>
              <el-button size="small" @click="resetFreqFullscreenYAxisRange">恢复自动</el-button>
              <span class="freq-filter-divider" aria-hidden="true" />
              <span class="freq-filter-label">倍频最高阶：</span>
              <el-input-number v-model="freqHarmonicMaxOrderInput" :min="HARMONIC_ORDER_MIN" :max="HARMONIC_ORDER_MAX"
                :precision="0" :step="1" size="small" controls-position="right"
                class="freq-filter-num freq-harmonic-order-input" @blur="commitFreqHarmonicMaxOrder" />
              <el-button size="small" type="primary" @click="commitFreqHarmonicMaxOrder">确认</el-button>
              <span class="freq-filter-divider" aria-hidden="true" />
              <span class="freq-filter-label">打标功能：</span>
              <el-tooltip content="开启：指针附近按算法吸附到局部幅值最大的谱点。关闭：打到离指针频率最近的采样点，适合双峰挨得很近时要标「旁边」那个点。" placement="top">
                <span class="freq-filter-label freq-pin-snap-switch-wrap">吸附功能</span>
              </el-tooltip>
              <el-switch v-model="freqPinUsePeakSnap" size="small" class="freq-pin-snap-switch" />
              <span class="freq-filter-label">阈值：</span>
              <el-input-number v-model="autoPinThresholdInput" :min="0" :step="0.0001" :precision="6" size="small"
                controls-position="right" class="freq-filter-num" />
              <el-button size="small" type="primary" @click="autoPinFreqPeaksAboveThreshold">
                一键打标
              </el-button>
              <el-button size="small" :disabled="!currentPinnedPointId" @click="clearCurrentPinnedPoint">
                清除当前标记
              </el-button>
              <el-button size="small" :disabled="!pinnedFreqPoints.length" @click="clearAllPinnedPoints">
                清除全部标记
              </el-button>
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

const props = withDefaults(
  defineProps<{
    receiverId?: string
    deviceId?: string
    alarmTime?: number
  }>(),
  {
    receiverId: '',
    deviceId: '',
    alarmTime: 0,
  },
)

const route = useRoute()
const receiverIdResolved = computed(() => {
  if (props.receiverId) return String(props.receiverId)
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

const pointDeviceId = computed(() => {
  if (props.deviceId) return String(props.deviceId)
  return resolvePointDeviceId(receiverIdResolved.value)
})

const chartAxisColor = computed(() => '#fff')
const chartSplitLineColor = computed(() => 'rgba(255,255,255,0.1)')

const freqChartRef = ref<InstanceType<typeof CommonEcharts>>()
const timeChartRef = ref<InstanceType<typeof CommonEcharts>>()
/** CommonEcharts 频域全屏打开时为 true，用于同一套 option 下区分 tooltip 倍频行数 */
const freqFullscreenUiActive = ref(false)
/** 全屏下用户锁定 Y 轴 (mm/s)，切换 X/Y/Z 时保持同尺度便于对比 */
const freqFullscreenYUseCustom = ref(false)
const freqFullscreenYMinInput = ref(0)
const freqFullscreenYMaxInput = ref(1)
const freqFullscreenYMinCommitted = ref(0)
const freqFullscreenYMaxCommitted = ref(1)
const freqChartInstance = shallowRef<echarts.ECharts | null>(null)
const fullscreenFreqChartInstance = shallowRef<echarts.ECharts | null>(null)
let freqChartCleanup: (() => void) | null = null
let fullscreenFreqPointerCleanup: (() => void) | null = null
let fullscreenFreqClickCleanup: (() => void) | null = null
let fullscreenFreqZrClickCleanup: (() => void) | null = null
/** 全屏频域：mousemove 将轴线指针吸附到局部谱峰（下一帧 dispatch，避免与默认轴指针抢帧） */
let fullscreenFreqPeakSnapRafId: number | null = null
/** 晚于 CommonEcharts 全屏 autoY debounce（默认 120ms）再读 yAxis，用于同步 Y 输入框 */
let freqFullscreenYInputSyncTimer: ReturnType<typeof setTimeout> | null = null
let markLineRafId: number | null = null
let lastHarmonicBaseFreq: number | null = null
const pinnedFreqPoints = ref<EchartsPersistentPoint[]>([])
const currentPinnedPointId = ref<string>('')
const autoPinThresholdInput = ref<number>(0.005)
/** 打标：开启则在参考频率附近窗口内吸附到幅值最大的谱点；关闭则打到离参考频率最近的采样点（便于邻峰、密集谱线时选对点） */
const freqPinUsePeakSnap = ref(true)

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
const HARMONIC_ORDER_MIN = 1
const HARMONIC_ORDER_MAX = 100
/** 非全屏小图倍频竖线固定为默认 4 阶，不与全屏自定义倍频同步 */
const INLINE_HARMONIC_MAX_ORDER = 4
const FREQ_HARMONIC_DEBOUNCE_MS = 400
const freqHarmonicMaxOrderCommitted = ref(4)
const freqHarmonicMaxOrderInput = ref(4)
let freqHarmonicDebounceTimer: ReturnType<typeof setTimeout> | null = null

const clearFreqHarmonicDebounce = () => {
  if (freqHarmonicDebounceTimer != null) {
    clearTimeout(freqHarmonicDebounceTimer)
    freqHarmonicDebounceTimer = null
  }
}

const FREQ_MATCH_DECIMALS = 6
const FREQ_FILTER_PRECISION = 6
const FREQ_FILTER_STEP = 1

/** 全屏手动 Y 轴 (mm/s)，与频域图刻度精度一致 */
const FREQ_Y_AXIS_PRECISION = 5
const FREQ_Y_AXIS_STEP = 0.00001

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

const clampHarmonicMaxOrder = (raw: unknown) => {
  const v = Math.round(Number(raw))
  if (!Number.isFinite(v)) return 4
  return Math.min(HARMONIC_ORDER_MAX, Math.max(HARMONIC_ORDER_MIN, v))
}

const harmonicOrderLabel = (order: number) => `${order}倍频`

const harmonicMarkLineColor = (order: number) => {
  if (order === 1) return '#7ecba1'
  const hue = ((order - 2) * 37 + 210) % 360
  return `hsl(${hue}, 68%, 58%)`
}

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

/** 全屏：与图表一致的自动 Y 轴上下界（含 10% 边距，下界不低于 0） */
const getFreqAutoYBounds = (chartDataArg?: [number, number][]) => {
  const chartData = chartDataArg ?? getSortedFreqChartData().chartData
  const yValues = chartData.map((item) => item[1])
  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 1
  const yMargin = (yMax - yMin) * 0.1
  return {
    yMinWithMargin: Math.max(0, yMin - yMargin),
    yMaxWithMargin: yMax + yMargin,
  }
}

const initFreqFullscreenYInputsFromData = () => {
  if (!freqData.value.frequency.length) return
  const { yMinWithMargin, yMaxWithMargin } = getFreqAutoYBounds()
  const lo = Number(yMinWithMargin.toFixed(FREQ_Y_AXIS_PRECISION))
  const hi = Number(yMaxWithMargin.toFixed(FREQ_Y_AXIS_PRECISION))
  freqFullscreenYMinInput.value = lo
  freqFullscreenYMaxInput.value = hi
  freqFullscreenYMinCommitted.value = lo
  freqFullscreenYMaxCommitted.value = hi
}

/** 自动 Y 时：把输入框同步为当前全屏图上的 Y 轴（含 X 缩放后的局部自适应），便于在放大后直接点「确认」锁定当前视窗尺度 */
const syncFreqFullscreenYInputsFromChartOption = () => {
  if (freqFullscreenYUseCustom.value) return
  const inst = fullscreenFreqChartInstance.value
  if (!inst || !freqFullscreenUiActive.value) return
  try {
    if (typeof inst.isDisposed === 'function' && inst.isDisposed()) return
    const opt = inst.getOption() as any
    const y = Array.isArray(opt.yAxis) ? opt.yAxis[0] : opt.yAxis
    const mn = Number(y?.min)
    const mx = Number(y?.max)
    if (Number.isFinite(mn) && Number.isFinite(mx)) {
      freqFullscreenYMinInput.value = Number(mn.toFixed(FREQ_Y_AXIS_PRECISION))
      freqFullscreenYMaxInput.value = Number(mx.toFixed(FREQ_Y_AXIS_PRECISION))
    }
  } catch {
    /* ignore */
  }
}

const patchFullscreenFreqYAxisRange = (min: number, max: number) => {
  const inst = fullscreenFreqChartInstance.value
  if (!inst || !freqFullscreenUiActive.value) return
  if (!Number.isFinite(min) || !Number.isFinite(max)) return
  try {
    inst.setOption({ yAxis: { min, max } } as any, { notMerge: false, lazyUpdate: true })
  } catch {
    // ignore
  }
}

const confirmFreqFullscreenYAxisRange = () => {
  let lo = Number(freqFullscreenYMinInput.value)
  let hi = Number(freqFullscreenYMaxInput.value)
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return
  if (lo > hi) [lo, hi] = [hi, lo]
  if (Math.abs(hi - lo) < FREQ_Y_AXIS_STEP) hi = lo + FREQ_Y_AXIS_STEP
  freqFullscreenYMinCommitted.value = lo
  freqFullscreenYMaxCommitted.value = hi
  freqFullscreenYMinInput.value = lo
  freqFullscreenYMaxInput.value = hi
  freqFullscreenYUseCustom.value = true
  patchFullscreenFreqYAxisRange(lo, hi)
}

const resetFreqFullscreenYAxisRange = () => {
  freqFullscreenYUseCustom.value = false
  initFreqFullscreenYInputsFromData()
  // 解除自定义后，立即按当前“可见频段”重新走一次自动 Y（不会影响外面小图）
  const inst = fullscreenFreqChartInstance.value
  if (inst && freqFullscreenUiActive.value) {
    requestAnimationFrame(() => {
      syncFreqFullscreenYInputsFromChartOption()
    })
  }
}

const buildHarmonicMarkLineData = (baseFreq: number, maxOrder: number) => {
  if (!Number.isFinite(baseFreq) || baseFreq <= 0) return []
  const { xMax, pointMap } = getSortedFreqChartData()
  const hasExactPoint = (x: number) => pointMap.has(toFreqKey(x))
  const maxOrderClamped = clampHarmonicMaxOrder(maxOrder)
  const candidates: Array<{ name: string; x: number; color: string; requirePoint: boolean }> = []
  for (let k = 1; k <= maxOrderClamped; k++) {
    candidates.push({
      name: '',
      x: baseFreq * k,
      color: harmonicMarkLineColor(k),
      requirePoint: k !== 1,
    })
  }

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

/** 打标吸附：根据谱线间距与频段宽度自适应窗口，在参考频率附近取 Y 最大的点（对准谱峰顶） */
const getFreqPinSnapHalfWidthHz = (): number => {
  const { chartData, xMin, xMax } = getSortedFreqChartData()
  const span = Math.max(xMax - xMin, 1e-9)
  if (chartData.length < 2) {
    return Number.isFinite(span) && span > 0 ? Math.min(span * 0.05, 50) : 15
  }
  const spacings: number[] = []
  for (let i = 1; i < chartData.length; i++) {
    const hi = chartData[i]
    const lo = chartData[i - 1]
    if (!hi || !lo) continue
    spacings.push(hi[0] - lo[0])
  }
  spacings.sort((a, b) => a - b)
  const median = spacings[Math.floor(spacings.length / 2)] ?? 1
  return Math.min(span * 0.04, Math.max(median * 10, median * 4, 3))
}

/** 在参考频率±半窗内选幅值最大的谱线点；窗内无点时退回最近 X 点 */
const pickPeakSnapFreqPoint = (refX: number): [number, number] | null => {
  const { chartData } = getSortedFreqChartData()
  if (!chartData.length || !Number.isFinite(refX)) return null
  const halfW = getFreqPinSnapHalfWidthHz()
  let best: [number, number] | null = null
  let bestY = Number.NEGATIVE_INFINITY
  let bestDx = Number.POSITIVE_INFINITY
  for (const pt of chartData) {
    const dx = Math.abs(pt[0] - refX)
    if (dx > halfW) continue
    const y = pt[1]
    if (y > bestY || (y === bestY && dx < bestDx)) {
      bestY = y
      bestDx = dx
      best = pt
    }
  }
  return best ?? pickNearestFreqPointByX(refX)
}

const resolveFreqPinPointByRefX = (refX: number): [number, number] | null =>
  freqPinUsePeakSnap.value ? pickPeakSnapFreqPoint(refX) : pickNearestFreqPointByX(refX)

const cancelFreqFullscreenPeakSnapRaf = () => {
  if (fullscreenFreqPeakSnapRafId != null) {
    cancelAnimationFrame(fullscreenFreqPeakSnapRafId)
    fullscreenFreqPeakSnapRafId = null
  }
}

/** 鼠标所在频率附近将轴线指针拉到谱峰顶（视觉上竖线与 tooltip 对齐峰顶，便于再打标点） */
const scheduleFreqFullscreenPeakSnapPointer = (offsetX: number, offsetY: number) => {
  if (!freqFullscreenUiActive.value || freqFullscreenTooltipLocked.value) return
  const inst = fullscreenFreqChartInstance.value
  if (!inst || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return
  cancelFreqFullscreenPeakSnapRaf()
  fullscreenFreqPeakSnapRafId = requestAnimationFrame(() => {
    fullscreenFreqPeakSnapRafId = null
    if (!freqFullscreenUiActive.value || freqFullscreenTooltipLocked.value) return
    const inner = fullscreenFreqChartInstance.value
    if (!inner) return
    let axisValue: unknown
    try {
      axisValue = inner.convertFromPixel({ xAxisIndex: 0 }, offsetX as any)
      if (!Number.isFinite(Array.isArray(axisValue) ? Number(axisValue[0]) : Number(axisValue))) {
        axisValue = inner.convertFromPixel({ xAxisIndex: 0 }, [offsetX, offsetY])
      }
      if (!Number.isFinite(Array.isArray(axisValue) ? Number(axisValue[0]) : Number(axisValue))) {
        axisValue = inner.convertFromPixel({ gridIndex: 0 }, [offsetX, offsetY])
      }
    } catch {
      return
    }
    const rawX = Array.isArray(axisValue) ? Number(axisValue[0]) : Number(axisValue)
    if (!Number.isFinite(rawX)) return
    const snapped = resolveFreqPinPointByRefX(rawX)
    if (!snapped) return
    const sx = snapped[0]
    const cur = pointerBaseFreq.value
    if (typeof cur === 'number' && Number.isFinite(cur) && toFreqKey(sx) === toFreqKey(cur)) {
      return
    }
    try {
      inner.dispatchAction({ type: 'updateAxisPointer', xAxisIndex: 0, value: sx } as any)
    } catch { }
  })
}

/** 全屏：移入 tooltip 锁定文案；指针停留 ≥90ms 的稳定频点优先作为快照 */
const freqFullscreenTooltipLocked = ref(false)
/** 与锁定 tooltip 一致的频率（Hz），用于轴线与倍频竖线 */
const freqFullscreenLockedAxisX = ref<number | null>(null)
const freqFullscreenTooltipPinnedHtml = ref('')
const freqFullscreenStablePair = ref<[number, number] | null>(null)
const freqFullscreenLastFormatterPair = ref<[number, number] | null>(null)
let freqFullscreenStablePairTimer: ReturnType<typeof setTimeout> | null = null
const FREQ_FULLSCREEN_STABLE_MS = 90
let freqFullscreenTooltipDocHandlersCleanup: (() => void) | null = null

const clearFreqFullscreenStablePairTimer = () => {
  if (freqFullscreenStablePairTimer != null) {
    clearTimeout(freqFullscreenStablePairTimer)
    freqFullscreenStablePairTimer = null
  }
}

const resetFreqFullscreenTooltipLock = () => {
  freqFullscreenTooltipLocked.value = false
  freqFullscreenLockedAxisX.value = null
  freqFullscreenTooltipPinnedHtml.value = ''
  freqFullscreenStablePair.value = null
  freqFullscreenLastFormatterPair.value = null
  clearFreqFullscreenStablePairTimer()
}

const formatVcFreqTooltipHtmlFromXY = (
  currentX: number,
  currentY: number,
  minX: number,
  maxX: number,
  pointMap: Map<string, [number, number]>,
  harmonicMaxOrder: number,
): string => {
  const mo = clampHarmonicMaxOrder(harmonicMaxOrder)
  let tooltipContent = `${formatFrequency(currentX)}Hz：${currentY.toFixed(10)}`
  const findExactPoint = (x: number) => pointMap.get(toFreqKey(x))
  for (let mult = 2; mult <= mo; mult++) {
    const hf = currentX * mult
    if (hf < minX || hf > maxX) continue
    const pt = findExactPoint(hf)
    if (pt) {
      tooltipContent += `<br/>${harmonicOrderLabel(mult)}：${formatFrequency(hf)}Hz：${pt[1].toFixed(10)}`
    }
  }
  return tooltipContent
}

const resolveVcFullscreenPinnedFreqPair = (): [number, number] | null =>
  freqFullscreenStablePair.value ??
  freqFullscreenLastFormatterPair.value ??
  (pointerBaseFreq.value != null && Number.isFinite(pointerBaseFreq.value)
    ? resolveFreqPinPointByRefX(Number(pointerBaseFreq.value))
    : null)

const buildVcFullscreenPinnedTooltipHtmlFromStable = (): string => {
  const xy = resolveVcFullscreenPinnedFreqPair()
  if (!xy) return ''
  const { chartData, xMin, xMax } = getSortedFreqChartData()
  const pointMap = new Map<string, [number, number]>(
    chartData.map((item) => [toFreqKey(item[0]), item] as [string, [number, number]]),
  )
  const mo = clampHarmonicMaxOrder(freqHarmonicMaxOrderCommitted.value)
  return formatVcFreqTooltipHtmlFromXY(xy[0], xy[1], xMin, xMax, pointMap, mo)
}

watch(pointerBaseFreq, (v) => {
  if (!freqFullscreenUiActive.value || freqFullscreenTooltipLocked.value) return
  clearFreqFullscreenStablePairTimer()
  freqFullscreenStablePairTimer = setTimeout(() => {
    freqFullscreenStablePairTimer = null
    const pt =
      v != null && Number.isFinite(Number(v)) ? resolveFreqPinPointByRefX(Number(v)) : null
    freqFullscreenStablePair.value = pt
  }, FREQ_FULLSCREEN_STABLE_MS)
})

const detachFreqFullscreenTooltipLockHandlers = () => {
  freqFullscreenTooltipDocHandlersCleanup?.()
  freqFullscreenTooltipDocHandlersCleanup = null
}

const refreshVcFullscreenFreqTooltipOption = () => {
  void nextTick(() => {
    const inst = fullscreenFreqChartInstance.value
    if (!inst) return
    try {
      const opt = freqOption.value as { tooltip?: unknown }
      if (!opt?.tooltip) return
      inst.setOption({ tooltip: opt.tooltip }, { replaceMerge: ['tooltip'] })
    } catch { }
  })
}

const attachFreqFullscreenTooltipLockHandlers = () => {
  detachFreqFullscreenTooltipLockHandlers()
  const onMouseOver = (e: MouseEvent) => {
    if (!freqFullscreenUiActive.value || freqFullscreenTooltipLocked.value) return
    const el = e.target as HTMLElement
    if (!el?.closest?.('.echarts-tooltip')) return
    const xy = resolveVcFullscreenPinnedFreqPair()
    if (!xy) return
    const html = buildVcFullscreenPinnedTooltipHtmlFromStable()
    if (!html) return
    freqFullscreenLockedAxisX.value = xy[0]
    freqFullscreenTooltipPinnedHtml.value = html
    freqFullscreenTooltipLocked.value = true
    pointerBaseFreq.value = xy[0]
    lastHarmonicBaseFreq = null
    scheduleHarmonicMarkLines(xy[0])
    syncVcFreqChartsAxisPointerToValue(xy[0])
    refreshVcFullscreenFreqTooltipOption()
  }
  const onMouseOut = (e: MouseEvent) => {
    if (!freqFullscreenUiActive.value || !freqFullscreenTooltipLocked.value) return
    const from = (e.target as HTMLElement | null)?.closest?.('.echarts-tooltip')
    if (!from) return
    const to = e.relatedTarget as Node | null
    if (to && from.contains(to)) return
    resetFreqFullscreenTooltipLock()
    refreshVcFullscreenFreqTooltipOption()
  }
  document.addEventListener('mouseover', onMouseOver, true)
  document.addEventListener('mouseout', onMouseOut, true)
  freqFullscreenTooltipDocHandlersCleanup = () => {
    document.removeEventListener('mouseover', onMouseOver, true)
    document.removeEventListener('mouseout', onMouseOut, true)
  }
}

const freqOption = computed<EChartsOption>(() => {
  if (!freqData.value.frequency.length) return {}

  const tooltipHarmonicMaxOrder = freqFullscreenUiActive.value
    ? clampHarmonicMaxOrder(freqHarmonicMaxOrderCommitted.value)
    : INLINE_HARMONIC_MAX_ORDER

  const { chartData, xMin, xMax } = getSortedFreqChartData()
  const { yMinWithMargin, yMaxWithMargin } = getFreqAutoYBounds(chartData)
  // 注意：频域图内嵌与全屏共用一套 option。全屏手动 Y 轴范围不要写进 option，
  // 否则会同步影响外面小图；全屏手动范围由 fullscreen 实例 setOption 局部 patch。
  const yAxisMin = yMinWithMargin
  const yAxisMax = yMaxWithMargin

  const c = chartAxisColor.value
  const s = chartSplitLineColor.value

  const fullscreenTooltipExtra =
    freqFullscreenUiActive.value &&
    'max-height:calc(100vh - 140px);overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:8px 12px;pointer-events:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;'

  return {
    tooltip: {
      trigger: 'axis',
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: 'rgba(50, 50, 50, 0.9)',
      textStyle: { color: '#fff' },

      confine: true,
      ...(fullscreenTooltipExtra ? { extraCssText: fullscreenTooltipExtra } : {}),
      ...(freqFullscreenUiActive.value
        ? { appendToBody: true, enterable: true, hideDelay: 3000 }
        : {}),
      position: function (pos: any, _params: any, _el: any, _elRect: any, size: any) {
        const [mouseX, mouseY] = pos as [number, number]
        const [contentWidth, contentHeight] = size.contentSize as [number, number]

        const gap = 18
        const hitMargin = 10

        const inst = freqChartInstance.value
        const base = pointerBaseFreq.value
        const avoidPixels: number[] = []
        if (inst && typeof base === 'number' && Number.isFinite(base) && base > 0) {
          const lines = buildHarmonicMarkLineData(base, INLINE_HARMONIC_MAX_ORDER)
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

        const pad = 8
        const vw = typeof size?.viewSize?.[0] === 'number' ? size.viewSize[0] : 0
        const vh = typeof size?.viewSize?.[1] === 'number' ? size.viewSize[1] : 0

        const viewportCap =
          freqFullscreenUiActive.value && typeof window !== 'undefined'
            ? Math.max(80, window.innerHeight - 140)
            : Number.POSITIVE_INFINITY
        const chartCap = vh > 0 ? Math.max(pad * 2, vh - 2 * pad) : Number.POSITIVE_INFINITY
        const contentHeightEff =
          contentHeight > 0 ? Math.min(contentHeight, viewportCap, chartCap) : contentHeight

        const clampTx = (t: number) => {
          if (vw <= 0 || contentWidth <= 0) return t
          const maxTx = Math.max(pad, vw - contentWidth - pad)
          return Math.min(Math.max(t, pad), maxTx)
        }
        const overlapMouseX = (tx: number) => mouseX > tx && mouseX < tx + contentWidth

        const txRightIdeal = mouseX + gap
        const txLeftIdeal = mouseX - contentWidth - gap
        const r = clampTx(txRightIdeal)
        const l = clampTx(txLeftIdeal)

        const mouseInLeftHalf = vw <= 0 || mouseX * 2 <= vw
        let tx: number
        if (mouseInLeftHalf) {
          if (!overlapMouseX(r) && !overlapMouseX(l)) tx = overlapCount(r) <= overlapCount(l) ? r : l
          else if (!overlapMouseX(r)) tx = r
          else if (!overlapMouseX(l)) tx = l
          else tx = overlapCount(r) <= overlapCount(l) ? r : l
        } else {
          if (!overlapMouseX(l) && !overlapMouseX(r)) tx = overlapCount(l) <= overlapCount(r) ? l : r
          else if (!overlapMouseX(l)) tx = l
          else if (!overlapMouseX(r)) tx = r
          else tx = overlapCount(l) <= overlapCount(r) ? l : r
        }

        let ty = mouseY - contentHeightEff / 2
        if (vh > 0 && contentHeightEff > 0) {
          const maxY = Math.max(pad, vh - contentHeightEff - pad)
          ty = Math.min(Math.max(ty, pad), maxY)
        }
        return [tx, ty]
      },
      formatter: function (params: any) {
        if (
          freqFullscreenUiActive.value &&
          freqFullscreenTooltipLocked.value &&
          freqFullscreenTooltipPinnedHtml.value
        ) {
          return freqFullscreenTooltipPinnedHtml.value
        }
        if (!params?.length || !params[0]?.value) return ''
        const data = params[0]
        const currentX = data.value[0]
        const currentY = data.value[1]
        const minX = xMin
        const maxX = xMax
        const pointMap = new Map<string, [number, number]>(
          chartData.map((item) => [toFreqKey(item[0]), item] as [string, [number, number]]),
        )
        if (freqFullscreenUiActive.value && !freqFullscreenTooltipLocked.value) {
          freqFullscreenLastFormatterPair.value = [currentX, currentY]
        }
        return formatVcFreqTooltipHtmlFromXY(
          currentX,
          currentY,
          minX,
          maxX,
          pointMap,
          tooltipHarmonicMaxOrder,
        )
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
      min: yAxisMin,
      max: yAxisMax,
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
    const dataInline = buildHarmonicMarkLineData(baseFreq, INLINE_HARMONIC_MAX_ORDER)
    const dataFullscreen = buildHarmonicMarkLineData(baseFreq, freqHarmonicMaxOrderCommitted.value)
    try {
      if (freqChartInstance.value) {
        freqChartInstance.value.setOption(
          { series: [{ id: 'freq-series', markLine: { data: dataInline } }] } as any,
          { notMerge: false, lazyUpdate: true },
        )
      }
      freqChartRef.value?.patchFullscreenSeriesMarkLine?.('freq-series', dataFullscreen)
    } catch { }
  })
}

const commitFreqHarmonicMaxOrder = () => {
  clearFreqHarmonicDebounce()
  const next = clampHarmonicMaxOrder(freqHarmonicMaxOrderInput.value)
  freqHarmonicMaxOrderInput.value = next
  const prev = freqHarmonicMaxOrderCommitted.value
  freqHarmonicMaxOrderCommitted.value = next
  if (prev === next) return
  resetFreqFullscreenTooltipLock()
  if (freqFullscreenUiActive.value) {
    refreshVcFullscreenFreqTooltipOption()
  }
  lastHarmonicBaseFreq = null
  const base = pointerBaseFreq.value
  if (base == null || !Number.isFinite(base)) return
  const dataInline = buildHarmonicMarkLineData(base, INLINE_HARMONIC_MAX_ORDER)
  const dataFullscreen = buildHarmonicMarkLineData(base, freqHarmonicMaxOrderCommitted.value)
  try {
    if (freqChartInstance.value) {
      freqChartInstance.value.setOption(
        { series: [{ id: 'freq-series', markLine: { data: dataInline } }] } as any,
        { notMerge: false, lazyUpdate: true },
      )
    }
    freqChartRef.value?.patchFullscreenSeriesMarkLine?.('freq-series', dataFullscreen)
  } catch { }
  lastHarmonicBaseFreq = base
}

const scheduleFreqHarmonicDebouncedCommit = () => {
  clearFreqHarmonicDebounce()
  freqHarmonicDebounceTimer = setTimeout(() => {
    freqHarmonicDebounceTimer = null
    commitFreqHarmonicMaxOrder()
  }, FREQ_HARMONIC_DEBOUNCE_MS)
}

watch(freqHarmonicMaxOrderInput, (_v, oldVal) => {
  if (oldVal === undefined) return
  scheduleFreqHarmonicDebouncedCommit()
})

/** tooltip 锁定时轴线与倍频竖线与锁定频率对齐 */
const syncVcFreqChartsAxisPointerToValue = (value: number) => {
  if (!Number.isFinite(value)) return
  const action = { type: 'updateAxisPointer', xAxisIndex: 0, value } as const
  requestAnimationFrame(() => {
    try {
      fullscreenFreqChartInstance.value?.dispatchAction(action as any)
    } catch { }
    try {
      freqChartInstance.value?.dispatchAction(action as any)
    } catch { }
  })
}

const onUpdateAxisPointer = (params: any) => {
  const axesInfo = Array.isArray(params?.axesInfo) ? params.axesInfo : []
  const info0 = axesInfo[0]
  const v = info0?.value
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return

  if (freqFullscreenTooltipLocked.value && freqFullscreenLockedAxisX.value != null) {
    const locked = freqFullscreenLockedAxisX.value
    pointerBaseFreq.value = locked
    scheduleHarmonicMarkLines(locked)
    if (Math.abs(n - locked) > 1e-9) {
      syncVcFreqChartsAxisPointerToValue(locked)
    }
    return
  }

  pointerBaseFreq.value = n
  scheduleHarmonicMarkLines(n)
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

/** 一键打标：标出所有超过阈值的局部峰值点 */
const autoPinFreqPeaksAboveThreshold = () => {
  const threshold = Number(autoPinThresholdInput.value)
  if (!Number.isFinite(threshold) || threshold < 0) return
  autoPinThresholdInput.value = threshold
  const { chartData } = getSortedFreqChartData()
  if (!chartData.length) return

  let nextPoints = pinnedFreqPoints.value
  let currentId = currentPinnedPointId.value
  const lastIndex = chartData.length - 1
  for (let i = 0; i < chartData.length; i++) {
    const cur = chartData[i]
    if (!cur) continue
    const x = cur[0]
    const y = cur[1]
    if (!Number.isFinite(x) || !Number.isFinite(y) || y <= threshold) continue
    const leftY = i > 0 ? (chartData[i - 1]?.[1] ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY
    const rightY = i < lastIndex
      ? (chartData[i + 1]?.[1] ?? Number.NEGATIVE_INFINITY)
      : Number.NEGATIVE_INFINITY
    const isPeak =
      i === 0
        ? y > rightY
        : i === lastIndex
          ? y > leftY
          : y >= leftY && y >= rightY && (y > leftY || y > rightY)
    if (!isPeak) continue
    const state = upsertPersistentPoint(nextPoints, x, y, currentId)
    nextPoints = state.points
    currentId = state.currentId
  }
  pinnedFreqPoints.value = nextPoints
  currentPinnedPointId.value = currentId
  refreshFullscreenPinnedMarkPoints()
}

const addPinnedByPixel = (offsetX: number, offsetY: number) => {
  const inst = fullscreenFreqChartInstance.value
  if (!inst || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return
  // 优先使用轴指针的 x（不依赖点击的 y），满足“按 x 轴打标”；吸附到附近窗口内 Y 最大点（谱峰顶）
  if (Number.isFinite(pointerBaseFreq.value)) {
    const snapped = resolveFreqPinPointByRefX(Number(pointerBaseFreq.value))
    console.log('[freq-pin] use pointerBaseFreq', {
      pointerBaseFreq: pointerBaseFreq.value,
      snapped,
    })
    if (snapped) {
      addPinnedFreqPoint(snapped[0], snapped[1])
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
  const snapped = resolveFreqPinPointByRefX(x)
  console.log('[freq-pin] snap from pixel x', { x, snapped })
  if (!snapped) return
  addPinnedFreqPoint(snapped[0], snapped[1])
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
      if (!freqPinUsePeakSnap.value) {
        addPinnedFreqPoint(x, y)
        return
      }
      const snapped = pickPeakSnapFreqPoint(x)
      console.log('[freq-pin] use direct series value + peak snap', { x, y, snapped })
      if (snapped) {
        addPinnedFreqPoint(snapped[0], snapped[1])
        return
      }
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
  freqFullscreenUiActive.value = true
  if (!freqFullscreenYUseCustom.value) {
    initFreqFullscreenYInputsFromData()
  }
  clearFreqHarmonicDebounce()
  freqHarmonicMaxOrderInput.value = freqHarmonicMaxOrderCommitted.value
  resetFreqFullscreenTooltipLock()
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
  const onFreqFullscreenDataZoom = (params: any) => {
    handleFullscreenDataZoom(params)
    if (!freqFullscreenYUseCustom.value) {
      if (freqFullscreenYInputSyncTimer != null) {
        clearTimeout(freqFullscreenYInputSyncTimer)
        freqFullscreenYInputSyncTimer = null
      }
      freqFullscreenYInputSyncTimer = setTimeout(() => {
        freqFullscreenYInputSyncTimer = null
        syncFreqFullscreenYInputsFromChartOption()
      }, 160)
    }
  }
  inst.on('datazoom', onFreqFullscreenDataZoom)
  inst.on('click', onFreqFullscreenChartClick)
  const zr = inst.getZr?.()
  const onZrClick = (evt: any) => {
    const offsetX = Number(evt?.offsetX)
    const offsetY = Number(evt?.offsetY)
    console.log('[freq-pin] zr click', { offsetX, offsetY })
    addPinnedByPixel(offsetX, offsetY)
  }
  const onZrMouseMove = (evt: any) => {
    scheduleFreqFullscreenPeakSnapPointer(Number(evt?.offsetX), Number(evt?.offsetY))
  }
  zr?.on?.('click', onZrClick)
  zr?.on?.('mousemove', onZrMouseMove)
  fullscreenFreqPointerCleanup = () => {
    if (freqFullscreenYInputSyncTimer != null) {
      clearTimeout(freqFullscreenYInputSyncTimer)
      freqFullscreenYInputSyncTimer = null
    }
    try {
      inst.off('updateAxisPointer', onUpdateAxisPointer)
      inst.off('datazoom', onFreqFullscreenDataZoom)
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
      zr?.off?.('mousemove', onZrMouseMove)
    } catch { }
  }
  console.log('[freq-pin] fullscreen click handlers attached')

  const base = pointerBaseFreq.value
  if (typeof base === 'number' && Number.isFinite(base) && base > 0) {
    const dataFullscreen = buildHarmonicMarkLineData(base, freqHarmonicMaxOrderCommitted.value)
    try {
      freqChartRef.value?.patchFullscreenSeriesMarkLine?.('freq-series', dataFullscreen)
    } catch { }
  }

  patchFullscreenPinnedMarkPoints()
  attachFreqFullscreenTooltipLockHandlers()
}

const onFreqFullscreenClosed = () => {
  if (freqFullscreenYInputSyncTimer != null) {
    clearTimeout(freqFullscreenYInputSyncTimer)
    freqFullscreenYInputSyncTimer = null
  }
  cancelFreqFullscreenPeakSnapRaf()
  detachFreqFullscreenTooltipLockHandlers()
  resetFreqFullscreenTooltipLock()
  freqFullscreenYUseCustom.value = false
  freqFullscreenUiActive.value = false
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
  if (!pointDeviceId.value || !receiverIdResolved.value) return

  try {
    const freqResponse = await getVibrationFrequencyData(
      pointDeviceId.value,
      receiverIdResolved.value,
      freqAxis.value,
      props.alarmTime > 0 ? props.alarmTime : undefined,
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
    if (freqFullscreenUiActive.value && !freqFullscreenYUseCustom.value) {
      void nextTick(() => initFreqFullscreenYInputsFromData())
    }
  } catch (error) {
    console.error('获取振动频域数据失败:', error)
    freqData.value = { frequency: [], freqSpeedData: [] }
    if (freqFullscreenUiActive.value && !freqFullscreenYUseCustom.value) {
      void nextTick(() => initFreqFullscreenYInputsFromData())
    }
  }
}

const loadTimeData = async () => {
  if (!pointDeviceId.value || !receiverIdResolved.value) return

  try {
    const timeResponse = await getVibrationTimeDomainData(
      pointDeviceId.value,
      receiverIdResolved.value,
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
  [receiverIdResolved, pointDeviceId, () => props.alarmTime],
  ([rid, pid]) => {
    if (!rid || !pid) return
    clearAllPinnedPoints()
    void loadVibrationChartsData()
  },
  { immediate: true },
)

watch(freqAxis, () => {
  if (!receiverIdResolved.value || !pointDeviceId.value) return
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
  if (!receiverIdResolved.value || !pointDeviceId.value) return
  void loadTimeData()
})

onUnmounted(() => {
  cancelFreqFullscreenPeakSnapRaf()
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
  clearFreqHarmonicDebounce()
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

/* 全屏顶栏：测点轴与各筛选/打标配置同一 flex 行内并列，统一换行 */
.freq-fullscreen-top.freq-filter-inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  row-gap: 8px;
  column-gap: 10px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  justify-content: flex-start;
}

.time-fullscreen-top {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.freq-filter-inline .freq-filter-label {
  color: #fff;
  font-size: 0.8rem;
}

.freq-fullscreen-top .freq-filter-num {
  width: 90px;
}

.freq-fullscreen-top .freq-y-axis-num {
  width: 108px;
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

.freq-fullscreen-top.freq-filter-inline .el-button+.el-button {
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

  .freq-fullscreen-top.freq-filter-inline {
    justify-content: flex-start;
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
