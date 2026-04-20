import { onUnmounted, computed } from 'vue'
import type { Ref } from 'vue'
import { observeResize } from '@/utils/chart'

export function useChartTheme() {
  const isGrayTheme = computed(() => false)
  const chartAxisColor = computed(() => '#fff')
  const chartSplitLineColor = computed(() => 'rgba(255,255,255,0.1)')
  return {
    isGrayTheme,
    chartAxisColor,
    chartSplitLineColor,
    getColors: () => ({
      axisColor: chartAxisColor.value,
      splitLineColor: chartSplitLineColor.value,
      isGrayTheme: isGrayTheme.value,
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
    if (!inst || typeof inst.resize !== 'function') return null
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

  const bind = () => {
    if (chartInstance.value && containerRef.value) {
      const proxy = createResizeProxy()
      cleanup = observeResize(proxy ?? chartInstance.value, containerRef.value)
    }
  }

  onUnmounted(() => {
    if (cleanup) {
      cleanup()
      cleanup = null
    }
    if (resizeRaf != null) {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = null
    }
  })

  return {
    bindResize: bind,
  }
}
