<template>
    <div class="bottom-row">
        <div class="card-item freq-card">
            <div class="card-header">
                <div class="card-title app-section-title">振动频域图</div>
            </div>
            <div class="chart-container">
                <CommonEcharts
                    ref="freqChartRef"
                    :option="freqOption"
                    :enable-data-zoom="false"
                    :not-merge="true"
                    @chart-ready="onFreqChartReady"
                />
            </div>
        </div>
        <div class="card-item time-card">
            <div class="card-header">
                <div class="card-title app-section-title">振动时域图</div>
            </div>
            <div class="chart-container">
                <CommonEcharts
                    :option="timeOption"
                    :enable-data-zoom="false"
                    :not-merge="true"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, inject, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { CommonEcharts } from '@/components/common/chart';
import { getVibrationFrequencyData, getVibrationTimeDomainData } from '@/api/modules/device';
import { useDeviceTreeStore } from '@/stores/deviceTree';

const route = useRoute();
const receiverIdFromParams = computed(() => {
    const rid = route.params.receiverId;
    const resolved = Array.isArray(rid) ? rid[0] : rid;
    return (typeof resolved === 'string' ? resolved : '') || '';
});
const deviceTreeStore = useDeviceTreeStore();

const resolvePointDeviceId = (rid: string): string => {
    if (!rid) return '';
    for (const factory of deviceTreeStore.deviceTreeData) {
        for (const workshop of (factory.children ?? [])) {
            for (const device of (workshop.children ?? [])) {
                if (device.type !== 'device') continue;
                const hit = (device.children ?? []).find(p => p.type === 'point' && p.id === rid);
                if (hit?.deviceId) return hit.deviceId;
            }
        }
    }
    return '';
};

// 点位页：接口入参需要点位级 deviceId，但地址只携带 equipmentId/receiverId
const pointDeviceId = computed(() => resolvePointDeviceId(receiverIdFromParams.value));

/** 主题：灰色时坐标轴/分割线为黑，否则白 */
const backgroundMode = inject<Ref<'image' | 'gray' | 'green' | 'navy'> | undefined>('backgroundMode');
const isGrayTheme = computed(() => backgroundMode?.value === 'gray');
const chartAxisColor = computed(() => (isGrayTheme.value ? '#000' : '#fff'));
const chartSplitLineColor = computed(() => (isGrayTheme.value ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)'));

const freqChartRef = ref<InstanceType<typeof CommonEcharts>>();
const freqChartInstance = shallowRef<echarts.ECharts | null>(null);
let freqChartCleanup: (() => void) | null = null;

const freqData = ref<{ frequency: number[]; freqSpeedData: number[] }>({ frequency: [], freqSpeedData: [] });
const timeDomainData = ref<number[]>([]);
const totalTime = ref<number>(0);

// 当前 axisPointer 所在的基础频率 f（由图表事件驱动）
const pointerBaseFreq = ref<number | null>(null);

const getSortedFreqChartData = () => {
    const chartData = freqData.value.frequency
        .map((freq, index) => [freq, freqData.value.freqSpeedData[index] ?? 0] as [number, number])
        .sort((a, b) => a[0] - b[0]);
    const xMax = chartData.length > 0 ? Math.max(...freqData.value.frequency, 2000) : 2000;
    return { chartData, xMax };
};

const buildHarmonicMarkLineData = (baseFreq: number) => {
    if (!Number.isFinite(baseFreq) || baseFreq <= 0) return [];
    const { chartData, xMax } = getSortedFreqChartData();
    const findNearPointByX = (x: number) => chartData.find(item => Math.abs(item[0] - x) < 1);

    const candidates: Array<{ name: string; x: number; color: string; requirePoint: boolean }> = [
        { name: '1X', x: baseFreq, color: '#7ecba1', requirePoint: false },
        { name: '2X', x: baseFreq * 2, color: '#60a5fa', requirePoint: true },
        { name: '3X', x: baseFreq * 3, color: '#f59e0b', requirePoint: true },
        { name: '4X', x: baseFreq * 4, color: '#f472b6', requirePoint: true }
    ];

    return candidates
        .filter(item => item.x > 0 && item.x <= xMax)
        .filter(item => (item.requirePoint ? !!findNearPointByX(item.x) : true))
        .map(item => ({
            name: item.name,
            xAxis: item.x,
            lineStyle: {
                type: 'dashed',
                width: 1,
                color: item.color,
                opacity: 0.9
            },
            label: {
                show: true,
                formatter: item.name,
                color: item.color,
                fontSize: 11,
                position: 'insideEndTop'
            }
        }));
};

/** 频域图：数据 [freq, value] 按频率升序，y 轴留边距 */
const freqOption = computed<EChartsOption>(() => {
    if (!freqData.value.frequency.length) return {};

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

    return {
        tooltip: {
            trigger: 'axis',
            className: 'echarts-tooltip',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: { color: '#fff' },
            // 允许 tooltip 溢出图表容器（避免被强行挤回去遮挡倍频线）
            confine: false,
            position: function (pos: any, _params: any, _el: any, _elRect: any, size: any) {
                const [mouseX, mouseY] = pos as [number, number];
                const [contentWidth, contentHeight] = size.contentSize as [number, number];

                const gap = 18;
                const hitMargin = 10;

                // 计算需要避让的竖线（只避让“当前实际会显示”的 1X/2X/3X/4X）
                const inst = freqChartInstance.value;
                const base = pointerBaseFreq.value;
                const avoidPixels: number[] = [];
                if (inst && typeof base === 'number' && Number.isFinite(base) && base > 0) {
                    const lines = buildHarmonicMarkLineData(base);
                    for (const l of lines as any[]) {
                        const v = (l as any)?.xAxis;
                        const n = typeof v === 'number' ? v : Number(v);
                        if (!Number.isFinite(n)) continue;
                        try {
                            const px = inst.convertToPixel({ xAxisIndex: 0 }, n) as number;
                            if (typeof px === 'number' && Number.isFinite(px)) avoidPixels.push(px);
                        } catch {
                            // ignore
                        }
                    }
                }

                const overlapCount = (x: number) => {
                    const left = x;
                    const right = x + contentWidth;
                    return avoidPixels.reduce((acc, px) => (px >= left - hitMargin && px <= right + hitMargin ? acc + 1 : acc), 0);
                };

                // 候选位置：右/左/上/下（不做 clamp，允许溢出），选“遮挡最少”的；同分选离鼠标更近的
                const candidatesRaw = [
                    { x0: mouseX + gap, y0: mouseY - contentHeight / 2 }, // right
                    { x0: mouseX - contentWidth - gap, y0: mouseY - contentHeight / 2 }, // left
                    { x0: mouseX - contentWidth / 2, y0: mouseY - contentHeight - gap }, // top
                    { x0: mouseX - contentWidth / 2, y0: mouseY + gap } // bottom
                ];
                const candidates = candidatesRaw.map(c => {
                    const x = c.x0;
                    const y = c.y0;
                    const dx = x + contentWidth / 2 - mouseX;
                    const dy = y + contentHeight / 2 - mouseY;
                    return {
                        x,
                        y,
                        overlaps: overlapCount(x),
                        dist2: dx * dx + dy * dy
                    };
                });

                candidates.sort((a, b) => a.overlaps - b.overlaps || a.dist2 - b.dist2);
                const best = candidates[0] ?? { x: mouseX + gap, y: mouseY - contentHeight / 2 };
                return [best.x, best.y];
            },
            formatter: function (params: any) {
                const data = params[0];
                const currentX = data.value[0];
                const currentY = data.value[1];
                const maxX = Math.max(...freqData.value.frequency, 2000);

                let tooltipContent = `${currentX.toFixed(0)}hZ：${currentY.toFixed(10)}`;

                const doubleFreq = currentX * 2;
                if (doubleFreq <= maxX) {
                    const doublePoint = chartData.find(item => Math.abs(item[0] - doubleFreq) < 1);
                    if (doublePoint) {
                        tooltipContent += `<br/>双倍频：${doubleFreq.toFixed(0)}hZ：${doublePoint[1].toFixed(10)}`;
                    }
                }

                const tripleFreq = currentX * 3;
                if (tripleFreq <= maxX) {
                    const triplePoint = chartData.find(item => Math.abs(item[0] - tripleFreq) < 1);
                    if (triplePoint) {
                        tooltipContent += `<br/>三倍频：${tripleFreq.toFixed(0)}hZ：${triplePoint[1].toFixed(10)}`;
                    }
                }

                const quadrupleFreq = currentX * 4;
                if (quadrupleFreq <= maxX) {
                    const quadruplePoint = chartData.find(item => Math.abs(item[0] - quadrupleFreq) < 1);
                    if (quadruplePoint) {
                        tooltipContent += `<br/>四倍频：${quadrupleFreq.toFixed(0)}hZ：${quadruplePoint[1].toFixed(10)}`;
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
                formatter: (value: number) => value.toFixed(2)
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
            id: 'freq-series',
            type: 'line',
            smooth: false,
            showSymbol: false,
            sampling: 'lttb',
            animation: false,
            data: chartData,
            lineStyle: { color: '#7ecba1', width: 1 },
            markLine: {
                silent: true,
                symbol: ['none', 'none'],
                precision: 2,
                animation: false,
                label: { show: false },
                lineStyle: { type: 'dashed', width: 1, opacity: 0.9 },
                data: []
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(126, 203, 161, 0.8)' },
                    { offset: 1, color: 'rgba(126, 203, 161, 0.2)' }
                ])
            }
        }]
    } as EChartsOption;
});

const onFreqChartReady = (instance: echarts.ECharts) => {
    freqChartInstance.value = instance;
    if (freqChartCleanup) {
        freqChartCleanup();
        freqChartCleanup = null;
    }

    let rafId: number | null = null;
    let lastAppliedBaseFreq: number | null = null;
    const scheduleApplyMarkLines = (baseFreq: number) => {
        if (!freqChartInstance.value) return;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            rafId = null;
            if (!freqChartInstance.value) return;
            if (lastAppliedBaseFreq !== null && Math.abs(lastAppliedBaseFreq - baseFreq) < 1e-6) return;
            lastAppliedBaseFreq = baseFreq;
            const data = buildHarmonicMarkLineData(baseFreq);
            try {
                freqChartInstance.value.setOption(
                    {
                        series: [
                            {
                                id: 'freq-series',
                                markLine: { data }
                            }
                        ]
                    } as any,
                    { notMerge: false, lazyUpdate: true }
                );
            } catch {
                // ignore
            }
        });
    };

    const onUpdateAxisPointer = (params: any) => {
        const axesInfo = Array.isArray(params?.axesInfo) ? params.axesInfo : [];
        const info0 = axesInfo[0];
        const v = info0?.value;
        const n = typeof v === 'number' ? v : Number(v);
        if (Number.isFinite(n)) {
            pointerBaseFreq.value = n;
            scheduleApplyMarkLines(n);
        }
    };

    instance.on('updateAxisPointer', onUpdateAxisPointer);
    freqChartCleanup = () => {
        try { instance.off('updateAxisPointer', onUpdateAxisPointer); } catch { /* ignore */ }
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    };
};

/** 时域图：按 totalTime 均分 x，y 为采样值 */
const timeOption = computed<EChartsOption>(() => {
    if (timeDomainData.value.length === 0) return {};

    const dataPoints = timeDomainData.value.length;
    const step = dataPoints > 1 ? totalTime.value / (dataPoints - 1) : 0;

    const chartData = timeDomainData.value.map((value, index) => [
        dataPoints > 1 ? index * step : 0,
        value
    ]);

    const c = chartAxisColor.value;
    const s = chartSplitLineColor.value;

    return {
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
    } as EChartsOption;
});

const loadVibrationChartsData = async () => {
    if (!pointDeviceId.value || !receiverIdFromParams.value) return;

    try {
        const freqResponse = await getVibrationFrequencyData(pointDeviceId.value, receiverIdFromParams.value);
        if (freqResponse.rc === 0 && freqResponse.ret) {
            try {
                const frequencyArray = JSON.parse(freqResponse.ret.frequency);
                const freqSpeedArray = JSON.parse(freqResponse.ret.freqSpeedData);
                if (Array.isArray(frequencyArray) && Array.isArray(freqSpeedArray) &&
                    frequencyArray.length > 0 && freqSpeedArray.length > 0) {
                    freqData.value = { frequency: frequencyArray, freqSpeedData: freqSpeedArray };
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
        const timeResponse = await getVibrationTimeDomainData(pointDeviceId.value, receiverIdFromParams.value);
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
};

watch([receiverIdFromParams, pointDeviceId], ([rid, pid]) => {
    if (!rid || !pid) return;
    void loadVibrationChartsData();
}, { immediate: true });

onUnmounted(() => {
    if (freqChartCleanup) {
        freqChartCleanup();
        freqChartCleanup = null;
    }
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
    }
}

.freq-card,
.time-card {
    width: 50%;
}
</style>
