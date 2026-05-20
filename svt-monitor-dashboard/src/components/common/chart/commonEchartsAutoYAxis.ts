import type * as echarts from 'echarts'
import {
  computeVisibleYRangeByIndex,
  computeVisibleYRangeByXValue,
  getXAxisType,
  parseDataZoomRange,
  parseDataZoomValueRange,
} from './commonEchartsDataZoom'

export type AutoYAxisResolveConfig = {
  xAxisIndex: number
  paddingRatio: number
  samplingThreshold: number
}

export function resolveAutoYAxisMinMax(
  opt: unknown,
  config: AutoYAxisResolveConfig,
): { min: number; max: number } | null {
  const xType = getXAxisType(opt, config.xAxisIndex)
  let y: { min: number; max: number } | null = null

  if (xType === 'value' || xType === 'time' || xType === 'log') {
    const xRange = parseDataZoomValueRange(opt, config.xAxisIndex)
    if (!xRange) return null
    y = computeVisibleYRangeByXValue(opt, xRange, config.samplingThreshold)
  } else {
    const range = parseDataZoomRange(opt, config.xAxisIndex)
    if (!range) return null
    y = computeVisibleYRangeByIndex(opt, range, config.samplingThreshold)
  }
  if (!y) return null

  const paddingRatio = Math.max(0, config.paddingRatio)
  const span = y.max - y.min
  const padding = span === 0 ? (Math.abs(y.max) || 1) * paddingRatio : span * paddingRatio
  const min = y.min >= 0 ? Math.max(0, y.min - padding) : y.min - padding
  let max = y.max + padding
  if (min === max) max = min + 1
  return { min, max }
}

export function applyYAxisMinMaxToChart(
  inst: echarts.ECharts,
  min: number,
  max: number,
  lazyUpdate = true,
) {
  try {
    const opt = inst.getOption?.() as { yAxis?: unknown }
    const yAxisArr = Array.isArray(opt?.yAxis) ? opt.yAxis : null
    const yAxisPatch =
      yAxisArr && yAxisArr.length > 1 ? yAxisArr.map(() => ({ min, max })) : { min, max }
    inst.setOption({ yAxis: yAxisPatch } as never, { notMerge: false, lazyUpdate })
  } catch {
    // ignore
  }
}
