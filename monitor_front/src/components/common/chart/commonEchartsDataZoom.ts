import type * as echarts from 'echarts'

export type DataZoomRange = { startIndex: number; endIndex: number }
export type DataZoomValueRange = { startValue: number; endValue: number }

export type DataZoomActionPayload = {
  start?: number
  end?: number
  startValue?: unknown
  endValue?: unknown
  dataZoomIndex?: number
}

export const pickArray = (v: unknown): unknown[] =>
  Array.isArray(v) ? v : typeof v !== 'undefined' && v !== null ? [v] : []

export const clampInt = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(v)))

export const clampNum = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const asFiniteNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export function getDataZoomForXAxis(opt: unknown, xAxisIndex: number): Record<string, unknown> | null {
  const dzList = pickArray((opt as { dataZoom?: unknown })?.dataZoom)
  if (!dzList.length) return null
  return (
    (dzList.find((d) => {
      const item = d as { xAxisIndex?: number | number[] }
      const idx = item?.xAxisIndex
      if (Array.isArray(idx)) return idx.includes(xAxisIndex)
      if (typeof idx === 'number') return idx === xAxisIndex
      return typeof idx === 'undefined' && xAxisIndex === 0
    }) as Record<string, unknown> | undefined) ??
    (dzList[0] as Record<string, unknown>) ??
    null
  )
}

export function captureCurrentDataZoomAction(
  inst: { getOption?: () => unknown },
  xAxisIndex: number,
): DataZoomActionPayload | null {
  try {
    const opt = inst.getOption?.()
    const dz = getDataZoomForXAxis(opt, xAxisIndex)
    if (!dz) return null

    const hasValue = typeof dz.startValue !== 'undefined' || typeof dz.endValue !== 'undefined'
    const hasPct = typeof dz.start !== 'undefined' || typeof dz.end !== 'undefined'
    if (!hasValue && !hasPct) return null

    const payload: DataZoomActionPayload = {}
    if (typeof dz.dataZoomIndex === 'number') payload.dataZoomIndex = dz.dataZoomIndex
    if (typeof dz.startValue !== 'undefined') payload.startValue = dz.startValue
    if (typeof dz.endValue !== 'undefined') payload.endValue = dz.endValue
    if (typeof dz.start !== 'undefined') payload.start = dz.start as number
    if (typeof dz.end !== 'undefined') payload.end = dz.end as number

    const s = asFiniteNumber(payload.start)
    const e = asFiniteNumber(payload.end)
    const isDefaultPct = s !== null && e !== null && Math.abs(s - 0) < 1e-9 && Math.abs(e - 100) < 1e-9
    if (isDefaultPct) return null

    return payload
  } catch {
    return null
  }
}

export function getXAxis(opt: unknown, xAxisIndex: number): Record<string, unknown> | null {
  const xAxes = pickArray((opt as { xAxis?: unknown })?.xAxis)
  return (xAxes[xAxisIndex] ?? xAxes[0] ?? null) as Record<string, unknown> | null
}

export function getXAxisType(opt: unknown, xAxisIndex: number): string {
  const xAxis = getXAxis(opt, xAxisIndex)
  return String(xAxis?.type ?? (xAxis?.data ? 'category' : 'value'))
}

export function extractXFromDatum(datum: unknown): number | null {
  if (datum == null) return null
  if (Array.isArray(datum)) {
    const n = Number(datum[0])
    return Number.isFinite(n) ? n : null
  }
  if (typeof datum === 'object') {
    const v = (datum as { value?: unknown }).value
    if (Array.isArray(v)) {
      const n = Number(v[0])
      return Number.isFinite(n) ? n : null
    }
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const n = Number(datum)
  return Number.isFinite(n) ? n : null
}

export function extractYFromDatum(datum: unknown): number | null {
  if (datum == null) return null
  if (typeof datum === 'number') return Number.isFinite(datum) ? datum : null
  if (typeof datum === 'string') {
    const n = Number(datum)
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(datum)) {
    const n = Number(datum[datum.length - 1])
    return Number.isFinite(n) ? n : null
  }
  if (typeof datum === 'object') {
    const v = (datum as { value?: unknown }).value
    if (Array.isArray(v)) {
      const n = Number(v[v.length - 1])
      return Number.isFinite(n) ? n : null
    }
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function inferXDomainFromSeries(opt: unknown): { min: number; max: number } | null {
  const seriesList = pickArray((opt as { series?: unknown })?.series)
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  let found = false
  for (const s of seriesList) {
    const data = (s as { data?: unknown[] })?.data
    if (!Array.isArray(data) || data.length === 0) continue
    for (const d of data) {
      const x = extractXFromDatum(d)
      if (x == null) continue
      found = true
      if (x < min) min = x
      if (x > max) max = x
    }
  }
  if (!found || !Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max }
}

export function getCategoryAxisLength(opt: unknown, xAxisIndex: number): number {
  const xAxis = getXAxis(opt, xAxisIndex)
  const data = xAxis?.data
  return Array.isArray(data) ? data.length : 0
}

export function parseDataZoomRange(opt: unknown, xAxisIndex: number): DataZoomRange | null {
  const axisLen = getCategoryAxisLength(opt, xAxisIndex)
  if (!axisLen) return null
  const dz = getDataZoomForXAxis(opt, xAxisIndex)
  if (!dz) return { startIndex: 0, endIndex: axisLen - 1 }

  const hasValueRange = typeof dz.startValue !== 'undefined' || typeof dz.endValue !== 'undefined'
  if (hasValueRange) {
    const s = typeof dz.startValue === 'number' ? dz.startValue : 0
    const e = typeof dz.endValue === 'number' ? dz.endValue : axisLen - 1
    const startIndex = clampInt(s, 0, axisLen - 1)
    const endIndex = clampInt(e, 0, axisLen - 1)
    return startIndex <= endIndex
      ? { startIndex, endIndex }
      : { startIndex: endIndex, endIndex: startIndex }
  }

  const startPct = typeof dz.start === 'number' ? dz.start : 0
  const endPct = typeof dz.end === 'number' ? dz.end : 100
  const startIndex = clampInt(Math.round((startPct / 100) * (axisLen - 1)), 0, axisLen - 1)
  const endIndex = clampInt(Math.round((endPct / 100) * (axisLen - 1)), 0, axisLen - 1)
  return startIndex <= endIndex
    ? { startIndex, endIndex }
    : { startIndex: endIndex, endIndex: startIndex }
}

/** 点是否落在可见 X 轴数值范围内（仅用于统计 Y，不改变 X 轴显示范围） */
export function isXInVisibleValueRange(x: number, lo: number, hi: number): boolean {
  const a = Math.min(lo, hi)
  const b = Math.max(lo, hi)
  const span = b - a
  const eps = span > 0 ? Math.max(span * 1e-9, 1e-12) : 1e-9
  return x >= a - eps && x <= b + eps
}

/**
 * 按绘图区左右边缘像素反算当前屏幕上可见的 X 数值范围（与肉眼所见一致，不扩大 X 轴配置）。
 */
export function parseVisibleXValueRangeFromChart(
  inst: echarts.ECharts,
  xAxisIndex: number,
): DataZoomValueRange | null {
  try {
    if (typeof inst.isDisposed === 'function' && inst.isDisposed()) return null
    const model = (inst as unknown as { getModel?: () => { getComponent?: (t: string, i: number) => unknown } })
      .getModel?.()
    if (!model) return null
    const xAxisModel = model.getComponent?.('xAxis', xAxisIndex) as
      | { coordinateSystem?: { getRect?: () => { x: number; y: number; width: number; height: number } } }
      | undefined
    const cs = xAxisModel?.coordinateSystem
    const rect = cs?.getRect?.()
    if (!rect || rect.width <= 0 || rect.height <= 0) return null

    const yMid = rect.y + rect.height / 2
    const left = inst.convertFromPixel({ xAxisIndex }, [rect.x, yMid]) as number[] | number
    const right = inst.convertFromPixel({ xAxisIndex }, [rect.x + rect.width, yMid]) as number[] | number
    const x0 = Number(Array.isArray(left) ? left[0] : left)
    const x1 = Number(Array.isArray(right) ? right[0] : right)
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) return null
    return { startValue: Math.min(x0, x1), endValue: Math.max(x0, x1) }
  } catch {
    return null
  }
}

export function parseDataZoomValueRange(opt: unknown, xAxisIndex: number): DataZoomValueRange | null {
  const dz = getDataZoomForXAxis(opt, xAxisIndex)
  const xAxis = getXAxis(opt, xAxisIndex)

  const axisMin = asFiniteNumber(xAxis?.min)
  const axisMax = asFiniteNumber(xAxis?.max)
  const inferred = inferXDomainFromSeries(opt)
  const dataMin = axisMin ?? inferred?.min
  const dataMax = axisMax ?? inferred?.max
  if (dataMin == null || dataMax == null) return null

  if (!dz) return { startValue: dataMin, endValue: dataMax }

  const sv = asFiniteNumber(dz.startValue)
  const ev = asFiniteNumber(dz.endValue)
  if (sv != null || ev != null) {
    const s0 = sv ?? dataMin
    const e0 = ev ?? dataMax
    return { startValue: Math.min(s0, e0), endValue: Math.max(s0, e0) }
  }

  const startPct = asFiniteNumber(dz.start) ?? 0
  const endPct = asFiniteNumber(dz.end) ?? 100
  const loPct = Math.min(clampNum(startPct, 0, 100), clampNum(endPct, 0, 100))
  const hiPct = Math.max(clampNum(startPct, 0, 100), clampNum(endPct, 0, 100))
  return {
    startValue: dataMin + (loPct / 100) * (dataMax - dataMin),
    endValue: dataMin + (hiPct / 100) * (dataMax - dataMin),
  }
}

export function getSamplingStep(length: number, threshold: number): number {
  const safeThreshold = Math.max(100, threshold)
  if (length <= safeThreshold) return 1
  return Math.max(1, Math.ceil(length / safeThreshold))
}

export function computeVisibleYRangeByIndex(
  opt: unknown,
  range: DataZoomRange,
  samplingThreshold: number,
): { min: number; max: number } | null {
  const seriesList = pickArray((opt as { series?: unknown })?.series)
  if (!seriesList.length) return null
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  let found = false

  for (const s of seriesList) {
    const data = (s as { data?: unknown[] })?.data
    if (!Array.isArray(data) || data.length === 0) continue
    const start = clampInt(range.startIndex, 0, data.length - 1)
    const end = clampInt(range.endIndex, 0, data.length - 1)
    const step = getSamplingStep(Math.max(1, end - start + 1), samplingThreshold)
    for (let i = start; i <= end; i += step) {
      const y = extractYFromDatum(data[i])
      if (y == null) continue
      found = true
      if (y < min) min = y
      if (y > max) max = y
    }
  }
  if (!found || !Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max }
}

function seriesUsesXAxisIndex(series: Record<string, unknown>, xAxisIndex: number): boolean {
  const idx = series.xAxisIndex
  if (typeof idx === 'number') return idx === xAxisIndex
  if (Array.isArray(idx)) return idx.includes(xAxisIndex)
  return xAxisIndex === 0
}

export function computeVisibleYRangeByXValue(
  opt: unknown,
  xRange: DataZoomValueRange,
  _samplingThreshold: number,
  xAxisIndex = 0,
): { min: number; max: number } | null {
  const seriesList = pickArray((opt as { series?: unknown })?.series)
  if (!seriesList.length) return null
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  let found = false
  const lo = Math.min(xRange.startValue, xRange.endValue)
  const hi = Math.max(xRange.startValue, xRange.endValue)

  for (const s of seriesList) {
    const series = s as Record<string, unknown>
    if (!seriesUsesXAxisIndex(series, xAxisIndex)) continue
    const data = series.data
    if (!Array.isArray(data) || data.length === 0) continue

    for (let i = 0; i < data.length; i++) {
      const x = extractXFromDatum(data[i])
      if (x == null || !isXInVisibleValueRange(x, lo, hi)) continue
      const y = extractYFromDatum(data[i])
      if (y == null) continue
      found = true
      if (y < min) min = y
      if (y > max) max = y
    }
  }

  if (!found || !Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max }
}
