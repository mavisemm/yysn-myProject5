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

    <el-dialog v-if="enableFullscreenButton" v-model="fullscreenVisible" :title="fullscreenTitleResolved"
        :fullscreen="true" destroy-on-close :append-to-body="true" :modal-append-to-body="true"
        class="common-echarts-fullscreen-dialog" modal-class="common-echarts-fullscreen-modal"
        :style="{ '--ce-fullscreen-bg': fullscreenBackgroundResolved }" @opened="handleFullscreenOpened"
        @closed="handleFullscreenClosed">
        <div class="common-echarts-fullscreen-wrap">
            <div ref="fullscreenChartRef" class="common-echarts-fullscreen-inner" />
        </div>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef, inject, computed, nextTick } from 'vue';
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
        autoYAxisOnZoom?: boolean;
        autoYAxisOnZoomDebounceMs?: number;
        autoYAxisOnZoomPaddingRatio?: number;
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

        enableFullscreen?: boolean;
        fullscreenTitle?: string;
        fullscreenBackground?: string;
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
        autoYAxisOnZoom: true,
        autoYAxisOnZoomDebounceMs: 120,
        autoYAxisOnZoomPaddingRatio: 0.05,
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
        preserveDataZoom: false,

        enableFullscreen: false,
        fullscreenTitle: '',
        fullscreenBackground: '#142060'
    }
);

const emit = defineEmits<{
    (e: 'chart-ready', instance: echarts.ECharts): void;
    (e: 'chart-disposed'): void;
    (e: 'range-change', payload: { min: number; max: number; startValue: any; endValue: any }): void;
    (e: 'range-reset'): void;
    (e: 'fullscreen-chart-ready', instance: echarts.ECharts): void;
    (e: 'fullscreen-closed'): void;
}>();

const containerRef = ref<HTMLElement>();
const chartRef = ref<HTMLElement>();
const chartInstance = shallowRef<echarts.ECharts | null>(null);
const fullscreenVisible = ref(false);
const fullscreenChartRef = ref<HTMLElement>();
const fullscreenChartInstance = shallowRef<echarts.ECharts | null>(null);
let fullscreenAutoYAxisCleanup: (() => void) | null = null;
let fullscreenAutoYAxisTimer: number | null = null;
let wheelZoomCleanup: (() => void) | null = null;
let rangeControlsCleanup: (() => void) | null = null;
let autoYAxisCleanup: (() => void) | null = null;
let autoYAxisTimer: number | null = null;


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

type DataZoomRange = { startIndex: number; endIndex: number };
type DataZoomValueRange = { startValue: number; endValue: number };
const clampInt = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.trunc(v)));
const pickArray = (v: any): any[] => (Array.isArray(v) ? v : (typeof v !== 'undefined' && v !== null ? [v] : []));
const clampNum = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const asFiniteNumber = (v: any): number | null => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
};
const getDataZoomForXAxis = (opt: any, xAxisIndex: number): any | null => {
    const dzList = pickArray(opt?.dataZoom);
    if (!dzList.length) return null;
    return (
        dzList.find((d: any) => {
            const idx = d?.xAxisIndex;
            if (Array.isArray(idx)) return idx.includes(xAxisIndex);
            if (typeof idx === 'number') return idx === xAxisIndex;
            return typeof idx === 'undefined' && xAxisIndex === 0;
        }) ?? dzList[0] ?? null
    );
};
const getXAxis = (opt: any, xAxisIndex: number): any | null => {
    const xAxes = pickArray(opt?.xAxis);
    return (xAxes[xAxisIndex] ?? xAxes[0] ?? null) as any;
};
const getXAxisType = (opt: any, xAxisIndex: number): 'category' | 'value' | 'time' | 'log' | string => {
    const xAxis = getXAxis(opt, xAxisIndex);
    return (xAxis?.type ?? (xAxis?.data ? 'category' : 'value')) as any;
};

const extractXFromDatum = (datum: any): number | null => {
    if (datum == null) return null;
    if (Array.isArray(datum)) {
        const first = datum[0];
        const n = Number(first);
        return Number.isFinite(n) ? n : null;
    }
    if (typeof datum === 'object') {
        const v = (datum as any).value;
        if (Array.isArray(v)) {
            const first = v[0];
            const n = Number(first);
            return Number.isFinite(n) ? n : null;
        }
    }
    return null;
};

const inferXDomainFromSeries = (opt: any): { min: number; max: number } | null => {
    const seriesList = pickArray(opt?.series) as any[];
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let found = false;
    for (const s of seriesList) {
        const data = s?.data;
        if (!Array.isArray(data) || data.length === 0) continue;
        for (const d of data) {
            const x = extractXFromDatum(d);
            if (x == null) continue;
            found = true;
            if (x < min) min = x;
            if (x > max) max = x;
        }
    }
    if (!found || !Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
};

const getCategoryAxisLength = (opt: any, xAxisIndex: number): number => {
    const xAxis = getXAxis(opt, xAxisIndex);
    const data = xAxis?.data;
    return Array.isArray(data) ? data.length : 0;
};
const parseDataZoomRange = (opt: any, xAxisIndex: number): DataZoomRange | null => {
    const axisLen = getCategoryAxisLength(opt, xAxisIndex);
    if (!axisLen) return null;
    const dz = getDataZoomForXAxis(opt, xAxisIndex);
    if (!dz) return { startIndex: 0, endIndex: axisLen - 1 };

    const hasValueRange = typeof dz.startValue !== 'undefined' || typeof dz.endValue !== 'undefined';
    if (hasValueRange) {
        const s = typeof dz.startValue === 'number' ? dz.startValue : 0;
        const e = typeof dz.endValue === 'number' ? dz.endValue : axisLen - 1;
        const startIndex = clampInt(s, 0, axisLen - 1);
        const endIndex = clampInt(e, 0, axisLen - 1);
        return startIndex <= endIndex ? { startIndex, endIndex } : { startIndex: endIndex, endIndex: startIndex };
    }

    const startPct = typeof dz.start === 'number' ? dz.start : 0;
    const endPct = typeof dz.end === 'number' ? dz.end : 100;
    const startIndex = clampInt(Math.round((startPct / 100) * (axisLen - 1)), 0, axisLen - 1);
    const endIndex = clampInt(Math.round((endPct / 100) * (axisLen - 1)), 0, axisLen - 1);
    return startIndex <= endIndex ? { startIndex, endIndex } : { startIndex: endIndex, endIndex: startIndex };
};

const parseDataZoomValueRange = (opt: any, xAxisIndex: number): DataZoomValueRange | null => {
    const dz = getDataZoomForXAxis(opt, xAxisIndex);
    const xAxis = getXAxis(opt, xAxisIndex);

    const axisMin = asFiniteNumber(xAxis?.min);
    const axisMax = asFiniteNumber(xAxis?.max);
    const inferred = inferXDomainFromSeries(opt);
    const dataMin = axisMin ?? inferred?.min;
    const dataMax = axisMax ?? inferred?.max;
    if (dataMin == null || dataMax == null) return null;

    if (!dz) return { startValue: dataMin, endValue: dataMax };

    const sv = asFiniteNumber(dz.startValue);
    const ev = asFiniteNumber(dz.endValue);
    if (sv != null || ev != null) {
        const s0 = sv ?? dataMin;
        const e0 = ev ?? dataMax;
        const startValue = Math.min(s0, e0);
        const endValue = Math.max(s0, e0);
        return { startValue, endValue };
    }

    const startPct = asFiniteNumber(dz.start) ?? 0;
    const endPct = asFiniteNumber(dz.end) ?? 100;
    const sPct = clampNum(startPct, 0, 100);
    const ePct = clampNum(endPct, 0, 100);
    const loPct = Math.min(sPct, ePct);
    const hiPct = Math.max(sPct, ePct);
    const startValue = dataMin + (loPct / 100) * (dataMax - dataMin);
    const endValue = dataMin + (hiPct / 100) * (dataMax - dataMin);
    return { startValue, endValue };
};

const extractYFromDatum = (datum: any): number | null => {
    if (datum == null) return null;
    if (typeof datum === 'number') return Number.isFinite(datum) ? datum : null;
    if (typeof datum === 'string') {
        const n = Number(datum);
        return Number.isFinite(n) ? n : null;
    }
    if (Array.isArray(datum)) {
        const last = datum[datum.length - 1];
        const n = Number(last);
        return Number.isFinite(n) ? n : null;
    }
    if (typeof datum === 'object') {
        const v = (datum as any).value;
        if (Array.isArray(v)) {
            const last = v[v.length - 1];
            const n = Number(last);
            return Number.isFinite(n) ? n : null;
        }
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
};

const computeVisibleYRangeByIndex = (opt: any, range: DataZoomRange): { min: number; max: number } | null => {
    const seriesList = pickArray(opt?.series) as any[];
    if (!seriesList.length) return null;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let found = false;

    for (const s of seriesList) {
        const data = s?.data;
        if (!Array.isArray(data) || data.length === 0) continue;
        const start = clampInt(range.startIndex, 0, data.length - 1);
        const end = clampInt(range.endIndex, 0, data.length - 1);
        for (let i = start; i <= end; i++) {
            const y = extractYFromDatum(data[i]);
            if (y == null) continue;
            found = true;
            if (y < min) min = y;
            if (y > max) max = y;
        }
    }
    if (!found || !Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
};

const computeVisibleYRangeByXValue = (opt: any, xRange: DataZoomValueRange): { min: number; max: number } | null => {
    const seriesList = pickArray(opt?.series) as any[];
    if (!seriesList.length) return null;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let found = false;
    const lo = Math.min(xRange.startValue, xRange.endValue);
    const hi = Math.max(xRange.startValue, xRange.endValue);

    for (const s of seriesList) {
        const data = s?.data;
        if (!Array.isArray(data) || data.length === 0) continue;
        for (const d of data) {
            const x = extractXFromDatum(d);
            if (x == null) continue;
            if (x < lo || x > hi) continue;
            const y = extractYFromDatum(d);
            if (y == null) continue;
            found = true;
            if (y < min) min = y;
            if (y > max) max = y;
        }
    }

    if (!found || !Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
};

const applyAutoYAxisRange = () => {
    if (!chartInstance.value) return;
    if (!props.autoYAxisOnZoom) return;
    if (!props.option) return;

    const opt = chartInstance.value.getOption?.() as any;
    const xAxisIndex = (props.rangeControlsXAxisIndex ?? 0) as number;
    const xType = getXAxisType(opt, xAxisIndex);

    let y: { min: number; max: number } | null = null;
    if (xType === 'value' || xType === 'time' || xType === 'log') {
        const xRange = parseDataZoomValueRange(opt, xAxisIndex);
        if (!xRange) return;
        y = computeVisibleYRangeByXValue(opt, xRange);
    } else {
        const range = parseDataZoomRange(opt, xAxisIndex);
        if (!range) return;
        y = computeVisibleYRangeByIndex(opt, range);
    }
    if (!y) return;

    const paddingRatio = Math.max(0, Number(props.autoYAxisOnZoomPaddingRatio ?? 0.05));
    const span = y.max - y.min;
    const padding = span === 0 ? (Math.abs(y.max) || 1) * paddingRatio : span * paddingRatio;
    const min = y.min - padding;
    let max = y.max + padding;
    if (min === max) {
        max = min + 1;
    }

    try {
        chartInstance.value.setOption(
            { yAxis: { min, max } } as any,
            { notMerge: false, lazyUpdate: true }
        );
    } catch {
        // ignore
    }
};

const attachAutoYAxisListener = () => {
    if (autoYAxisCleanup) {
        autoYAxisCleanup();
        autoYAxisCleanup = null;
    }
    if (autoYAxisTimer != null) {
        window.clearTimeout(autoYAxisTimer);
        autoYAxisTimer = null;
    }
    if (!chartInstance.value) return;
    if (!props.autoYAxisOnZoom) return;

    const handler = () => {
        const delay = Math.max(0, Number(props.autoYAxisOnZoomDebounceMs ?? 120));
        if (autoYAxisTimer != null) window.clearTimeout(autoYAxisTimer);
        autoYAxisTimer = window.setTimeout(() => {
            autoYAxisTimer = null;
            applyAutoYAxisRange();
        }, delay);
    };

    chartInstance.value.on('datazoom', handler);
    autoYAxisCleanup = () => {
        chartInstance.value?.off('datazoom', handler);
        if (autoYAxisTimer != null) {
            window.clearTimeout(autoYAxisTimer);
            autoYAxisTimer = null;
        }
    };
};

const applyAutoYAxisRangeFor = (inst: echarts.ECharts) => {
    if (!props.autoYAxisOnZoom) return;
    if (!props.option) return;

    const opt = inst.getOption?.() as any;
    const xAxisIndex = (props.rangeControlsXAxisIndex ?? 0) as number;
    const xType = getXAxisType(opt, xAxisIndex);

    let y: { min: number; max: number } | null = null;
    if (xType === 'value' || xType === 'time' || xType === 'log') {
        const xRange = parseDataZoomValueRange(opt, xAxisIndex);
        if (!xRange) return;
        y = computeVisibleYRangeByXValue(opt, xRange);
    } else {
        const range = parseDataZoomRange(opt, xAxisIndex);
        if (!range) return;
        y = computeVisibleYRangeByIndex(opt, range);
    }
    if (!y) return;

    const paddingRatio = Math.max(0, Number(props.autoYAxisOnZoomPaddingRatio ?? 0.05));
    const span = y.max - y.min;
    const padding = span === 0 ? (Math.abs(y.max) || 1) * paddingRatio : span * paddingRatio;
    const min = y.min - padding;
    let max = y.max + padding;
    if (min === max) {
        max = min + 1;
    }

    try {
        inst.setOption(
            { yAxis: { min, max } } as any,
            { notMerge: false, lazyUpdate: true }
        );
    } catch {
        // ignore
    }
};

const attachAutoYAxisListenerForFullscreen = () => {
    if (fullscreenAutoYAxisCleanup) {
        fullscreenAutoYAxisCleanup();
        fullscreenAutoYAxisCleanup = null;
    }
    if (fullscreenAutoYAxisTimer != null) {
        window.clearTimeout(fullscreenAutoYAxisTimer);
        fullscreenAutoYAxisTimer = null;
    }
    if (!fullscreenChartInstance.value) return;
    if (!props.autoYAxisOnZoom) return;

    const inst = fullscreenChartInstance.value;
    const handler = () => {
        const delay = Math.max(0, Number(props.autoYAxisOnZoomDebounceMs ?? 120));
        if (fullscreenAutoYAxisTimer != null) window.clearTimeout(fullscreenAutoYAxisTimer);
        fullscreenAutoYAxisTimer = window.setTimeout(() => {
            fullscreenAutoYAxisTimer = null;
            applyAutoYAxisRangeFor(inst);
        }, delay);
    };

    inst.on('datazoom', handler);
    fullscreenAutoYAxisCleanup = () => {
        try { inst.off('datazoom', handler); } catch { }
        if (fullscreenAutoYAxisTimer != null) {
            window.clearTimeout(fullscreenAutoYAxisTimer);
            fullscreenAutoYAxisTimer = null;
        }
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
    attachAutoYAxisListener();
    emit('chart-ready', chartInstance.value);
};

const applyOption = () => {
    if (!chartInstance.value || !props.option) return;

    const opt = buildResolvedOption();
    chartInstance.value.setOption(opt, {
        notMerge: props.notMerge,
        replaceMerge: props.replaceMerge.length > 0 ? props.replaceMerge : undefined
    });

    restoreZoomAfterSetOption();
};

const buildResolvedOption = () => {
    const opt = { ...(props.option as any) } as EChartsOption & {
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

    return opt as EChartsOption;
};

const applyFullscreenOption = () => {
    if (!fullscreenChartInstance.value) return;
    if (!props.option) return;
    const opt = buildResolvedOption();
    try {
        fullscreenChartInstance.value.setOption(opt, {
            notMerge: props.notMerge,
            replaceMerge: props.replaceMerge.length > 0 ? props.replaceMerge : undefined
        });
    } catch {
        // ignore
    }
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
        if (fullscreenVisible.value && fullscreenChartInstance.value && !props.loading && !resolvedEmpty.value) {
            applyFullscreenOption();
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
    () => [props.autoYAxisOnZoom, props.autoYAxisOnZoomDebounceMs, props.autoYAxisOnZoomPaddingRatio, props.rangeControlsXAxisIndex],
    () => {
        if (chartInstance.value) {
            attachAutoYAxisListener();
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

const enableFullscreenButton = computed(() => !!props.enableFullscreen);
const fullscreenTitleResolved = computed(() => props.fullscreenTitle || (props.option as any)?.title?.text || '图表');
const fullscreenBackgroundResolved = computed(() => props.fullscreenBackground || '#142060');

const openFullscreen = () => {
    fullscreenVisible.value = true;
};
const patchFullscreenSeriesMarkLine = (seriesId: string, data: unknown[]) => {
    if (!fullscreenChartInstance.value) return;
    try {
        fullscreenChartInstance.value.setOption(
            { series: [{ id: seriesId, markLine: { data } }] } as EChartsOption,
            { notMerge: false, lazyUpdate: true }
        );
    } catch {
        // ignore
    }
};

const handleFullscreenOpened = async () => {
    await nextTick();
    if (!fullscreenChartRef.value) return;
    if (fullscreenChartInstance.value) {
        try { fullscreenChartInstance.value.dispose(); } catch { }
        fullscreenChartInstance.value = null;
    }
    try {
        fullscreenChartInstance.value = echarts.init(fullscreenChartRef.value);
        applyFullscreenOption();
        attachAutoYAxisListenerForFullscreen();
        fullscreenChartInstance.value.resize();
        emit('fullscreen-chart-ready', fullscreenChartInstance.value);
    } catch {
        // ignore
    }
};
const handleFullscreenClosed = () => {
    emit('fullscreen-closed');
    if (fullscreenAutoYAxisCleanup) {
        fullscreenAutoYAxisCleanup();
        fullscreenAutoYAxisCleanup = null;
    }
    if (fullscreenAutoYAxisTimer != null) {
        window.clearTimeout(fullscreenAutoYAxisTimer);
        fullscreenAutoYAxisTimer = null;
    }
    if (fullscreenChartInstance.value) {
        try { fullscreenChartInstance.value.dispose(); } catch { }
        fullscreenChartInstance.value = null;
    }
};

onUnmounted(() => {
    if (chartInstance.value) {
        chartInstance.value.dispose();
        chartInstance.value = null;
        emit('chart-disposed');
    }
    if (fullscreenChartInstance.value) {
        try { fullscreenChartInstance.value.dispose(); } catch { }
        fullscreenChartInstance.value = null;
    }
    if (fullscreenAutoYAxisCleanup) {
        fullscreenAutoYAxisCleanup();
        fullscreenAutoYAxisCleanup = null;
    }
    if (fullscreenAutoYAxisTimer != null) {
        window.clearTimeout(fullscreenAutoYAxisTimer);
        fullscreenAutoYAxisTimer = null;
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

    if (autoYAxisCleanup) {
        autoYAxisCleanup();
        autoYAxisCleanup = null;
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
    getThemeColors,
    openFullscreen,
    patchFullscreenSeriesMarkLine
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

/* 全屏触发按钮由业务侧放置（如标题栏），公共组件仅提供 openFullscreen 能力 */

.common-echarts-fullscreen-wrap {
    height: calc(100vh - 120px);
    min-height: 300px;
    padding-top: 20px;
}

.common-echarts-fullscreen-inner {
    width: 100%;
    height: 100%;
}

/* append-to-body 下用 modal-class + :global 保证能命中 */
:global(.common-echarts-fullscreen-modal .el-dialog) {
    background: var(--ce-fullscreen-bg, #142060) !important;
}

:global(.common-echarts-fullscreen-modal .el-dialog__header) {
    background: var(--ce-fullscreen-bg, #142060) !important;
    margin-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.5);
}

:global(.common-echarts-fullscreen-modal .el-dialog__title) {
    color: rgba(255, 255, 255, 0.92) !important;
}

:global(.common-echarts-fullscreen-modal .el-dialog__body) {
    background: var(--ce-fullscreen-bg, #142060) !important;
}

:global(.common-echarts-fullscreen-modal .el-dialog__headerbtn .el-dialog__close) {
    color: rgba(255, 255, 255, 0.92) !important;
}
</style>
