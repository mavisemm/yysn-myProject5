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

            <!-- 温度图表 -->
            <div class="chart-item chart-item--wide">
                <div class="chart-header">
                    <span class="chart-title">温度随时间变化</span>
                    <div class="chart-header-right">
                        <!-- <span class="realtime-temp-inline">
                            实时温度：<span class="special-font-color">{{ realtimeTempValueText }}</span>
                        </span> -->
                        <span class="chart-unit special-font-color">（单位：℃）</span>
                    </div>
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
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
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

function mockTemperatureByReceiverId(receiverId: string): number {
    // 简单稳定 hash：同一 receiverId 始终同一温度，不同点位有差异
    let hash = 0
    for (let i = 0; i < receiverId.length; i++) {
        hash = (hash * 31 + receiverId.charCodeAt(i)) >>> 0
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

// 灰色主题已移除：统一使用非灰配色
const chartAxisColor = computed(() => '#fff')
const chartSplitLineColor = computed(() => 'rgba(150,150,150, 0.2)')
const TEMP_COLOR = '#ff4d4f'
const VIB_COLOR = '#1890ff'
const SOUND_COLOR = '#fadb14'

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
            { type: 'slider', xAxisIndex: [0], bottom: '5%', height: '10%', fillerColor: 'rgba(255, 77, 79, 0.3)', borderColor: 'rgba(255, 77, 79, 0.5)', handleStyle: { color: TEMP_COLOR }, filterMode: 'none' }
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
        series: values.length
            ? [{
                data: values,
                type: 'line',
                smooth: true,
                symbolSize: 1,
                itemStyle: { color: TEMP_COLOR },
                lineStyle: { color: TEMP_COLOR, width: 2 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(255, 77, 79, 0.5)' },
                            { offset: 1, color: 'rgba(255, 77, 79, 0.1)' }
                        ]
                    },
                    opacity: 0.3
                }
            }]
            : [],
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
            { type: 'slider', xAxisIndex: [0], bottom: '5%', height: '10%', fillerColor: 'rgba(24, 144, 255, 0.3)', borderColor: 'rgba(24, 144, 255, 0.5)', handleStyle: { color: VIB_COLOR }, filterMode: 'none' }
        ],
        xAxis: {
            type: 'category',
            data: timeLabels,
            axisLabel: { fontSize: 10, color: c },
            // 保证 x 轴落在 grid 底部，而不是放在 y=0 处（避免看起来跑到中间）
            axisLine: { lineStyle: { color: c }, onZero: false },
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
            itemStyle: { color: VIB_COLOR },
            lineStyle: { color: VIB_COLOR, width: 2 },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(24, 144, 255, 0.5)' }, { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }] },
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
            { type: 'slider', xAxisIndex: [0], bottom: '5%', height: '10%', fillerColor: 'rgba(250, 219, 20, 0.3)', borderColor: 'rgba(250, 219, 20, 0.5)', handleStyle: { color: SOUND_COLOR }, filterMode: 'none' }
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
            itemStyle: { color: SOUND_COLOR },
            lineStyle: { color: SOUND_COLOR, width: 2 },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(250, 219, 20, 0.5)' }, { offset: 1, color: 'rgba(250, 219, 20, 0.1)' }] },
                opacity: 0.3
            }
        }] : [],
        backgroundColor: 'transparent'
    } as EChartsOption
})

//（趋势分析相关功能已移除）

 
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
const loadTemperatureData = async (receiverId: string) => {
    if (!receiverId) return

    try {
        const response = await getTemperatureTrend({
            receiverId
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
const loadVibrationData = async (receiverId: string) => {
    if (!receiverId) return

    try {
        const response = await getVibrationTrend({
            receiverId
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

// 加载响度趋势数据
const loadSoundData = async (receiverId: string) => {
    if (!receiverId) return
    try {
        const response = await getSoundTrend({
            receiverId
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

//（趋势分析相关功能已移除）

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
            const receiverId = newList[0]?.id
            if (receiverId) {
                loadTemperatureData(receiverId)
                loadVibrationData(receiverId)
                loadSoundData(receiverId)
            }
        } else if (!props.selectedPointId && newListLength > 0) {
            const receiverId = newList[0]?.id
            if (receiverId) {
                loadTemperatureData(receiverId)
                loadVibrationData(receiverId)
                loadSoundData(receiverId)
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
        const receiverId = selId || list?.[0]?.id || ''
        if (!receiverId) return
        realtimeTempMockValue.value = mockTemperatureByReceiverId(receiverId)
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
                const receiverId = props.selectedPointId || firstPoint.id
                if (receiverId) {
                    loadTemperatureData(receiverId)
                    loadVibrationData(receiverId)
                    loadSoundData(receiverId)
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
                gap: 10px;

                .chart-title {
                    font-size: 1rem;
                    font-weight: 500;
                    color: #fff;
                }

                .chart-unit {
                    font-size: 0.9rem;
                    color: #fff;
                }

                .chart-header-right {
                    display: inline-flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 10px;
                    min-width: 0;
                    flex: 0 0 auto;
                    white-space: nowrap;
                }

                .realtime-temp-inline {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #fff;
                }
            }

            .chart {
                flex: 1;
                min-height: 0;
                min-width: 0;
            }
        }

        .chart-item--wide {
            grid-column: 1 / -1;
        }

        .analysis-item {
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

    }
}

/*（趋势分析相关样式已移除）*/
/*
:global(.page-layout--gray) .charts-analysis-module {
    .analysis-form {
        :deep(.el-form-item__label) {
            color: #000 !important;
        }
    }
}*/

/*（趋势分析弹窗相关样式已移除）*/
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