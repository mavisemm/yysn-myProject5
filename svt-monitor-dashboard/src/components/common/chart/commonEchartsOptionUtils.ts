import type { EChartsOption } from 'echarts'

const isValueMeaningful = (v: unknown) =>
  v !== null && typeof v !== 'undefined' && !(typeof v === 'number' && Number.isNaN(v))

const hasNonEmptyDataArray = (arr: unknown[]) => arr.some(isValueMeaningful)

export function isChartOptionEmpty(opt: EChartsOption | null | undefined): boolean {
  if (!opt) return true
  const anyOpt = opt as Record<string, unknown>

  const ds = anyOpt.dataset
  const dsArr = Array.isArray(ds) ? ds : ds ? [ds] : []
  for (const d of dsArr) {
    const source = (d as { source?: unknown[] })?.source
    if (Array.isArray(source) && source.length > 0) {
      if (source.length > 1) return false
      const row = source[0]
      if (Array.isArray(row) ? hasNonEmptyDataArray(row) : isValueMeaningful(row)) return false
    }
  }

  const series = anyOpt.series
  const seriesArr = Array.isArray(series) ? series : series ? [series] : []
  if (seriesArr.length === 0) return true

  for (const s of seriesArr) {
    const data = (s as { data?: unknown })?.data
    if (Array.isArray(data)) {
      if (data.length > 0 && hasNonEmptyDataArray(data)) return false
    } else if (isValueMeaningful(data)) {
      return false
    }
  }

  return true
}

export function buildResolvedChartOption(
  base: EChartsOption | null | undefined,
  options: {
    tooltipFollowMouse?: boolean
    enableDataZoom?: boolean
    transparentBackground?: boolean
  },
): EChartsOption {
  const opt = { ...(base as Record<string, unknown>) } as EChartsOption & {
    dataZoom?: unknown
    xAxis?: unknown
    backgroundColor?: unknown
    tooltip?: unknown
  }

  const rawTooltip = opt.tooltip
  if (typeof rawTooltip === 'object' && rawTooltip) {
    const t = rawTooltip as Record<string, unknown>
    opt.tooltip = {
      ...(t as object),
      className: String(t.className ?? 'echarts-tooltip'),
      appendToBody: (t.appendToBody ?? true) as boolean,
      backgroundColor: String(t.backgroundColor ?? 'rgba(50, 50, 50, 0.9)'),
      borderColor: String(t.borderColor ?? 'rgba(50, 50, 50, 0.9)'),
      textStyle: (t.textStyle as { color?: string } | undefined) ?? { color: '#fff' },
      extraCssText: String(t.extraCssText ?? 'z-index: 99999 !important;'),
    }
  } else if (!opt.tooltip) {
    opt.tooltip = {
      className: 'echarts-tooltip',
      appendToBody: true,
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: 'rgba(50, 50, 50, 0.9)',
      textStyle: { color: '#fff' },
      extraCssText: 'z-index: 99999 !important;',
    }
  }

  if (options.tooltipFollowMouse && opt.tooltip && typeof opt.tooltip === 'object') {
    const tooltip = opt.tooltip as Record<string, unknown>
    if (!('position' in tooltip)) {
      tooltip.position = (pos: unknown, _params: unknown, _el: unknown, _elRect: unknown, size: unknown) => {
        const [mouseX, mouseY] = pos as [number, number]
        const [, contentHeight] = (size as { contentSize: [number, number] }).contentSize
        const [viewWidth] = (size as { viewSize: [number, number] }).viewSize
        let x = mouseX + 20
        if (x + contentHeight > viewWidth) x = mouseX - contentHeight - 20
        const y = Math.max(0, mouseY - contentHeight / 2)
        return [x, y]
      }
    }
  }

  if (options.enableDataZoom && !opt.dataZoom) {
    const hasXAxis = Array.isArray(opt.xAxis)
      ? opt.xAxis.length > 0
      : typeof opt.xAxis !== 'undefined'
    if (hasXAxis) {
      opt.dataZoom = [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        { type: 'slider', xAxisIndex: 0, bottom: 10, height: 20, filterMode: 'none' },
      ]
    }
  }

  if (options.transparentBackground && typeof opt.backgroundColor === 'undefined') {
    opt.backgroundColor = 'transparent'
  }

  return opt as EChartsOption
}
