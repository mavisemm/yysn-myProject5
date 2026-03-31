import * as echarts from 'echarts';

export type ChartThemeColors = {
    axisColor: string;
    splitLineColor: string;
    isGrayTheme: boolean;
};
export const connectCharts = (charts: any[]) => {
  const validCharts = charts.filter((chart) => !!chart);
  if (validCharts.length > 1) {
    echarts.connect(validCharts);
  }
};
export const observeResize = (chart: any, container: HTMLElement) => {
  const resizeObserver = new ResizeObserver((entries) => {
    
    if (document.hidden) {
      console.debug('Document hidden, skipping resize');
      return;
    }
    
    
    setTimeout(() => {
      if (chart && typeof chart.resize === 'function') {
        try {
          
          if (chart.isDisposed && chart.isDisposed()) {
            console.debug('Chart already disposed, skipping resize');
            return;
          }
          
          chart.resize();
        } catch (error) {
          console.warn('ECharts resize failed:', error);
          
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
export const enableMouseWheelZoom = (chart: any) => {
  if (!chart) return;
  
  
  const chartDom = chart.getDom();
  const handleWheel = (e: WheelEvent) => {
    
    const target = e.target as HTMLElement | null;
    if (target && typeof target.closest === 'function' && target.closest('.echarts-tooltip')) {
      return;
    }

    e.preventDefault();
    
    
    const option = chart.getOption();
    const dataZooms = option.dataZoom || [];
    
    
    const sliderZoom = dataZooms.find((dz: any) => dz.type === 'slider');
    
    if (sliderZoom) {
      
      const percent = e.deltaY > 0 ? 0.05 : -0.05; 
      const start = Math.max(0, sliderZoom.startValue - Math.round(percent * 100));
      const end = Math.min(100, sliderZoom.endValue + Math.round(percent * 100));
      
      
      if (Math.abs(start - end) < 1) {
        return; 
      }
      
      
      chart.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 0,
        startValue: start,
        endValue: end
      });
    }
  };
  
  chartDom.addEventListener('wheel', handleWheel, { passive: false });
  
  
  return () => {
    chartDom.removeEventListener('wheel', handleWheel);
  };
};
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
