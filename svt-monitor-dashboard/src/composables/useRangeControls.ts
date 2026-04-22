import { computed, ref, watch, type ComputedRef } from 'vue';
import type { EChartsOption } from 'echarts';

export interface UseRangeControlsConfig {
    option: ComputedRef<EChartsOption | null | undefined>;
    showRangeControls: ComputedRef<boolean>;
    rangeControlsData: ComputedRef<Array<string | number>>;
    rangeControlsXAxisIndex: ComputedRef<number>;
    rangeControlsMin: ComputedRef<number | undefined>;
    rangeControlsMax: ComputedRef<number | undefined>;
    rangeControlsStep: ComputedRef<number>;
    rangeControlsPrecision: ComputedRef<number>;
    rangeControlsDebounceMs: ComputedRef<number>;
    preserveDataZoom: ComputedRef<boolean>;
    doDataZoom: (payload: { startValue: any; endValue: any }) => void;
    onRangeChange?: (payload: { min: number; max: number; startValue: any; endValue: any }) => void;
    onRangeReset?: () => void;
}

export function useRangeControls(config: UseRangeControlsConfig) {
    const roundToPrecision = (n: number, precision: number) => {
        const p = Math.pow(10, Math.max(0, precision));
        return Math.round(n * p) / p;
    };

    const getXAxisDataFromOption = (opt: EChartsOption | null | undefined, xAxisIndex: number): any[] => {
        if (!opt) return [];
        const anyOpt = opt as any;
        const xAxis = anyOpt?.xAxis;
        const axis = Array.isArray(xAxis) ? xAxis[xAxisIndex] : xAxis;
        const axisType = axis?.type;
        const data = axis?.data;
        if (!Array.isArray(data) || data.length === 0) return [];
        if (axisType && axisType !== 'category') return [];
        return data;
    };

    const rangeAxisRaw = computed<any[]>(() => {
        const fromProps = config.rangeControlsData.value;
        if (Array.isArray(fromProps) && fromProps.length > 0) return fromProps as any[];
        return getXAxisDataFromOption(config.option.value, config.rangeControlsXAxisIndex.value ?? 0);
    });

    const rangeAxisNumsAll = computed<number[]>(() => rangeAxisRaw.value.map(v => Number(v)));

    const rangeAxisAllFinite = computed<boolean>(() => {
        const arr = rangeAxisNumsAll.value;
        return arr.length > 0 && arr.every(v => Number.isFinite(v));
    });

    const rangeDataMin = computed(() => {
        const manualMin = config.rangeControlsMin.value;
        if (typeof manualMin === 'number' && Number.isFinite(manualMin)) return manualMin;
        if (!rangeAxisAllFinite.value) return 0;
        return Math.min(...rangeAxisNumsAll.value);
    });

    const rangeDataMax = computed(() => {
        const manualMax = config.rangeControlsMax.value;
        if (typeof manualMax === 'number' && Number.isFinite(manualMax)) return manualMax;
        if (!rangeAxisAllFinite.value) return 0;
        return Math.max(...rangeAxisNumsAll.value);
    });

    const rangeMin = ref<number | null>(null);
    const rangeMax = ref<number | null>(null);
    const zoomRange = ref<{ startValue: any; endValue: any } | null>(null);
    const suppressDebouncedApply = ref(false);
    let debouncedApplyTimer: ReturnType<typeof setTimeout> | null = null;

    const showResolvedRangeControls = computed(
        () => !!config.showRangeControls.value && rangeAxisAllFinite.value
    );

    const shouldPreserveDataZoom = computed(
        () => !!config.preserveDataZoom.value || !!config.showRangeControls.value
    );
    const isCategoryAxis = computed(() => {
        const opt = config.option.value as any;
        const xAxis = opt?.xAxis;
        const idx = config.rangeControlsXAxisIndex.value ?? 0;
        const axis = Array.isArray(xAxis) ? xAxis[idx] : xAxis;
        const axisType = axis?.type;
        if (typeof axisType === 'string') return axisType === 'category';
        return Array.isArray(axis?.data);
    });

    const applyRange = () => {
        if (!rangeAxisAllFinite.value) return;
        if (rangeMin.value === null || rangeMax.value === null) return;

        const precision = config.rangeControlsPrecision.value;
        let minV = Math.max(rangeDataMin.value, Math.min(rangeDataMax.value, rangeMin.value));
        let maxV = Math.max(rangeDataMin.value, Math.min(rangeDataMax.value, rangeMax.value));
        if (minV > maxV) [minV, maxV] = [maxV, minV];

        minV = roundToPrecision(minV, precision);
        maxV = roundToPrecision(maxV, precision);
        rangeMin.value = minV;
        rangeMax.value = maxV;

        const raw = rangeAxisRaw.value;
        const nums = rangeAxisNumsAll.value;
        if (!raw.length || raw.length !== nums.length) return;

        let startValue: any;
        let endValue: any;
        if (isCategoryAxis.value) {
            let startIdx = nums.findIndex(v => v >= minV);
            if (startIdx === -1) startIdx = 0;

            let endIdx = -1;
            for (let i = nums.length - 1; i >= 0; i--) {
                const v = nums[i];
                if (typeof v === 'number' && v <= maxV) {
                    endIdx = i;
                    break;
                }
            }
            if (endIdx === -1) endIdx = nums.length - 1;
            if (startIdx > endIdx) startIdx = endIdx;
            startValue = raw[startIdx] ?? raw[0];
            endValue = raw[endIdx] ?? raw[raw.length - 1];
        } else {
            startValue = minV;
            endValue = maxV;
        }
        if (typeof startValue === 'undefined' || typeof endValue === 'undefined') return;

        zoomRange.value = { startValue, endValue };
        config.doDataZoom({ startValue, endValue });
        config.onRangeChange?.({ min: minV, max: maxV, startValue, endValue });
    };

    const resetRange = () => {
        if (!rangeAxisAllFinite.value) return;
        const precision = config.rangeControlsPrecision.value;
        const minV = roundToPrecision(rangeDataMin.value, precision);
        const maxV = roundToPrecision(rangeDataMax.value, precision);

        suppressDebouncedApply.value = true;
        rangeMin.value = minV;
        rangeMax.value = maxV;

        const raw = rangeAxisRaw.value;
        const startValue = raw[0];
        const endValue = raw[raw.length - 1];
        zoomRange.value =
            typeof startValue !== 'undefined' && typeof endValue !== 'undefined'
                ? { startValue, endValue }
                : null;

        if (zoomRange.value) {
            config.doDataZoom(zoomRange.value);
        }
        config.onRangeReset?.();
        setTimeout(() => {
            suppressDebouncedApply.value = false;
        }, 0);
    };

    const scheduleApplyRange = () => {
        if (suppressDebouncedApply.value) return;
        if (debouncedApplyTimer) clearTimeout(debouncedApplyTimer);
        debouncedApplyTimer = setTimeout(() => {
            applyRange();
        }, config.rangeControlsDebounceMs.value);
    };

    const syncInputsFromZoom = (
        startIdx: number,
        endIdx: number,
        startValue: any,
        endValue: any
    ) => {
        if (!rangeAxisAllFinite.value) return;
        const raw = rangeAxisRaw.value;
        const nums = rangeAxisNumsAll.value;
        if (!raw.length || raw.length !== nums.length) return;

        const sIdx = Math.max(0, Math.min(nums.length - 1, startIdx));
        const eIdx = Math.max(0, Math.min(nums.length - 1, endIdx));
        const aIdx = Math.min(sIdx, eIdx);
        const bIdx = Math.max(sIdx, eIdx);

        const minV = nums[aIdx];
        const maxV = nums[bIdx];
        if (
            typeof minV !== 'number' ||
            typeof maxV !== 'number' ||
            !Number.isFinite(minV) ||
            !Number.isFinite(maxV)
        )
            return;

        suppressDebouncedApply.value = true;
        if (debouncedApplyTimer) {
            clearTimeout(debouncedApplyTimer);
            debouncedApplyTimer = null;
        }

        const precision = config.rangeControlsPrecision.value ?? 0;
        rangeMin.value = roundToPrecision(minV, precision);
        rangeMax.value = roundToPrecision(maxV, precision);
        zoomRange.value = { startValue, endValue };

        setTimeout(() => {
            suppressDebouncedApply.value = false;
        }, 0);
    };

    const handleDataZoom = (params: any) => {
        const raw = rangeAxisRaw.value;
        if (!raw || raw.length === 0) return;
        const batch = Array.isArray(params?.batch) ? params.batch[0] : params;
        const startValue = batch?.startValue;
        const endValue = batch?.endValue;

        if (!isCategoryAxis.value) {
            const sNum = Number(startValue);
            const eNum = Number(endValue);
            if (Number.isFinite(sNum) && Number.isFinite(eNum)) {
                const precision = config.rangeControlsPrecision.value ?? 0;
                let minV = Math.max(rangeDataMin.value, Math.min(rangeDataMax.value, sNum));
                let maxV = Math.max(rangeDataMin.value, Math.min(rangeDataMax.value, eNum));
                if (minV > maxV) [minV, maxV] = [maxV, minV];

                suppressDebouncedApply.value = true;
                if (debouncedApplyTimer) {
                    clearTimeout(debouncedApplyTimer);
                    debouncedApplyTimer = null;
                }
                rangeMin.value = roundToPrecision(minV, precision);
                rangeMax.value = roundToPrecision(maxV, precision);
                zoomRange.value = { startValue: minV, endValue: maxV };
                setTimeout(() => {
                    suppressDebouncedApply.value = false;
                }, 0);
                return;
            }
        }

        const resolveIdx = (v: any, fallbackIdx: number) => {
            if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < raw.length) return v;
            const asStr = String(v);
            const idx = raw.findIndex(x => String(x) === asStr);
            return idx >= 0 ? idx : fallbackIdx;
        };

        if (typeof startValue !== 'undefined' && typeof endValue !== 'undefined') {
            const sIdx = resolveIdx(startValue, 0);
            const eIdx = resolveIdx(endValue, raw.length - 1);
            syncInputsFromZoom(sIdx, eIdx, startValue, endValue);
            return;
        }

        const start = typeof batch?.start === 'number' ? batch.start : null;
        const end = typeof batch?.end === 'number' ? batch.end : null;
        if (start === null || end === null) return;

        const maxIdx = raw.length - 1;
        const sIdx = Math.round((start / 100) * maxIdx);
        const eIdx = Math.round((end / 100) * maxIdx);
        const sVal = raw[Math.max(0, Math.min(maxIdx, sIdx))];
        const eVal = raw[Math.max(0, Math.min(maxIdx, eIdx))];
        if (typeof sVal === 'undefined' || typeof eVal === 'undefined') return;
        syncInputsFromZoom(sIdx, eIdx, sVal, eVal);
    };

    watch(
        () => rangeAxisRaw.value,
        next => {
            if (!showResolvedRangeControls.value) return;
            if (!next || next.length === 0 || !rangeAxisAllFinite.value) {
                rangeMin.value = null;
                rangeMax.value = null;
                zoomRange.value = null;
                return;
            }
            
            resetRange();
        },
        { immediate: true }
    );

    watch([rangeMin, rangeMax], scheduleApplyRange);

    const restoreZoomAfterSetOption = () => {
        if (shouldPreserveDataZoom.value && zoomRange.value) {
            config.doDataZoom(zoomRange.value);
        }
    };

    const dispose = () => {
        if (debouncedApplyTimer) {
            clearTimeout(debouncedApplyTimer);
            debouncedApplyTimer = null;
        }
    };

    return {
        showResolvedRangeControls,
        rangeMin,
        rangeMax,
        rangeDataMin,
        rangeDataMax,
        applyRange,
        resetRange,
        handleDataZoom,
        restoreZoomAfterSetOption,
        dispose
    };
}

