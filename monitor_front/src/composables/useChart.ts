import { onUnmounted, type Ref } from 'vue'
import { observeResize } from '@/utils/chart'

const CHART_AXIS_COLOR = '#fff'
const CHART_SPLIT_LINE_COLOR = 'rgba(255,255,255,0.1)'

export function useChartTheme() {
  return {
    isGrayTheme: false,
    chartAxisColor: CHART_AXIS_COLOR,
    chartSplitLineColor: CHART_SPLIT_LINE_COLOR,
    getColors: () => ({
      axisColor: CHART_AXIS_COLOR,
      splitLineColor: CHART_SPLIT_LINE_COLOR,
      isGrayTheme: false,
    }),
  }
}

export function useChartResize(
  chartInstance: Ref<any>,
  ...containerRefs: Array<Ref<HTMLElement | undefined>>
) {
  let cleanup: (() => void) | null = null
  let resizeRaf: number | null = null

  const unbindResize = () => {
    cleanup?.()
    cleanup = null
    if (resizeRaf != null) {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = null
    }
  }

  const scheduleResize = () => {
    const inst = chartInstance.value
    if (!inst?.resize) return
    if (resizeRaf != null) cancelAnimationFrame(resizeRaf)
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null
      try {
        inst.resize()
      } catch {
        // ignore
      }
    })
  }

  const createResizeProxy = () => ({
    resize: scheduleResize,
  })

  onUnmounted(unbindResize)

  return {
    bindResize: () => {
      unbindResize()
      if (!chartInstance.value) return
      const targets = containerRefs
        .map((r) => r.value)
        .filter((el): el is HTMLElement => !!el)
      const seen = new Set<HTMLElement>()
      const uniqueTargets = targets.filter((el) => {
        if (seen.has(el)) return false
        seen.add(el)
        return true
      })
      if (!uniqueTargets.length) return
      const proxy = createResizeProxy()
      const cleanups = uniqueTargets.map((el) => observeResize(proxy, el))
      cleanup = () => cleanups.forEach((fn) => fn())
    },
    unbindResize,
    scheduleResize,
  }
}
