import * as echarts from 'echarts'

export type ChartThemeColors = {
  axisColor: string
  splitLineColor: string
  isGrayTheme: boolean
}

export const connectCharts = (charts: any[]) => {
  const validCharts = charts.filter(Boolean)
  if (validCharts.length > 1) {
    echarts.connect(validCharts)
  }
}

const isDisposed = (chart: any) => typeof chart?.isDisposed === 'function' && chart.isDisposed()

/** 避免在 ECharts finished/datazoom 等主流程回调里同步 setOption 触发告警 */
export const scheduleChartSetOption = (task: () => void) => {
  requestAnimationFrame(() => {
    try {
      task()
    } catch {
      // ignore
    }
  })
}

export function getChartSeriesList(inst: { getOption?: () => unknown } | null | undefined) {
  if (!inst?.getOption) return []
  try {
    const opt = inst.getOption() as { series?: unknown }
    const raw = opt?.series
    if (!raw) return []
    return (Array.isArray(raw) ? raw : [raw]) as Array<{ id?: string }>
  } catch {
    return []
  }
}

export function chartHasSeriesId(inst: any, seriesId: string): boolean {
  if (!inst || !seriesId) return false
  if (typeof inst.isDisposed === 'function' && inst.isDisposed()) return false
  return getChartSeriesList(inst).some((s) => s?.id === seriesId)
}

/** 按 series.id 局部 merge；目标 series 未就绪时跳过，避免 Unknown series */
export function patchChartSeriesById(
  inst: any,
  seriesId: string,
  patch: Record<string, unknown>,
  seriesType = 'line',
) {
  if (!inst?.setOption || !seriesId) return
  scheduleChartSetOption(() => {
    if (!chartHasSeriesId(inst, seriesId)) return
    try {
      inst.setOption(
        { series: [{ id: seriesId, type: seriesType, ...patch }] },
        { notMerge: false, lazyUpdate: true },
      )
    } catch {
      // ignore
    }
  })
}

const safeResize = (chart: any) => {
  if (!chart?.resize || isDisposed(chart)) return
  try {
    chart.resize()
  } catch (error) {
    if (error instanceof Error && error.message.includes('main process')) {
      setTimeout(() => {
        if (!chart?.resize || isDisposed(chart)) return
        try {
          chart.resize()
        } catch {
          // ignore retry failure
        }
      }, 50)
    }
  }
}

export const observeResize = (chart: any, container: HTMLElement) => {
  const resizeObserver = new ResizeObserver(() => {
    if (document.hidden) return
    setTimeout(() => safeResize(chart), 0)
  })
  resizeObserver.observe(container)
  return () => resizeObserver.disconnect()
}

export const enableMouseWheelZoom = (chart: any) => {
  if (!chart) return

  const chartDom = chart.getDom()
  const handleWheel = (e: WheelEvent) => {
    const target = e.target as HTMLElement | null
    if (target?.closest?.('.echarts-tooltip')) return

    e.preventDefault()
    const sliderZoom = (chart.getOption().dataZoom ?? []).find((dz: any) => dz.type === 'slider')
    if (!sliderZoom) return

    const percent = e.deltaY > 0 ? 0.05 : -0.05
    const start = Math.max(0, sliderZoom.startValue - Math.round(percent * 100))
    const end = Math.min(100, sliderZoom.endValue + Math.round(percent * 100))
    if (Math.abs(start - end) < 1) return

    chart.dispatchAction({
      type: 'dataZoom',
      dataZoomIndex: 0,
      startValue: start,
      endValue: end,
    })
  }

  chartDom.addEventListener('wheel', handleWheel, { passive: false })
  return () => chartDom.removeEventListener('wheel', handleWheel)
}

export const enableMouseWheelZoomForCharts = (charts: any[]) => {
  const cleanups = charts
    .map((chart) => (chart ? enableMouseWheelZoom(chart) : null))
    .filter((fn): fn is () => void => typeof fn === 'function')
  return () => cleanups.forEach((fn) => fn())
}
