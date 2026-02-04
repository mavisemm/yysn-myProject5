<template>
    <div class="charts-section">
        <div class="chart-item">
            <div class="chart-title">能量曲线</div>
            <div ref="energyChartRef" class="chart-container"></div>
        </div>
        <div class="chart-item">
            <div class="chart-title">密度曲线</div>
            <div ref="densityChartRef" class="chart-container"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import * as echarts from 'echarts';
import { useChartResize } from '@/composables/useChart';
import { connectCharts, enableMouseWheelZoomForCharts } from '@/utils/chart';

const emit = defineEmits(['chart-init']);
const props = defineProps<{
    deviationList: any[];
}>();

const energyChartRef = ref<HTMLDivElement>();
const densityChartRef = ref<HTMLDivElement>();

const energyChartInstance = shallowRef<echarts.ECharts | null>(null);
const densityChartInstance = shallowRef<echarts.ECharts | null>(null);

const updateCharts = () => {
    const selectedItems = props.deviationList.filter(item => item.visible);

    selectedItems.forEach((item, index) => {
        item.color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
    });

    props.deviationList.forEach(item => {
        if (!item.visible) item.color = undefined;
    });

    const freqs = selectedItems[0]?.freqs || [];

    const commonOption = {
        textStyle: { color: '#fff' },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(50,50,50,0.8)',
            borderColor: 'rgba(50,50,50,0.8)',
            textStyle: {
                color: '#fff'
            },
            axisPointer: { type: 'cross' },
            position: function (pos: any, params: any, el: any, elRect: any, size: any) {
                const [mouseX, mouseY] = pos;
                const [contentWidth, contentHeight] = size.contentSize;
                const [viewWidth, viewHeight] = size.viewSize;
                let x = mouseX + 20;
                if (x + contentWidth > viewWidth) {
                    x = mouseX - contentWidth - 20;
                }
                let y = Math.max(0, mouseY - contentHeight / 2);
                return [x, y];
            }
        },
        axisPointer: {
            link: [{ xAxisIndex: 'all' }],
            label: {
                backgroundColor: 'rgba(50,50,50,0.8)',
                color: '#fff',
            }
        },
        grid: { left: 30, right: 20, top: 40, bottom: 50 },
        legend: { show: false },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
            {
                type: 'slider',
                xAxisIndex: [0],
                bottom: 10,
                height: 20,
                textStyle: { color: '#fff' },
                handleStyle: { color: '#fff' },
                filterMode: 'none'
            }
        ],
        xAxis: {
            type: 'category',
            data: freqs,
            boundaryGap: false,
            axisLine: { lineStyle: { color: '#fff' } },
            axisLabel: { color: '#fff' }
        },
    };

    energyChartInstance.value?.setOption({
        ...commonOption,
        yAxis: {
            type: 'value',
            name: 'dB',
            axisLine: { lineStyle: { color: '#fff' } },
            axisLabel: { color: '#fff' },
            nameTextStyle: { color: '#fff' }
        },
        series: selectedItems.map(item => ({
            name: item.time,
            type: 'line',
            data: item.dbArr,
            itemStyle: { color: item.color },
            smooth: true,
            symbolSize: 1
        }))
    }, true);

    densityChartInstance.value?.setOption({
        ...commonOption,
        yAxis: {
            type: 'value',
            name: '密度',
            axisLine: { lineStyle: { color: '#fff' } },
            axisLabel: { color: '#fff' },
            nameTextStyle: { color: '#fff' }
        },
        series: selectedItems.map(item => ({
            name: item.time,
            type: 'line',
            data: item.densityArr,
            itemStyle: { color: item.color },
            smooth: true,
            symbolSize: 1
        }))
    }, true);
};

const initCharts = () => {
    if (energyChartRef.value) energyChartInstance.value = echarts.init(energyChartRef.value);
    if (densityChartRef.value) densityChartInstance.value = echarts.init(densityChartRef.value);

    const { bindResize: bindEnergy } = useChartResize(energyChartInstance, energyChartRef);
    const { bindResize: bindDensity } = useChartResize(densityChartInstance, densityChartRef);
    bindEnergy();
    bindDensity();

    connectCharts([energyChartInstance.value, densityChartInstance.value]);
    enableMouseWheelZoomForCharts([energyChartInstance.value, densityChartInstance.value]);

    emit('chart-init', { energyChartInstance, densityChartInstance });
    updateCharts();
};

const handleResize = () => {
    // 使用 setTimeout 避免在主渲染过程中调用 resize
    setTimeout(() => {
        try {
            if (energyChartInstance.value) {
                if (!(energyChartInstance.value.isDisposed && energyChartInstance.value.isDisposed())) {
                    energyChartInstance.value.resize();
                    console.debug('Energy chart resize completed');
                }
            }

            if (densityChartInstance.value) {
                if (!(densityChartInstance.value.isDisposed && densityChartInstance.value.isDisposed())) {
                    densityChartInstance.value.resize();
                    console.debug('Density chart resize completed');
                }
            }
        } catch (error) {
            console.warn('Charts resize failed:', error);
            // 如果是主进程错误，尝试重试
            if (error instanceof Error && error.message.includes('main process')) {
                console.info('SoundPoint charts main process resize error, will retry');
                setTimeout(() => {
                    try {
                        if (energyChartInstance.value && !(energyChartInstance.value.isDisposed && energyChartInstance.value.isDisposed())) {
                            energyChartInstance.value.resize();
                            console.debug('Energy chart resize retry successful');
                        }

                        if (densityChartInstance.value && !(densityChartInstance.value.isDisposed && densityChartInstance.value.isDisposed())) {
                            densityChartInstance.value.resize();
                            console.debug('Density chart resize retry successful');
                        }
                    } catch (retryError) {
                        console.error('Charts resize retry also failed:', retryError);
                    }
                }, 50);
            }
        }
    }, 0);
};

onMounted(() => {
    initCharts();
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    energyChartInstance.value?.dispose();
    densityChartInstance.value?.dispose();
});

defineExpose({
    updateCharts
});
</script>

<style lang="scss" scoped>
.charts-section {
    display: flex;
    flex-direction: row;
    gap: 15px;
    height: 50%;
    padding-bottom: 15px;

    .chart-item {
        background: url('@/assets/images/background/首页-预警总览背景.png') no-repeat center center;
        background-size: 100% 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
        border-radius: 8px;

        .chart-title {
            font-size: clamp(18px, 2.5vw, 24px);
            font-weight: bold;
            text-align: center;
            padding: 20px 20px 0 20px;
        }

        .chart-container {
            flex: 1;
            min-height: 200px;
            padding: 20px;
        }
    }
}
</style>