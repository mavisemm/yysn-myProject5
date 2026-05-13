<template>
  <div class="card-item freq-card" :class="{ 'freq-card--inline-light': inlineChartTheme === 'light' }">
    <div class="card-header">
      <div class="card-header-leading">
        <div class="card-title app-section-title">{{ chartTitle }}</div>
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
        :fullscreen-auto-y-axis-on-zoom="!freqFullscreenYUseCustom" enable-fullscreen
        :fullscreen-title="fullscreenTitle" fullscreen-background="#142060" @chart-ready="onFreqChartReady"
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
            <el-button size="small" type="primary" @click="confirmFreqFullscreenYAxisRange">锁定范围</el-button>
            <el-button size="small" @click="resetFreqFullscreenYAxisRange">取消锁定</el-button>
            <span class="freq-filter-divider" aria-hidden="true" />
            <span class="freq-filter-label">倍频数量：</span>
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
            <span class="freq-filter-divider" aria-hidden="true" />
            <span class="freq-fullscreen-mouse-mode-hint">
              <el-icon class="freq-fullscreen-mouse-mode-hint__icon">
                <WarningFilled />
              </el-icon>
              <span class="freq-fullscreen-mouse-mode-hint__text">
                按 R 切换到提示条阅读模式（默认打开打标功能，按 R 关闭打标功能）。阅读模式下，点击图面可固定当前鼠标位置的提示条和倍频线。</span>
            </span>
          </div>
        </template>
      </CommonEcharts>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, shallowRef, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { CommonEcharts } from '@/components/common/chart'
import { useRangeControls } from '@/composables/useRangeControls'
import {
  getVibrationFrequencyData,
  getVibrationMetricData,
  type VibrationAxis,
  type VibrationMetricData,
} from '@/api/modules/device'
import { FullScreen, WarningFilled } from '@element-plus/icons-vue'
import {
  buildPersistentMarkPointData,
  removeCurrentPersistentPoint,
  upsertPersistentPoint,
  type EchartsPersistentPoint,
} from '@/utils/echartsPointMarker'

const props = withDefaults(
  defineProps<{
    /** 测点 receiver id（已解析后的字符串） */
    receiverId: string
    /** 设备 id（已解析） */
    pointDeviceId: string
    alarmTime?: number
    chartTitle?: string
    fullscreenTitle?: string
    /** 小图坐标轴配色：light 适合白底卡片内嵌；全屏仍为深色底 */
    inlineChartTheme?: 'dark' | 'light'
  }>(),
  {
    alarmTime: 0,
    chartTitle: '振动速度频域图',
    fullscreenTitle: '振动速度频域图',
    inlineChartTheme: 'dark',
  },
)

const emit = defineEmits<{
  (e: 'frequency-data-state', payload: { hasData: boolean }): void
}>()

const receiverIdResolved = computed(() => props.receiverId)
const pointDeviceId = computed(() => props.pointDeviceId)

/** 报警详情回看传入；振动点位页默认为 0，此时请求体不带 alarmTime */
const vibrationAlarmTimeArg = computed(() => {
  const at = Number(props.alarmTime)
  return Number.isFinite(at) && at > 0 ? at : undefined
})

const freqChartRef = ref<InstanceType<typeof CommonEcharts>>()
/** CommonEcharts 频域全屏打开时为 true，用于同一套 option 下区分 tooltip 倍频行数 */
const freqFullscreenUiActive = ref(false)
const chartAxisColor = computed(() => {
  if (freqFullscreenUiActive.value) return '#fff'
  return props.inlineChartTheme === 'light' ? '#303133' : '#fff'
})
const chartSplitLineColor = computed(() => {
  if (freqFullscreenUiActive.value) return 'rgba(255,255,255,0.1)'
  return props.inlineChartTheme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)'
})
/**
 * 仅控制「共享 freqOption」里是否带右侧有效值柱与双 grid；与 freqFullscreenUiActive 分离，
 * 以便在 @fullscreen-closing 时立刻关掉，避免关全屏动画期间小图先露出仍带有效值而闪现。
 */
const freqFullscreenRmsLayoutInOption = ref(false)
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
let fullscreenFreqFinishedCleanup: (() => void) | null = null
/** 仅在全屏切轴/初次打开后做一次有效值上界兜底，避免每次缩放都强制改 y 轴 */
let pendingFullscreenRmsYClamp = false
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
/** 全屏频域：打标点击与「移入 Tooltip 细读/锁定」分时启用，避免抢鼠标（默认打标；按 R 切换） */
const freqFullscreenMouseMode = ref<'pin' | 'read'>('pin')
let freqFullscreenMouseModeKeydownCleanup: (() => void) | null = null

const isFreqFullscreenEditableKeyTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null
  if (!el?.closest) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  if (el.closest('.el-input__inner, .el-textarea__inner, [contenteditable="true"]')) return true
  return false
}

const onFreqFullscreenMouseModeKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'r' && e.key !== 'R') return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (!freqFullscreenUiActive.value) return
  if (isFreqFullscreenEditableKeyTarget(e.target)) return
  e.preventDefault()
  freqFullscreenMouseMode.value = freqFullscreenMouseMode.value === 'pin' ? 'read' : 'pin'
}

const detachFreqFullscreenMouseModeHotkey = () => {
  freqFullscreenMouseModeKeydownCleanup?.()
  freqFullscreenMouseModeKeydownCleanup = null
}

const attachFreqFullscreenMouseModeHotkey = () => {
  detachFreqFullscreenMouseModeHotkey()
  window.addEventListener('keydown', onFreqFullscreenMouseModeKeydown, true)
  freqFullscreenMouseModeKeydownCleanup = () => {
    window.removeEventListener('keydown', onFreqFullscreenMouseModeKeydown, true)
    freqFullscreenMouseModeKeydownCleanup = null
  }
}

const openFreqFullscreen = () => {
  ; (freqChartRef.value as any)?.openFullscreen?.()
}

const freqData = ref<{ frequency: number[]; freqSpeedData: number[] }>({
  frequency: [],
  freqSpeedData: [],
})
const metricData = ref<VibrationMetricData>({})

const axisOptions: { label: string; value: VibrationAxis }[] = [
  { label: 'X轴', value: 'X' },
  { label: 'Y轴', value: 'Y' },
  { label: 'Z轴', value: 'Z' },
]

const freqAxis = ref<VibrationAxis>('X')

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

const formatRmsBarValue = (v: number | undefined) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return '0.00000'
  return n.toFixed(5)
}

const toFreqKey = (v: number) => v.toFixed(FREQ_MATCH_DECIMALS)

const clampHarmonicMaxOrder = (raw: unknown) => {
  const v = Math.round(Number(raw))
  if (!Number.isFinite(v)) return 4
  return Math.min(HARMONIC_ORDER_MAX, Math.max(HARMONIC_ORDER_MIN, v))
}

const harmonicOrderLabel = (order: number) => `${order}倍频`

const harmonicMarkLineColor = (order: number) => {
  if (order === 1) return '#ffffff'
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
    // 全屏右侧有效值柱状图使用第二条 yAxis（与主 yAxis 同尺度），这里需一并更新
    inst.setOption({ yAxis: [{ min, max }, { min, max }] } as any, { notMerge: false, lazyUpdate: true })
  } catch {
    // ignore
  }
}

const getCurrentAxisVelocityRms = () => {
  const axisLabel = freqAxis.value
  return axisLabel === 'X'
    ? Number(metricData.value.xvelocityRms ?? 0)
    : axisLabel === 'Y'
      ? Number(metricData.value.yvelocityRms ?? 0)
      : Number(metricData.value.zvelocityRms ?? 0)
}

/** 全屏自动 Y 轴兜底：确保上界至少覆盖当前轴有效值，避免切轴后上界被自动计算压小 */
const ensureFullscreenFreqYAxisIncludesRms = () => {
  if (freqFullscreenYUseCustom.value) return
  const inst = fullscreenFreqChartInstance.value
  if (!inst || !freqFullscreenUiActive.value) return
  try {
    if (typeof inst.isDisposed === 'function' && inst.isDisposed()) return
    const opt = inst.getOption() as any
    const y0 = Array.isArray(opt?.yAxis) ? opt.yAxis[0] : opt?.yAxis
    const mn = Number(y0?.min)
    const mx = Number(y0?.max)
    const rms = getCurrentAxisVelocityRms()
    if (!Number.isFinite(mn) || !Number.isFinite(mx) || !Number.isFinite(rms)) return
    if (mx + FREQ_Y_AXIS_STEP >= rms) return
    patchFullscreenFreqYAxisRange(mn, rms)
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
  if (
    !freqFullscreenUiActive.value ||
    freqFullscreenMouseMode.value !== 'pin' ||
    freqFullscreenTooltipLocked.value
  ) {
    return
  }
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

/** 全屏：点击图表锁定 tooltip；鼠标离开 tooltip 后 2s 取消固定 */
const freqFullscreenTooltipLocked = ref(false)
/** 与锁定 tooltip 一致的频率（Hz），用于轴线与倍频竖线 */
const freqFullscreenLockedAxisX = ref<number | null>(null)
const freqFullscreenTooltipPinnedHtml = ref('')
const freqFullscreenTooltipPinnedVisible = ref(false)
const freqFullscreenStablePair = ref<[number, number] | null>(null)
const freqFullscreenLastFormatterPair = ref<[number, number] | null>(null)
let freqFullscreenStablePairTimer: ReturnType<typeof setTimeout> | null = null
const FREQ_FULLSCREEN_STABLE_MS = 90
let freqFullscreenTooltipDocHandlersCleanup: (() => void) | null = null
let freqFullscreenTooltipPinLeaveTimer: ReturnType<typeof setTimeout> | null = null
const FREQ_FULLSCREEN_TOOLTIP_PIN_LEAVE_MS = 2000
let freqFullscreenReadClickCancelAt = 0
const FREQ_FULLSCREEN_READ_CLICK_CANCEL_DEBOUNCE_MS = 200

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
  freqFullscreenTooltipPinnedVisible.value = false
  freqFullscreenStablePair.value = null
  freqFullscreenLastFormatterPair.value = null
  clearFreqFullscreenStablePairTimer()
  if (freqFullscreenTooltipPinLeaveTimer != null) {
    clearTimeout(freqFullscreenTooltipPinLeaveTimer)
    freqFullscreenTooltipPinLeaveTimer = null
  }
}

const clearFreqFullscreenTooltipPinLeaveTimer = () => {
  if (freqFullscreenTooltipPinLeaveTimer == null) return
  clearTimeout(freqFullscreenTooltipPinLeaveTimer)
  freqFullscreenTooltipPinLeaveTimer = null
}

const scheduleFreqFullscreenTooltipPinLeaveReset = () => {
  if (!freqFullscreenUiActive.value || freqFullscreenMouseMode.value !== 'read') return
  if (!freqFullscreenTooltipLocked.value) return
  clearFreqFullscreenTooltipPinLeaveTimer()
  freqFullscreenTooltipPinLeaveTimer = setTimeout(() => {
    freqFullscreenTooltipPinLeaveTimer = null
    if (!freqFullscreenUiActive.value || freqFullscreenMouseMode.value !== 'read') return
    if (!freqFullscreenTooltipLocked.value) return
    // 2 秒后仅隐藏固定 tooltip，不退出固定模式（倍频线与锁定频率保持）
    freqFullscreenTooltipPinnedVisible.value = false
    refreshVcFullscreenFreqTooltipOption()
  }, FREQ_FULLSCREEN_TOOLTIP_PIN_LEAVE_MS)
}

const isClientPointInElement = (clientX: number, clientY: number, el: HTMLElement) => {
  const r = el.getBoundingClientRect()
  return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
}

const maybeStartFreqFullscreenTooltipPinLeaveTimerByClientPoint = (
  clientX: number | null,
  clientY: number | null,
) => {
  // tooltip 是 appendToBody 的，可能需要下一帧才生成出来
  if (clientX == null || clientY == null) {
    scheduleFreqFullscreenTooltipPinLeaveReset()
    return
  }
  if (!freqFullscreenUiActive.value) return
  let tries = 6
  const tick = () => {
    if (tries-- <= 0) {
      scheduleFreqFullscreenTooltipPinLeaveReset()
      return
    }
    if (!freqFullscreenUiActive.value || freqFullscreenMouseMode.value !== 'read') return
    if (!freqFullscreenTooltipLocked.value) return
    const tooltipEl = document.querySelector('.echarts-tooltip') as HTMLElement | null
    if (!tooltipEl) {
      requestAnimationFrame(tick)
      return
    }
    if (isClientPointInElement(clientX, clientY, tooltipEl)) return
    scheduleFreqFullscreenTooltipPinLeaveReset()
  }
  requestAnimationFrame(tick)
}

const lockFreqFullscreenTooltipByFreqPair = (xy: [number, number]) => {
  if (!freqFullscreenUiActive.value) return
  clearFreqFullscreenTooltipPinLeaveTimer()
  clearFreqFullscreenStablePairTimer()

  freqFullscreenTooltipLocked.value = true
  freqFullscreenLockedAxisX.value = xy[0]
  freqFullscreenStablePair.value = xy
  freqFullscreenLastFormatterPair.value = xy
  pointerBaseFreq.value = xy[0]
  lastHarmonicBaseFreq = null
  scheduleHarmonicMarkLines(xy[0])
  syncVcFreqChartsAxisPointerToValue(xy[0])

  const html = buildVcFullscreenPinnedTooltipHtmlFromStable()
  freqFullscreenTooltipPinnedHtml.value = html
  freqFullscreenTooltipPinnedVisible.value = true
  refreshVcFullscreenFreqTooltipOption()
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
      v != null && Number.isFinite(Number(v))
        ? freqFullscreenMouseMode.value === 'read'
          ? pickNearestFreqPointByX(Number(v))
          : resolveFreqPinPointByRefX(Number(v))
        : null
    freqFullscreenStablePair.value = pt
  }, FREQ_FULLSCREEN_STABLE_MS)
})

const detachFreqFullscreenTooltipLockHandlers = () => {
  freqFullscreenTooltipDocHandlersCleanup?.()
  freqFullscreenTooltipDocHandlersCleanup = null
}

const applyVcFullscreenTooltipPointerModeToInst = (inst: echarts.ECharts) => {
  const read = freqFullscreenMouseMode.value === 'read'
  try {
    inst.setOption(
      { tooltip: { enterable: read, hideDelay: read ? 2000 : 2000 } } as EChartsOption,
      { lazyUpdate: true },
    )
  } catch { }
}

/** 仅切换打标/阅读时改 enterable、hideDelay，避免 replaceMerge 整段 tooltip 导致整图闪动 */
const patchVcFullscreenTooltipPointerModeOnly = () => {
  void nextTick(() => {
    const inst = fullscreenFreqChartInstance.value
    if (!inst || !freqFullscreenUiActive.value) return
    applyVcFullscreenTooltipPointerModeToInst(inst)
  })
}

const refreshVcFullscreenFreqTooltipOption = () => {
  void nextTick(() => {
    const inst = fullscreenFreqChartInstance.value
    if (!inst) return
    try {
      const opt = freqOption.value as { tooltip?: unknown }
      if (!opt?.tooltip) return
      inst.setOption({ tooltip: opt.tooltip }, { replaceMerge: ['tooltip'], lazyUpdate: true })
      applyVcFullscreenTooltipPointerModeToInst(inst)
    } catch { }
  })
}

const syncFreqFullscreenTooltipLockHandlers = (opts?: { pointerModeOnly?: boolean }) => {
  if (!freqFullscreenUiActive.value) return
  resetFreqFullscreenTooltipLock()
  if (freqFullscreenMouseMode.value === 'read') {
    attachFreqFullscreenTooltipLockHandlers()
  } else {
    detachFreqFullscreenTooltipLockHandlers()
  }
  if (opts?.pointerModeOnly) {
    patchVcFullscreenTooltipPointerModeOnly()
  } else {
    refreshVcFullscreenFreqTooltipOption()
  }
}

watch(freqFullscreenMouseMode, () => {
  syncFreqFullscreenTooltipLockHandlers({ pointerModeOnly: true })
})

const attachFreqFullscreenTooltipLockHandlers = () => {
  detachFreqFullscreenTooltipLockHandlers()
  const onMouseOver = (e: MouseEvent) => {
    if (!freqFullscreenUiActive.value || freqFullscreenMouseMode.value !== 'read') return
    if (!freqFullscreenTooltipLocked.value) return
    const el = e.target as HTMLElement | null
    if (!el?.closest?.('.echarts-tooltip')) return
    clearFreqFullscreenTooltipPinLeaveTimer()
    freqFullscreenTooltipPinnedVisible.value = true
    refreshVcFullscreenFreqTooltipOption()
  }

  const onMouseOut = (e: MouseEvent) => {
    if (!freqFullscreenUiActive.value || freqFullscreenMouseMode.value !== 'read') return
    if (!freqFullscreenTooltipLocked.value) return
    const from = (e.target as HTMLElement | null)?.closest?.('.echarts-tooltip')
    if (!from) return
    const to = e.relatedTarget as Node | null
    if (to && from.contains(to)) return
    scheduleFreqFullscreenTooltipPinLeaveReset()
  }

  const onDocClick = (e: MouseEvent) => {
    if (!freqFullscreenUiActive.value || freqFullscreenMouseMode.value !== 'read') return
    if (!freqFullscreenTooltipLocked.value) return
    const el = e.target as HTMLElement | null
    if (el?.closest?.('.echarts-tooltip')) return
    freqFullscreenReadClickCancelAt = Date.now()
    clearFreqFullscreenTooltipPinLeaveTimer()
    resetFreqFullscreenTooltipLock()
    refreshVcFullscreenFreqTooltipOption()
  }

  document.addEventListener('mouseover', onMouseOver, true)
  document.addEventListener('mouseout', onMouseOut, true)
  document.addEventListener('click', onDocClick, true)
  freqFullscreenTooltipDocHandlersCleanup = () => {
    document.removeEventListener('mouseover', onMouseOver, true)
    document.removeEventListener('mouseout', onMouseOut, true)
    document.removeEventListener('click', onDocClick, true)
  }
}

const freqOption = computed<EChartsOption>(() => {
  if (!freqData.value.frequency.length) return {}

  const tooltipHarmonicMaxOrder = freqFullscreenUiActive.value
    ? clampHarmonicMaxOrder(freqHarmonicMaxOrderCommitted.value)
    : INLINE_HARMONIC_MAX_ORDER

  const { chartData, xMin, xMax } = getSortedFreqChartData()
  const { yMinWithMargin, yMaxWithMargin } = getFreqAutoYBounds(chartData)
  const axisLabel = freqAxis.value
  const currentAxisRms = getCurrentAxisVelocityRms()
  // 自动范围下，全屏才取「频谱上界 vs 当前轴有效值」较大者，避免影响小图
  // 注意：频域图内嵌与全屏共用一套 option。全屏手动 Y 轴范围不要写进 option，
  // 否则会同步影响外面小图；全屏手动范围由 fullscreen 实例 setOption 局部 patch。
  const yAxisMin = yMinWithMargin
  const yAxisMax = freqFullscreenRmsLayoutInOption.value
    ? Math.max(yMaxWithMargin, currentAxisRms)
    : yMaxWithMargin

  const c = chartAxisColor.value
  const s = chartSplitLineColor.value

  const showRmsBars = freqFullscreenRmsLayoutInOption.value
  const axisColor = axisLabel === 'X' ? '#7ecba1' : axisLabel === 'Y' ? '#ffd166' : '#ff6b6b'

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
      // 全屏下 enterable/hideDelay 仅通过 patchVcFullscreenTooltipPointerModeOnly 打到实例上，
      // 避免写入此处导致 freqOption 随 R 键变化、CommonEcharts 整 option 重绘闪屏。
      ...(freqFullscreenUiActive.value
        ? { appendToBody: true, enterable: false, hideDelay: 2000 }
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
          freqFullscreenTooltipPinnedVisible.value &&
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
    grid: showRmsBars
      ? [
        { top: 30, left: 40, right: 180, bottom: 35, containLabel: true },
        { top: 30, right: 16, width: 140, bottom: 35, containLabel: true },
      ]
      : { top: 30, left: 40, right: 50, bottom: 35, containLabel: true },
    xAxis: showRmsBars
      ? [
        {
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
        {
          type: 'category',
          gridIndex: 1,
          data: [`${axisLabel}轴的速度有效值`],
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: {
            color: c,
            fontSize: 11,
            interval: 0,
            hideOverlap: false,
            width: 132,
            overflow: 'break',
          },
          splitLine: { show: false },
        },
      ]
      : {
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
    yAxis: showRmsBars
      ? [
        {
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
        {
          type: 'value',
          gridIndex: 1,
          min: yAxisMin,
          max: yAxisMax,
          axisLabel: { show: false },
          axisTick: { show: false },
          axisLine: { show: false },
          splitLine: { show: false },
        },
      ]
      : {
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
      ...(showRmsBars
        ? [
          {
            id: 'freq-rms-bars',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            tooltip: {
              trigger: 'item',
              formatter: (p: any) => {
                const v = Number(p?.value ?? 0)
                return `${axisLabel}轴速度有效值：${formatRmsBarValue(v)} mm/s`
              },
            },
            barWidth: 36,
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
              color: axisColor,
            },
            label: {
              show: true,
              position: 'top',
              color: '#fff',
              fontSize: 11,
              formatter: (p: any) => `${formatRmsBarValue(p?.value)} mm/s`,
            },
            data: [currentAxisRms],
          },
        ]
        : []),
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
  if (freqFullscreenMouseMode.value === 'read') return
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

const resolveFreqPinPairByClickPixel = (
  inst: echarts.ECharts,
  offsetX: number,
  offsetY: number,
): [number, number] | null => {
  if (!inst || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null
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
  } catch {
    return null
  }
  const x = Array.isArray(axisValue) ? Number(axisValue[0]) : Number(axisValue)
  if (!Number.isFinite(x)) return null
  return resolveFreqPinPointByRefX(x)
}

const onFreqFullscreenChartClick = (params: any) => {
  if (freqFullscreenMouseMode.value === 'read') return
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

const onFreqFullscreenClosing = () => {
  freqFullscreenRmsLayoutInOption.value = false
}

const onFreqFullscreenChartReady = (inst: echarts.ECharts) => {
  console.log('[freq-pin] fullscreen chart ready')
  freqFullscreenUiActive.value = true
  freqFullscreenRmsLayoutInOption.value = true
  freqFullscreenMouseMode.value = 'pin'
  if (!freqFullscreenYUseCustom.value) {
    initFreqFullscreenYInputsFromData()
  }
  clearFreqHarmonicDebounce()
  freqHarmonicMaxOrderInput.value = freqHarmonicMaxOrderCommitted.value
  resetFreqFullscreenTooltipLock()
  fullscreenFreqChartInstance.value = inst
  pendingFullscreenRmsYClamp = true
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
  if (fullscreenFreqFinishedCleanup) {
    fullscreenFreqFinishedCleanup()
    fullscreenFreqFinishedCleanup = null
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
  const onFreqFullscreenFinished = () => {
    if (!freqFullscreenYUseCustom.value) {
      if (pendingFullscreenRmsYClamp) {
        ensureFullscreenFreqYAxisIncludesRms()
        pendingFullscreenRmsYClamp = false
      }
      syncFreqFullscreenYInputsFromChartOption()
    }
  }
  inst.on('finished', onFreqFullscreenFinished)
  inst.on('click', onFreqFullscreenChartClick)
  const zr = inst.getZr?.()
  const onZrClick = (evt: any) => {
    if (freqFullscreenMouseMode.value === 'read') {
      // 如果是“取消固定”的那次点击，不要再触发锁定
      if (Date.now() - freqFullscreenReadClickCancelAt < FREQ_FULLSCREEN_READ_CLICK_CANCEL_DEBOUNCE_MS) return
      if (freqFullscreenTooltipLocked.value) return
      const nativeEvt = evt?.event as MouseEvent | undefined
      const clientX = typeof nativeEvt?.clientX === 'number' ? nativeEvt.clientX : null
      const clientY = typeof nativeEvt?.clientY === 'number' ? nativeEvt.clientY : null
      // 关键点：点击锁定时必须与当前 tooltip 展示的一致。
      // tooltip 的频率来源于当前鼠标悬停时 axisPointer 命中的谱点，所以优先锁定 lastFormatterPair。
      const xy =
        freqFullscreenLastFormatterPair.value ??
        freqFullscreenStablePair.value ??
        (typeof pointerBaseFreq.value === 'number' && Number.isFinite(pointerBaseFreq.value)
          ? pickNearestFreqPointByX(pointerBaseFreq.value)
          : null)
      if (!xy) return
      lockFreqFullscreenTooltipByFreqPair(xy)
      maybeStartFreqFullscreenTooltipPinLeaveTimerByClientPoint(clientX, clientY)
      return
    }
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
  fullscreenFreqFinishedCleanup = () => {
    try {
      inst.off('finished', onFreqFullscreenFinished)
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
  syncFreqFullscreenTooltipLockHandlers()
  attachFreqFullscreenMouseModeHotkey()
}

const onFreqFullscreenClosed = () => {
  if (freqFullscreenYInputSyncTimer != null) {
    clearTimeout(freqFullscreenYInputSyncTimer)
    freqFullscreenYInputSyncTimer = null
  }
  cancelFreqFullscreenPeakSnapRaf()
  detachFreqFullscreenMouseModeHotkey()
  detachFreqFullscreenTooltipLockHandlers()
  resetFreqFullscreenTooltipLock()
  freqFullscreenYUseCustom.value = false
  freqFullscreenRmsLayoutInOption.value = false
  freqFullscreenUiActive.value = false
  pendingFullscreenRmsYClamp = false
  fullscreenFreqChartInstance.value = null
  if (fullscreenFreqPointerCleanup) {
    fullscreenFreqPointerCleanup()
    fullscreenFreqPointerCleanup = null
  }
  if (fullscreenFreqFinishedCleanup) {
    fullscreenFreqFinishedCleanup()
    fullscreenFreqFinishedCleanup = null
  }
  if (fullscreenFreqClickCleanup) {
    fullscreenFreqClickCleanup()
    fullscreenFreqClickCleanup = null
  }
  if (fullscreenFreqZrClickCleanup) {
    fullscreenFreqZrClickCleanup()
    fullscreenFreqZrClickCleanup = null
  }
  void nextTick(() => {
    patchInlinePinnedMarkPoints()
  })
}

const notifyFrequencyDataState = () => {
  const fd = freqData.value.frequency
  const sp = freqData.value.freqSpeedData
  const hasData =
    Array.isArray(fd) && Array.isArray(sp) && fd.length > 0 && sp.length > 0
  emit('frequency-data-state', { hasData })
}

const loadFreqData = async () => {
  if (!pointDeviceId.value || !receiverIdResolved.value) {
    freqData.value = { frequency: [], freqSpeedData: [] }
    notifyFrequencyDataState()
    return
  }

  try {
    const freqResponse = await getVibrationFrequencyData(
      pointDeviceId.value,
      receiverIdResolved.value,
      freqAxis.value,
      vibrationAlarmTimeArg.value,
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
    notifyFrequencyDataState()
  } catch (error) {
    console.error('获取振动频域数据失败:', error)
    freqData.value = { frequency: [], freqSpeedData: [] }
    if (freqFullscreenUiActive.value && !freqFullscreenYUseCustom.value) {
      void nextTick(() => initFreqFullscreenYInputsFromData())
    }
    notifyFrequencyDataState()
  }
}

const loadMetricData = async () => {
  if (!pointDeviceId.value || !receiverIdResolved.value) return
  try {
    const res = await getVibrationMetricData(pointDeviceId.value, receiverIdResolved.value)
    if (res.rc === 0 && res.ret) {
      metricData.value = res.ret
    } else {
      metricData.value = {}
    }
  } catch {
    metricData.value = {}
  }
}

const loadFreqChartData = async () => {
  await Promise.all([loadFreqData(), loadMetricData()])
}

watch(
  [receiverIdResolved, pointDeviceId, () => props.alarmTime],
  ([rid, pid]) => {
    if (!rid || !pid) return
    clearAllPinnedPoints()
    void loadFreqChartData()
  },
  { immediate: true },
)

watch(freqAxis, () => {
  if (!receiverIdResolved.value || !pointDeviceId.value) return
  clearAllPinnedPoints()
  if (freqFullscreenUiActive.value && !freqFullscreenYUseCustom.value) {
    pendingFullscreenRmsYClamp = true
  }
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

onUnmounted(() => {
  cancelFreqFullscreenPeakSnapRaf()
  detachFreqFullscreenMouseModeHotkey()
  detachFreqFullscreenTooltipLockHandlers()
  if (freqChartCleanup) {
    freqChartCleanup()
    freqChartCleanup = null
  }
  if (fullscreenFreqPointerCleanup) {
    fullscreenFreqPointerCleanup()
    fullscreenFreqPointerCleanup = null
  }
  if (fullscreenFreqFinishedCleanup) {
    fullscreenFreqFinishedCleanup()
    fullscreenFreqFinishedCleanup = null
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
.card-item.freq-card {
  width: 100%;
  min-height: 0;
}

.card-item.freq-card.freq-card--inline-light {
  flex: 1;
  min-height: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;

  .card-title {
    color: rgba(0, 0, 0, 0.72);
  }

  :deep(.freq-fullscreen-btn) {
    color: rgba(0, 0, 0, 0.78) !important;
  }

  :deep(.freq-fullscreen-btn:hover),
  :deep(.freq-fullscreen-btn:focus),
  :deep(.freq-fullscreen-btn:active) {
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }

  :deep(.freq-fullscreen-btn .el-icon) {
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
    padding: 10px 10px 0 10px;
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

    :deep(.freq-fullscreen-btn:hover),
    :deep(.freq-fullscreen-btn:focus),
    :deep(.freq-fullscreen-btn:active) {
      background-color: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }

    :deep(.freq-fullscreen-btn .el-icon) {
      color: #fff !important;
      margin-left: 4px;
      font-size: 0.8rem;
    }
  }

  .chart-container {
    flex: 1;
    width: 100%;
    min-height: 0;
    padding: 10px 10px 10px 10px;
    position: relative;
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

.freq-card--inline-light .vibration-axis-select .el-select__wrapper {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.freq-card--inline-light .vibration-axis-select .el-select__placeholder,
.freq-card--inline-light .vibration-axis-select .el-select__selected-item {
  color: rgba(0, 0, 0, 0.88);
}

.freq-card--inline-light .vibration-axis-select .el-select__caret {
  color: rgba(0, 0, 0, 0.45);
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

.freq-fullscreen-mouse-mode-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.86);
  flex-shrink: 0;
}

.freq-fullscreen-mouse-mode-hint__icon {
  color: #f7c948;
  font-size: 14px;
}

.freq-fullscreen-mouse-mode-hint__text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
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
