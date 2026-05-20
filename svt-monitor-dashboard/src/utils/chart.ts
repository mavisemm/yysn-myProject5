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
