<template>
    <div class="charts-analysis-module">
        <div ref="chartGridRef" class="charts-grid">
            <!-- 烈度图表 -->
            <div class="chart-item">
                <div class="chart-header">
                    <span class="chart-title">烈度随时间变化</span>
                    <span class="chart-unit">（单位：mm/s）</span>
                </div>
                <div ref="vibChartRef" class="chart"></div>
            </div>

            <!-- 温度图表 -->
            <div class="chart-item">
                <div class="chart-header">
                    <span class="chart-title">温度随时间变化</span>
                    <span class="chart-unit">（单位：℃）</span>
                </div>
                <div ref="tempChartRef" class="chart"></div>
            </div>

            <!-- 响度图表 -->
            <div class="chart-item">
                <div class="chart-header">
                    <span class="chart-title">响度随时间变化</span>
                    <span class="chart-unit">（单位：dB）</span>
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
                                <el-date-picker v-model="analysisForm.dateRange" type="datetimerange"
                                    range-separator="-" start-placeholder="开始日期" end-placeholder="结束日期"
                                    format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" size="small"
                                    style="width: 100%;" popper-class="custom-datepicker-popper"
                                    :default-time="defaultTime" :disabled-date="disabledDate"
                                    @calendar-change="handleCalendarChange" />
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
                            <span class="result-value">{{ analysisResult.pointName }}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, watch, computed } from 'vue'
import { ElForm, ElFormItem, ElSelect, ElOption, ElInputNumber, ElDatePicker, ElButton, ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

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
export type DateRange = [Date, Date] | null

// 定义属性
const props = defineProps<{
    pointList: PointInfo[]
}>()

// 图表相关
const tempChartRef = ref<HTMLDivElement>()
const soundChartRef = ref<HTMLDivElement>()
const vibChartRef = ref<HTMLDivElement>()

let tempChart: echarts.ECharts | null = null
let soundChart: echarts.ECharts | null = null
let vibChart: echarts.ECharts | null = null

// 趋势分析相关
const disabledDate = (time: Date) => {
    return time.getTime() > Date.now();
};



const defaultTime = computed<[Date, Date]>(() => {
    const now = new Date();
    return [new Date(2000, 1, 1, 0, 0, 0), now];
});

const handleCalendarChange = (val: DateRange) => {
    if (val) {
        const [start, end] = val;
        if (end) {
            const now = new Date();
            const endDay = new Date(end);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 如果结束日期是今天，则结束时间设置为当前时间
            endDay.setHours(0, 0, 0, 0);
            if (endDay.getTime() === today.getTime()) {
                analysisForm.value.dateRange = [start, now];
            }
        }
    }
};

const analysisForm = ref({
    pointId: '',
    days: 1,
    dateRange: null as DateRange
})

const analysisResult = ref<AnalysisResult>({
    deviation: '0.25',
    pointName: '进风口位置'
})

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
})

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

    const hours = Array.from({ length: 24 }, (_, i) => `${i}`)
    const tempData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 50) + 30) // 30-80℃

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
            bottom: '3%',
            top: '10%',
            containLabel: true
        },
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
            name: '℃',
            axisLabel: {
                fontSize: 10,
                color: '#fff'
            },
            axisLine: {
                lineStyle: {
                    color: '#fff'
                }
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(255, 255, 255, 0.2)'
                }
            }
        },
        series: [{
            data: tempData,
            type: 'line',
            smooth: true,
            symbolSize: 1,
            itemStyle: {
                color: '#FF6384'
            },
            lineStyle: {
                color: '#FF6384',
                width: 2
            },
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{
                        offset: 0, color: 'rgba(255, 99, 132, 0.5)' // color with opacity
                    }, {
                        offset: 1, color: 'rgba(255, 99, 132, 0.1)' // color with opacity
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
            bottom: '3%',
            top: '10%',
            containLabel: true
        },
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
            name: 'dB',
            axisLabel: {
                fontSize: 10,
                color: '#fff'
            },
            axisLine: {
                lineStyle: {
                    color: '#fff'
                }
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(255, 255, 255, 0.2)'
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
            bottom: '3%',
            top: '10%',
            containLabel: true
        },
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
            splitLine: {
                lineStyle: {
                    color: 'rgba(255, 255, 255, 0.2)'
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
const analyzeTrend = () => {
    // 模拟分析结果
    analysisResult.value.deviation = (Math.random() * 0.5).toFixed(2)
    const selectedPoint = props.pointList.find(p => p.id === analysisForm.value.pointId)
    analysisResult.value.pointName = selectedPoint ? String(selectedPoint.name) : '未知点位'

    ElMessage.success('趋势分析完成')
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

// 组件挂载时设置resize监听
onMounted(() => {
    // 使用 nextTick 确保 DOM 已渲染
    nextTick(() => {
        // 使用 setTimeout 确保 DOM 完全渲染后再初始化图表
        setTimeout(() => {
            initTempChart();
            initSoundChart();
            initVibChart();

            // 设置resize观察器
            setupResizeObserver();
        }, 150); // 增加延时时间以确保图表容器完全渲染
    });
})

// 组件卸载时清理资源
onUnmounted(() => {
    if (tempChart) tempChart.dispose()
    if (soundChart) soundChart.dispose()
    if (vibChart) vibChart.dispose()

    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
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

            .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                flex: 0 0 auto;
                /* 固定头部高度 */

                .chart-title {
                    font-size: 14px;
                    font-weight: bold;
                    color: white;
                }

                .chart-unit {
                    font-size: 12px;
                    color: #fff;
                }
            }

            .chart {
                flex: 1;
                min-height: 0;
                /* 确保图表区域可以收缩 */
            }
        }

        .analysis-item {
            background: url('@/assets/images/background/设备详情页-echarts背景.png') no-repeat center center;
            background-size: 100% 100%;
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            /* 统一overflow处理 */
            min-height: 0;
            /* 确保flex子项可以收缩 */

            .module-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                flex: 0 0 auto;

                .module-title {
                    font-size: 14px;
                    font-weight: bold;
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
                            font-weight: 600;
                        }

                        .result-value {
                            font-size: 12px;
                            color: white;
                            font-weight: 500;
                        }
                    }
                }
            }




        }
    }
}

/* === 精细化调整 Element Plus 日期范围选择器 === */
.el-picker-panel.el-date-range-picker {
    width: 440px !important;
    font-size: 12px !important;

    .el-input__wrapper {
        width: 90px !important;
    }

    .el-date-range-picker__time-header {
        width: 400px !important;
    }

    /* --- 1. 压缩顶部“开始/结束 时间输入区域” --- */
    .el-date-range-picker__time-header {
        display: flex;
        justify-content: space-between;
        padding: 8px 10px !important;
        gap: 6px;
        /* 控制左右两组之间的间隙 */

        /* 每组：日期 + 时间 */
        >.el-scrollbar {
            width: calc(50% - 3px) !important;
            /* 两等分，减去 gap 的一半 */
        }

        /* 日期输入框 */
        .el-date-editor {
            width: 100% !important;

            :deep(.el-input__wrapper) {
                height: 26px !important;
                padding: 0 6px !important;
                background: rgba(255, 255, 255, 0.1) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                box-shadow: none !important;
                border-radius: 3px !important;
            }

            :deep(.el-input__inner) {
                height: 26px !important;
                line-height: 26px !important;
                font-size: 11px !important;
                padding: 0 4px !important;
                color: white !important;
                background: transparent !important;
            }
        }
    }

    /* --- 2. 缩小日历顶部“2026年1月”标题 --- */
    .el-date-range-picker__header {
        font-size: 12px !important;
        /* 原为 14px+ */
        font-weight: normal !important;
        padding: 4px 0 !important;
        line-height: 1.2 !important;
        // 防止文字过长换行或溢出
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
    }

    /* 左右切换箭头也缩小 */
    .el-picker-panel__icon-btn {
        width: 14px !important;
        height: 14px !important;
        line-height: 14px !important;
        font-size: 11px !important;
    }

    /* --- 3. 日历内容区继续紧凑 --- */
    .el-date-range-picker__content {
        width: 180px !important;
        /* 每个日历 180px */
        padding: 6px !important;

        .el-date-table {
            font-size: 10.5px !important;

            th,
            td {
                padding: 2px 0 !important;
                height: 22px !important;
                line-height: 22px !important;
            }
        }
    }

    /* --- 4. 时间选择器（如果展开）--- */
    .el-time-panel {
        padding: 6px !important;

        .el-time-spinner__wrapper {
            padding: 0 3px !important;
        }

        .el-time-spinner__input {
            :deep(.el-input__inner) {
                height: 22px !important;
                line-height: 22px !important;
                font-size: 11px !important;
                padding: 0 3px !important;
            }
        }
    }

    /* --- 5. Footer 按钮 --- */
    .el-picker-panel__footer {
        padding: 6px 10px !important;

        .el-button--text {
            font-size: 11px !important;
            padding: 2px 6px !important;
        }
    }
}
</style>