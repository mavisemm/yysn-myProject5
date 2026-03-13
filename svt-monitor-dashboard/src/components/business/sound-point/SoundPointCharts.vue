<template>
    <div class="charts-section">
        <div class="charts-row">
            <div class="chart-item">
                <div class="chart-title-row">
                    <div class="chart-title app-section-title">能量曲线</div>
                </div>
                <div class="chart-container">
                    <CommonEcharts
                        ref="energyChartRef"
                        :option="energyOption"
                        linkage-group="sound-point-charts"
                        :enable-linkage-zoom="true"
                        :enable-wheel-zoom="true"
                        :tooltip-follow-mouse="true"
                        :not-merge="true"
                        :enable-data-zoom="false"
                        @chart-ready="onEnergyChartReady"
                    />
                </div>
            </div>
            <div class="chart-item">
                <div class="chart-title-row">
                    <div class="chart-title app-section-title">密度曲线</div>
                </div>
                <div class="chart-container">
                    <CommonEcharts
                        ref="densityChartRef"
                        :option="densityOption"
                        linkage-group="sound-point-charts"
                        :enable-linkage-zoom="true"
                        :enable-wheel-zoom="true"
                        :tooltip-follow-mouse="true"
                        :not-merge="true"
                        :enable-data-zoom="false"
                        @chart-ready="onDensityChartReady"
                    />
                </div>
            </div>
        </div>

        <!-- 声音点位页：两个图共用的频率范围输入条（放在两个 ECharts 下面） -->
        <div
            v-if="true"
            class="range-controls-bar"
            @mousedown.stop
            @wheel.stop
        >
            <span class="controls-label">频率范围：</span>
            <el-input-number
                v-model="rangeMin"
                class="range-input"
                size="small"
                :min="safeRangeDataMin"
                :max="safeRangeDataMax"
                :step="0.1"
                :precision="1"
                controls-position="right"
                :disabled="rangeControlsDisabled"
                @change="applyRangeIfEnabled"
            />
            <span class="controls-sep">~</span>
            <el-input-number
                v-model="rangeMax"
                class="range-input"
                size="small"
                :min="safeRangeDataMin"
                :max="safeRangeDataMax"
                :step="0.1"
                :precision="1"
                controls-position="right"
                :disabled="rangeControlsDisabled"
                @change="applyRangeIfEnabled"
            />
            <span class="controls-unit">Hz</span>
            <el-button size="small" :disabled="rangeControlsDisabled" @click="resetRangeIfEnabled">重置</el-button>
            <el-button
                type="primary"
                size="small"
                @mousedown.stop
                @wheel.stop
                @click="trendDialogVisible = true"
            >
                趋势分析
            </el-button>
        </div>

        <SoundTrendAnalysisDialog
            v-model="trendDialogVisible"
            :point-list="pointList"
            :selected-point-id="selectedPointId"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, inject, computed, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import type { EChartsOption } from 'echarts';
import { CommonEcharts } from '@/components/common/chart';
import { useRangeControls } from '@/composables/useRangeControls';
import SoundTrendAnalysisDialog from '@/components/business/sound-point/SoundTrendAnalysisDialog.vue';

const emit = defineEmits(['chart-init']);
const props = defineProps<{
    deviationList: any[];
    pointList: any[];
    selectedPointId?: string;
}>();

const trendDialogVisible = ref(false);

const selectedPointId = computed(() => props.selectedPointId || (props.pointList?.[0]?.id ?? ''));
const pointList = computed(() => props.pointList || []);

const energyChartRef = ref<InstanceType<typeof CommonEcharts>>();
const densityChartRef = ref<InstanceType<typeof CommonEcharts>>();

/** 主题：灰色时坐标轴/分割线为黑，否则白 */
const backgroundMode = inject<Ref<'image' | 'gray' | 'green' | 'navy'> | undefined>('backgroundMode');
const isGrayTheme = computed(() => backgroundMode?.value === 'gray');
const chartAxisColor = computed(() => (isGrayTheme.value ? '#000' : '#fff'));
const chartSplitLineColor = computed(() => (isGrayTheme.value ? 'rgba(0,0,0,0.2)' : 'rgba(150,150,150, 0.2)'));

/** 选中的条目（带颜色） */
const selectedItemsWithColor = computed(() => {
    const selected = props.deviationList.filter(item => item.visible);
    return selected.map((item, index) => ({
        ...item,
        color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
    }));
});

const hasEnergyData = computed(() => {
    return selectedItemsWithColor.value.some((item: any) => Array.isArray(item?.dbArr) && item.dbArr.length > 0);
});
const hasDensityData = computed(() => {
    return selectedItemsWithColor.value.some((item: any) => Array.isArray(item?.densityArr) && item.densityArr.length > 0);
});
/** 两张曲线都没有返回值时：图表显示暂无数据，范围筛选不可输入但模块保留 */
const hasAnyChartData = computed(() => hasEnergyData.value || hasDensityData.value);
const rangeControlsDisabled = computed(() => !hasAnyChartData.value);

const freqsRaw = computed<any[]>(() => selectedItemsWithColor.value[0]?.freqs || []);
/** 公共配置 */
const commonOptionBase = computed(() => {
    const c = chartAxisColor.value;
    const s = chartSplitLineColor.value;
    const freqs = freqsRaw.value || [];
    return {
        textStyle: { color: c },
        tooltip: {
            trigger: 'axis' as const,
            className: 'echarts-tooltip',
            backgroundColor: 'rgba(50,50,50,0.8)',
            borderColor: 'rgba(50,50,50,0.8)',
            textStyle: { color: '#fff' },
            axisPointer: {
                type: 'cross' as const,
                label: { show: false }
            },
            position: function (pos: any, _params: any, _el: any, _elRect: any, size: any) {
                const [mouseX, mouseY] = pos;
                const [contentWidth, contentHeight] = size.contentSize;
                const [viewWidth] = size.viewSize;
                let x = mouseX + 20;
                if (x + contentWidth > viewWidth) {
                    x = mouseX - contentWidth - 20;
                }
                const y = Math.max(0, mouseY - contentHeight / 2);
                return [x, y];
            }
        },
        axisPointer: {
            link: [{ xAxisIndex: 'all' as const }],
            label: {
                backgroundColor: 'rgba(50,50,50,0.8)',
                color: c
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
                textStyle: { color: c },
                handleStyle: { color: c },
                filterMode: 'none'
            }
        ],
        xAxis: {
            type: 'category' as const,
            data: freqs,
            boundaryGap: false,
            axisLine: { lineStyle: { color: c } },
            axisLabel: { color: c }
        }
    };
});

const emptyGraphic = computed(() => {
    const c = chartAxisColor.value;
    return [{
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
            text: '暂无数据',
            fill: c,
            fontSize: 14,
            fontWeight: 500,
            opacity: 0.75
        }
    }];
});

/** 能量曲线配置 */
const energyOption = computed<EChartsOption>(() => {
    const c = chartAxisColor.value;
    const s = chartSplitLineColor.value;
    const series = selectedItemsWithColor.value
        .filter((item: any) => Array.isArray(item?.dbArr) && item.dbArr.length > 0)
        .map((item: any) => ({
            name: item.time,
            type: 'line',
            data: item.dbArr,
            itemStyle: { color: item.color },
            smooth: true,
            symbolSize: 1
        }));
    return {
        ...commonOptionBase.value,
        yAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: c } },
            axisLabel: { color: c },
            nameTextStyle: { color: c },
            splitLine: { lineStyle: { color: s } }
        },
        series,
        ...(series.length === 0 ? { graphic: emptyGraphic.value } : { graphic: [] })
    } as EChartsOption;
});

/** 密度曲线配置 */
const densityOption = computed<EChartsOption>(() => {
    const c = chartAxisColor.value;
    const s = chartSplitLineColor.value;
    const series = selectedItemsWithColor.value
        .filter((item: any) => Array.isArray(item?.densityArr) && item.densityArr.length > 0)
        .map((item: any) => ({
            name: item.time,
            type: 'line',
            data: item.densityArr,
            itemStyle: { color: item.color },
            smooth: true,
            symbolSize: 1
        }));
    return {
        ...commonOptionBase.value,
        yAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: c } },
            axisLabel: { color: c },
            nameTextStyle: { color: c },
            splitLine: { lineStyle: { color: s } }
        },
        series,
        ...(series.length === 0 ? { graphic: emptyGraphic.value } : { graphic: [] })
    } as EChartsOption;
});

let chartInitEmitted = false;
let energyDataZoomCleanup: (() => void) | null = null;
const onEnergyChartReady = () => {
    tryEmitChartInit();
};
const onDensityChartReady = () => {
    tryEmitChartInit();
};
const tryEmitChartInit = () => {
    if (chartInitEmitted) return;
    const energy = energyChartRef.value?.chartInstance;
    const density = densityChartRef.value?.chartInstance;
    if (energy && density) {
        chartInitEmitted = true;
        emit('chart-init', { energyChartInstance: energy, densityChartInstance: density });

        // 监听 dataZoom，同步到底部范围输入框（只监听一张图即可，因已做联动分组）
        if (!energyDataZoomCleanup) {
            const handler = (params: any) => {
                handleDataZoom(params);
            };
            (energy as any).on('datazoom', handler);
            energyDataZoomCleanup = () => {
                (energy as any).off('datazoom', handler);
            };
        }
    }
};

/** 供父组件调用，使用 CommonEcharts 后由响应式 option 自动更新，保留空实现以兼容 */
const updateCharts = () => {
    // option 为 computed，随 deviationList 变化自动更新
};

defineExpose({ updateCharts });

// 频率范围控制（复用 CommonEcharts 的公共逻辑）
const {
    showResolvedRangeControls,
    rangeMin,
    rangeMax,
    rangeDataMin,
    rangeDataMax,
    applyRange,
    resetRange,
    handleDataZoom,
    dispose: disposeRangeControls
} = useRangeControls({
    option: energyOption,
    showRangeControls: computed(() => true),
    rangeControlsData: computed(() => freqsRaw.value || []),
    rangeControlsXAxisIndex: computed(() => 0),
    rangeControlsMin: computed(() => undefined),
    rangeControlsMax: computed(() => undefined),
    rangeControlsStep: computed(() => 0.1),
    rangeControlsPrecision: computed(() => 1),
    rangeControlsDebounceMs: computed(() => 600),
    preserveDataZoom: computed(() => true),
    doDataZoom: ({ startValue, endValue }) => {
        const energyInstance = energyChartRef.value?.chartInstance;
        const densityInstance = densityChartRef.value?.chartInstance;
        const payload: any = { type: 'dataZoom', startValue, endValue };
        energyInstance?.dispatchAction(payload);
        densityInstance?.dispatchAction(payload);
    }
});

const safeRangeDataMin = computed(() => {
    const v = Number(rangeDataMin.value);
    return Number.isFinite(v) ? v : 0;
});
const safeRangeDataMax = computed(() => {
    const v = Number(rangeDataMax.value);
    if (Number.isFinite(v) && v >= safeRangeDataMin.value) return v;
    return safeRangeDataMin.value;
});

const applyRangeIfEnabled = () => {
    if (rangeControlsDisabled.value) return;
    applyRange();
};
const resetRangeIfEnabled = () => {
    if (rangeControlsDisabled.value) return;
    resetRange();
};

onUnmounted(() => {
    if (energyDataZoomCleanup) {
        energyDataZoomCleanup();
        energyDataZoomCleanup = null;
    }
    disposeRangeControls();
});
</script>

<style lang="scss" scoped>
.charts-section {
    display: flex;
    flex-direction: column;
    height: 50%;
    background: url('@/assets/images/background/首页-Top5背景.png') no-repeat center center;
    background-size: 100% 100%;

    .charts-row {
        display: flex;
        flex-direction: row;
        gap: 10px;
        flex: 1;
        min-height: 0;
    }

    .range-controls-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: nowrap;
        gap: 8px;
        padding: 10px 20px 20px;
        font-size: 12px;
        overflow-x: auto;
        overflow-y: hidden;

        .controls-label,
        .controls-sep,
        .controls-unit {
            white-space: nowrap;
            opacity: 0.9;
            flex: 0 0 auto;
        }

        :deep(.el-input-number.range-input) {
            width: 100px;
            flex: 0 0 auto;
        }

        :deep(.el-input-number.range-input .el-input__wrapper) {
            width: 100%;
        }
    }

    display: flex;
    flex-direction: column;

    .chart-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        border-radius: 8px;

        .chart-title-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 10px 20px 0;

            .chart-title {
                text-align: center;
            }
        }

        .chart-container {
            flex: 1;
            min-height: 200px;
            padding: 0 20px;
        }
    }
}

:deep(.el-button.trend-analysis-btn) {
    height: 26px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.92);
    font-weight: 500;
    transition: background-color 0.15s ease, border-color 0.15s ease;
}

:deep(.el-button.trend-analysis-btn:hover) {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.55);
}
</style>
