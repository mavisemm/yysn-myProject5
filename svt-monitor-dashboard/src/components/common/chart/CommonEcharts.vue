<template>
    <div ref="containerRef" class="common-echarts-wrapper">
        <div ref="chartRef" class="common-echarts-inner" />
        <div
            v-if="showResolvedRangeControls && !loading && !resolvedEmpty"
            class="common-echarts-range-controls"
            @mousedown.stop
            @wheel.stop
        >
            <span class="controls-label">{{ rangeControlsLabel }}</span>
            <el-input-number
                v-model="rangeMin"
                class="range-input"
                size="small"
                :min="rangeDataMin"
                :max="rangeDataMax"
                :step="rangeControlsStep"
                :precision="rangeControlsPrecision"
                controls-position="right"
            />
            <span class="controls-sep">{{ rangeControlsSepText }}</span>
            <el-input-number
                v-model="rangeMax"
                class="range-input"
                size="small"
                :min="rangeDataMin"
                :max="rangeDataMax"
                :step="rangeControlsStep"
                :precision="rangeControlsPrecision"
                controls-position="right"
            />
            <span v-if="rangeControlsUnit" class="controls-unit">{{ rangeControlsUnit }}</span>
            <el-button size="small" @click="resetRange">重置</el-button>
        </div>
        <div v-if="loading" class="common-echarts-loading">
            <span class="loading-text">加载中...</span>
        </div>
        <div v-if="resolvedEmpty && !loading" class="common-echarts-empty">
            <span class="empty-text">{{ emptyText }}</span>
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

/** 是否使用 echarts-gl（3D 图表，如瀑布图） */
const props = withDefaults(
    defineProps<{
        /** ECharts 配置项，支持响应式 */
        option?: EChartsOption | null;
        /** 是否显示加载状态 */
        loading?: boolean;
        /** 是否为空数据状态 */
        empty?: boolean;
        /** 空数据提示文字 */
        emptyText?: string;
        /**
         * 自动判空：当未显式传入 empty 时，根据 option 的 series/dataset 自动判断是否显示空态。
         * 默认开启，如业务需要展示“空坐标系”可传 autoEmpty=false。
         */
        autoEmpty?: boolean;
        /** 是否启用 echarts-gl（3D） */
        useGl?: boolean;
        /** 是否自动注入 dataZoom（默认开启） */
        enableDataZoom?: boolean;
        /** setOption 的 notMerge，默认 false */
        notMerge?: boolean;
        /** setOption 的 replaceMerge，如 ['series'] */
        replaceMerge?: string[];
        /**
         * 缩放联动分组 ID。
         * 当多个 CommonEcharts 使用相同的分组且 enableLinkageZoom 为 true 时，将共享缩放范围。
         */
        linkageGroup?: string;
        /**
         * 是否开启缩放联动。
         * 默认关闭，需要业务组件手动开启。
         */
        enableLinkageZoom?: boolean;
        /**
         * 是否启用鼠标滚轮缩放（基于 dataZoom）。
         * 默认关闭，如需开启请确保 option 中包含 dataZoom，
         * 或保持 enableDataZoom=true 使用组件注入的默认 dataZoom。
         */
        enableWheelZoom?: boolean;
        /**
         * Tooltip 是否跟随鼠标并自动避免溢出视口。
         * 若业务已自定义 tooltip.position，则不会覆盖。
         */
        tooltipFollowMouse?: boolean;
        /**
         * 是否在未显式设置 backgroundColor 时强制使用透明背景。
         * 适用于有自定义背景图/渐变的页面。
         */
        transparentBackground?: boolean;
        /**
         * 是否显示“范围输入框”（用于控制 X 轴 dataZoom 的 startValue/endValue）。
         * 目前仅支持：xAxis 为 category 且 xAxis.data 能被全部解析为数字的场景（如频率轴）。
         */
        showRangeControls?: boolean;
        /** 范围输入框：标签 */
        rangeControlsLabel?: string;
        /** 范围输入框：单位（可选） */
        rangeControlsUnit?: string;
        /** 范围输入框：分隔符文案 */
        rangeControlsSepText?: string;
        /** 范围输入框：步进 */
        rangeControlsStep?: number;
        /** 范围输入框：小数精度 */
        rangeControlsPrecision?: number;
        /** 范围输入框：防抖延时（ms） */
        rangeControlsDebounceMs?: number;
        /**
         * 范围输入框：xAxis.data 来源（可选）。
         * 未传时默认从 option.xAxis[xAxisIndex].data 读取。
         */
        rangeControlsData?: Array<string | number>;
        /** 范围输入框：xAxis 索引（当 option.xAxis 为数组时） */
        rangeControlsXAxisIndex?: number;
        /** 范围输入框：最小值（可选，优先级高于从 data 计算） */
        rangeControlsMin?: number;
        /** 范围输入框：最大值（可选，优先级高于从 data 计算） */
        rangeControlsMax?: number;
        /**
         * option 变化时是否尝试保持当前 dataZoom 范围（默认 false）。
         * 当 showRangeControls=true 时组件会自动保持，无需额外传。
         */
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

    // dataset 判空：source 至少有 1 行数据（常见第一行为表头）
    const ds = anyOpt.dataset;
    const dsArr = Array.isArray(ds) ? ds : (ds ? [ds] : []);
    for (const d of dsArr) {
        const source = d?.source;
        if (Array.isArray(source) && source.length > 0) {
            // 兼容二维表/对象数组：只要存在一行有效数据就认为非空
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

    // series 判空：任意一个 series 有有效数据即认为非空
    for (const s of seriesArr) {
        const data = (s as any)?.data;
        if (Array.isArray(data)) {
            if (data.length > 0 && hasNonEmptyDataArray(data)) return false;
        } else if (isValueMeaningful(data)) {
            // 少数 series 可能不是数组（容错）
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

/** 主题：灰色时坐标轴/分割线为黑，否则白 */
const backgroundMode = inject<Ref<'image' | 'gray' | 'green' | 'navy'> | undefined>('backgroundMode');
const isGrayTheme = computed(() => backgroundMode?.value === 'gray');
const chartAxisColor = computed(() => (isGrayTheme.value ? '#000' : '#fff'));
const chartSplitLineColor = computed(() =>
    isGrayTheme.value ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)'
);

/** 根据 props 设置/更新图表联动缩放 */
const applyLinkageZoom = () => {
    if (!chartInstance.value) return;

    const hasGroup = !!props.linkageGroup;
    if (props.enableLinkageZoom && hasGroup) {
        // 使用 ECharts 的 group 机制实现多个图表之间的缩放联动
        (chartInstance.value as any).group = props.linkageGroup;
        echarts.connect(props.linkageGroup as string);
    } else if ((chartInstance.value as any).group) {
        // 关闭联动时，仅移除当前实例的 group，避免影响其他图表
        (chartInstance.value as any).group = '';
    }
};

/** 根据 props 设置/更新鼠标滚轮缩放 */
const applyWheelZoom = () => {
    // 清理旧的滚轮监听
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

/** 初始化图表 */
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
    // 监听 dataZoom 回填输入框
    attachRangeControlsListener();
    emit('chart-ready', chartInstance.value);
};

/** 应用 option，并注入通用主题变量 */
const applyOption = () => {
    if (!chartInstance.value || !props.option) return;

    const opt = { ...props.option } as EChartsOption & {
        dataZoom?: any;
        xAxis?: any;
        backgroundColor?: any;
        tooltip?: any;
    };

    // 注入通用 tooltip 样式（若未显式设置），避免污染原始 option
    const rawTooltip = opt.tooltip;
    if (typeof rawTooltip === 'object' && rawTooltip) {
        opt.tooltip = {
            ...rawTooltip,
            className: (rawTooltip as Record<string, unknown>).className ?? 'echarts-tooltip',
            backgroundColor: (rawTooltip as Record<string, unknown>).backgroundColor ?? 'rgba(50, 50, 50, 0.9)',
            borderColor: (rawTooltip as Record<string, unknown>).borderColor ?? 'rgba(50, 50, 50, 0.9)',
            textStyle: (rawTooltip as Record<string, unknown>).textStyle ?? { color: '#fff' }
        };
    } else if (!opt.tooltip) {
        opt.tooltip = {
            className: 'echarts-tooltip',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: { color: '#fff' }
        };
    }

    // Tooltip 跟随鼠标并自动避免溢出视口（不覆盖业务自定义 position）
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

    // 默认开启 dataZoom：如果外部未配置 dataZoom，则对第一个 x 轴注入 inside + slider
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

    // 透明背景：仅在外部未设置 backgroundColor 时生效
    if (props.transparentBackground && typeof opt.backgroundColor === 'undefined') {
        opt.backgroundColor = 'transparent';
    }

    chartInstance.value.setOption(opt, {
        notMerge: props.notMerge,
        replaceMerge: props.replaceMerge.length > 0 ? props.replaceMerge : undefined
    });

    // option 更新后尽量保持当前缩放范围（避免 notMerge=true 时重置 zoom）
    restoreZoomAfterSetOption();
};

/** 暴露主题变量供父组件构建 option 时使用 */
const getThemeColors = () => ({
    axisColor: chartAxisColor.value,
    splitLineColor: chartSplitLineColor.value,
    isGrayTheme: isGrayTheme.value
});

const { bindResize } = useChartResize(chartInstance, chartRef);

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
});

onUnmounted(() => {
    if (chartInstance.value) {
        chartInstance.value.dispose();
        chartInstance.value = null;
        emit('chart-disposed');
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
    /** 图表实例 */
    chartInstance,
    /** 重新初始化（如容器尺寸从 0 变为有效） */
    initChart,
    /** 更新配置（内部调用 applyOption） */
    updateOption: applyOption,
    /** 获取当前主题颜色 */
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
        flex-wrap: nowrap;
        gap: 8px;
        padding: 8px 10px 6px;
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
