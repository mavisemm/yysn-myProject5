<template>
    <div class="bottom-row">
        <div class="card-item freq-card">
            <div class="card-header">
                <div class="card-title app-section-title">振动频域图</div>
            </div>
            <div class="chart-container">
                <div ref="freqChartRef" class="chart-inner"></div>
                <div v-if="!freqData.frequency.length" class="chart-empty">暂无数据</div>
            </div>
        </div>
        <div class="card-item time-card">
            <div class="card-header">
                <div class="card-title app-section-title">振动时域图</div>
            </div>
            <div class="chart-container">
                <div ref="timeChartRef" class="chart-inner"></div>
                <div v-if="!timeDomainData.length" class="chart-empty">暂无数据</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, computed, inject, watch } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import * as echarts from 'echarts';
import { useChartResize } from '@/composables/useChart';
import { getVibrationFrequencyData, getVibrationTimeDomainData, type VibrationFrequencyData, type VibrationTimeDomainData, type NewApiResponse } from '@/api/modules/device';

const route = useRoute();
const deviceId = computed(() => (route.query.deviceId as string) || '');
const pointId = computed(() => (route.query.pointId as string) || '');

const freqChartRef = ref<HTMLElement>();
const timeChartRef = ref<HTMLElement>();
const freqChartInstance = shallowRef<echarts.ECharts | null>(null);
const timeChartInstance = shallowRef<echarts.ECharts | null>(null);

/** 主题：灰色时坐标轴/分割线为黑，否则白 */
const backgroundMode = inject<Ref<'image' | 'gray' | 'green' | 'navy'> | undefined>('backgroundMode');
const isGrayTheme = computed(() => backgroundMode?.value === 'gray');
const chartAxisColor = computed(() => (isGrayTheme.value ? '#000' : '#fff'));
const chartSplitLineColor = computed(() => (isGrayTheme.value ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)'));

const freqData = ref<{ frequency: number[]; freqSpeedData: number[] }>({ frequency: [], freqSpeedData: [] });
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
    }
};

/** 频域图：数据 [freq, value] 按频率升序，y 轴留边距 */
const updateFreqChart = () => {
    if (!freqChartInstance.value || !freqData.value.frequency.length) return;

    const chartData = freqData.value.frequency
        .map((freq, index) => [freq, freqData.value.freqSpeedData[index] ?? 0] as [number, number])
        .sort((a, b) => a[0] - b[0]);

    const xMax = chartData.length > 0 ? Math.max(...freqData.value.frequency, 2000) : 2000;
    const yValues = chartData.map(item => item[1]);
    const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;
    const yMax = yValues.length > 0 ? Math.max(...yValues) : 1;
    const yMargin = (yMax - yMin) * 0.1;
    const yMinWithMargin = Math.max(0, yMin - yMargin);
    const yMaxWithMargin = yMax + yMargin;

    const c = chartAxisColor.value;
    const s = chartSplitLineColor.value;
    freqChartInstance.value.setOption({
        tooltip: {
            trigger: 'axis',
            className: 'echarts-tooltip',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: { color: '#fff' },
            formatter: function (params: any) {
                const data = params[0];
                const currentX = data.value[0];
                const currentY = data.value[1];

                // 获取图表数据用于查找倍频点
                const chartData = freqData.value.frequency
                    .map((freq, index) => [freq, freqData.value.freqSpeedData[index] ?? 0] as [number, number])
                    .sort((a, b) => a[0] - b[0]);

                const maxX = Math.max(...freqData.value.frequency, 2000);

                let tooltipContent = `${currentX.toFixed(0)}hZ：${currentY.toFixed(10)}`;

                // 查找2倍频点
                const doubleFreq = currentX * 2;
                if (doubleFreq <= maxX) {
                    const doublePoint = chartData.find(item => Math.abs(item[0] - doubleFreq) < 1);
                    if (doublePoint) {
                        tooltipContent += `<br/>双倍频：${doubleFreq.toFixed(0)}hZ：${doublePoint[1].toFixed(10)}`;
                    }
                }

                // 查找3倍频点
                const tripleFreq = currentX * 3;
                if (tripleFreq <= maxX) {
                    const triplePoint = chartData.find(item => Math.abs(item[0] - tripleFreq) < 1);
                    if (triplePoint) {
                        tooltipContent += `<br/>三倍频：${tripleFreq.toFixed(0)}hZ：${triplePoint[1].toFixed(10)}`;
                    }
                }

                return tooltipContent;
            }
        },
        grid: { top: 30, left: 40, right: 40, bottom: 50 },
        xAxis: {
            type: 'value',
            name: 'Hz',
            min: 0,
            max: xMax,
            nameTextStyle: { color: c },
            axisLabel: { color: c },
            axisLine: { lineStyle: { color: c } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: 'mm/s',
            min: yMinWithMargin,
            max: yMaxWithMargin,
            nameTextStyle: { color: c },
            axisLabel: {
                color: c,
                formatter: function (value: number) {
                    return value.toFixed(2);
                }
            },
            axisLine: { lineStyle: { color: c } },
            splitLine: { lineStyle: { color: s } }
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

/** 时域图：按 totalTime 均分 x，y 为采样值 */
const updateTimeChart = () => {
    if (!timeChartInstance.value || timeDomainData.value.length === 0) return;

    // X轴：0 到 time，按 timedomaindata 长度均分；timedomaindata[0] 在 x=0，最后一个在 x=time
    const dataPoints = timeDomainData.value.length;
    const step = dataPoints > 1 ? totalTime.value / (dataPoints - 1) : 0;

    const chartData = timeDomainData.value.map((value, index) => [
        dataPoints > 1 ? index * step : 0,
        value
    ]);

    const c = chartAxisColor.value;
    const s = chartSplitLineColor.value;
    timeChartInstance.value.setOption({
        tooltip: {
            trigger: 'axis',
            className: 'echarts-tooltip',
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
            nameTextStyle: { color: c },
            axisLabel: { color: c },
            axisLine: { lineStyle: { color: c } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: 'mm/s',
            nameTextStyle: { color: c },
            axisLabel: { color: c },
            axisLine: { lineStyle: { color: c } },
            splitLine: { lineStyle: { color: s } }
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

watch(() => backgroundMode?.value, () => {
    updateFreqChart();
    updateTimeChart();
}, { flush: 'post' });

onMounted(async () => {
    initCharts();
    bindFreq();
    bindTime();

    try {
        if (!deviceId.value || !pointId.value) return;
        const freqResponse = await getVibrationFrequencyData(deviceId.value, pointId.value);
        if (freqResponse.rc === 0 && freqResponse.ret) {
            try {
                const frequencyArray = JSON.parse(freqResponse.ret.frequency);
                const freqSpeedArray = JSON.parse(freqResponse.ret.freqSpeedData);
                if (Array.isArray(frequencyArray) && Array.isArray(freqSpeedArray) &&
                    frequencyArray.length > 0 && freqSpeedArray.length > 0) {
                    freqData.value = { frequency: frequencyArray, freqSpeedData: freqSpeedArray };
                    updateFreqChart();
                } else {
                    console.warn('频域图数据为空或格式不正确');
                }
            } catch (parseError) {
                console.error('解析频域图数据失败:', parseError);
            }
        } else {
            console.warn('频域图接口返回错误或无数据:', freqResponse);
        }
    } catch (error) {
        console.error('获取振动频域数据失败:', error);
    }

    try {
        if (!deviceId.value || !pointId.value) return;
        const timeResponse = await getVibrationTimeDomainData(deviceId.value, pointId.value);
        if (timeResponse.rc === 0 && timeResponse.ret) {
            try {
                const timeDomainArray = timeResponse.ret.timedomaindata
                    .split(',')
                    .map((s) => parseFloat(s.trim()))
                    .filter((n) => !isNaN(n));
                if (Array.isArray(timeDomainArray) && timeDomainArray.length > 0 &&
                    typeof timeResponse.ret.time === 'number' && timeResponse.ret.time > 0) {
                    timeDomainData.value = timeDomainArray;
                    totalTime.value = timeResponse.ret.time;
                    updateTimeChart();
                } else {
                    console.warn('时域图数据为空或格式不正确');
                }
            } catch (parseError) {
                console.error('解析时域图数据失败:', parseError);
            }
        } else {
            console.warn('时域图接口返回错误或无数据:', timeResponse);
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
    gap: 10px;
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
        padding: 10px 20px 0 20px;

        .card-title {
            color: #fff;
        }
    }

    .chart-container {
        flex: 1;
        width: 100%;
        min-height: 0;
        padding: 10px 20px 20px;
        position: relative;

        .chart-inner {
            width: 100%;
            height: 100%;
            min-height: 100px;
        }

        .chart-empty {
            position: absolute;
            inset: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-weight: 500;
        }
    }
}

.freq-card,
.time-card {
    width: 50%;
    background: url('@/assets/images/background/设备详情页-点位列表背景.png') no-repeat center center;
    background-size: 100% 100%;
}
</style>