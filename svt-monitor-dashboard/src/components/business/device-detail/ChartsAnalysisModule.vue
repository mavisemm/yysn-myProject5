<template>
    <div class="charts-analysis-module">
        <div ref="chartGridRef" class="charts-grid">
            <!-- 烈度图表 -->
            <div class="chart-item">
                <div class="chart-header">
                    <span class="chart-title">烈度随时间变化</span>
                    <span class="chart-unit special-font-color">（单位：mm/s）</span>
                </div>
                <div ref="vibChartRef" class="chart"></div>
            </div>

            <!-- 温度图表 -->
            <div class="chart-item">
                <div class="chart-header">
                    <span class="chart-title">温度随时间变化</span>
                    <span class="chart-unit special-font-color">（单位：℃）</span>
                </div>
                <div ref="tempChartRef" class="chart"></div>
            </div>

            <!-- 响度图表 -->
            <div class="chart-item">
                <div class="chart-header">
                    <span class="chart-title">响度随时间变化</span>
                    <span class="chart-unit special-font-color">（单位：dB）</span>
                </div>
                <div ref="soundChartRef" class="chart"></div>
            </div>



            <!-- 趋势分析模块 -->
            <div class="analysis-item">
                <div class="module-header">
                    <h3 class="module-title">趋势分析</h3>
                </div>
                <div class="module-content">
                    <div class="analysis-form">
                        <el-form label-position="top">
                            <div class="form-row">
                                <el-form-item label="点位选择" style="flex: 1; margin-right: 10px;">
                                    <el-select v-model="analysisForm.pointId" placeholder="请选择点位" size="small"
                                        style="width: 100%;">
                                        <el-option v-for="point in pointList" :key="point.id" :label="point.name"
                                            :value="point.id" />
                                    </el-select>
                                </el-form-item>

                                <el-form-item label="间隔天数" style="flex: 1;">
                                    <el-input-number v-model="analysisForm.days" :min="0" :max="365" placeholder="输入天数"
                                        size="small" style="width: 100%;" />
                                </el-form-item>
                            </div>

                            <el-form-item label="时间选择">
                                <CommonDateTimePicker v-model="analysisForm.dateRange" width="100%" />
                            </el-form-item>

                            <el-button type="primary" @click="analyzeTrend" style="width: 100%; margin-top: 10px;">
                                开始分析
                            </el-button>
                        </el-form>
                    </div>

                    <div class="analysis-result">
                        <div class="result-row">
                            <span class="result-label">偏差值：</span>
                            <span class="result-value">{{ analysisResult.deviation }}</span>
                        </div>
                        <div class="result-row">
                            <span class="result-label">点位名称：</span>
                            <span class="result-value clickable" @click="showTrendChart">{{ analysisResult.pointName
                            }}</span>
                        </div>
                    </div>

                    <!-- 趋势分析图表弹窗 -->
                    <el-dialog v-model="chartDialogVisible" title="趋势分析图表" :close-on-click-modal="true" destroy-on-close
                        class="trend-chart-dialog" @opened="onTrendDialogOpened" @closed="onTrendDialogClosed">
                        <div class="trend-charts-container">
                            <div class="chart-wrapper">
                                <div ref="dbChartRef" class="chart-box"></div>
                            </div>
                            <div class="chart-wrapper">
                                <div ref="densityChartRef" class="chart-box"></div>
                            </div>
                        </div>
                    </el-dialog>
                </div>

            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, watch, computed } from 'vue'
import { ElForm, ElFormItem, ElSelect, ElOption, ElInputNumber, ElDatePicker, ElButton, ElMessage, ElDialog } from 'element-plus'
import * as echarts from 'echarts'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { enableMouseWheelZoomForCharts, connectCharts } from '@/utils/chart'
import { getTemperatureTrend, getVibrationTrend, getSoundTrend, getTrendAnalysis } from '@/api/modules/hardware'
import { handleDatePickerChange, disabledFutureDate } from '@/utils/datetime'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'

// 定义点位信息类型
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

// 定义日期范围类型，兼容Element Plus的日期选择器
export type DateRange = [string, string] | null

// 定义属性
const props = defineProps<{
    pointList: PointInfo[]
    selectedPointId?: string
}>()

// 图表相关
const tempChartRef = ref<HTMLDivElement>()
const soundChartRef = ref<HTMLDivElement>()
const vibChartRef = ref<HTMLDivElement>()

let tempChart: echarts.ECharts | null = null
let soundChart: echarts.ECharts | null = null
let vibChart: echarts.ECharts | null = null

// 趋势分析相关

const handleCalendarChange = (val: [Date, Date] | null) => {
    const result = handleDatePickerChange(val);
    if (result) {
        analysisForm.value.dateRange = result;
    }
};

const analysisForm = ref({
    pointId: '',
    days: 1,
    dateRange: null as DateRange
})

// 日期范围由 CommonDateTimePicker 负责默认时间逻辑，此处不再覆盖，以便用户可手动修改结束时间

const analysisResult = ref<AnalysisResult>({
    deviation: '0.25',
    pointName: '进风口位置'
})

// 图表弹窗相关
const chartDialogVisible = ref(false)
const dbChartRef = ref<HTMLDivElement>()
const densityChartRef = ref<HTMLDivElement>()
let dbChart: echarts.ECharts | null = null
let densityChart: echarts.ECharts | null = null
let resizeTimer: number | null = null

// 存储趋势分析数据用于图表展示
const trendAnalysisData = ref<any[]>([])

// 显示趋势图表
const showTrendChart = () => {
    if (trendAnalysisData.value.length === 0) {
        ElMessage.warning('暂无趋势分析数据')
        return
    }
    chartDialogVisible.value = true
}

// 弹窗完全打开后初始化图表并联动
const onTrendDialogOpened = () => {
    nextTick(() => {
        setTimeout(() => {
            initTrendChart()
            // 联动两个图表：缩放、拖拽同步
            if (dbChart && densityChart) {
                connectCharts([dbChart, densityChart])
                enableMouseWheelZoomForCharts([dbChart, densityChart])
                nextTick(() => {
                    dbChart?.resize()
                    densityChart?.resize()
                })
            }
        }, 50)
    })
}

// 弹窗关闭时销毁图表
const onTrendDialogClosed = () => {
    if (dbChart) {
        dbChart.dispose()
        dbChart = null
    }
    if (densityChart) {
        densityChart.dispose()
        densityChart = null
    }
}

// 计算dB最大差值信息
const calcDbMaxDiff = (totalArr: any[], xArr: any[]) => {
    const diffInfo = {
        diff: 0,
        freq: '',
        index: -1,
        maxValue: 0,
        minValue: 0
    }

    if (!totalArr.length || !xArr.length) return diffInfo

    for (let xIndex = 0; xIndex < xArr.length; xIndex++) {
        const currentFreq = xArr[xIndex]
        const dbValues: number[] = []

        for (let groupIndex = 0; groupIndex < totalArr.length; groupIndex++) {
            const dbValue = totalArr[groupIndex].dbArr?.[xIndex]
            if (dbValue != null && !isNaN(Number(dbValue))) {
                dbValues.push(Number(dbValue))
            }
        }

        if (dbValues.length < 2) continue

        const currentMax = Math.max(...dbValues)
        const currentMin = Math.min(...dbValues)
        const currentDiff = currentMax - currentMin

        if (currentDiff > diffInfo.diff) {
            diffInfo.diff = currentDiff
            diffInfo.freq = currentFreq
            diffInfo.index = xIndex
            diffInfo.maxValue = currentMax
            diffInfo.minValue = currentMin
        }
    }

    return diffInfo
}

// 更新tooltip格式化器
const updateDbEchartsTooltip = (option: any, totalArr: any[], xArr: any[]) => {
    option.tooltip = {
        ...option.tooltip,
        hideDelay: 10000,
        formatter: (params: any) => {
            if (!params || !params.length) return ''

            const xIndex = params[0].dataIndex
            const currentFreq = xArr[xIndex] || '未知频率'

            const dbValues: number[] = []
            for (let groupIndex = 0; groupIndex < totalArr.length; groupIndex++) {
                const dbValue = totalArr[groupIndex].dbArr?.[xIndex]
                if (dbValue != null && !isNaN(Number(dbValue))) {
                    dbValues.push(Number(dbValue))
                }
            }

            let currentDiffStr = '当前差值：无有效数据'
            let currentMax = null
            if (dbValues.length >= 2) {
                currentMax = Math.max(...dbValues)
                const currentMin = Math.min(...dbValues)
                const currentDiff = currentMax - currentMin
                currentDiffStr = `当前差值：${currentDiff.toFixed(4)}<br/>最大值：${currentMax.toFixed(4)}<br/>最小值：${currentMin.toFixed(4)}`
            }

            let tooltipContent = ''
            tooltipContent += currentDiffStr
            tooltipContent += `<br/><hr style="border: none; border-top: 1px solid #ccc; margin: 6px 0;"/>`
            tooltipContent += `${currentFreq}Hz<br/>`
            params.forEach((item: any) => {
                const colorCircle = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:4px;"></span>`
                const isMaxValue = currentMax !== null && Math.abs(Number(item.data) - currentMax) < 0.0001
                if (isMaxValue) {
                    tooltipContent += `${colorCircle}<span style="color: #ff6a6aff; font-size: 16px; font-weight: 500;">${item.seriesName}：${item.data || '无数据'}</span><br/>`
                } else {
                    tooltipContent += `${colorCircle}${item.seriesName}：${item.data || '无数据'}<br/>`
                }
            })

            return tooltipContent
        }
    }
    return option
}

// 生成时间渐变色
const generateTimeGradientColors = (totalCount: number) => {
    const colors: string[] = []
    const count = Math.max(totalCount, 1)
    const step = count > 1 ? 255 / (count - 1) : 0

    for (let i = 0; i < count; i++) {
        const r = 255
        const g = Math.floor(i * step)
        const b = 0
        colors.push(`rgb(${r}, ${g}, ${b})`)
    }
    return colors
}

// 初始化趋势图表
const initTrendChart = () => {
    if ((!dbChartRef.value && !densityChartRef.value) || trendAnalysisData.value.length === 0) return

    // 清理现有的图表实例
    if (dbChart) {
        dbChart.dispose()
        dbChart = null
    }
    if (densityChart) {
        densityChart.dispose()
        densityChart = null
    }

    // 处理数据 - 仿照zPoint.js的方式
    let totalArr: any[] = []
    let xArr: any[] = []

    // 构造数据结构
    for (let i = 0; i < trendAnalysisData.value.length; i++) {
        const item = trendAnalysisData.value[i]
        let dbArr: any[] = []
        let densityArr: any[] = []

        if (item.avgFrequencyDtoList && item.avgFrequencyDtoList.length > 0) {
            for (let j = 0; j < item.avgFrequencyDtoList.length; j++) {
                const temp = item.avgFrequencyDtoList[j]
                dbArr.push(temp.db ? temp.db.toFixed(4) : undefined)
                densityArr.push(temp.density ? temp.density.toFixed(4) : undefined)

                // 只在第一次循环时设置x轴数据
                if (i === 0) {
                    const freq = Math.sqrt(Number(temp.freq1) * Number(temp.freq2)).toFixed(4)
                    xArr.push(freq)
                }
            }
        }

        const rawTime = item.time != null ? new Date(item.time).getTime() : 0
        totalArr.push({
            ...item,
            dbArr,
            densityArr,
            rawTime,
            time: new Date(item.time).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        })
    }

    // 按时间正序（早→晚）
    totalArr.sort((a, b) => (a.rawTime || 0) - (b.rawTime || 0))

    // 生成时间渐变色
    const timeGradientColors = generateTimeGradientColors(totalArr.length)

    // 构造系列数据
    let finallyDbArr: any[] = []
    let finallyDensityArr: any[] = []

    for (let j = 0; j < totalArr.length; j++) {
        const currentColor = timeGradientColors[j]

        finallyDbArr.push({
            name: totalArr[j].time,
            type: "line",
            data: totalArr[j].dbArr,
            itemStyle: {
                color: currentColor
            },
            lineStyle: {
                color: currentColor,
            }
        })

        finallyDensityArr.push({
            name: totalArr[j].time,
            type: "line",
            data: totalArr[j].densityArr,
            itemStyle: {
                color: currentColor
            },
            lineStyle: {
                color: currentColor,
            }
        })
    }

    // 计算最大差值
    const dbMaxDiffInfo = calcDbMaxDiff(totalArr, xArr)

    // 初始化dB图表
    if (dbChartRef.value) {
        dbChart = echarts.init(dbChartRef.value)

        const dbOption = {
            backgroundColor: 'transparent',
            title: {
                text: '能量趋势分析',
                textStyle: {
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: 'bold'
                },
                left: 'center',
                top: 10
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(25, 25, 25, 0.9)',
                borderColor: '#4a90e2',
                borderWidth: 1,
                textStyle: {
                    color: '#ffffff',
                    fontSize: 12
                },
                padding: 12,
                extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.3);'
            },
            legend: {
                data: finallyDbArr.map(item => item.name),
                textStyle: {
                    color: '#e0e0e0',
                    fontSize: 11
                },
                top: 40,
                type: 'scroll',
                pageTextStyle: {
                    color: '#e0e0e0'
                }
            },
            grid: {
                left: '8%',
                right: '8%',
                bottom: '12%',
                top: '22%',
                containLabel: true
            },
            xAxis: [{
                type: 'category',
                data: xArr,
                axisLabel: {
                    fontSize: 11,
                    color: '#cccccc',
                    rotate: 45,
                    margin: 15
                },
                axisLine: {
                    lineStyle: {
                        color: '#555555',
                        width: 1
                    }
                },
                axisTick: {
                    alignWithLabel: true,
                    lineStyle: { color: '#555555' }
                },
                splitLine: {
                    show: false
                }
            }],
            yAxis: {
                type: 'value',
                axisLabel: {
                    fontSize: 11,
                    color: '#cccccc'
                },
                axisLine: {
                    lineStyle: {
                        color: '#555555',
                        width: 1
                    }
                },
                axisTick: {
                    lineStyle: { color: '#555555' }
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(85, 85, 85, 0.3)',
                        type: 'solid'
                    }
                }
            },
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 100,
                    xAxisIndex: [0]
                },
                {
                    type: 'slider',
                    start: 0,
                    end: 100,
                    xAxisIndex: [0],
                    bottom: 10,
                    height: 20,
                    borderColor: '#555555',
                    textStyle: {
                        color: '#cccccc'
                    },
                    handleStyle: {
                        color: '#4a90e2',
                        borderColor: '#4a90e2'
                    },
                    fillerColor: 'rgba(74, 144, 226, 0.2)',
                    brushSelect: false
                }
            ],
            series: finallyDbArr.map((series, index) => ({
                ...series,
                smooth: true,
                symbol: 'circle',
                symbolSize: 1,
                lineStyle: {
                    width: 2.5,
                    shadowBlur: 3,
                    shadowColor: 'rgba(0,0,0,0.2)'
                },
                itemStyle: {
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    shadowBlur: 4,
                    shadowColor: 'rgba(0,0,0,0.3)'
                },
                emphasis: {
                    focus: 'series',
                    itemStyle: {
                        borderWidth: 3,
                        borderColor: '#ffffff'
                    }
                }
            }))
        }

        // 为第一个系列添加最大差值标记
        if (finallyDbArr.length > 0 && dbMaxDiffInfo.index !== -1) {
            dbOption.series[0].markPoint = {
                enabled: true,
                symbol: 'pin',
                symbolSize: 20,
                z: 10,
                label: {
                    show: true,
                    formatter: `${dbMaxDiffInfo.freq}Hz\n最大差值\n${dbMaxDiffInfo.diff.toFixed(4)}`,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 'bold',
                    position: 'top'
                },
                itemStyle: {
                    color: '#f56954',
                    borderColor: '#fff',
                    borderWidth: 2
                },
                data: [{
                    name: `@${dbMaxDiffInfo.freq}Hz`,
                    xAxis: dbMaxDiffInfo.index,
                    yAxis: dbMaxDiffInfo.maxValue,
                    value: dbMaxDiffInfo.diff.toFixed(4)
                }]
            }
        }

        dbChart.setOption(dbOption)
    }

    // 初始化密度图表
    if (densityChartRef.value) {
        densityChart = echarts.init(densityChartRef.value)

        const densityOption = {
            backgroundColor: 'transparent',
            title: {
                text: '密度趋势分析',
                textStyle: {
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: 'bold'
                },
                left: 'center',
                top: 10
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(25, 25, 25, 0.9)',
                borderColor: '#4a90e2',
                borderWidth: 1,
                textStyle: {
                    color: '#ffffff',
                    fontSize: 12
                },
                padding: 12,
                extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.3);'
            },
            legend: {
                data: finallyDensityArr.map(item => item.name),
                textStyle: {
                    color: '#e0e0e0',
                    fontSize: 11
                },
                top: 40,
                type: 'scroll',
                pageTextStyle: {
                    color: '#e0e0e0'
                }
            },
            grid: {
                left: '8%',
                right: '8%',
                bottom: '12%',
                top: '22%',
                containLabel: true
            },
            xAxis: [{
                type: 'category',
                data: xArr,
                axisLabel: {
                    fontSize: 11,
                    color: '#cccccc',
                    rotate: 45,
                    margin: 15
                },
                axisLine: {
                    lineStyle: {
                        color: '#555555',
                        width: 1
                    }
                },
                axisTick: {
                    alignWithLabel: true,
                    lineStyle: { color: '#555555' }
                },
                splitLine: {
                    show: false
                }
            }],
            yAxis: {
                type: 'value',
                name: '密度',
                nameTextStyle: {
                    color: '#cccccc',
                    fontSize: 12
                },
                axisLabel: {
                    fontSize: 11,
                    color: '#cccccc'
                },
                axisLine: {
                    lineStyle: {
                        color: '#555555',
                        width: 1
                    }
                },
                axisTick: {
                    lineStyle: { color: '#555555' }
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(85, 85, 85, 0.3)',
                        type: 'solid'
                    }
                }
            },
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 100,
                    xAxisIndex: [0]
                },
                {
                    type: 'slider',
                    start: 0,
                    end: 100,
                    xAxisIndex: [0],
                    bottom: 10,
                    height: 20,
                    borderColor: '#555555',
                    textStyle: {
                        color: '#cccccc'
                    },
                    handleStyle: {
                        color: '#4a90e2',
                        borderColor: '#4a90e2'
                    },
                    fillerColor: 'rgba(74, 144, 226, 0.2)',
                    brushSelect: false
                }
            ],
            series: finallyDensityArr.map((series, index) => ({
                ...series,
                smooth: true,
                symbol: 'circle',
                symbolSize: 1,
                lineStyle: {
                    width: 2.5,
                    shadowBlur: 3,
                    shadowColor: 'rgba(0,0,0,0.2)'
                },
                itemStyle: {
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    shadowBlur: 4,
                    shadowColor: 'rgba(0,0,0,0.3)'
                },
                emphasis: {
                    focus: 'series',
                    itemStyle: {
                        borderWidth: 3,
                        borderColor: '#ffffff'
                    }
                }
            }))
        }

        densityChart.setOption(densityOption)
    }
}

// 初始化图表
onMounted(() => {
    // 使用 nextTick 确保 DOM 已渲染
    nextTick(() => {
        // 使用 setTimeout 确保 DOM 完全渲染后再初始化图表
        setTimeout(() => {
            initTempChart();
            initSoundChart();
            initVibChart();
        }, 100);
    });

    // 添加窗口大小变化监听
    window.addEventListener('resize', handleWindowResize);
})

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
    if (!pointId || !tempChart) return

    try {
        const startTime = '2026-02-04 00:00:00'
        const endTime = '2026-02-04 23:59:59'

        const response = await getTemperatureTrend({
            point_id: 'P001',
            start_time: startTime,
            end_time: endTime
        })

        if (response.rc === 0 && response.ret && Array.isArray(response.ret) && response.ret.length > 0) {
            // 接口可能返回 dateTime 或 time（与烈度接口一致），时间格式与烈度 chart 保持一致
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

            tempChart.setOption({
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(50,50,50,0.8)',
                    borderColor: 'rgba(50,50,50,0.8)',
                    textStyle: {
                        color: '#fff'
                    },
                    position: function (pos: any, params: any, el: any, elRect: any, size: any) {
                        const [mouseX, mouseY] = pos;
                        const [contentWidth, contentHeight] = size.contentSize;
                        const [viewWidth, viewHeight] = size.viewSize;
                        let x = mouseX + 20;
                        if (x + contentWidth > viewWidth) {
                            x = mouseX - contentWidth - 20;
                        }
                        let y = Math.max(0, mouseY - contentHeight / 2);
                        return [x, y];
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '15%', // 与烈度随时间变化保持一致
                    top: '10%',
                    containLabel: true
                },
                dataZoom: [
                    { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
                    {
                        type: 'slider',
                        xAxisIndex: [0],
                        bottom: '5%',
                        height: '10%',
                        fillerColor: 'rgba(255, 206, 86, 0.3)',
                        borderColor: 'rgba(255, 206, 86, 0.5)',
                        handleStyle: { color: '#FFCE56' },
                        filterMode: 'none'
                    }
                ],
                // x 轴樣式與「烈度随时间变化」保持一致
                xAxis: {
                    type: 'category',
                    data: timeData,
                    axisLabel: {
                        fontSize: 10,
                        color: '#fff'
                    },
                    axisLine: {
                        lineStyle: {
                            color: '#fff'
                        }
                    },
                    axisTick: {
                        lineStyle: {
                            color: '#fff'
                        }
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '℃',
                    scale: true,
                    min: yMin,
                    max: yMax,
                    axisLabel: {
                        fontSize: 10,
                        color: '#fff',
                        formatter: (value: number) => String(Math.round(Number(value)))
                    },
                    axisLine: { lineStyle: { color: '#fff' } },
                    axisTick: { lineStyle: { color: '#fff' } },
                    splitLine: { lineStyle: { color: 'rgba(150,150,150, 0.2)' } },
                    splitNumber: 8,
                    nameTextStyle: { color: '#fff' }
                },
                series: [{
                    data: tempData,
                    type: 'line',
                    smooth: true,
                    symbolSize: 4,
                    lineStyle: { width: 2 }
                }]
            })
        } else {
            console.warn('温度趋势数据格式错误:', response)
            setTempChartFallback()
        }
    } catch (error) {
        console.error('加载温度趋势数据失败:', error)
        setTempChartFallback()
    }
}

const TEMP_FALLBACK_TIMES = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
const TEMP_FALLBACK_DATA = [32, 35, 38, 42, 45, 43, 40, 36, 33]
const setTempChartFallback = () => {
    if (!tempChart) return
    tempChart.setOption({
        xAxis: {
            type: 'category',
            data: TEMP_FALLBACK_TIMES,
            axisLabel: {
                fontSize: 10,
                color: '#fff'
            },
            axisLine: {
                lineStyle: {
                    color: '#fff'
                }
            },
            axisTick: {
                lineStyle: {
                    color: '#fff'
                }
            }
        },
        series: [{
            data: TEMP_FALLBACK_DATA,
            type: 'line',
            smooth: true,
            symbolSize: 4,
            lineStyle: { width: 2 }
        }]
    })
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
    if (!pointId || !vibChart) return

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

            vibChart.setOption({
                xAxis: {
                    data: timeData,
                    axisLabel: {
                        fontSize: 10,
                        color: '#fff'
                    }
                },
                yAxis: {
                    type: 'value',
                    scale: true,
                    min: yMin,
                    max: yMax,
                    axisLabel: {
                        fontSize: 10,
                        color: '#fff',
                        formatter: (value: number) => String(Math.round(Number(value)))
                    },
                    axisLine: { lineStyle: { color: '#fff' } },
                    axisTick: { lineStyle: { color: '#fff' } },
                    splitLine: { lineStyle: { color: 'rgba(150,150,150, 0.2)' } },
                    splitNumber: 8
                },
                series: [{
                    data: vibData
                }]
            })
        } else {
            console.warn('振动趋势数据格式错误:', response)
        }
    } catch (error) {
        console.error('加载振动趋势数据失败:', error)
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
    if (!soundChart) return

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

            soundChart.setOption({
                xAxis: {
                    data: timeData,
                    axisLabel: {
                        fontSize: 10,
                        color: '#fff'
                    }
                },
                yAxis: {
                    type: 'value',
                    scale: true,
                    axisLabel: {
                        fontSize: 10,
                        color: '#fff',
                        formatter: (value: number) => String(Math.round(Number(value)))
                    },
                    axisLine: { lineStyle: { color: '#fff' } },
                    axisTick: { lineStyle: { color: '#fff' } },
                    splitLine: { lineStyle: { color: 'rgba(150,150,150, 0.2)' } },
                    splitNumber: 8
                },
                series: [{
                    data: soundData
                }]
            }, { replaceMerge: ['yAxis'] })
        } else {
            console.warn('响度趋势数据格式错误或为空:', response)
        }
    } catch (error) {
        console.error('加载响度趋势数据失败:', error)
    }
}

// 初始化温度图表
const initTempChart = () => {
    if (!tempChartRef.value) return

    // 检查容器元素是否具有有效尺寸
    const rect = tempChartRef.value.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        // 如果尺寸为0，推迟初始化
        setTimeout(() => {
            initTempChart();
        }, 100);
        return;
    }

    if (tempChart) {
        tempChart.dispose()
    }

    tempChart = echarts.init(tempChartRef.value)

    // 写死时间用于 x 轴占位，便于排查接口问题
    const FALLBACK_TIME_LABELS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
    const tempData = [32, 35, 38, 42, 45, 43, 40, 36, 33] // 写死对应的温度数据

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(50,50,50,0.8)',
            borderColor: 'rgba(50,50,50,0.8)',
            textStyle: {
                color: '#fff'
            },
            position: function (pos: any, params: any, el: any, elRect: any, size: any) {
                const [mouseX, mouseY] = pos;
                const [contentWidth, contentHeight] = size.contentSize;
                const [viewWidth, viewHeight] = size.viewSize;
                let x = mouseX + 20;
                if (x + contentWidth > viewWidth) {
                    x = mouseX - contentWidth - 20;
                }
                let y = Math.max(0, mouseY - contentHeight / 2);
                return [x, y];
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%', // 与烈度随时间变化保持一致
            top: '10%',
            containLabel: true
        },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
            {
                type: 'slider',
                xAxisIndex: [0],
                bottom: '5%',
                height: '10%',
                fillerColor: 'rgba(255, 206, 86, 0.3)',
                borderColor: 'rgba(255, 206, 86, 0.5)',
                handleStyle: { color: '#FFCE56' },
                filterMode: 'none'
            }
        ],
        // x 轴樣式完全複用「烈度随时间变化」配置
        xAxis: {
            type: 'category',
            data: FALLBACK_TIME_LABELS,
            axisLabel: {
                fontSize: 10,
                color: '#fff'
            },
            axisLine: {
                lineStyle: {
                    color: '#fff'
                    // 不論 y 軸是否有負值，x 軸始終貼底顯示
                }
                , onZero: false
            },
            axisTick: {
                lineStyle: {
                    color: '#fff'
                }
            }
        },
        yAxis: {
            type: 'value',
            name: '℃',
            scale: true,
            min: 'dataMin',
            max: 'dataMax',
            axisLabel: {
                fontSize: 10,
                color: '#fff',
                formatter: (value: number) => String(Math.round(Number(value)))
            },
            axisLine: { lineStyle: { color: '#fff' } },
            axisTick: { lineStyle: { color: '#fff' } },
            splitLine: { lineStyle: { color: 'rgba(150,150,150, 0.2)' } },
            nameTextStyle: { color: '#fff' },
            splitNumber: 8
        },
        series: [{
            data: tempData as number[],
            type: 'line',
            smooth: true,
            symbolSize: 1,
            // 颜色样式与“烈度随时间变化”一致
            itemStyle: {
                color: '#FFCE56'
            },
            lineStyle: {
                color: '#FFCE56',
                width: 2
            },
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{
                        offset: 0, color: 'rgba(255, 206, 86, 0.5)'
                    }, {
                        offset: 1, color: 'rgba(255, 206, 86, 0.1)'
                    }]
                },
                opacity: 0.3
            }
        }],
        backgroundColor: 'transparent'
    }

    tempChart.setOption(option)
}

// 初始化响度图表
const initSoundChart = () => {
    if (!soundChartRef.value) return

    // 检查容器元素是否具有有效尺寸
    const rect = soundChartRef.value.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        // 如果尺寸为0，推迟初始化
        setTimeout(() => {
            initSoundChart();
        }, 100);
        return;
    }

    if (soundChart) {
        soundChart.dispose()
    }

    soundChart = echarts.init(soundChartRef.value)

    const hours = Array.from({ length: 24 }, (_, i) => `${i}`)
    const soundData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 30) + 50) // 50-80 dB

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(50,50,50,0.8)',
            borderColor: 'rgba(50,50,50,0.8)',
            textStyle: {
                color: '#fff'
            },
            position: function (pos: any, params: any, el: any, elRect: any, size: any) {
                const [mouseX, mouseY] = pos;
                const [contentWidth, contentHeight] = size.contentSize;
                const [viewWidth, viewHeight] = size.viewSize;
                let x = mouseX + 20;
                if (x + contentWidth > viewWidth) {
                    x = mouseX - contentWidth - 20;
                }
                let y = Math.max(0, mouseY - contentHeight / 2);
                return [x, y];
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '10%',
            containLabel: true
        },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
            {
                type: 'slider',
                xAxisIndex: [0],
                bottom: '5%',
                height: '10%',
                fillerColor: 'rgba(234, 124, 204, 0.3)',
                borderColor: 'rgba(234, 124, 204, 0.5)',
                handleStyle: { color: '#ea7ccc' },
                filterMode: 'none'
            }
        ],
        xAxis: {
            type: 'category',
            data: hours,
            axisLabel: {
                fontSize: 10,
                color: '#fff'
            },
            axisLine: {
                lineStyle: {
                    color: '#fff'
                    // 不論 y 軸是否有負值，x 軸始終貼底顯示
                }
                , onZero: false
            },
            axisTick: {
                lineStyle: {
                    color: '#fff'
                }
            }
        },
        yAxis: {
            type: 'value',
            name: 'dB',
            scale: true,
            axisLabel: {
                fontSize: 10,
                color: '#fff'
            },
            axisLine: {
                lineStyle: {
                    color: '#fff'
                }
            },
            axisTick: {
                lineStyle: {
                    color: '#fff'
                }
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(150,150,150, 0.2)'
                }
            }
        },
        series: [{
            data: soundData,
            type: 'line',
            smooth: true,
            symbolSize: 1,
            itemStyle: {
                color: '#ea7ccc'
            },
            lineStyle: {
                color: '#ea7ccc',
                width: 2
            },
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{
                        offset: 0, color: 'rgba(234, 124, 204, 0.5)' // purple with opacity
                    }, {
                        offset: 1, color: 'rgba(234, 124, 204, 0.1)' // purple with opacity
                    }]
                },
                opacity: 0.3
            }
        }],
        backgroundColor: 'transparent'
    }

    soundChart.setOption(option)
}

// 初始化振动图表
const initVibChart = () => {
    if (!vibChartRef.value) return

    // 检查容器元素是否具有有效尺寸
    const rect = vibChartRef.value.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        // 如果尺寸为0，推迟初始化
        setTimeout(() => {
            initVibChart();
        }, 100);
        return;
    }

    if (vibChart) {
        vibChart.dispose()
    }

    vibChart = echarts.init(vibChartRef.value)

    const hours = Array.from({ length: 24 }, (_, i) => `${i}`)
    const vibData = Array.from({ length: 24 }, () => (Math.random() * 20).toFixed(1)) // 0-20 mm/s

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(50,50,50,0.8)',
            borderColor: 'rgba(50,50,50,0.8)',
            textStyle: {
                color: '#fff'
            },
            position: function (pos: any, params: any, el: any, elRect: any, size: any) {
                const [mouseX, mouseY] = pos;
                const [contentWidth, contentHeight] = size.contentSize;
                const [viewWidth, viewHeight] = size.viewSize;
                let x = mouseX + 20;
                if (x + contentWidth > viewWidth) {
                    x = mouseX - contentWidth - 20;
                }
                let y = Math.max(0, mouseY - contentHeight / 2);
                return [x, y];
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '10%',
            containLabel: true
        },
        dataZoom: [
            { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
            {
                type: 'slider',
                xAxisIndex: [0],
                bottom: '5%',
                height: '10%',
                fillerColor: 'rgba(255, 206, 86, 0.3)',
                borderColor: 'rgba(255, 206, 86, 0.5)',
                handleStyle: { color: '#FFCE56' },
                filterMode: 'none'
            }
        ],
        xAxis: {
            type: 'category',
            data: hours,
            axisLabel: {
                fontSize: 10,
                color: '#fff'
            },
            axisLine: {
                lineStyle: {
                    color: '#fff'
                }
            },
            axisTick: {
                lineStyle: {
                    color: '#fff'
                }
            }
        },
        yAxis: {
            type: 'value',
            name: 'mm/s',
            axisLabel: {
                fontSize: 10,
                color: '#fff'
            },
            axisLine: {
                lineStyle: {
                    color: '#fff'
                }
            },
            axisTick: {
                lineStyle: {
                    color: '#fff'
                }
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(150,150,150, 0.2)'
                }
            }
        },
        series: [{
            data: vibData,
            type: 'line',
            smooth: true,
            symbolSize: 1,
            itemStyle: {
                color: '#FFCE56'
            },
            lineStyle: {
                color: '#FFCE56',
                width: 2
            },
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{
                        offset: 0, color: 'rgba(255, 206, 86, 0.5)' // color with opacity
                    }, {
                        offset: 1, color: 'rgba(255, 206, 86, 0.1)' // color with opacity
                    }]
                },
                opacity: 0.3
            }
        }],
        backgroundColor: 'transparent'
    }

    vibChart.setOption(option)
}

// 分析趋势
const analyzeTrend = async () => {
    if (!analysisForm.value.pointId) {
        ElMessage.warning('请选择点位')
        return
    }

    if (!analysisForm.value.dateRange || analysisForm.value.dateRange.length !== 2) {
        ElMessage.warning('请选择时间范围')
        return
    }

    try {
        // 构造请求参数
        const startTime = new Date(analysisForm.value.dateRange[0]).getTime()
        const endTime = new Date(analysisForm.value.dateRange[1]).getTime()
        const currentTime = Date.now()

        const params = {
            tenantId: '2b410e834b4b4ae49ab8d52f6d49e967',
            time: currentTime,
            startTime: startTime,
            pointIdList: [293], // 写死测试pointId
            type: 1,
            days: analysisForm.value.days
        }

        const response = await getTrendAnalysis(params)

        if (response.rc === 0 && response.ret && response.ret.length > 0) {
            const result = response.ret[0]
            if (result) {
                analysisResult.value.deviation = result.value.toString()
                analysisResult.value.pointName = result.pointName
                // 存储趋势分析数据用于图表展示
                trendAnalysisData.value = result.list || []
                ElMessage.success('趋势分析完成')
            } else {
                ElMessage.error('趋势分析返回数据格式错误')
            }
        } else {
            ElMessage.error('趋势分析失败: ' + (response.err || '未知错误'))
        }
    } catch (error) {
        console.error('趋势分析请求失败:', error)
        ElMessage.error('趋势分析请求失败')
    }
}

let resizeObserver: ResizeObserver | null = null

// 窗口大小改变时，重新调整图表大小
const resizeCharts = () => {
    // 使用setTimeout确保在下一个事件循环中执行resize，避免在DOM未完全更新时调用
    setTimeout(() => {
        if (tempChart) {
            try {
                tempChart.resize()
                // 在某些情况下，resize后立即重绘图表可确保显示正常
                tempChart.setOption(tempChart.getOption());
            } catch (e) {
                console.warn('Error resizing temp chart:', e)
                // 如果resize失败，尝试重新初始化图表
                nextTick(() => {
                    initTempChart();
                });
            }
        }
        if (soundChart) {
            try {
                soundChart.resize()
                // 在某些情况下，resize后立即重绘图表可确保显示正常
                soundChart.setOption(soundChart.getOption());
            } catch (e) {
                console.warn('Error resizing sound chart:', e)
                // 如果resize失败，尝试重新初始化图表
                nextTick(() => {
                    initSoundChart();
                });
            }
        }
        if (vibChart) {
            try {
                vibChart.resize()
                // 在某些情况下，resize后立即重绘图表可确保显示正常
                vibChart.setOption(vibChart.getOption());
            } catch (e) {
                console.warn('Error resizing vib chart:', e)
                // 如果resize失败，尝试重新初始化图表
                nextTick(() => {
                    initVibChart();
                });
            }
        }
    }, 100)
}

// 存储用于重试的定时器ID
let chartsRetryTimerId: number | null = null;

// 使用ResizeObserver监听容器变化
const setupResizeObserver = () => {
    if (chartGridRef?.value) {
        resizeObserver = new ResizeObserver(resizeCharts);
        resizeObserver.observe(chartGridRef.value);
    } else {
        // 如果ref还未绑定，稍后重试
        if (chartsRetryTimerId) {
            clearTimeout(chartsRetryTimerId);
        }
        chartsRetryTimerId = window.setTimeout(setupResizeObserver, 100);
    }
}

// 创建一个ref来引用charts-grid容器
const chartGridRef = ref<HTMLDivElement>()

// 图表初始化完成标志
const chartsInitialized = ref(false)

// 监听点位列表变化，自动加载第一个点位的温度数据
watch(
    () => props.pointList,
    (newList, oldList) => {
        // 只有当图表已初始化且点位列表有变化时才加载数据
        if (chartsInitialized.value && newList && newList.length > 0 && tempChart) {
            // 如果点位列表从空变为有数据，或者没有选中点位，加载第一个点位的数据
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
        }
    },
    { immediate: false, deep: true }
)

// 监听选中点位变化，加载对应点位的温度数据
watch(
    () => props.selectedPointId,
    (newPointId, oldPointId) => {
        // 只有当图表已初始化且点位ID有变化时才重新加载数据
        if (chartsInitialized.value && newPointId && newPointId !== oldPointId && tempChart) {
            loadTemperatureData(newPointId)
            loadVibrationData(newPointId)
            loadSoundData(newPointId)
        }
    },
    { immediate: false }
)

// 组件挂载时设置resize监听
onMounted(() => {
    // 使用 nextTick 确保 DOM 已渲染
    nextTick(() => {
        // 使用 setTimeout 确保 DOM 完全渲染后再初始化图表
        setTimeout(() => {
            initTempChart();
            initSoundChart();
            initVibChart();

            // 图表联动
            if (tempChart && soundChart && vibChart) {
                connectCharts([tempChart, soundChart, vibChart]);

                // 启用滚轮缩放功能
                enableMouseWheelZoomForCharts([tempChart, soundChart, vibChart]);
            }

            // 设置resize观察器
            setupResizeObserver();

            // 标记图表已初始化完成
            chartsInitialized.value = true;

            // 图表初始化完成后，如果有点位列表，自动加载第一个点位的数据
            const firstPoint = props.pointList?.[0]
            if (firstPoint && tempChart) {
                const pointId = props.selectedPointId || firstPoint.id
                if (pointId) {
                    loadTemperatureData(pointId)
                    loadVibrationData(pointId)
                    loadSoundData(pointId)
                }
            }
        }, 150); // 增加延时时间以确保图表容器完全渲染
    });
})

// 窗口大小变化处理
const handleWindowResize = () => {
    // 使用防抖避免频繁触发
    if (resizeTimer) {
        window.clearTimeout(resizeTimer)
    }

    resizeTimer = window.setTimeout(() => {
        // 重新调整主图表大小
        if (tempChart && typeof tempChart.resize === 'function') {
            tempChart.resize()
        }
        if (soundChart && typeof soundChart.resize === 'function') {
            soundChart.resize()
        }
        if (vibChart && typeof vibChart.resize === 'function') {
            vibChart.resize()
        }

        // 重新调整趋势分析图表大小
        if (dbChart && typeof dbChart.resize === 'function' && chartDialogVisible.value) {
            dbChart.resize()
        }
        if (densityChart && typeof densityChart.resize === 'function' && chartDialogVisible.value) {
            densityChart.resize()
        }
    }, 300) // 300ms防抖
}

// 组件卸载时清理资源
onUnmounted(() => {
    if (tempChart) tempChart.dispose()
    if (soundChart) soundChart.dispose()
    if (vibChart) vibChart.dispose()
    if (dbChart) dbChart.dispose()
    if (densityChart) densityChart.dispose()

    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }

    if (resizeTimer) {
        window.clearTimeout(resizeTimer)
    }

    // 清理重试图表初始化的定时器
    if (chartsRetryTimerId) {
        clearTimeout(chartsRetryTimerId);
        chartsRetryTimerId = null;
    }
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
        gap: 15px;
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

                .chart-unit {
                    font-size: 12px;
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
                    font-size: 14px;
                    //font-weight: bold;
                    color: white;
                }
            }

            .module-content {

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
                                font-size: 12px;
                                color: white !important;
                            }
                        }
                    }
                }

                .analysis-result {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #e4e7ed;

                    .result-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;

                        .result-label {
                            font-size: 12px;
                            color: #fff;
                            font-weight: 500;
                        }

                        .result-value {
                            font-size: 12px;
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
                        text-align: center;
                        font-size: 16px;
                        font-weight: bold;
                        color: #fff;
                        margin-bottom: 15px;
                        padding: 10px;
                        background: rgba(0, 0, 0, 0.2);
                        border-radius: 4px;
                    }

                    .chart-box {
                        width: 100%;
                        height: 350px;
                        min-height: 300px;
                        background: rgba(0, 0, 0, 0.1);
                        border-radius: 4px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                }
            }




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
    background-color: #054b9c !important;

    .el-dialog__body {
        flex: 1;
        overflow: hidden;
        padding: 0 20px 20px;
        display: flex;
        flex-direction: column;
        min-height: 0;
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
    }

    .chart-wrapper .chart-box {
        flex: 1;
        min-height: 0;
        width: 100%;
        background: transparent;
    }

    :deep(.el-dialog__header.show-close) {
        font-weight: 500 !important;
        letter-spacing: 1.22px !important;
        color: rgb(255, 255, 255) !important;
        font-size: clamp(22px, 3vw, 26px) !important;
    }
}
</style>