<template>
    <div class="bottom-row">
        <!-- 振动频域图卡片 -->
        <div class="card-item freq-card">
            <div class="card-header">
                <div class="card-title">振动频域图</div>
            </div>
            <div ref="freqChartRef" class="chart-container"></div>
        </div>

        <!-- 振动时域图卡片 -->
        <div class="card-item time-card">
            <div class="card-header">
                <div class="card-title">振动时域图</div>
            </div>
            <div ref="timeChartRef" class="chart-container"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import * as echarts from 'echarts';
import { useChartResize } from '@/composables/useChart';
import { enableMouseWheelZoomForCharts, connectCharts } from '@/utils/chart';
import { getVibrationFrequencyData, getVibrationTimeDomainData, type VibrationFrequencyData, type VibrationTimeDomainData, type NewApiResponse } from '@/api/modules/device';

const freqChartRef = ref<HTMLElement>();
const timeChartRef = ref<HTMLElement>();

const freqChartInstance = shallowRef<echarts.ECharts | null>(null);
const timeChartInstance = shallowRef<echarts.ECharts | null>(null);

// 存储接口返回的数据
const freqData = ref<{ frequency: number[]; freqSpeedData: number[] }>({
    frequency: [],
    freqSpeedData: []
});

// 存储时域图数据
const timeDomainData = ref<number[]>([]);
const totalTime = ref<number>(0);

const initCharts = () => {
    if (freqChartRef.value) {
        freqChartInstance.value = echarts.init(freqChartRef.value);
        updateFreqChart();
    }

    if (timeChartRef.value) {
        timeChartInstance.value = echarts.init(timeChartRef.value);
        updateTimeChart();

        if (freqChartInstance.value && timeChartInstance.value) {
            connectCharts([freqChartInstance.value, timeChartInstance.value]);
            enableMouseWheelZoomForCharts([freqChartInstance.value, timeChartInstance.value]);
        }
    }
};

/**
 * 更新频域图数据
 */
const updateFreqChart = () => {
    if (!freqChartInstance.value) return;

    // 将两个数组组合成 [x, y] 格式的二维数组
    const chartData = freqData.value.frequency.map((freq, index) => [
        freq,
        freqData.value.freqSpeedData[index] || 0
    ]);

    freqChartInstance.value.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: { color: '#fff' },
            axisPointer: { type: 'shadow' }
        },
        grid: { top: 30, left: 40, right: 30, bottom: 50 },
        xAxis: {
            type: 'value',
            name: 'Hz',
            min: 0,
            max: Math.max(...freqData.value.frequency, 2000),
            nameTextStyle: { color: '#fff' },
            axisLabel: { color: '#fff' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: 'm/s²',
            min: 0,
            nameTextStyle: { color: '#fff' },
            axisLabel: { color: '#fff', formatter: '{value}' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
            {
                type: 'slider',
                xAxisIndex: [0],
                bottom: 10,
                height: 20,
                fillerColor: 'rgba(126, 203, 161, 0.3)',
                borderColor: 'rgba(126, 203, 161, 0.5)',
                handleStyle: { color: '#7ecba1' },
                filterMode: 'none'
            }
        ],
        series: [{
            type: 'bar',
            barWidth: 2,
            data: chartData,
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#7ecba1' },
                    { offset: 0.5, color: '#5fb98b' },
                    { offset: 1, color: '#d4a853' }
                ])
            }
        }]
    });
};

/**
 * 更新时域图数据
 */
const updateTimeChart = () => {
    if (!timeChartInstance.value || timeDomainData.value.length === 0) return;

    // 根据总时长和数据点数生成x轴坐标
    const dataPoints = timeDomainData.value.length;
    const step = totalTime.value / (dataPoints - 1);

    // 生成 [x, y] 格式的二维数组
    const chartData = timeDomainData.value.map((value, index) => [
        index * step,
        value
    ]);

    timeChartInstance.value.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: { color: '#fff' }
        },
        grid: { top: 30, left: 40, right: 40, bottom: 50 },
        xAxis: {
            type: 'value',
            name: 's',
            min: 0,
            max: totalTime.value,
            nameTextStyle: { color: '#fff' },
            axisLabel: { color: '#fff' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: 'm/s²',
            nameTextStyle: { color: '#fff' },
            axisLabel: { color: '#fff' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
            {
                type: 'slider',
                xAxisIndex: [0],
                bottom: 10,
                height: 20,
                fillerColor: 'rgba(126, 203, 161, 0.3)',
                borderColor: 'rgba(126, 203, 161, 0.5)',
                handleStyle: { color: '#7ecba1' },
                filterMode: 'none'
            }
        ],
        series: [{
            type: 'line',
            smooth: false,
            showSymbol: false,
            sampling: 'lttb',
            data: chartData,
            lineStyle: { color: '#7ecba1', width: 1 },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(126, 203, 161, 0.8)' },
                    { offset: 1, color: 'rgba(126, 203, 161, 0.2)' }
                ])
            }
        }]
    });
};

const { bindResize: bindFreq } = useChartResize(freqChartInstance, freqChartRef);
const { bindResize: bindTime } = useChartResize(timeChartInstance, timeChartRef);

onMounted(async () => {
    // 初始化图表
    initCharts();
    bindFreq();
    bindTime();

    // 请求频域图数据
    try {
        const freqResponse = await getVibrationFrequencyData();
        if (freqResponse.rc === 0 && freqResponse.ret) {
            // 解析JSON字符串为数组
            const frequencyArray = JSON.parse(freqResponse.ret.frequency);
            const freqSpeedArray = JSON.parse(freqResponse.ret.freqSpeedData);

            // 更新数据
            freqData.value = {
                frequency: frequencyArray,
                freqSpeedData: freqSpeedArray
            };

            // 更新图表
            updateFreqChart();
        }
    } catch (error) {
        console.error('获取振动频域数据失败:', error);
    }

    // 请求时域图数据
    try {
        const timeResponse = await getVibrationTimeDomainData();
        if (timeResponse.rc === 0 && timeResponse.ret) {
            // 解析JSON字符串为数组
            const timeDomainArray = JSON.parse(timeResponse.ret.timedomaindata);

            // 更新时域图数据
            timeDomainData.value = timeDomainArray;
            totalTime.value = timeResponse.ret.time;

            // 更新时域图
            updateTimeChart();
        }
    } catch (error) {
        console.error('获取振动时域数据失败:', error);
    }
});

onUnmounted(() => {
    freqChartInstance.value?.dispose();
    timeChartInstance.value?.dispose();
});
</script>

<style lang="scss" scoped>
.bottom-row {
    display: flex;
    height: 40%;
    gap: 15px;
    min-height: 0;
}

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

.freq-card,
.time-card {
    width: 50%;
    background: url('@/assets/images/background/设备详情页-点位列表背景.png') no-repeat center center;
    background-size: 100% 100%;
}
</style>