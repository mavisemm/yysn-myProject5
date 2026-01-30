import * as echarts from 'echarts';

/**
 * 联动多个 ECharts 图表，实现缩放、移动、提示框等同步
 * @param charts 图表实例数组
 */
export const connectCharts = (charts: any[]) => {
  const validCharts = charts.filter((chart) => !!chart);
  if (validCharts.length > 1) {
    echarts.connect(validCharts);
  }
};

/**
 * 监听元素尺寸变化并自动重绘图表
 * @param chart 图表实例
 * @param container 容器 DOM 元素
 * @returns 销毁监听的方法
 */
export const observeResize = (chart: any, container: HTMLElement) => {
  const resizeObserver = new ResizeObserver(() => {
    chart?.resize();
  });
  resizeObserver.observe(container);
  return () => resizeObserver.disconnect();
};
