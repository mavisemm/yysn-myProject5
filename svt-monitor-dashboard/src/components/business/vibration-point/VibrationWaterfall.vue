<template>
  <div class="card-item waterfall-card">
    <div class="card-header">
      <div class="card-header-leading">
        <div class="card-title app-section-title">频域瀑布图</div>
        <el-select v-model="waterfallAxis" class="waterfall-axis-select" size="small" teleported :show-arrow="false"
          popper-class="waterfall-axis-select-dropdown">
          <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>
      <div class="time-section">
        <div class="interval-input">
          <div class="interval-left">
            <span class="interval-label">间隔</span>
            <el-input-number v-model="intervalHours" :min="0.25" :max="24" :step="0.25" :precision="2" size="small"
              placeholder="小时" controls-position="right" class="interval-num" />
            <span class="interval-unit">小时</span>
          </div>
          <el-button class="waterfall-fullscreen-btn" text size="large" @click="openWaterfallFullscreen">
            全屏显示
            <el-icon>
              <FullScreen />
            </el-icon>
          </el-button>
        </div>
        <CommonDateTimePicker v-model="dateRange" width="320px" />
      </div>
    </div>
    <div class="chart-container">
      <CommonEcharts ref="waterfallChartRef" :option="waterfallOption" :enable-data-zoom="false" :not-merge="true"
        @chart-ready="onWaterfallChartReady" @fullscreen-chart-ready="onWaterfallFullscreenChartReady"
        @fullscreen-closed="onWaterfallFullscreenClosed" use-gl enable-fullscreen fullscreen-title="频域瀑布图"
        fullscreen-background="#142060">
        <template #fullscreen-body-top>
          <div class="waterfall-fullscreen-filters">
            <el-select v-model="waterfallAxis" class="waterfall-axis-select" size="small" teleported :show-arrow="false"
              popper-class="waterfall-axis-select-dropdown">
              <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <span class="waterfall-filter-divider" aria-hidden="true" />
            <div class="interval-input">
              <span class="interval-label">间隔</span>
              <el-input-number v-model="intervalHours" :min="0.25" :max="24" :step="0.25" :precision="2" size="small"
                placeholder="小时" controls-position="right" class="interval-num" />
              <span class="interval-unit">小时</span>
            </div>
            <CommonDateTimePicker v-model="dateRange" width="320px" />
            <span class="waterfall-filter-divider" aria-hidden="true" />
            <div class="freq-filter">
              <span class="freq-filter-label">频率范围：</span>
              <el-input-number v-model="freqFilterMin" :min="freqAxisDomain.min" :max="freqAxisDomain.max"
                :precision="0" :step="1" size="small" placeholder="最小" controls-position="right" class="freq-num" />
              <span class="freq-sep">~</span>
              <el-input-number v-model="freqFilterMax" :min="freqAxisDomain.min" :max="freqAxisDomain.max"
                :precision="0" :step="1" size="small" placeholder="最大" controls-position="right" class="freq-num" />
              <el-button type="primary" size="small" class="freq-apply-btn" @click="applyFreqFilter">
                确认
              </el-button>
              <el-button size="small" @click="resetFreqFilter"> 重置 </el-button>
            </div>
          </div>
        </template>
      </CommonEcharts>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { EChartsOption } from 'echarts'
import type { ECharts } from 'echarts'
import { getRollingWeekDateRange } from '@/utils/datetime'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'
import { CommonEcharts } from '@/components/common/chart'
import { FullScreen } from '@element-plus/icons-vue'
import { getVibrationFrequencyWaterfallData, type VibrationAxis } from '@/api/modules/device'
import { useDeviceTreeStore } from '@/stores/deviceTree'
// 与 echarts-gl Grid3DView 一致：底面射线求交 + pointToData（仅类型外依赖，运行时用 chart 内部视图）
import graphicGL from 'echarts-gl/lib/util/graphicGL.js'

const waterfallChartRef = ref<InstanceType<typeof CommonEcharts>>()
const route = useRoute()

/** 悬停频率时沿时间轴连成的 3D 折线（独立 series，用局部 setOption 更新，避免整图重配影响视角） */
const FREQ_SLICE_SERIES_ID = 'waterfall-freq-slice'
/** 按需求：瀑布图小图/全屏去掉指示线，仅保留黄色 3D 折线指示线 */
const WATERFALL_INDICATOR_LINE_ENABLED = true
/** 与 echarts-gl/lib/component/grid3D/Grid3DView.js 中 dimIndicesMap 一致 */
const GRID3D_DIM_INDICES = { x: 0, y: 2, z: 1 } as const

/** echarts-gl ViewGL（clay Eventful），仅用于绑定/解绑 mousemove */
type EcViewGLEventHost = {
  on: (ev: string, fn: (e: { offsetX: number; offsetY: number }) => void) => void
  off: (ev: string, fn: (e: { offsetX: number; offsetY: number }) => void) => void
}

/** 仅声明本文件射线拾取所需的 grid3D 组件内部字段（非 echarts 公开 API） */
type EcGrid3DFace = {
  rootNode: { invisible?: boolean }
  plane: { normal: { dot: (v: unknown) => number; negate: () => void } }
  faceInfo: [keyof typeof GRID3D_DIM_INDICES, keyof typeof GRID3D_DIM_INDICES, string, number, string]
}

type EcGrid3DCartesian = {
  viewGL: EcViewGLEventHost & {
    containPoint: (x: number, y: number) => boolean
    castRay: (x: number, y: number, out: unknown) => { intersectPlane: (p: unknown) => unknown }
    camera: { worldTransform: { z: unknown } }
  }
  getAxis: (dim: string) => { contain: (v: number) => boolean }
  pointToData: (point: number[], out: number[] | undefined, clamp: boolean) => number[]
}

type EcGrid3DComponentView = {
  _faces?: EcGrid3DFace[]
  _model?: { coordinateSystem?: EcGrid3DCartesian }
}

const freqSliceHandlers = new WeakMap<
  ECharts,
  {
    onViewGLMouseMove: (e: { offsetX: number; offsetY: number }) => void
    /** 命中 line3D 数据点时的后备更新（viewGL 未就绪或射线未打到盒面时仍可用） */
    onSeriesPointer: (raw: unknown) => void
    onGlobalOut: () => void
    viewGLBound: EcViewGLEventHost | null
    onFinishedBind: (() => void) | null
  }
>()
const lastFreqSliceIndex = new WeakMap<ECharts, number>()

/** 切片 setOption 合并到 rAF，减少同一帧内多次 setOption */
const freqSlicePatchRafId = new WeakMap<ECharts, number>()
const freqSlicePatchPending = new WeakMap<ECharts, [number, number, number][]>()
/** 上次已通过 setOption 写入 option 的相机快照；未变化时只改 series，避免反复 merge grid3D 导致刻度闪烁 */
const freqSliceLastViewControlKey = new WeakMap<ECharts, string>()
/** 上次已下发的切片数据，避免同数据重复 setOption（仍会触发 GL 重绘） */
const freqSliceLastDataKey = new WeakMap<ECharts, string>()
/** 限制切片 setOption 频率：mousemove 换频过快会密集触发 GL 重绘，Grid3D 轴标签贴图反复 clear → 刻度闪 */
const FREQ_SLICE_SETOPTION_MIN_MS = 52
const freqSliceLastSetOptionTs = new WeakMap<ECharts, number>()
const freqSliceThrottleTimer = new WeakMap<ECharts, ReturnType<typeof setTimeout>>()

/**
 * echarts-gl：OrbitControl 内部 orthographic 尺寸 = option.viewControl.orthographicSize + 1（base）。
 * 写回 option 时需减 base，避免每次 setOption 叠加 +1。
 */
const GRID3D_VIEWCONTROL_ORTHO_BASE = 1

const readLiveGrid3DViewControlPatch = (chart: ECharts): Record<string, unknown> | undefined => {
  try {
    const views = (chart as unknown as { _componentsViews?: unknown[] })._componentsViews
    if (!Array.isArray(views)) return undefined
    for (const raw of views) {
      if (!raw || typeof raw !== 'object') continue
      const v = raw as {
        type?: string
        _control?: {
          _projection?: string
          getAlpha: () => number
          getBeta: () => number
          getDistance: () => number
          getCenter: () => number[]
          getOrthographicSize: () => number
        }
      }
      if (v.type !== 'grid3D' || !v._control) continue
      const c = v._control
      const projection = c._projection
      const patch: Record<string, unknown> = {
        alpha: c.getAlpha(),
        beta: c.getBeta(),
        distance: c.getDistance(),
        center: [...c.getCenter()],
      }
      if (projection) patch.projection = projection
      if (projection === 'orthographic') {
        const internal = c.getOrthographicSize()
        patch.orthographicSize = internal - GRID3D_VIEWCONTROL_ORTHO_BASE
      }
      return patch
    }
  } catch {
    return undefined
  }
  return undefined
}

/**
 * 粗粒度量化相机再比较：OrbitControl 读出的 float 在 5 位小数下仍可能帧间微抖，
 * 导致 needMergeViewControl 长期为 true → 反复 merge grid3D → 轴标签贴图每次 clear（全屏尤其明显）。
 */
const snapNum = (n: number, decimals: number) => {
  if (!Number.isFinite(n)) return n
  const p = 10 ** decimals
  return Math.round(n * p) / p
}

const viewControlStableKey = (patch: Record<string, unknown>): string => {
  const center = Array.isArray(patch.center)
    ? (patch.center as unknown[]).map((x) => snapNum(Number(x), 2))
    : patch.center
  return JSON.stringify({
    projection: patch.projection,
    alpha: snapNum(Number(patch.alpha), 2),
    beta: snapNum(Number(patch.beta), 2),
    distance: snapNum(Number(patch.distance), 1),
    orthographicSize:
      patch.orthographicSize !== undefined
        ? snapNum(Number(patch.orthographicSize), 3)
        : undefined,
    center,
  })
}

const forgetFreqSliceViewControlCache = (chart: ECharts) => {
  freqSliceLastViewControlKey.delete(chart)
  freqSliceLastDataKey.delete(chart)
  freqSliceLastSetOptionTs.delete(chart)
}

const cancelFreqSliceThrottleTimer = (chart: ECharts) => {
  const tid = freqSliceThrottleTimer.get(chart)
  if (tid != null) {
    clearTimeout(tid)
    freqSliceThrottleTimer.delete(chart)
  }
}

const cancelFreqSlicePatchRaf = (chart: ECharts) => {
  const id = freqSlicePatchRafId.get(chart)
  if (id != null) {
    cancelAnimationFrame(id)
    freqSlicePatchRafId.delete(chart)
  }
  cancelFreqSliceThrottleTimer(chart)
  freqSlicePatchPending.delete(chart)
}

/**
 * @param forceImmediate 清空切片等场景立即下发（跳过节流）
 */
const flushFreqSlicePatch = (chart: ECharts, forceImmediate = false) => {
  freqSlicePatchRafId.delete(chart)
  const data = freqSlicePatchPending.get(chart)
  if (data === undefined) return
  if (typeof chart.isDisposed === 'function' && chart.isDisposed()) return

  const viewControl = readLiveGrid3DViewControlPatch(chart)
  const vcKey = viewControl ? viewControlStableKey(viewControl) : ''
  const prevKey = freqSliceLastViewControlKey.get(chart)
  const needMergeViewControl =
    viewControl != null && (prevKey === undefined || vcKey !== prevKey)

  const isClearSlice = data.length === 0
  /** 合并相机时必须立刻 setOption，否则节流会把「缩放/旋转后的 viewControl」写回推迟 → 视角被旧 option 拉回 */
  const bypassSliceThrottle = forceImmediate || isClearSlice || needMergeViewControl

  if (!bypassSliceThrottle) {
    const now = performance.now()
    const last = freqSliceLastSetOptionTs.get(chart) ?? 0
    if (last > 0 && now - last < FREQ_SLICE_SETOPTION_MIN_MS) {
      if (!freqSliceThrottleTimer.has(chart)) {
        const tid = setTimeout(() => {
          freqSliceThrottleTimer.delete(chart)
          requestAnimationFrame(() => flushFreqSlicePatch(chart, false))
        }, FREQ_SLICE_SETOPTION_MIN_MS - (now - last))
        freqSliceThrottleTimer.set(chart, tid)
      }
      return
    }
  }

  cancelFreqSliceThrottleTimer(chart)
  freqSlicePatchPending.delete(chart)

  const dataKey = JSON.stringify(data)
  if (!needMergeViewControl && dataKey === freqSliceLastDataKey.get(chart)) {
    return
  }

  const patch = (
    needMergeViewControl
      ? {
        series: [{ id: FREQ_SLICE_SERIES_ID, data }],
        grid3D: { viewControl },
      }
      : { series: [{ id: FREQ_SLICE_SERIES_ID, data }] }
  ) as EChartsOption

  try {
    chart.setOption(patch, { notMerge: false, lazyUpdate: true, silent: true })
  } catch {
    // ignore
  }

  freqSliceLastSetOptionTs.set(chart, performance.now())
  freqSliceLastDataKey.set(chart, dataKey)
  if (needMergeViewControl && vcKey !== '') {
    freqSliceLastViewControlKey.set(chart, vcKey)
  }
}

const nearestFreqIndex = (freqs: number[], x: number) => {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < freqs.length; i++) {
    const fi = Number(freqs[i])
    if (!Number.isFinite(fi)) continue
    const d = Math.abs(fi - x)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

const findGrid3DComponentView = (chart: ECharts): EcGrid3DComponentView | null => {
  const views = (chart as unknown as { _componentsViews?: unknown[] })._componentsViews
  if (!Array.isArray(views)) return null
  for (const raw of views) {
    if (raw && typeof raw === 'object' && (raw as { type?: string }).type === 'grid3D') {
      return raw as EcGrid3DComponentView
    }
  }
  return null
}

/**
 * 鼠标射线与 grid 六个面相交，取落在面范围内的交点并换算为数据空间频率（与 Grid3DView._updateAxisPointerOnMousePosition 同源）。
 */
const pickWaterfallFreqByBasePlaneRaycast = (
  chart: ECharts,
  offsetX: number,
  offsetY: number,
): number | null => {
  const gridView = findGrid3DComponentView(chart)
  const faces = gridView?._faces
  const gridModel = gridView?._model
  if (!faces?.length || !gridModel?.coordinateSystem) return null
  const cartesian = gridModel.coordinateSystem
  const viewGL = cartesian.viewGL
  if (!viewGL?.containPoint?.(offsetX, offsetY)) return null

  const ray = viewGL.castRay(offsetX, offsetY, new graphicGL.Ray())
  let nearestIntersectPoint: { array: number[] } | null = null

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i]
    if (!face) continue
    if (face.rootNode.invisible) continue
    if (face.plane.normal.dot(viewGL.camera.worldTransform.z) < 0) {
      face.plane.normal.negate()
    }
    const point = ray.intersectPlane(face.plane) as { array: number[] } | null
    if (!point) continue
    const axis0 = cartesian.getAxis(face.faceInfo[0])
    const axis1 = cartesian.getAxis(face.faceInfo[1])
    const idx0 = GRID3D_DIM_INDICES[face.faceInfo[0]]
    const idx1 = GRID3D_DIM_INDICES[face.faceInfo[1]]
    const v0 = point.array[idx0]
    const v1 = point.array[idx1]
    if (v0 !== undefined && v1 !== undefined && axis0.contain(v0) && axis1.contain(v1)) {
      nearestIntersectPoint = point
    }
  }

  if (!nearestIntersectPoint) return null
  const data = cartesian.pointToData(nearestIntersectPoint.array, [], true)
  const fx = Number(data[0])
  return Number.isFinite(fx) ? fx : null
}

/**
 * 局部更新频率切片：相机合并策略见 flushFreqSlicePatch；刻度闪烁主要靠「切片 setOption 最小间隔」压低频率。
 */
const patchWaterfallFreqSliceSeries = (chart: ECharts, data: [number, number, number][]) => {
  if (typeof chart.isDisposed === 'function' && chart.isDisposed()) return
  freqSlicePatchPending.set(chart, data)
  if (data.length === 0) {
    cancelFreqSliceThrottleTimer(chart)
    const id = freqSlicePatchRafId.get(chart)
    if (id != null) {
      cancelAnimationFrame(id)
      freqSlicePatchRafId.delete(chart)
    }
    flushFreqSlicePatch(chart, true)
    return
  }
  if (freqSlicePatchRafId.has(chart)) return
  const rafId = requestAnimationFrame(() => {
    flushFreqSlicePatch(chart)
  })
  freqSlicePatchRafId.set(chart, rafId)
}

const clearWaterfallFreqSlice = (chart: ECharts) => {
  if (!WATERFALL_INDICATOR_LINE_ENABLED) return
  lastFreqSliceIndex.delete(chart)
  patchWaterfallFreqSliceSeries(chart, [])
}

const updateWaterfallFreqSlice = (chart: ECharts) => {
  const { frequencies, speedMatrix } = filteredWaterfallDisplay.value
  if (!frequencies.length || !speedMatrix.length) {
    clearWaterfallFreqSlice(chart)
    return
  }
  const idx = lastFreqSliceIndex.get(chart)
  if (idx === undefined) return
  const f = frequencies[idx]
  if (f === undefined) {
    clearWaterfallFreqSlice(chart)
    return
  }
  const data: [number, number, number][] = []
  for (let t = 0; t < speedMatrix.length; t++) {
    const row = speedMatrix[t]
    data.push([Number(f), t, Number(row?.[idx] ?? 0)])
  }
  patchWaterfallFreqSliceSeries(chart, data)
}

const detachWaterfallFreqSliceHandlers = (chart: ECharts) => {
  if (!WATERFALL_INDICATOR_LINE_ENABLED) return
  const h = freqSliceHandlers.get(chart)
  if (!h) return
  cancelFreqSlicePatchRaf(chart)
  forgetFreqSliceViewControlCache(chart)
  if (h.viewGLBound) {
    h.viewGLBound.off('mousemove', h.onViewGLMouseMove)
  }
  if (h.onFinishedBind) {
    chart.off('finished', h.onFinishedBind)
  }
  chart.off('mouseover', h.onSeriesPointer)
  chart.off('mousemove', h.onSeriesPointer)
  chart.off('globalout', h.onGlobalOut)
  freqSliceHandlers.delete(chart)
  lastFreqSliceIndex.delete(chart)
}

const applyWaterfallFreqSliceFromHz = (chart: ECharts, fx: number) => {
  if (!Number.isFinite(fx)) return
  const { frequencies, speedMatrix } = filteredWaterfallDisplay.value
  if (!frequencies.length || !speedMatrix.length) return
  const idx = nearestFreqIndex(frequencies, fx)
  if (lastFreqSliceIndex.get(chart) === idx) return
  lastFreqSliceIndex.set(chart, idx)
  updateWaterfallFreqSlice(chart)
}

const attachWaterfallFreqSliceHandlers = (chart: ECharts) => {
  if (!WATERFALL_INDICATOR_LINE_ENABLED) return
  if (freqSliceHandlers.has(chart)) return

  const onViewGLMouseMove = (e: { offsetX: number; offsetY: number }) => {
    const fx = pickWaterfallFreqByBasePlaneRaycast(chart, e.offsetX, e.offsetY)
    if (fx == null) return
    applyWaterfallFreqSliceFromHz(chart, fx)
  }

  const onSeriesPointer = (raw: unknown) => {
    const params = raw as {
      componentType?: string
      seriesType?: string
      seriesId?: string
      value?: unknown
    }
    if (params.componentType !== 'series' || params.seriesType !== 'line3D') return
    if (params.seriesId === FREQ_SLICE_SERIES_ID) return
    const v = params.value
    if (!Array.isArray(v) || v.length < 2) return
    const fx = Number(v[0])
    applyWaterfallFreqSliceFromHz(chart, fx)
  }

  const onGlobalOut = () => {
    clearWaterfallFreqSlice(chart)
  }

  const handlerState = {
    onViewGLMouseMove,
    onSeriesPointer,
    onGlobalOut,
    viewGLBound: null as EcViewGLEventHost | null,
    onFinishedBind: null as (() => void) | null,
  }

  const tryBindViewGL = (): boolean => {
    if (handlerState.viewGLBound) return true
    const gridView = findGrid3DComponentView(chart)
    const viewGL = gridView?._model?.coordinateSystem?.viewGL as EcViewGLEventHost | undefined
    if (!viewGL?.on) return false
    viewGL.on('mousemove', onViewGLMouseMove)
    handlerState.viewGLBound = viewGL
    return true
  }

  if (!tryBindViewGL()) {
    const onFinished = () => {
      if (tryBindViewGL()) {
        chart.off('finished', onFinished)
        handlerState.onFinishedBind = null
      }
    }
    handlerState.onFinishedBind = onFinished
    chart.on('finished', onFinished)
  }

  // GL 组件视图有时晚一帧就绪，避免仅依赖 finished 时小图永远绑不上 viewGL
  requestAnimationFrame(() => {
    tryBindViewGL()
  })

  chart.on('mouseover', onSeriesPointer)
  chart.on('mousemove', onSeriesPointer)
  chart.on('globalout', onGlobalOut)
  freqSliceHandlers.set(chart, handlerState)
}

const onWaterfallChartReady = (chart: ECharts) => {
  attachWaterfallFreqSliceHandlers(chart)
}

/** 全屏弹窗内的实例（与内嵌 chart 分离），用于数据刷新时同步清掉频率切片缓存 */
let waterfallFullscreenEcharts: ECharts | null = null

const deviceTreeStore = useDeviceTreeStore()

const chartAxisColor = computed(() => '#ffffff')
const chartGridLineColor = computed(() => '#999999')

const intervalHours = ref(12)
const dateRange = ref<[string, string] | null>(getRollingWeekDateRange())
/** 频率范围输入（点击确认」后写入 freqDisplayRange） */
const freqFilterMin = ref<number | undefined>(undefined)
const freqFilterMax = ref<number | undefined>(undefined)
/** null 表示不过滤，使用接口返回全量频率；否则为闭区间 [min,max]（已与输入对齐） */
const freqDisplayRange = ref<{ min: number; max: number } | null>(null)
/** 频域 x 轴刻度间隔（Hz） */
const freqAxisTickInterval = 10
const axisOptions: { label: string; value: VibrationAxis }[] = [
  { label: 'X轴', value: 'X' },
  { label: 'Y轴', value: 'Y' },
  { label: 'Z轴', value: 'Z' },
]
const waterfallAxis = ref<VibrationAxis>('X')
const waterfallData = ref<{
  collectTime: string[]
  frequency: number[]
  freqSpeedData: number[][]
}>({
  collectTime: [],
  frequency: [],
  freqSpeedData: [],
})
let waterfallReloadTimer: ReturnType<typeof setTimeout> | null = null

const receiverIdFromParams = computed(() => {
  const rid = route.params.receiverId
  const resolved = Array.isArray(rid) ? rid[0] : rid
  return (typeof resolved === 'string' ? resolved : '') || ''
})

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

const openWaterfallFullscreen = () => {
  void (waterfallChartRef.value as { openFullscreen?: () => void } | undefined)?.openFullscreen?.()
}

const applyFreqFilter = () => {
  const a = freqFilterMin.value
  const b = freqFilterMax.value
  if (a == null && b == null) {
    freqDisplayRange.value = null
    return
  }
  const lo = a ?? -Infinity
  const hi = b ?? Infinity
  freqDisplayRange.value = {
    min: Math.min(lo, hi),
    max: Math.max(lo, hi),
  }
}

/** 按频率区间切片后的展示数据（不改变原始 waterfallData） */
const filteredWaterfallDisplay = computed(() => {
  const freqs = waterfallData.value.frequency
  const matrix = waterfallData.value.freqSpeedData
  const range = freqDisplayRange.value
  if (!range || !freqs.length) {
    return { frequencies: freqs, speedMatrix: matrix }
  }
  const indices: number[] = []
  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i]
    if (f === undefined) continue
    if (f >= range.min && f <= range.max) indices.push(i)
  }
  if (indices.length === 0) {
    return { frequencies: [] as number[], speedMatrix: matrix.map(() => [] as number[]) }
  }
  const newFreqs = indices.map((i) => freqs[i]!)
  const newMatrix = matrix.map((row) => indices.map((i) => row[i] ?? 0))
  return { frequencies: newFreqs, speedMatrix: newMatrix }
})

/** 与 `xAxis3D` 使用同一套频率范围：用于全屏时输入框回填 + 输入框 min/max 绑定 */
const freqAxisDomain = computed(() => {
  const freqs = filteredWaterfallDisplay.value.frequencies
  const nums = freqs.map((n) => Number(n)).filter((n) => Number.isFinite(n))
  if (!nums.length) {
    return { min: 0, max: freqAxisTickInterval }
  }
  return { min: Math.min(...nums), max: Math.max(...nums) }
})

const onWaterfallFullscreenChartReady = (chart: ECharts) => {
  waterfallFullscreenEcharts = chart
  // 全屏打开后：把输入框回填为当前坐标轴频率范围，确保“数字与轴绑定”
  freqFilterMin.value = freqAxisDomain.value.min
  freqFilterMax.value = freqAxisDomain.value.max
  attachWaterfallFreqSliceHandlers(chart)
}

const onWaterfallFullscreenClosed = () => {
  const inst = waterfallFullscreenEcharts
  if (inst) detachWaterfallFreqSliceHandlers(inst)
  waterfallFullscreenEcharts = null
}

const resetFreqFilter = () => {
  // 重置为“不过滤”：并把输入框回填为当前坐标轴范围
  freqDisplayRange.value = null
  freqFilterMin.value = freqAxisDomain.value.min
  freqFilterMax.value = freqAxisDomain.value.max
}

const toApiDateTime = (s: string) => s.replace('T', ' ')
const toApiInterval = (hours: number) => Number(hours).toFixed(1)
const formatTimeLabel = (timeStr: string) => {
  if (!timeStr) return ''
  const [datePart, hms] = timeStr.split(' ')
  if (!datePart || !hms) return timeStr
  const [, month = '', day = ''] = datePart.split('-')
  return `${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hms.slice(0, 5)}`
}

const loadWaterfallData = async () => {
  if (!pointDeviceId.value || !receiverIdFromParams.value) return
  const [startStr, endStr] =
    dateRange.value && dateRange.value[0] && dateRange.value[1]
      ? dateRange.value
      : getRollingWeekDateRange()
  try {
    const res = await getVibrationFrequencyWaterfallData(
      pointDeviceId.value,
      receiverIdFromParams.value,
      waterfallAxis.value,
      toApiInterval(intervalHours.value),
      toApiDateTime(startStr),
      toApiDateTime(endStr),
    )
    if (
      res.rc === 0 &&
      res.ret &&
      Array.isArray(res.ret.collectTime) &&
      Array.isArray(res.ret.frequency) &&
      Array.isArray(res.ret.freqSpeedData)
    ) {
      waterfallData.value = {
        collectTime: res.ret.collectTime,
        frequency: res.ret.frequency,
        freqSpeedData: res.ret.freqSpeedData,
      }
    } else {
      waterfallData.value = { collectTime: [], frequency: [], freqSpeedData: [] }
    }
  } catch (error) {
    console.error('获取频域瀑布图数据失败:', error)
    waterfallData.value = { collectTime: [], frequency: [], freqSpeedData: [] }
  }
}

const scheduleLoadWaterfallData = (delay = 400) => {
  if (waterfallReloadTimer) {
    clearTimeout(waterfallReloadTimer)
    waterfallReloadTimer = null
  }
  waterfallReloadTimer = setTimeout(() => {
    waterfallReloadTimer = null
    void loadWaterfallData()
  }, delay)
}

const waterfallOption = computed<EChartsOption>(() => {
  const times = waterfallData.value.collectTime.map(formatTimeLabel)
  const { frequencies, speedMatrix } = filteredWaterfallDisplay.value
  // 柔和一点的红色起点，避免过于刺眼
  const light = { r: 239, g: 83, b: 80 }
  const dark = { r: 34, g: 139, b: 34 }
  const generateGradientColors = (count: number) => {
    return Array.from({ length: count }, (_, i) => {
      const t = count > 1 ? i / (count - 1) : 1
      const r = Math.round(light.r + (dark.r - light.r) * t)
      const g = Math.round(light.g + (dark.g - light.g) * t)
      const b = Math.round(light.b + (dark.b - light.b) * t)
      return `rgb(${r},${g},${b})`
    })
  }
  const curveColors = generateGradientColors(times.length)
  const seriesList = times.map((time, timeIndex) => {
    const row = Array.isArray(speedMatrix[timeIndex]) ? speedMatrix[timeIndex] : []
    const points = frequencies.map((freq, freqIndex) => {
      const speed = Number(row[freqIndex] ?? 0)
      return [freq, timeIndex, speed, `${(speed || 0).toFixed(3)} mm/s`]
    })
    return {
      name: time,
      type: 'line3D' as const,
      data: points,
      lineStyle: {
        width: 2,
        color: curveColors[timeIndex % curveColors.length],
      },
      label: { show: false },
      emphasis: {
        label: {
          show: true,
          formatter: (params: { value?: unknown[] }) =>
            `${(Number((params.value ?? [])[2]) || 0).toFixed(3)} mm/s`,
          fontSize: 12,
          color: '#ffffff',
        },
      },
    }
  })

  const c = chartAxisColor.value
  const gridColor = chartGridLineColor.value
  const freqMin = frequencies.length ? Math.min(...frequencies.map((n) => Number(n))) : 0
  const freqMax = frequencies.length
    ? Math.max(...frequencies.map((n) => Number(n)))
    : freqAxisTickInterval
  const freqSpan = freqMax - freqMin
  const freqSplitNumber =
    freqSpan > 0 ? Math.max(1, Math.round(freqSpan / freqAxisTickInterval)) : 1
  // 仍保持刻度线每 20Hz，但坐标轴文字每隔若干个刻度显示一次，避免全屏文字过密
  const freqAxisLabelEveryTicks = 5 // 10Hz * 5 = 50Hz 显示一条文字
  return {
    // 切片局部 setOption 时缩短更新动画，减轻视觉上的「整图闪一下」
    animationDurationUpdate: 0,
    tooltip: {
      show: true,
      trigger: 'item',
      /** 指针离开图表后仍保留一段时间，避免轻微抖动即消失 */
      hideDelay: 600,
      /** 允许鼠标移入 tooltip 本身，便于读完内容 */
      enterable: true,
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: 'rgba(50, 50, 50, 0.9)',
      textStyle: { color: '#fff' },
      formatter: (params: { value?: unknown[]; seriesName?: string }) => {
        const vals = params.value ?? []
        const freq = Number(vals[0]) || 0
        const seriesName = params.seriesName || ''
        const value = Number(vals[2]) || 0
        const timeLabel =
          seriesName ||
          (typeof vals[1] === 'number' ? (times[vals[1]] ?? '') : '')

        return [
          `时间：${timeLabel}`,
          `频率：${freq.toFixed(0)} Hz`,
          `速度有效值：${value.toFixed(3)} mm/s`,
        ].join('<br/>')
      },
    },
    /** 与全屏 3D 图共用同一套盒体与视角参数（内嵌不再单独走移动端 grid/图例布局） */
    grid3D: {
      left: '-10%',
      top: '-2%',
      bottom: 0,
      viewControl: {
        projection: 'orthographic',
        alpha: 15,
        beta: 20,
        distance: 250,
        rotateSensitivity: 1,
        zoomSensitivity: 0.5,
        panSensitivity: 1,
      },
      boxWidth: 100,
      boxHeight: 100,
      boxDepth: 100,
      /** 按需求：去掉瀑布图指示线（axisPointer 那根线） */
      axisPointer: { show: false },
      splitLine: {
        lineStyle: { color: gridColor },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: '#F0f0f0',
          opacity: 1,
        },
      },
    },
    xAxis3D: {
      type: 'value',
      name: '频率(Hz)',
      nameTextStyle: {
        color: c,
        fontSize: '0.8rem',
      },
      nameGap: 40,
      axisLine: { lineStyle: { color: c } },
      // 仅让“会显示刻度数字”的刻度线伸出来，避免 10Hz 一根短刻度线造成干扰
      axisTick: {
        show: true,
        lineStyle: { color: c },
        interval: (_index: number, value: number) => {
          const n = Number(value)
          if (!Number.isFinite(n)) return false
          const tickIndex = Math.round((n - freqMin) / freqAxisTickInterval)
          return tickIndex % freqAxisLabelEveryTicks === 0
        },
      } as any,
      axisLabel: {
        color: c,
        fontSize: '0.8rem',
        margin: 10,
        formatter: (value: number) => {
          const n = Number(value)
          if (!Number.isFinite(n)) return ''
          // 以 min 作为对齐基准计算当前刻度序号，达到“每 40Hz 显示一条”的效果
          const tickIndex = Math.round((n - freqMin) / freqAxisTickInterval)
          if (tickIndex % freqAxisLabelEveryTicks !== 0) return ''
          return `${Math.round(n)}`
        },
      },
      interval: freqAxisTickInterval,
      splitNumber: freqSplitNumber,
      min: freqMin,
      max: freqMax,
    },
    yAxis3D: {
      type: 'category',
      name: '时间',
      nameTextStyle: {
        color: c,
        fontSize: '0.8rem',
      },
      nameGap: 5,
      axisLine: { lineStyle: { color: c } },
      axisTick: { lineStyle: { color: c } },
      axisLabel: {
        color: c,
        fontSize: '0.8rem',
        margin: 20,
      },
      data: times,
    },
    legend: {
      show: true,
      data: times,
      textStyle: { color: c },
      pageTextStyle: { color: c },
      pageIconColor: '#ffffff',
      pageIconInactiveColor: 'rgba(255,255,255,0.5)',
      right: 10,
      top: 'middle',
      orient: 'vertical',
      type: 'scroll',
      itemWidth: 14,
      itemHeight: 10,
    },
    zAxis3D: {
      name: '速\n度\n有\n效\n值\n(mm/s)',
      nameTextStyle: {
        color: c,
        fontSize: '0.8rem',
      },
      nameGap: 35,
      nameRotate: 90,
      namemoveoverlap: true,
      axisLine: { lineStyle: { color: c } },
      axisTick: { lineStyle: { color: c } },
      axisLabel: {
        color: c,
        fontSize: '0.8rem',
        margin: 8,
      },
    },
    series: [
      ...seriesList,
      ...(WATERFALL_INDICATOR_LINE_ENABLED
        ? [
          {
            id: FREQ_SLICE_SERIES_ID,
            name: '',
            type: 'line3D' as const,
            data: [] as [number, number, number][],
            silent: true,
            legendHoverLink: false,
            tooltip: { show: false },
            lineStyle: {
              width: 2.5,
              color: '#ffeb3b',
            },
            itemStyle: { opacity: 0 },
            emphasis: { disabled: true },
          },
        ]
        : []),
    ],
  } as EChartsOption
})

watch(
  [receiverIdFromParams, pointDeviceId],
  ([rid, pid]) => {
    if (!rid || !pid) return
    void loadWaterfallData()
  },
  { immediate: true },
)

watch(waterfallAxis, () => {
  if (!receiverIdFromParams.value || !pointDeviceId.value) return
  scheduleLoadWaterfallData()
})

watch(intervalHours, () => {
  if (!receiverIdFromParams.value || !pointDeviceId.value) return
  scheduleLoadWaterfallData()
})

watch(
  dateRange,
  (newRange, oldRange) => {
    if (!receiverIdFromParams.value || !pointDeviceId.value) return
    const newKey = Array.isArray(newRange) ? `${newRange[0] || ''}|${newRange[1] || ''}` : ''
    const oldKey = Array.isArray(oldRange) ? `${oldRange[0] || ''}|${oldRange[1] || ''}` : ''
    if (newKey === oldKey) return
    scheduleLoadWaterfallData()
  },
  { deep: true },
)

watch(
  () => [waterfallData.value, freqDisplayRange.value] as const,
  () => {
    const inline = waterfallChartRef.value?.chartInstance as ECharts | undefined
    if (inline) {
      forgetFreqSliceViewControlCache(inline)
      clearWaterfallFreqSlice(inline)
    }
    if (waterfallFullscreenEcharts) {
      forgetFreqSliceViewControlCache(waterfallFullscreenEcharts)
      clearWaterfallFreqSlice(waterfallFullscreenEcharts)
    }
  },
  { deep: true },
)

onUnmounted(() => {
  if (waterfallReloadTimer) {
    clearTimeout(waterfallReloadTimer)
    waterfallReloadTimer = null
  }
  const inst = waterfallChartRef.value?.chartInstance as ECharts | undefined
  if (inst) detachWaterfallFreqSliceHandlers(inst)
})
</script>

<style lang="scss" scoped>
.card-item {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 10px 10px 0 10px;

    .card-header-leading {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .card-title {
      color: #fff;
    }

    .time-section {
      width: 320px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;

      .interval-input {
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;

        .interval-left {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .interval-label {
          color: #fff;
        }

        .interval-num {
          width: 100px;
        }

        .interval-unit {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }

    :deep(.waterfall-fullscreen-btn) {
      color: #fff !important;
      padding: 0 !important;
      gap: 4px;
      font-size: 0.8rem;
    }

    :deep(.waterfall-fullscreen-btn:hover),
    :deep(.waterfall-fullscreen-btn:focus),
    :deep(.waterfall-fullscreen-btn:active) {
      background-color: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }

    :deep(.waterfall-fullscreen-btn .el-icon) {
      color: #fff !important;
      margin-left: 4px;
      font-size: 0.8rem;
    }
  }

  .chart-container {
    flex: 1;
    width: 100%;
    min-height: 0;
    padding: 10px 10px 20px 10px;
  }
}

.waterfall-card {
  width: 66.66%;
}

@media (max-width: 800px) {
  .waterfall-card {
    width: 100%;
  }

  .card-item .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .card-item .card-header .card-header-leading {
    width: 100%;
    justify-content: flex-start;
  }

  .card-item .card-header .time-section {
    width: 100%;
  }

  .card-item .card-header .time-section .interval-input {
    width: 100%;
  }

  .card-item .chart-container {
    height: 312px;
    min-height: 312px;
  }

  .card-item .chart-container :deep(.common-echarts-wrapper),
  .card-item .chart-container :deep(.common-echarts-inner) {
    height: 100%;
    min-height: 312px;
  }
}
</style>

<style lang="scss">
.waterfall-axis-select {
  width: 72px;
  vertical-align: middle;
}

.waterfall-axis-select .el-select__wrapper {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  min-height: 30px;
  padding: 0 10px;
}

.waterfall-axis-select .el-select__placeholder,
.waterfall-axis-select .el-select__selected-item {
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
}

.waterfall-axis-select .el-select__caret {
  color: rgba(255, 255, 255, 0.65);
}

.waterfall-fullscreen-filters {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  flex-wrap: nowrap;
}

.waterfall-fullscreen-filters>* {
  flex: 0 0 auto;
}

.waterfall-fullscreen-filters .interval-input {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.waterfall-fullscreen-filters .interval-input .interval-label {
  color: #fff;
}

.waterfall-fullscreen-filters .interval-input .interval-num {
  width: 100px;
}

.waterfall-fullscreen-filters .interval-input .interval-unit {
  color: rgba(255, 255, 255, 0.8);
}

.waterfall-fullscreen-filters .freq-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.waterfall-fullscreen-filters .freq-filter-label {
  color: #fff;
  font-size: 0.8rem;
}

.waterfall-fullscreen-filters .freq-num {
  width: 92px;
}

.waterfall-fullscreen-filters .freq-sep {
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
}

.waterfall-fullscreen-filters .freq-apply-btn {
  padding: 0 12px;
}

.waterfall-fullscreen-filters .waterfall-filter-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background: rgba(255, 255, 255, 0.28);
  flex: 0 0 auto;
}

.waterfall-fullscreen-filters .el-button+.el-button {
  margin-left: 0;
}

.waterfall-axis-select-dropdown.el-popper {
  background: #1a2a6e !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  font-size: 12px;
  z-index: 10000 !important;
}

.waterfall-axis-select-dropdown .el-select-dropdown__item {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
}

.waterfall-axis-select-dropdown .el-select-dropdown__item.is-hovering,
.waterfall-axis-select-dropdown .el-select-dropdown__item:hover {
  background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 800px) {
  .common-echarts-fullscreen-modal .el-dialog {
    height: 600px !important;
    max-height: 600px !important;
  }

  .waterfall-fullscreen-filters {
    flex-wrap: wrap;
  }

  .waterfall-fullscreen-filters .interval-input,
  .waterfall-fullscreen-filters .freq-filter {
    flex-wrap: wrap;
    white-space: normal;
  }

  /* 振动点位页：弹窗内图表高度固定（仅手机端） */
  .common-echarts-fullscreen-wrap {
    height: 372px !important;
    min-height: 372px !important;
    max-height: 372px !important;
  }

  .common-echarts-fullscreen-inner {
    height: 372px !important;
    min-height: 372px !important;
  }
}
</style>
