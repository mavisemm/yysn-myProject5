<template>
    <div class="bottom-row">
        <!-- 振动频域图卡片 -->
        <div class="card-item freq-card">
            <div class="card-header">
                <div class="card-title app-section-title">振动频域图</div>
            </div>
            <div class="chart-container">
                <div ref="freqChartRef" class="chart-inner"></div>
                <div v-if="!freqData.frequency.length" class="chart-empty">暂无数据</div>
            </div>
        </div>

        <!-- 振动时域图卡片 -->
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
import { ref, onMounted, onUnmounted, shallowRef, computed } from 'vue';
import { useRoute } from 'vue-router';
import * as echarts from 'echarts';
import { useChartResize } from '@/composables/useChart';
import { getVibrationFrequencyData, getVibrationTimeDomainData, type VibrationFrequencyData, type VibrationTimeDomainData, type NewApiResponse } from '@/api/modules/device';

const route = useRoute();

// 从路由获取真实参数
const deviceId = computed(() => (route.query.deviceId as string) || '');
const pointId = computed(() => (route.query.pointId as string) || '');

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
    }
};

/**
 * 更新频域图数据
 */
const updateFreqChart = () => {
    if (!freqChartInstance.value || !freqData.value.frequency.length) return;

    // 将两个数组组合成 [x, y] 格式的二维数组，并按 x（频率）升序排序，折线才不会乱序
    const chartData = freqData.value.frequency
        .map((freq, index) => [freq, freqData.value.freqSpeedData[index] ?? 0] as [number, number])
        .sort((a, b) => a[0] - b[0]);

    const xMax = chartData.length > 0 ? Math.max(...freqData.value.frequency, 2000) : 2000;

    // 计算Y轴的最小值和最大值
    const yValues = chartData.map(item => item[1]);
    const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;
    const yMax = yValues.length > 0 ? Math.max(...yValues) : 1;

    // 为Y轴添加一些边距，确保数据不会贴边显示
    const yMargin = (yMax - yMin) * 0.1;
    const yMinWithMargin = Math.max(0, yMin - yMargin);
    const yMaxWithMargin = yMax + yMargin;

    freqChartInstance.value.setOption({
        tooltip: {
            trigger: 'axis',
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
            nameTextStyle: { color: '#fff' },
            axisLabel: { color: '#fff' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: 'mm/s',
            min: yMinWithMargin,
            max: yMaxWithMargin,
            nameTextStyle: { color: '#fff' },
            axisLabel: {
                color: '#fff',
                formatter: function (value: number) {
                    return value.toFixed(2);
                }
            },
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

/**
 * 更新时域图数据
 */
const updateTimeChart = () => {
    if (!timeChartInstance.value || timeDomainData.value.length === 0) return;

    // X轴：0 到 time，按 timedomaindata 长度均分；timedomaindata[0] 在 x=0，最后一个在 x=time
    const dataPoints = timeDomainData.value.length;
    const step = dataPoints > 1 ? totalTime.value / (dataPoints - 1) : 0;

    const chartData = timeDomainData.value.map((value, index) => [
        dataPoints > 1 ? index * step : 0,
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
            name: 'mm/s',
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
        // 检查必要参数
        if (!deviceId.value || !pointId.value) {
            console.warn('缺少 deviceId 或 pointId 参数，无法加载频域图数据');
            return;
        }

        const freqResponse = await getVibrationFrequencyData(deviceId.value, pointId.value);
        if (freqResponse.rc === 0 && freqResponse.ret) {
            try {
                // 解析JSON字符串为数组
                const frequencyArray = JSON.parse(freqResponse.ret.frequency);
                const freqSpeedArray = JSON.parse(freqResponse.ret.freqSpeedData);

                // 验证数据有效性
                if (Array.isArray(frequencyArray) && Array.isArray(freqSpeedArray) &&
                    frequencyArray.length > 0 && freqSpeedArray.length > 0) {
                    // 更新数据
                    freqData.value = {
                        frequency: frequencyArray,
                        freqSpeedData: freqSpeedArray
                    };

                    // 更新图表
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
        // 即使出错也要保持模块显示
    }

    // 请求时域图数据
    try {
        // 检查必要参数
        if (!deviceId.value || !pointId.value) {
            console.warn('缺少 deviceId 或 pointId 参数，无法加载时域图数据');
            return;
        }

        const timeResponse = await getVibrationTimeDomainData(deviceId.value, pointId.value);
        if (timeResponse.rc === 0 && timeResponse.ret) {
            try {
                // timedomaindata 为逗号分隔字符串，如 "91,48,46,48,53,..."
                const timeDomainArray = timeResponse.ret.timedomaindata
                    .split(',')
                    .map((s) => parseFloat(s.trim()))
                    .filter((n) => !isNaN(n));

                // 验证数据有效性
                if (Array.isArray(timeDomainArray) && timeDomainArray.length > 0 &&
                    typeof timeResponse.ret.time === 'number' && timeResponse.ret.time > 0) {
                    // 更新时域图数据
                    timeDomainData.value = timeDomainArray;
                    totalTime.value = timeResponse.ret.time;

                    // 更新时域图
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
        // 即使出错也要保持模块显示
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
            //font-weight: bold;
            color: #fff;
        }
    }

    .chart-container {
        flex: 1;
        width: 100%;
        min-height: 0;
        padding: 20px;
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
            font-size: 16px;
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