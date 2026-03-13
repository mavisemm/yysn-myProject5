<template>
    <div class="charts-analysis-module">
        <div ref="chartGridRef" class="charts-grid">
            <!-- 烈度图表 -->
            <div class="chart-item">
                <div class="chart-header">
                    <span class="chart-title">烈度随时间变化</span>
                    <span class="chart-unit special-font-color">（单位：mm/s）</span>
                </div>
                <div class="chart">
                    <CommonEcharts
                        :option="vibOption"
                        :enable-data-zoom="false"
                        :not-merge="true"
                        :tooltip-follow-mouse="true"
                        linkage-group="device-detail-charts"
                        :enable-linkage-zoom="true"
                        :enable-wheel-zoom="true"
                    />
                </div>
            </div>

            <!-- 温度图表 -->
            <div class="chart-item">
                <div class="chart-header">
                    <span class="chart-title">温度随时间变化</span>
                    <span class="chart-unit special-font-color">（单位：℃）</span>
                </div>
                <div class="chart">
                    <CommonEcharts
                        :option="tempOption"
                        :enable-data-zoom="false"
                        :not-merge="true"
                        :tooltip-follow-mouse="true"
                        linkage-group="device-detail-charts"
                        :enable-linkage-zoom="true"
                        :enable-wheel-zoom="true"
                    />
                </div>
            </div>

            <!-- 响度图表 -->
            <div class="chart-item">
                <div class="chart-header">
                    <span class="chart-title">响度随时间变化</span>
                    <span class="chart-unit special-font-color">（单位：dB）</span>
                </div>
                <div class="chart">
                    <CommonEcharts
                        :option="soundOption"
                        :enable-data-zoom="false"
                        :not-merge="true"
                        :tooltip-follow-mouse="true"
                        linkage-group="device-detail-charts"
                        :enable-linkage-zoom="true"
                        :enable-wheel-zoom="true"
                    />
                </div>
            </div>



            <!-- 右下角面板：实时温度 -->
            <div class="analysis-item realtime-temp-item">
                <div class="module-header">
                    <h3 class="module-title">实时温度</h3>
                </div>
                <div class="module-content realtime-temp-content">
                    <div class="realtime-temp-value special-font-color">
                        {{ realtimeTempValueText }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed, inject } from 'vue'
import type { Ref } from 'vue'
import { getTemperatureTrend, getVibrationTrend, getSoundTrend } from '@/api/modules/hardware'
import { CommonEcharts } from '@/components/common/chart'
import type { EChartsOption } from 'echarts'

interface PointInfo {
    id: string,
    name: string,
    lastAlarmTime: string,
    alarmType: string,
    alarmValue: string,
    hasAlarm: boolean
}

interface AnalysisResult {
    deviation: string,
    pointName: string
}

export type DateRange = [string, string] | null

const props = defineProps<{
    pointList: PointInfo[]
    selectedPointId?: string
}>()

// 三个主图表的数据（null 时使用 fallback）
interface ChartDataPoint {
    timeLabels: string[]
    values: number[]
    yMin?: number
    yMax?: number
}
const tempChartData = ref<ChartDataPoint | null>(null)
const vibChartData = ref<ChartDataPoint | null>(null)
const soundChartData = ref<ChartDataPoint | null>(null)

// “实时温度”面板：目前无接口，先用假数据展示
const realtimeTempMockValue = ref<number>(33)

function mockTemperatureByPointId(pointId: string): number {
    // 简单稳定 hash：同一 pointId 始终同一温度，不同点位有差异
    let hash = 0
    for (let i = 0; i < pointId.length; i++) {
        hash = (hash * 31 + pointId.charCodeAt(i)) >>> 0
    }
    // 生成 25.0 ~ 45.0 ℃ 的假温度
    const base = 25
    const span = 20
    const tenth = hash % (span * 10 + 1) // 0..200
    return base + tenth / 10
}

const realtimeTempValueText = computed(() => {
    const num = Number(realtimeTempMockValue.value)
    if (Number.isNaN(num)) return '—'
    const shown = Number.isInteger(num) ? String(num) : num.toFixed(1)
    return `${shown}℃`
})

// 灰色主题下图表坐标轴/分割线用黑色，否则白色
const backgroundMode = inject<Ref<'image' | 'gray' | 'green' | 'navy'> | undefined>('backgroundMode')
const isGrayTheme = computed(() => backgroundMode?.value === 'gray')
const chartAxisColor = computed(() => (isGrayTheme.value ? '#000' : '#fff'))
const chartSplitLineColor = computed(() => (isGrayTheme.value ? 'rgba(0,0,0,0.2)' : 'rgba(150,150,150, 0.2)'))

const HOURS_24 = Array.from({ length: 24 }, (_, i) => `${i}`)

/** 温度图表 option */
const tempOption = computed<EChartsOption>(() => {
    const c = chartAxisColor.value
    const s = chartSplitLineColor.value
    const d = tempChartData.value
    const timeLabels = d?.timeLabels ?? []
    const values = d?.values ?? []
    const yMin = d?.yMin
    const yMax = d?.yMax
    return {
        tooltip: {
            trigger: 'axis',
            className: 'echarts-tooltip',
            backgroundColor: 'rgba(50,50,50,0.8)',
            borderColor: 'rgba(50,50,50,0.8)',
            textStyle: { color: '#fff' }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
            { type: 'slider', xAxisIndex: [0], bottom: '5%', height: '10%', fillerColor: 'rgba(255, 206, 86, 0.3)', borderColor: 'rgba(255, 206, 86, 0.5)', handleStyle: { color: '#FFCE56' }, filterMode: 'none' }
        ],
        xAxis: {
            type: 'category',
            data: timeLabels,
            axisLabel: { fontSize: 10, color: c },
            axisLine: { lineStyle: { color: c }, onZero: false },
            axisTick: { lineStyle: { color: c } }
        },
        yAxis: {
            type: 'value',
            name: '℃',
            scale: true,
            ...(yMin != null && yMax != null ? { min: yMin, max: yMax } : { min: 'dataMin', max: 'dataMax' }),
            axisLabel: { fontSize: 10, color: c, formatter: (v: number) => String(Math.round(Number(v))) },
            axisLine: { lineStyle: { color: c } },
            axisTick: { lineStyle: { color: c } },
            splitLine: { lineStyle: { color: s } },
            nameTextStyle: { color: c },
            splitNumber: 4
        },
        series: values.length ? [{
            data: values,
            type: 'line',
            smooth: true,
            symbolSize: 4,
            itemStyle: { color: '#FFCE56' },
            lineStyle: { color: '#FFCE56', width: 2 },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255, 206, 86, 0.5)' }, { offset: 1, color: 'rgba(255, 206, 86, 0.1)' }] },
                opacity: 0.3
            }
        }] : [],
        backgroundColor: 'transparent'
    } as EChartsOption
})

/** 烈度图表 option */
const vibOption = computed<EChartsOption>(() => {
    const c = chartAxisColor.value
    const s = chartSplitLineColor.value
    const d = vibChartData.value
    const timeLabels = d?.timeLabels ?? []
    const values = d?.values ?? []
    const yMin = d?.yMin
    const yMax = d?.yMax
    return {
        tooltip: {
            trigger: 'axis',
            className: 'echarts-tooltip',
            backgroundColor: 'rgba(50,50,50,0.8)',
            borderColor: 'rgba(50,50,50,0.8)',
            textStyle: { color: '#fff' }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
            { type: 'slider', xAxisIndex: [0], bottom: '5%', height: '10%', fillerColor: 'rgba(255, 206, 86, 0.3)', borderColor: 'rgba(255, 206, 86, 0.5)', handleStyle: { color: '#FFCE56' }, filterMode: 'none' }
        ],
        xAxis: {
            type: 'category',
            data: timeLabels,
            axisLabel: { fontSize: 10, color: c },
            axisLine: { lineStyle: { color: c } },
            axisTick: { lineStyle: { color: c } }
        },
        yAxis: {
            type: 'value',
            name: 'mm/s',
            ...(yMin != null && yMax != null ? { min: yMin, max: yMax } : {}),
            axisLabel: { fontSize: 10, color: c },
            axisLine: { lineStyle: { color: c } },
            axisTick: { lineStyle: { color: c } },
            splitLine: { lineStyle: { color: s } },
            nameTextStyle: { color: c },
            splitNumber: 4
        },
        series: values.length ? [{
            data: values,
            type: 'line',
            smooth: true,
            symbolSize: 1,
            itemStyle: { color: '#FFCE56' },
            lineStyle: { color: '#FFCE56', width: 2 },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255, 206, 86, 0.5)' }, { offset: 1, color: 'rgba(255, 206, 86, 0.1)' }] },
                opacity: 0.3
            }
        }] : [],
        backgroundColor: 'transparent'
    } as EChartsOption
})

/** 响度图表 option */
const soundOption = computed<EChartsOption>(() => {
    const c = chartAxisColor.value
    const s = chartSplitLineColor.value
    const d = soundChartData.value
    const timeLabels = d?.timeLabels ?? []
    const values = d?.values ?? []
    const yMin = d?.yMin
    const yMax = d?.yMax
    return {
        tooltip: {
            trigger: 'axis',
            className: 'echarts-tooltip',
            backgroundColor: 'rgba(50,50,50,0.8)',
            borderColor: 'rgba(50,50,50,0.8)',
            textStyle: { color: '#fff' }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
            { type: 'slider', xAxisIndex: [0], bottom: '5%', height: '10%', fillerColor: 'rgba(234, 124, 204, 0.3)', borderColor: 'rgba(234, 124, 204, 0.5)', handleStyle: { color: '#ea7ccc' }, filterMode: 'none' }
        ],
        xAxis: {
            type: 'category',
            data: timeLabels,
            axisLabel: { fontSize: 10, color: c },
            axisLine: { lineStyle: { color: c }, onZero: false },
            axisTick: { lineStyle: { color: c } }
        },
        yAxis: {
            type: 'value',
            name: 'dB',
            scale: true,
            ...(yMin != null && yMax != null ? { min: yMin, max: yMax } : {}),
            axisLabel: { fontSize: 10, color: c },
            axisLine: { lineStyle: { color: c } },
            axisTick: { lineStyle: { color: c } },
            splitLine: { lineStyle: { color: s } },
            nameTextStyle: { color: c },
            splitNumber: 4
        },
        series: values.length ? [{
            data: values,
            type: 'line',
            smooth: true,
            symbolSize: 1,
            itemStyle: { color: '#ea7ccc' },
            lineStyle: { color: '#ea7ccc', width: 2 },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(234, 124, 204, 0.5)' }, { offset: 1, color: 'rgba(234, 124, 204, 0.1)' }] },
                opacity: 0.3
            }
        }] : [],
        backgroundColor: 'transparent'
    } as EChartsOption
})

// 趋势分析已迁移到独立组件 TrendAnalysisPanel.vue

//（旧趋势分析函数已删除，统一由 TrendAnalysisPanel.vue 维护）

//（趋势分析弹窗/图表逻辑已迁移到 TrendAnalysisPanel.vue）

 
// 根据数据范围计算 y 轴 min/max（支持负数，取整到合适刻度）
function computeTempYAxisRange(dataMin: number, dataMax: number): { min: number; max: number } {
    const span = dataMax - dataMin
    const padding = Math.max(span * 0.1, 2)
    let min = dataMin - padding
    let max = dataMax + padding
    const range = max - min
    const step = range <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(range)))
    min = Math.floor(min / step) * step
    max = Math.ceil(max / step) * step
    return { min, max }
}

// 加载温度趋势数据
const loadTemperatureData = async (pointId: string) => {
    if (!pointId) return

    try {
        const startTime = '2026-02-04 00:00:00'
        const endTime = '2026-02-04 23:59:59'

        const response = await getTemperatureTrend({
            point_id: 'P001',
            start_time: startTime,
            end_time: endTime
        })

        if (response.rc === 0 && response.ret && Array.isArray(response.ret) && response.ret.length > 0) {
            const timeData = response.ret.map((item: { dateTime?: string; time?: string }) => {
                const dt = item.dateTime || item.time || ''
                if (dt.includes(' ')) return (dt.split(' ')[1] || dt).trim().substring(0, 8)
                if (dt.includes('T')) return (dt.split('T')[1] || dt).substring(0, 8)
                return dt || ''
            })
            const tempData = response.ret.map(item => item.temperature)
            const dataMin = tempData.length ? Math.min(...tempData) : 0
            const dataMax = tempData.length ? Math.max(...tempData) : 100
            const { min: yMin, max: yMax } = computeTempYAxisRange(dataMin, dataMax)
            tempChartData.value = { timeLabels: timeData, values: tempData, yMin, yMax }
        } else {
            console.warn('温度趋势数据格式错误:', response)
            tempChartData.value = null
        }
    } catch (error) {
        console.error('加载温度趋势数据失败:', error)
        tempChartData.value = null
    }
}

// 根据数据范围计算 y 轴 min/max（烈度，支持小数与取整刻度）
function computeVibYAxisRange(dataMin: number, dataMax: number): { min: number; max: number } {
    const span = dataMax - dataMin
    const padding = Math.max(span * 0.1, 0.5)
    let min = Math.min(0, dataMin - padding)
    let max = dataMax + padding
    const range = max - min
    const step = range <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(range)))
    const safeStep = step < 0.1 ? 0.1 : step
    min = Math.floor(min / safeStep) * safeStep
    max = Math.ceil(max / safeStep) * safeStep
    return { min, max }
}

// 加载振动趋势数据
const loadVibrationData = async (pointId: string) => {
    if (!pointId) return

    try {
        const startTime = '2026-02-04 00:00:00'
        const endTime = '2026-02-04 23:59:59'

        const response = await getVibrationTrend({
            point_id: 'P001',
            start_time: startTime,
            end_time: endTime
        })

        const list = Array.isArray(response) ? response : (response.ret && Array.isArray(response.ret) ? response.ret : [])
        if (list.length > 0) {
            const timeData = list.map(item => {
                const dt = item.time || ''
                if (dt.includes(' ')) return (dt.split(' ')[1] || dt).trim().substring(0, 8)
                if (dt.includes('T')) return (dt.split('T')[1] || dt).substring(0, 8)
                return dt
            })
            const vibData = list.map(item => item.sumRms)
            const dataMin = vibData.length ? Math.min(...vibData) : 0
            const dataMax = vibData.length ? Math.max(...vibData) : 20
            const { min: yMin, max: yMax } = computeVibYAxisRange(dataMin, dataMax)
            vibChartData.value = { timeLabels: timeData, values: vibData, yMin, yMax }
        } else {
            console.warn('振动趋势数据格式错误:', response)
            vibChartData.value = null
        }
    } catch (error) {
        console.error('加载振动趋势数据失败:', error)
        vibChartData.value = null
    }
}

// 根据数据范围计算响度 y 轴 min/max
function computeSoundYAxisRange(dataMin: number, dataMax: number): { min: number; max: number } {
    const span = Math.max(dataMax - dataMin, 1)
    const padding = Math.max(span * 0.1, 2)
    let min = Math.min(0, dataMin - padding)
    let max = dataMax + padding
    const range = max - min
    const step = range <= 0 ? 10 : Math.pow(10, Math.floor(Math.log10(range)))
    const safeStep = step < 1 ? 1 : step
    min = Math.floor(min / safeStep) * safeStep
    max = Math.ceil(max / safeStep) * safeStep
    return { min, max }
}

// 加载响度趋势数据（point_id 暂用死数据 PT-001-A）
const loadSoundData = async (_pointId: string) => {
    try {
        const startTime = '2026-02-04 00:00:00'
        const endTime = '2026-02-04 23:59:59'

        const response = await getSoundTrend({
            point_id: 'P001',
            start_time: startTime,
            end_time: endTime
        })

        const list = Array.isArray(response) ? response : (response.ret && Array.isArray(response.ret) ? response.ret : [])
        if (list.length > 0) {
            const timeData = list.map(item => {
                const dt = item.time || item.dateTime || ''
                if (dt.includes(' ')) return (dt.split(' ')[1] || dt).trim().substring(0, 8)
                if (dt.includes('T')) return (dt.split('T')[1] || dt).substring(0, 8)
                return dt
            })
            const soundData = list.map(item => item.value ?? item.soundLevel ?? 0)
            const dataMin = soundData.length ? Math.min(...soundData) : 0
            const dataMax = soundData.length ? Math.max(...soundData) : 100
            const { min: yMin, max: yMax } = computeSoundYAxisRange(dataMin, dataMax)
            soundChartData.value = { timeLabels: timeData, values: soundData, yMin, yMax }
        } else {
            console.warn('响度趋势数据格式错误或为空:', response)
            soundChartData.value = null
        }
    } catch (error) {
        console.error('加载响度趋势数据失败:', error)
        soundChartData.value = null
    }
}

// 趋势分析已迁移到独立组件 TrendAnalysisPanel.vue

// 创建一个ref来引用charts-grid容器
const chartGridRef = ref<HTMLDivElement>()

// 图表初始化完成标志
const chartsInitialized = ref(false)

// 监听点位列表变化，自动加载第一个点位的温度/烈度/响度数据
watch(
    () => props.pointList,
    (newList, oldList) => {
        if (!chartsInitialized.value || !newList?.length) return
        const oldListLength = oldList ? oldList.length : 0
        const newListLength = newList.length
        if (oldListLength === 0 && newListLength > 0) {
            const pointId = newList[0]?.id
            if (pointId) {
                loadTemperatureData(pointId)
                loadVibrationData(pointId)
                loadSoundData(pointId)
            }
        } else if (!props.selectedPointId && newListLength > 0) {
            const pointId = newList[0]?.id
            if (pointId) {
                loadTemperatureData(pointId)
                loadVibrationData(pointId)
                loadSoundData(pointId)
            }
        }
    },
    { immediate: false, deep: true }
)

// 监听选中点位变化，加载对应点位数据
watch(
    () => props.selectedPointId,
    (newPointId, oldPointId) => {
        if (chartsInitialized.value && newPointId && newPointId !== oldPointId) {
            loadTemperatureData(newPointId)
            loadVibrationData(newPointId)
            loadSoundData(newPointId)
        }
    },
    { immediate: false }
)

// 实时温度（假数据）：随选中点位变化而变化；如果未选中则取列表第一个点位
watch(
    [() => props.selectedPointId, () => props.pointList],
    ([selId, list]) => {
        const pointId = selId || list?.[0]?.id || ''
        if (!pointId) return
        realtimeTempMockValue.value = mockTemperatureByPointId(pointId)
    },
    { immediate: true, deep: true }
)

// 组件挂载时标记就绪并加载首个点位数据
onMounted(() => {
    nextTick(() => {
        setTimeout(() => {
            chartsInitialized.value = true
            const firstPoint = props.pointList?.[0]
            if (firstPoint) {
                const pointId = props.selectedPointId || firstPoint.id
                if (pointId) {
                    loadTemperatureData(pointId)
                    loadVibrationData(pointId)
                    loadSoundData(pointId)
                }
            }
        }, 150)
    })
})
</script>

<style lang="scss" scoped>
.charts-analysis-module {
    height: 50%;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .charts-grid {
        height: 100%;
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 10px;
        min-height: 0;
        overflow: auto;

        .chart-item {
            background: url('@/assets/images/background/设备详情页-echarts背景.png') no-repeat center center;
            background-size: 100% 100%;
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
            min-height: 0;
            /* 确保flex子项可以收缩 */
            min-width: 0;
            /* 确保项目可以在小屏幕上收缩 */

            .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                flex: 0 0 auto;
                /* 固定头部高度 */

                .chart-title {
                    font-size: 1rem;
                    font-weight: 500;
                    color: #fff;
                }

                .chart-unit {
                    font-size: 0.9rem;
                    color: #fff;
                }
            }

            .chart {
                flex: 1;
                min-height: 0;
                min-width: 0;
            }
        }

        .analysis-item {
            background: url('@/assets/images/background/设备详情页-echarts背景.png') no-repeat center center;
            background-size: 100% 100%;
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            /* 移除 overflow: hidden 以允许下拉框正常显示 */
            min-height: 0;
            /* 确保flex子项可以收缩 */
            min-width: 0;
            /* 确保项目可以在小屏幕上收缩 */

            .module-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                flex: 0 0 auto;

                .module-title {
                    font-weight: 500;
                    font-size: 1rem;
                    color: white;
                }
            }

            .module-content {
                flex: 1;
                min-height: 0;

                overflow-y: auto;



                .analysis-form {
                    flex: 1;
                    min-height: 0;

                    .form-row {
                        display: flex;
                        gap: 10px;
                    }

                    .el-form {
                        .el-form-item {
                            margin-bottom: 12px;

                            :deep(.el-form-item__label) {
                                /* 默认（非灰色主题）保持白字 */
                                color: #fff;
                                font-size: 0.8rem;
                            }
                        }
                    }
                }

                .analysis-result {
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid #e4e7ed;

                    .result-row {
                        display: flex;
                        justify-content: flex-start;
                        margin-bottom: 8px;

                        .result-label {
                            font-size: 0.8rem;
                            color: #fff;
                            font-weight: 500;
                        }

                        .result-value {
                            font-size: 0.8rem;
                            color: white;
                            font-weight: 500;

                            &.clickable {
                                cursor: pointer;
                                text-decoration: underline;

                                &:hover {
                                    color: #409eff;
                                }
                            }
                        }
                    }
                }
            }

            .trend-charts-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
                min-height: 400px;

                .chart-wrapper {
                    flex-shrink: 0;

                    .chart-title {
                        font-size: 1rem!important;
                        text-align: center;
                        font-weight: 500;
                        color: #fff;
                        margin-bottom: 10px;
                        padding: 10px;
                        background: rgba(0, 0, 0, 0.2);
                        border-radius: 4px;
                    }

                    .chart-box {
                        width: 100%;
                        height: 350px;
                        min-height: 300px;
                        background: transparent;
                        border-radius: 4px;
                        border: 1px solid #e4e7ed;
                    }
                }
            }




        }

        /* 实时温度：内容区水平/垂直居中（放在 analysis-item 同级，避免被表单样式嵌套吞掉） */
        .analysis-item.realtime-temp-item {
            .module-content.realtime-temp-content {
                flex: 1;
                min-height: 0;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                overflow: hidden;
                border-radius: 8px;
                background: rgba(10, 22, 40, 0.35);
                box-shadow:
                    inset 0 0 0 1px rgba(120, 220, 255, 0.14),
                    0 8px 24px rgba(0, 0, 0, 0.18);
            }

            .realtime-temp-value {
                width: 100%;
                font-size: clamp(2.2rem, 4.2vw, 3.6rem);
                font-weight: 800;
                line-height: 1.05;
                text-align: center;
                letter-spacing: 0.5px;
                color: rgba(110, 225, 255, 0.98);
                text-shadow:
                    0 2px 10px rgba(0, 0, 0, 0.45),
                    0 0 18px rgba(80, 200, 255, 0.38);
            }
        }
    }
}

/* 灰色主题下（PageLayout 的 page-layout--gray），趋势分析表单 label 需要黑字 */
:global(.page-layout--gray) .charts-analysis-module {
    .analysis-form {
        :deep(.el-form-item__label) {
            color: #000 !important;
        }
    }
}

/* 趋势分析弹窗（teleported 到 body，需全局样式） */
:global(.trend-chart-dialog) {
    width: 70vw !important;
    height: 95vh !important;
    margin-top: 2.5vh !important;
    display: flex;
    flex-direction: column;
    background-color: #ffffff !important;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

    .el-dialog__body {
        flex: 1;
        overflow: hidden;
        padding: 0 20px 20px;
        display: flex;
        flex-direction: column;
        min-height: 0;
        background-color: #ffffff;
    }

    .trend-charts-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 0;
    }

    .chart-wrapper {
        flex: 0 0 40vh;
        min-height: 40vh;
        display: flex;
        flex-direction: column;
        background-color: #ffffff;
    }

    .chart-wrapper .chart-box {
        flex: 1;
        min-height: 0;
        width: 100%;
        background: transparent;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
    }

    :deep(.el-dialog__header.show-close) {
        font-weight: 500 !important;
        letter-spacing: 1.22px !important;
        color: #333333 !important;
        background-color: #ffffff !important;
        border-bottom: 1px solid #e4e7ed;
    }
}
</style>

<!-- 全局样式确保弹窗标题样式生效 -->
<style lang="scss">
:root {
    --dialog-title-weight: 500;
    --dialog-title-spacing: 1.22px;
    --dialog-title-color: #333333;
    --dialog-title-size: clamp(22px, 3vw, 26px);
}

/* 多层选择器确保样式生效 */
.trend-chart-dialog,
.el-dialog.trend-chart-dialog,
.el-overlay-dialog .trend-chart-dialog {

    .el-dialog__header,
    .el-dialog__header.show-close {
        .el-dialog__title {
            font-weight: var(--dialog-title-weight) !important;
            letter-spacing: var(--dialog-title-spacing) !important;
            color: var(--dialog-title-color) !important;
            font-size: var(--dialog-title-size) !important;
        }
    }
}

/* 最终兜底样式 */
.el-dialog__title {
    &.trend-chart-title {
        font-weight: 500 !important;
        letter-spacing: 1.22px !important;
        color: #333333 !important;
    }
}

/* 自定义头部样式 */
.trend-chart-dialog-header {
    .trend-chart-title {
        font-weight: 500 !important;
        letter-spacing: 1.22px !important;
        color: #333333 !important;
    }
}
</style>