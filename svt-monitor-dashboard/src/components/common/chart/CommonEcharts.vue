<template>
    <div ref="containerRef" class="common-echarts-wrapper">
        <div ref="chartRef" class="common-echarts-inner" />
        <div v-if="showResolvedRangeControls && !loading && !resolvedEmpty" class="common-echarts-range-controls"
            @mousedown.stop @wheel.stop>
            <span class="controls-label">{{ rangeControlsLabel }}</span>
            <el-input-number v-model="rangeMin" class="range-input" size="small" :min="rangeDataMin" :max="rangeDataMax"
                :step="rangeControlsStep" :precision="rangeControlsPrecision" :controls="false"
                controls-position="right" />
            <span class="controls-sep">{{ rangeControlsSepText }}</span>
            <el-input-number v-model="rangeMax" class="range-input" size="small" :min="rangeDataMin" :max="rangeDataMax"
                :step="rangeControlsStep" :precision="rangeControlsPrecision" :controls="false"
                controls-position="right" />
            <span v-if="rangeControlsUnit" class="controls-unit">{{ rangeControlsUnit }}</span>
            <el-button size="small" @click="resetRange">重置</el-button>
        </div>
        <div v-if="loading" class="common-echarts-loading">
            <span class="loading-text">加载中...</span>
        </div>
        <div v-if="resolvedEmpty && !loading" class="common-echarts-empty">
            <CommonEmptyState :text="emptyText" size="small" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef, inject, computed } from 'vue';
import type { Ref } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { useChartResize } from '@/composables/useChart';
import { enableMouseWheelZoom } from '@/utils/chart';
import { useRangeControls } from '@/composables/useRangeControls';
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue';

const props = withDefaults(
    defineProps<{
        option?: EChartsOption | null;
        loading?: boolean;
        empty?: boolean;
        emptyText?: string;
        autoEmpty?: boolean;
        useGl?: boolean;
        enableDataZoom?: boolean;
        notMerge?: boolean;
        replaceMerge?: string[];
        linkageGroup?: string;
        linkageZoomOnly?: boolean;
        enableLinkageZoom?: boolean;
        enableWheelZoom?: boolean;
        tooltipFollowMouse?: boolean;
        transparentBackground?: boolean;
        showRangeControls?: boolean;
        rangeControlsLabel?: string;
        rangeControlsUnit?: string;
        rangeControlsSepText?: string;
        rangeControlsStep?: number;
        rangeControlsPrecision?: number;
        rangeControlsDebounceMs?: number;
        rangeControlsData?: Array<string | number>;
        rangeControlsXAxisIndex?: number;
        rangeControlsMin?: number;
        rangeControlsMax?: number;
        preserveDataZoom?: boolean;
    }>(),
    {
        option: () => ({}),
        loading: false,
        empty: false,
        emptyText: '暂无数据',
        autoEmpty: true,
        useGl: false,
        enableDataZoom: true,
        notMerge: false,
        replaceMerge: () => [],
        linkageGroup: '',
        linkageZoomOnly: false,
        enableLinkageZoom: false,
        enableWheelZoom: false,
        tooltipFollowMouse: false,
        transparentBackground: true,
        showRangeControls: false,
        rangeControlsLabel: '范围',
        rangeControlsUnit: '',
        rangeControlsSepText: '~',
        rangeControlsStep: 0.1,
        rangeControlsPrecision: 1,
        rangeControlsDebounceMs: 600,
        rangeControlsData: () => [],
        rangeControlsXAxisIndex: 0,
        preserveDataZoom: false
    }
);

const emit = defineEmits<{
    (e: 'chart-ready', instance: echarts.ECharts): void;
    (e: 'chart-disposed'): void;
    (e: 'range-change', payload: { min: number; max: number; startValue: any; endValue: any }): void;
    (e: 'range-reset'): void;
}>();

const containerRef = ref<HTMLElement>();
const chartRef = ref<HTMLElement>();
const chartInstance = shallowRef<echarts.ECharts | null>(null);
let wheelZoomCleanup: (() => void) | null = null;
let rangeControlsCleanup: (() => void) | null = null;


type GroupRegistry = Map<string, Set<echarts.ECharts>>;
const linkageRegistry: GroupRegistry = (globalThis as any).__COMMON_ECHARTS_LINKAGE_REGISTRY__ ?? new Map();
(globalThis as any).__COMMON_ECHARTS_LINKAGE_REGISTRY__ = linkageRegistry;

let linkageZoomCleanup: (() => void) | null = null;
let isSyncingZoom = false;
const {
    showResolvedRangeControls,
    rangeMin,
    rangeMax,
    rangeDataMin,
    rangeDataMax,
    applyRange,
    resetRange,
    handleDataZoom,
    restoreZoomAfterSetOption,
    dispose: disposeRangeControls
} = useRangeControls({
    option: computed(() => props.option),
    showRangeControls: computed(() => !!props.showRangeControls),
    rangeControlsData: computed(() => props.rangeControlsData ?? []),
    rangeControlsXAxisIndex: computed(() => props.rangeControlsXAxisIndex ?? 0),
    rangeControlsMin: computed(() => props.rangeControlsMin),
    rangeControlsMax: computed(() => props.rangeControlsMax),
    rangeControlsStep: computed(() => props.rangeControlsStep ?? 0.1),
    rangeControlsPrecision: computed(() => props.rangeControlsPrecision ?? 0),
    rangeControlsDebounceMs: computed(() => props.rangeControlsDebounceMs ?? 600),
    preserveDataZoom: computed(() => !!props.preserveDataZoom),
    doDataZoom: ({ startValue, endValue }) => {
        if (!chartInstance.value) return;
        chartInstance.value.dispatchAction({ type: 'dataZoom', startValue, endValue } as any);
    },
    onRangeChange: payload => emit('range-change', payload),
    onRangeReset: () => emit('range-reset')
});

const attachRangeControlsListener = () => {
    if (rangeControlsCleanup) {
        rangeControlsCleanup();
        rangeControlsCleanup = null;
    }
    if (!chartInstance.value) return;
    if (!showResolvedRangeControls.value) return;

    const handler = (params: any) => {
        handleDataZoom(params);
    };

    chartInstance.value.on('datazoom', handler);
    rangeControlsCleanup = () => {
        chartInstance.value?.off('datazoom', handler);
    };
};

type SeriesLike = Record<string, any> & { data?: any; type?: string };
const isValueMeaningful = (v: any) => v !== null && typeof v !== 'undefined' && !(typeof v === 'number' && Number.isNaN(v));
const hasNonEmptyDataArray = (arr: any[]) => arr.some(isValueMeaningful);
const isOptionEmpty = (opt: EChartsOption | null | undefined): boolean => {
    if (!opt) return true;

    const anyOpt = opt as any;


    const ds = anyOpt.dataset;
    const dsArr = Array.isArray(ds) ? ds : (ds ? [ds] : []);
    for (const d of dsArr) {
        const source = d?.source;
        if (Array.isArray(source) && source.length > 0) {

            if (source.length > 1) return false;
            if (source.length === 1) {
                const row = source[0];
                if (Array.isArray(row) ? hasNonEmptyDataArray(row) : isValueMeaningful(row)) return false;
            }
        }
    }

    const series = anyOpt.series;
    const seriesArr: SeriesLike[] = Array.isArray(series) ? series : (series ? [series] : []);
    if (seriesArr.length === 0) return true;


    for (const s of seriesArr) {
        const data = (s as any)?.data;
        if (Array.isArray(data)) {
            if (data.length > 0 && hasNonEmptyDataArray(data)) return false;
        } else if (isValueMeaningful(data)) {

            return false;
        }
    }

    return true;
};

const resolvedEmpty = computed(() => {
    if (props.empty) return true;
    if (!props.autoEmpty) return false;
    return isOptionEmpty(props.option);
});

const backgroundMode = inject<Ref<'image' | 'navy' | 'solid'> | undefined>('backgroundMode');
const isGrayTheme = computed(() => false);
const chartAxisColor = computed(() => '#fff');
const chartSplitLineColor = computed(() => 'rgba(255,255,255,0.1)');

const applyLinkageZoom = () => {
    if (!chartInstance.value) return;

    const hasGroup = !!props.linkageGroup;

    if (linkageZoomCleanup) {
        linkageZoomCleanup();
        linkageZoomCleanup = null;
    }

    if (!(props.enableLinkageZoom && hasGroup)) {

        if ((chartInstance.value as any).group) (chartInstance.value as any).group = '';
        return;
    }

    if (!props.linkageZoomOnly) {

        (chartInstance.value as any).group = props.linkageGroup;
        echarts.connect(props.linkageGroup as string);
        return;
    }


    (chartInstance.value as any).group = '';
    const groupId = props.linkageGroup as string;
    const inst = chartInstance.value;
    if (!linkageRegistry.has(groupId)) linkageRegistry.set(groupId, new Set());
    linkageRegistry.get(groupId)!.add(inst);

    const handler = (params: any) => {
        if (isSyncingZoom) return;
        isSyncingZoom = true;
        try {
            const others = linkageRegistry.get(groupId);
            if (!others) return;
            const batch0 = Array.isArray(params?.batch) ? params.batch[0] : null;
            const payload = batch0 && typeof batch0 === 'object' ? batch0 : params;
            if (!payload || typeof payload !== 'object') return;


            const action: Record<string, any> = { type: 'dataZoom' };
            if (typeof (payload as any).startValue !== 'undefined' || typeof (payload as any).endValue !== 'undefined') {
                if (typeof (payload as any).startValue !== 'undefined') action.startValue = (payload as any).startValue;
                if (typeof (payload as any).endValue !== 'undefined') action.endValue = (payload as any).endValue;
            } else {
                if (typeof (payload as any).start !== 'undefined') action.start = (payload as any).start;
                if (typeof (payload as any).end !== 'undefined') action.end = (payload as any).end;
            }


            if (typeof (payload as any).dataZoomIndex !== 'undefined') action.dataZoomIndex = (payload as any).dataZoomIndex;


            if (
                typeof action.start === 'undefined' &&
                typeof action.end === 'undefined' &&
                typeof action.startValue === 'undefined' &&
                typeof action.endValue === 'undefined'
            ) {
                return;
            }
            for (const other of others) {
                if (other === inst) continue;
                try {
                    other.dispatchAction(action as any);
                } catch {

                }
            }
        } finally {
            isSyncingZoom = false;
        }
    };

    inst.on('datazoom', handler);
    linkageZoomCleanup = () => {
        try {
            inst.off('datazoom', handler);
        } catch {

        }
        const set = linkageRegistry.get(groupId);
        if (set) {
            set.delete(inst);
            if (set.size === 0) linkageRegistry.delete(groupId);
        }
    };
};

const applyWheelZoom = () => {

    if (wheelZoomCleanup) {
        wheelZoomCleanup();
        wheelZoomCleanup = null;
    }

    if (!chartInstance.value || !props.enableWheelZoom) return;

    const cleanup = enableMouseWheelZoom(chartInstance.value);
    if (cleanup) {
        wheelZoomCleanup = cleanup;
    }
};

const initChart = async () => {
    if (!chartRef.value || !containerRef.value) return;

    if (props.useGl) {
        await import('echarts-gl');
    }

    if (chartInstance.value) {
        chartInstance.value.dispose();
        chartInstance.value = null;
    }

    chartInstance.value = echarts.init(chartRef.value);
    applyLinkageZoom();
    applyWheelZoom();
    applyOption();

    attachRangeControlsListener();
    emit('chart-ready', chartInstance.value);
};

const applyOption = () => {
    if (!chartInstance.value || !props.option) return;

    const opt = { ...props.option } as EChartsOption & {
        dataZoom?: any;
        xAxis?: any;
        backgroundColor?: any;
        tooltip?: any;
    };


    const rawTooltip = opt.tooltip;
    if (typeof rawTooltip === 'object' && rawTooltip) {
        opt.tooltip = {
            ...rawTooltip,
            className: (rawTooltip as Record<string, unknown>).className ?? 'echarts-tooltip',

            appendToBody: (rawTooltip as Record<string, unknown>).appendToBody ?? true,
            backgroundColor: (rawTooltip as Record<string, unknown>).backgroundColor ?? 'rgba(50, 50, 50, 0.9)',
            borderColor: (rawTooltip as Record<string, unknown>).borderColor ?? 'rgba(50, 50, 50, 0.9)',
            textStyle: (rawTooltip as Record<string, unknown>).textStyle ?? { color: '#fff' },
            extraCssText: (rawTooltip as Record<string, unknown>).extraCssText ?? 'z-index: 99999 !important;'
        };
    } else if (!opt.tooltip) {
        opt.tooltip = {
            className: 'echarts-tooltip',
            appendToBody: true,
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: { color: '#fff' },
            extraCssText: 'z-index: 99999 !important;'
        };
    }


    if (props.tooltipFollowMouse && opt.tooltip && typeof opt.tooltip === 'object') {
        if (!('position' in opt.tooltip)) {
            opt.tooltip.position = (pos: any, _params: any, _el: any, _elRect: any, size: any) => {
                const [mouseX, mouseY] = pos as [number, number];
                const [contentWidth, contentHeight] = size.contentSize as [number, number];
                const [viewWidth, _viewHeight] = size.viewSize as [number, number];
                let x = mouseX + 20;
                if (x + contentWidth > viewWidth) {
                    x = mouseX - contentWidth - 20;
                }
                const y = Math.max(0, mouseY - contentHeight / 2);
                return [x, y];
            };
        }
    }


    if (props.enableDataZoom && !opt.dataZoom) {
        const hasXAxis =
            Array.isArray(opt.xAxis) ? opt.xAxis.length > 0 : typeof opt.xAxis !== 'undefined';
        if (hasXAxis) {
            opt.dataZoom = [
                { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
                {
                    type: 'slider',
                    xAxisIndex: 0,
                    bottom: 10,
                    height: 20,
                    filterMode: 'none'
                }
            ];
        }
    }


    if (props.transparentBackground && typeof opt.backgroundColor === 'undefined') {
        opt.backgroundColor = 'transparent';
    }

    chartInstance.value.setOption(opt, {
        notMerge: props.notMerge,
        replaceMerge: props.replaceMerge.length > 0 ? props.replaceMerge : undefined
    });


    restoreZoomAfterSetOption();
};

const getThemeColors = () => ({
    axisColor: chartAxisColor.value,
    splitLineColor: chartSplitLineColor.value,
    isGrayTheme: isGrayTheme.value
});

const { bindResize } = useChartResize(chartInstance, chartRef);


const handleWindowResize = () => {
    if (!chartInstance.value) return;
    try {
        chartInstance.value.resize();
    } catch {

    }
};

watch(
    () => props.option,
    () => {
        if (chartInstance.value && !props.loading && !resolvedEmpty.value) {
            applyOption();
        }
    },
    { deep: true }
);

watch(
    () => [props.loading, resolvedEmpty.value],
    ([loading, empty]) => {
        if (chartInstance.value && !loading && !empty) {
            applyOption();
        }
        if (chartInstance.value && empty) {
            chartInstance.value.clear();
        }
    }
);

watch(
    () => [props.enableLinkageZoom, props.linkageGroup],
    () => {
        if (chartInstance.value) {
            applyLinkageZoom();
        }
    }
);

watch(
    () => props.enableWheelZoom,
    () => {
        if (chartInstance.value) {
            applyWheelZoom();
        }
    }
);

watch(
    () => [props.showRangeControls, props.rangeControlsData, props.rangeControlsXAxisIndex],
    () => {
        if (chartInstance.value) {
            attachRangeControlsListener();
        }
    },
    { deep: true }
);

watch(
    () => backgroundMode?.value,
    () => {
        if (chartInstance.value && props.option) {
            applyOption();
        }
    },
    { flush: 'post' }
);

onMounted(() => {
    if (!resolvedEmpty.value && !props.loading) {
        initChart();
        bindResize();
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleWindowResize);
    }
});

onUnmounted(() => {
    if (chartInstance.value) {
        chartInstance.value.dispose();
        chartInstance.value = null;
        emit('chart-disposed');
    }

    if (linkageZoomCleanup) {
        linkageZoomCleanup();
        linkageZoomCleanup = null;
    }

    if (wheelZoomCleanup) {
        wheelZoomCleanup();
        wheelZoomCleanup = null;
    }

    if (rangeControlsCleanup) {
        rangeControlsCleanup();
        rangeControlsCleanup = null;
    }

    disposeRangeControls();

    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleWindowResize);
    }
});

watch(
    () => [resolvedEmpty.value, props.loading],
    ([empty, loading]) => {
        if (empty || loading) return;
        if (!chartInstance.value && chartRef.value) {
            initChart();
            bindResize();
        }
    }
);

defineExpose({
    chartInstance,
    initChart,
    updateOption: applyOption,
    getThemeColors
});
</script>

<style lang="scss" scoped>
.common-echarts-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .common-echarts-inner {
        width: 100%;
        flex: 1;
        min-height: 0;
    }

    .common-echarts-range-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: nowrap;
        gap: 8px;
        padding: 8px 10px 6px;
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;

        .controls-label,
        .controls-sep,
        .controls-unit {
            font-size: 12px;
            opacity: 0.9;
            white-space: nowrap;
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

    .common-echarts-loading,
    .common-echarts-empty {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.02);
        pointer-events: none;
    }

    .loading-text,
    .empty-text {
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
    }
}
</style>
