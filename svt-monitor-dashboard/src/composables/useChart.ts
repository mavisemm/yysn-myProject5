import { onUnmounted, type Ref } from 'vue';
import { observeResize } from '@/utils/chart';

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
