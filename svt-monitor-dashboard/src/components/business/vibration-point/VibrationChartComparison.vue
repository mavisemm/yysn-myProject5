<template>
    <div class="bottom-row">
        <div class="card-item freq-card">
            <div class="card-header">
                <div class="card-title app-section-title">振动频域图</div>
                <el-button class="freq-fullscreen-btn" text circle size="large" :icon="FullScreen" title="全屏查看"
                    @click="openFreqFullscreen" />
            </div>
            <div class="chart-container">
                <CommonEcharts ref="freqChartRef" :option="freqOption" :enable-data-zoom="false" :not-merge="true"
                    enable-fullscreen fullscreen-title="振动频域图" fullscreen-background="#142060"
                    @chart-ready="onFreqChartReady" @fullscreen-chart-ready="onFreqFullscreenChartReady"
                    @fullscreen-closed="onFreqFullscreenClosed" />
            </div>
        </div>
        <div class="card-item time-card">
            <div class="card-header">
                <div class="card-title app-section-title">振动时域图</div>
                <el-button class="time-fullscreen-btn" text circle size="large" :icon="FullScreen" title="全屏查看"
                    @click="openTimeFullscreen" />
            </div>
            <div class="chart-container">
                <CommonEcharts ref="timeChartRef" :option="timeOption" :enable-data-zoom="false" :not-merge="true"
                    enable-fullscreen fullscreen-title="振动时域图" fullscreen-background="#142060" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { CommonEcharts } from '@/components/common/chart';
import { getVibrationFrequencyData, getVibrationTimeDomainData } from '@/api/modules/device';
import { useDeviceTreeStore } from '@/stores/deviceTree';
import { FullScreen } from '@element-plus/icons-vue';

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


const pointDeviceId = computed(() => resolvePointDeviceId(receiverIdFromParams.value));


const chartAxisColor = computed(() => '#fff');
const chartSplitLineColor = computed(() => 'rgba(255,255,255,0.1)');

const freqChartRef = ref<InstanceType<typeof CommonEcharts>>();
const timeChartRef = ref<InstanceType<typeof CommonEcharts>>();
const freqChartInstance = shallowRef<echarts.ECharts | null>(null);
let freqChartCleanup: (() => void) | null = null;
let fullscreenFreqPointerCleanup: (() => void) | null = null;
let markLineRafId: number | null = null;
let lastHarmonicBaseFreq: number | null = null;

const openFreqFullscreen = () => {
    (freqChartRef.value as any)?.openFullscreen?.();
};
const openTimeFullscreen = () => {
    (timeChartRef.value as any)?.openFullscreen?.();
};

const freqData = ref<{ frequency: number[]; freqSpeedData: number[] }>({ frequency: [], freqSpeedData: [] });
const timeDomainData = ref<number[]>([]);
const totalTime = ref<number>(0);


const pointerBaseFreq = ref<number | null>(null);

// y 轴刻度：最多保留小数点后两位（并去掉无意义的尾随 0）
const formatYAxisTick = (v: number | string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return String(Number(n.toFixed(2)));
};
// 频域图 y 轴刻度：固定显示到小数点后 5 位
const formatFreqYAxisTick = (v: number | string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return n.toFixed(5);
};

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

            confine: false,
            position: function (pos: any, _params: any, _el: any, _elRect: any, size: any) {
                const [mouseX, mouseY] = pos as [number, number];
                const [contentWidth, contentHeight] = size.contentSize as [number, number];

                const gap = 18;
                const hitMargin = 10;


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

                        }
                    }
                }

                const overlapCount = (x: number) => {
                    const left = x;
                    const right = x + contentWidth;
                    return avoidPixels.reduce((acc, px) => (px >= left - hitMargin && px <= right + hitMargin ? acc + 1 : acc), 0);
                };


                const candidatesRaw = [
                    { x0: mouseX + gap, y0: mouseY - contentHeight / 2 },
                    { x0: mouseX - contentWidth - gap, y0: mouseY - contentHeight / 2 },
                    { x0: mouseX - contentWidth / 2, y0: mouseY - contentHeight - gap },
                    { x0: mouseX - contentWidth / 2, y0: mouseY + gap }
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
                        tooltipContent += `<br/>二倍频：${doubleFreq.toFixed(0)}hZ：${doublePoint[1].toFixed(10)}`;
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
        grid: { top: 30, left: 40, right: 50, bottom: 35, containLabel: true },
        xAxis: {
            type: 'value',
            name: 'Hz',
            min: 0,
            max: xMax,
            nameTextStyle: { color: c },
            axisLabel: {
                color: c,
                margin: 8,
                showMaxLabel: true,
                hideOverlap: true
            },
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
                formatter: formatFreqYAxisTick
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

const scheduleHarmonicMarkLines = (baseFreq: number) => {
    if (markLineRafId) cancelAnimationFrame(markLineRafId);
    markLineRafId = requestAnimationFrame(() => {
        markLineRafId = null;
        if (lastHarmonicBaseFreq !== null && Math.abs(lastHarmonicBaseFreq - baseFreq) < 1e-6) return;
        lastHarmonicBaseFreq = baseFreq;
        const data = buildHarmonicMarkLineData(baseFreq);
        try {
            if (freqChartInstance.value) {
                freqChartInstance.value.setOption(
                    { series: [{ id: 'freq-series', markLine: { data } }] } as any,
                    { notMerge: false, lazyUpdate: true }
                );
            }
            freqChartRef.value?.patchFullscreenSeriesMarkLine?.('freq-series', data);
        } catch {

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
        scheduleHarmonicMarkLines(n);
    }
};

const onFreqChartReady = (instance: echarts.ECharts) => {
    freqChartInstance.value = instance;
    if (freqChartCleanup) {
        freqChartCleanup();
        freqChartCleanup = null;
    }

    instance.on('updateAxisPointer', onUpdateAxisPointer);
    freqChartCleanup = () => {
        try { instance.off('updateAxisPointer', onUpdateAxisPointer); } catch { }
        if (markLineRafId) {
            cancelAnimationFrame(markLineRafId);
            markLineRafId = null;
        }
    };
};

const onFreqFullscreenChartReady = (inst: echarts.ECharts) => {
    if (fullscreenFreqPointerCleanup) {
        fullscreenFreqPointerCleanup();
        fullscreenFreqPointerCleanup = null;
    }
    inst.on('updateAxisPointer', onUpdateAxisPointer);
    fullscreenFreqPointerCleanup = () => {
        try { inst.off('updateAxisPointer', onUpdateAxisPointer); } catch { }
    };

    const base = pointerBaseFreq.value;
    if (typeof base === 'number' && Number.isFinite(base) && base > 0) {
        const data = buildHarmonicMarkLineData(base);
        try {
            freqChartRef.value?.patchFullscreenSeriesMarkLine?.('freq-series', data);
        } catch {

        }
    }
};

const onFreqFullscreenClosed = () => {
    if (fullscreenFreqPointerCleanup) {
        fullscreenFreqPointerCleanup();
        fullscreenFreqPointerCleanup = null;
    }
};

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
        grid: { top: 30, left: 40, right: 50, bottom: 35, containLabel: true },
        xAxis: {
            type: 'value',
            name: 's',
            min: 0,
            max: totalTime.value,
            nameTextStyle: { color: c },
            axisLabel: {
                color: c,
                margin: 8,
                showMaxLabel: true,
                hideOverlap: true
            },
            axisLine: { lineStyle: { color: c } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: 'mm/s',
            nameTextStyle: { color: c },
            axisLabel: {
                color: c,
                formatter: formatYAxisTick
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
                const raw = (timeResponse.ret as any).timedomaindata;
                const timeDomainArray: number[] = Array.isArray(raw)
                    ? raw
                        .map((v: any) => (typeof v === 'number' ? v : parseFloat(String(v).trim())))
                        .filter((n: number) => Number.isFinite(n))
                    : String(raw ?? '')
                        .split(',')
                        .map((s) => parseFloat(s.trim()))
                        .filter((n) => Number.isFinite(n));
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
    if (fullscreenFreqPointerCleanup) {
        fullscreenFreqPointerCleanup();
        fullscreenFreqPointerCleanup = null;
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

        :deep(.freq-fullscreen-btn) {
            color: #fff !important;
        }

        :deep(.time-fullscreen-btn) {
            color: #fff !important;
        }

        :deep(.freq-fullscreen-btn:hover),
        :deep(.freq-fullscreen-btn:focus),
        :deep(.freq-fullscreen-btn:active),
        :deep(.time-fullscreen-btn:hover),
        :deep(.time-fullscreen-btn:focus),
        :deep(.time-fullscreen-btn:active) {
            background-color: transparent !important;
            border-color: transparent !important;
            box-shadow: none !important;
        }

        :deep(.freq-fullscreen-btn .el-icon) {
            color: #fff !important;
        }

        :deep(.time-fullscreen-btn .el-icon) {
            color: #fff !important;
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



:global(.freq-fullscreen-modal .el-dialog) {
    background: #142060 !important;
}

:global(.freq-fullscreen-modal .el-dialog__header) {
    background: #142060 !important;
    margin-right: 0;
}

:global(.freq-fullscreen-modal .el-dialog__title) {
    color: rgba(255, 255, 255, 0.92) !important;
}

:global(.freq-fullscreen-modal .el-dialog__body) {
    background: #142060 !important;
}

:global(.freq-fullscreen-modal .el-dialog__headerbtn .el-dialog__close) {
    color: rgba(255, 255, 255, 0.92) !important;
}

:deep(.freq-fullscreen-dialog .el-dialog) {
    background: #142060;
}

:deep(.freq-fullscreen-dialog .el-dialog__header) {
    background: #142060;
    margin-right: 0;
}

:deep(.freq-fullscreen-dialog .el-dialog__title) {
    color: rgba(255, 255, 255, 0.92);
}

:deep(.freq-fullscreen-dialog .el-dialog__body) {
    background: #142060;
}

:deep(.freq-fullscreen-dialog .el-dialog__headerbtn .el-dialog__close) {
    color: rgba(255, 255, 255, 0.92);
}

.freq-card,
.time-card {
    width: 50%;
}
</style>
