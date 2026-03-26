import { onUnmounted, computed } from 'vue';
import type { Ref } from 'vue';
import { observeResize } from '@/utils/chart';

/**
 * 获取 ECharts 图表主题颜色（与 CommonEcharts 一致）
 * 用于在业务组件中构建 option 时统一坐标轴/分割线颜色
 */
export function useChartTheme() {
    // 已移除灰色主题：固定走非灰的配色
    const isGrayTheme = computed(() => false);
    const chartAxisColor = computed(() => '#fff');
    const chartSplitLineColor = computed(() =>
        'rgba(255,255,255,0.1)'
    );
    return {
        isGrayTheme,
        chartAxisColor,
        chartSplitLineColor,
        getColors: () => ({
            axisColor: chartAxisColor.value,
            splitLineColor: chartSplitLineColor.value,
            isGrayTheme: isGrayTheme.value
        })
    };
}

/**
 * 自动处理 ECharts 响应式布局的 Hook
 * @param chartInstance 图表实例的 Ref
 * @param containerRef 容器 DOM 的 Ref
 */
export function useChartResize(
  chartInstance: Ref<any>,
  containerRef: Ref<HTMLElement | undefined>
) {
  let cleanup: (() => void) | null = null;

  // 绑定监听
  const bind = () => {
    if (chartInstance.value && containerRef.value) {
      cleanup = observeResize(chartInstance.value, containerRef.value);
    }
  };

  // 组件销毁时自动移除监听
  onUnmounted(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  return {
    bindResize: bind
  };
}
