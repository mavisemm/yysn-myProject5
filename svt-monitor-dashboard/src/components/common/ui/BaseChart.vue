<template>
    <div ref="chartRef" :style="{ width: width, height: height }" class="base-chart"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { CanvasRenderer } from 'echarts/renderers'
import {
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
    RadarChart,
    GaugeChart
} from 'echarts/charts'
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent,
    ToolboxComponent
} from 'echarts/components'

echarts.use([
    CanvasRenderer,
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
    RadarChart,
    GaugeChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent,
    ToolboxComponent
])

interface Props {
    option: EChartsOption
    theme?: string
    loading?: boolean
    width?: string
    height?: string
    autoResize?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    width: '100%',
    height: '400px',
    autoResize: true,
    loading: false
})

const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

// 初始化图表
const initChart = () => {
    if (!chartRef.value) return

    if (chartInstance) {
        chartInstance.dispose()
    }

    chartInstance = echarts.init(chartRef.value, props.theme)
    chartInstance.setOption(props.option)

    if (props.loading) {
        chartInstance.showLoading()
    } else {
        chartInstance.hideLoading()
    }
}

const handleResize = () => {
    if (chartInstance) {
        chartInstance.resize()
    }
}

// 监听容器大小变化
const observeResize = () => {
    if (!chartRef.value || !props.autoResize) return

    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(chartRef.value)
}

// 清理资源
const cleanup = () => {
    if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
    }

    if (chartInstance) {
        chartInstance.dispose()
        chartInstance = null
    }
}

onMounted(() => {
    initChart()
    observeResize()
})

onUnmounted(() => {
    cleanup()
})

// 监听属性变化
watch(() => props.option, () => {
    nextTick(() => {
        if (chartInstance) {
            chartInstance.setOption(props.option, { notMerge: false })
            if (props.loading) {
                chartInstance.showLoading()
            } else {
                chartInstance.hideLoading()
            }
        }
    })
}, { deep: true })

watch(() => props.loading, (loading) => {
    if (chartInstance) {
        if (loading) {
            chartInstance.showLoading()
        } else {
            chartInstance.hideLoading()
        }
    }
})

defineExpose({
    getInstance: () => chartInstance,
    resize: handleResize
})
</script>

<style scoped>
.base-chart {
    width: 100%;
    height: 400px;
}
</style>