<template>
    <div class="card-item waterfall-card">
        <div class="card-header">
            <div class="card-title">频域瀑布图</div>
            <el-button type="primary" size="small">筛选数据</el-button>
        </div>
        <div ref="waterfallChartRef" class="chart-container"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import * as echarts from 'echarts';
import { ElButton } from 'element-plus';
import { useChartResize } from '@/composables/useChart';

const waterfallChartRef = ref<HTMLElement>();
const waterfallChartInstance = shallowRef<echarts.ECharts | null>(null);

const waterfallTimeLabels = [
    '2026-11-14 13:59:57 (29 ℃)',
    '2026-11-14 14:59:57 (28 ℃)',
    '2026-11-14 15:59:58 (27 ℃)',
    '2026-11-14 16:59:58 (25 ℃)',
    '2026-11-14 17:59:58'
];

const waterfallColors = [
    '#c23531',
    '#61a0a8',
    '#6e7074',
    '#546fc6',
    '#3a5ba0'
];

const initChart = () => {
    if (waterfallChartRef.value) {
        waterfallChartInstance.value = echarts.init(waterfallChartRef.value);

        const waterfallSeries = generateWaterfallSeries();

        waterfallChartInstance.value.setOption({
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(50, 50, 50, 0.9)',
                borderColor: 'rgba(50, 50, 50, 0.9)',
                textStyle: { color: '#fff' }
            },
            grid: {
                top: 30,
                left: 30,
                right: 30,
                bottom: 30
            },
            xAxis: {
                type: 'value',
                name: 'Hz',
                min: 300,
                max: 600,
                nameTextStyle: { color: '#fff' },
                axisLabel: { color: '#fff' },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
            },
            yAxis: {
                type: 'value',
                name: 'm/s2',
                min: 0,
                max: 3.2,
                nameTextStyle: { color: '#fff' },
                axisLabel: { color: '#fff' },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
            },
            series: waterfallSeries
        });
    }
};

/**
 * 生成瀑布图的多条线series（模拟3D效果）
 */
const generateWaterfallSeries = () => {
    const series: any[] = [];
    const lineCount = 5;

    for (let i = 0; i < lineCount; i++) {
        const yOffset = i * 0.5;
        const lineData = generateSingleWaterfallLine(yOffset);

        series.push({
            type: 'line',
            smooth: false,
            showSymbol: false,
            data: lineData,
            lineStyle: {
                color: waterfallColors[i],
                width: 1
            },
            z: lineCount - i,
            markPoint: {
                symbol: 'none',
                label: {
                    show: true,
                    position: 'right',
                    formatter: waterfallTimeLabels[i],
                    color: waterfallColors[i],
                    fontSize: 10
                },
                data: [{
                    coord: [600, yOffset + 0.3],
                    value: waterfallTimeLabels[i]
                }]
            }
        });
    }

    return series;
};

/**
 * 生成单条瀑布线数据
 */
const generateSingleWaterfallLine = (yOffset: number) => {
    const data = [];
    for (let x = 300; x <= 600; x += 2) {
        const baseValue = Math.random() * 0.3;
        const spike = Math.random() > 0.95 ? Math.random() * 1.5 : 0;
        const y = yOffset + baseValue + spike;
        data.push([x, y]);
    }
    return data;
};

const { bindResize } = useChartResize(waterfallChartInstance, waterfallChartRef);

onMounted(() => {
    initChart();
    bindResize();
});

onUnmounted(() => {
    waterfallChartInstance.value?.dispose();
});
</script>

<style lang="scss" scoped>
.card-item {
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 0 20px;

        .card-title {
            font-size: clamp(16px, 1.5vw, 20px);
            font-weight: bold;
            color: #fff;
        }
    }

    .chart-container {
        flex: 1;
        width: 100%;
        min-height: 0;
        padding: 20px;
    }
}

.waterfall-card {
    width: 66.66%;
    background: url('@/assets/images/background/首页-预警总览背景.png') no-repeat center center;
    background-size: 100% 100%;
}
</style>