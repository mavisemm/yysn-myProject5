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
  const resizeObserver = new ResizeObserver((entries) => {
    // 检查是否在主渲染过程中
    if (document.hidden) {
      console.debug('Document hidden, skipping resize');
      return;
    }
    
    // 使用 setTimeout 将 resize 调用推迟到下一个事件循环，避免在主渲染过程中调用
    setTimeout(() => {
      if (chart && typeof chart.resize === 'function') {
        try {
          // 再次检查图表状态
          if (chart.isDisposed && chart.isDisposed()) {
            console.debug('Chart already disposed, skipping resize');
            return;
          }
          
          chart.resize();
          console.debug('ECharts resize completed successfully');
        } catch (error) {
          console.warn('ECharts resize failed:', error);
          // 如果 resize 失败，可能需要重新初始化
          if (error instanceof Error && error.message.includes('main process')) {
            console.info('Main process resize error detected, will retry');
            setTimeout(() => {
              if (chart && typeof chart.resize === 'function' && !(chart.isDisposed && chart.isDisposed())) {
                try {
                  chart.resize();
                  console.debug('ECharts resize retry successful');
                } catch (retryError) {
                  console.error('ECharts resize retry also failed:', retryError);
                }
              }
            }, 50);
          }
        }
      } else {
        console.debug('Chart not ready for resize');
      }
    }, 0);
  });
  
  resizeObserver.observe(container);
  return () => resizeObserver.disconnect();
};

/**
 * 为图表实例添加滚轮缩放功能
 * @param chart 图表实例
 */
export const enableMouseWheelZoom = (chart: any) => {
  if (!chart) return;
  
  // 添加滚轮事件监听
  const chartDom = chart.getDom();
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    // 获取当前dataZoom的配置
    const option = chart.getOption();
    const dataZooms = option.dataZoom || [];
    
    // 找到slider类型的dataZoom
    const sliderZoom = dataZooms.find((dz: any) => dz.type === 'slider');
    
    if (sliderZoom) {
      // 计算新的起始和结束位置
      const percent = e.deltaY > 0 ? 0.05 : -0.05; // 滚轮方向控制
      const start = Math.max(0, sliderZoom.startValue - Math.round(percent * 100));
      const end = Math.min(100, sliderZoom.endValue + Math.round(percent * 100));
      
      // 确保start和end不会相等或交叉
      if (Math.abs(start - end) < 1) {
        return; // 防止过度缩放
      }
      
      // 更新dataZoom
      chart.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 0,
        startValue: start,
        endValue: end
      });
    }
  };
  
  chartDom.addEventListener('wheel', handleWheel, { passive: false });
  
  // 返回销毁方法
  return () => {
    chartDom.removeEventListener('wheel', handleWheel);
  };
};

/**
 * 批量为多个图表启用滚轮缩放功能
 * @param charts 图表实例数组
 * @returns 销毁所有监听的方法
 */
export const enableMouseWheelZoomForCharts = (charts: any[]) => {
  const cleanupFunctions: (() => void)[] = [];
  
  charts.forEach(chart => {
    if (chart) {
      const cleanup = enableMouseWheelZoom(chart);
      if (cleanup) {
        cleanupFunctions.push(cleanup);
      }
    }
  });
  
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
};
