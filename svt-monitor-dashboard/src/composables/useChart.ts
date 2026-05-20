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
  containerRef: Ref<HTMLElement | undefined>,
) {
  let cleanup: (() => void) | null = null
  let resizeRaf: number | null = null

  const createResizeProxy = () => {
    const inst = chartInstance.value
    if (!inst?.resize) return null
    return {
      ...inst,
      resize: () => {
        if (resizeRaf != null) cancelAnimationFrame(resizeRaf)
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = null
          try {
            inst.resize()
          } catch {
            // ignore
          }
        })
      },
    }
  }

  onUnmounted(() => {
    cleanup?.()
    cleanup = null
    if (resizeRaf != null) {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = null
    }
  })

  return {
    bindResize: () => {
      if (chartInstance.value && containerRef.value) {
        cleanup = observeResize(createResizeProxy() ?? chartInstance.value, containerRef.value)
      }
    },
  }
}
