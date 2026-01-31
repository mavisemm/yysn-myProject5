<template>
  <div class="vibration-point-page">
    <!-- 主要内容区域：分上下结构 -->
    <div class="main-layout">
      <!-- 上半部分 -->
      <div class="top-row">
        <!-- 上左：1/3宽度，展示四个数据 -->
        <div class="card-item stats-card">
          <div class="card-header">
            <div class="card-title">基本指标</div>
          </div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">速度有效值</div>
              <div class="stat-value">3.25 <span class="unit">mm/s</span></div>
            </div>
            <div class="stat-box">
              <div class="stat-label">速度最大值</div>
              <div class="stat-value">5.12 <span class="unit">mm/s</span></div>
            </div>
            <div class="stat-box">
              <div class="stat-label">加速度有效值</div>
              <div class="stat-value">12.4 <span class="unit">m/s²</span></div>
            </div>
            <div class="stat-box">
              <div class="stat-label">加速度最大值</div>
              <div class="stat-value">18.6 <span class="unit">m/s²</span></div>
            </div>
          </div>
        </div>

        <!-- 上右：2/3宽度，频域瀑布图 -->
        <div class="card-item waterfall-card">
          <div class="card-header">
            <div class="card-title">频域瀑布图</div>
            <el-button type="primary" size="small">筛选数据</el-button>
          </div>
          <div ref="waterfallChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 下半部分 -->
      <div class="bottom-row">
        <!-- 下左：1/2宽度，振动频域图 -->
        <div class="card-item freq-card">
          <div class="card-header">
            <div class="card-title">振动频域图</div>
          </div>
          <div ref="freqChartRef" class="chart-container"></div>
        </div>

        <!-- 下右：1/2宽度，振动时域图 -->
        <div class="card-item time-card">
          <div class="card-header">
            <div class="card-title">振动时域图</div>
          </div>
          <div ref="timeChartRef" class="chart-container"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { watch, ref, onMounted, onUnmounted, shallowRef } from 'vue'
import * as echarts from 'echarts'
import { ElButton } from 'element-plus'
import { useChartResize } from '@/composables/useChart'
import { enableMouseWheelZoomForCharts, connectCharts } from '@/utils/chart'

const route = useRoute()
const router = useRouter()

// 图表引用
const waterfallChartRef = ref<HTMLElement>()
const freqChartRef = ref<HTMLElement>()
const timeChartRef = ref<HTMLElement>()

const waterfallChartInstance = shallowRef<echarts.ECharts | null>(null)
const freqChartInstance = shallowRef<echarts.ECharts | null>(null)
const timeChartInstance = shallowRef<echarts.ECharts | null>(null)

// 瀑布图时间标签数据
const waterfallTimeLabels = [
  '2026-11-14 13:59:57 (29 ℃)',
  '2026-11-14 14:59:57 (28 ℃)',
  '2026-11-14 15:59:58 (27 ℃)',
  '2026-11-14 16:59:58 (25 ℃)',
  '2026-11-14 17:59:58'
]

// 瀑布图颜色（从红色渐变到蓝色）
const waterfallColors = [
  '#c23531',  // 红色（最近）
  '#61a0a8',  // 青色
  '#6e7074',  // 灰色
  '#546fc6',  // 蓝紫
  '#3a5ba0'   // 深蓝（最早）
]

// 初始化图表
const initCharts = () => {
  // 频域瀑布图 - 3D效果多线瀑布图
  if (waterfallChartRef.value) {
    waterfallChartInstance.value = echarts.init(waterfallChartRef.value)

    // 生成瀑布图的多条线数据
    const waterfallSeries = generateWaterfallSeries()

    waterfallChartInstance.value.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: 'rgba(50, 50, 50, 0.9)',
        textStyle: { color: '#fff' }
      },
      grid: {
        top: 30,
        left: 30,
        right: 30,
        bottom: 30
      },
      xAxis: {
        type: 'value',
        name: 'Hz',
        min: 300,
        max: 600,
        nameTextStyle: { color: '#fff' },
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      yAxis: {
        type: 'value',
        name: 'm/s2',
        min: 0,
        max: 3.2,
        nameTextStyle: { color: '#fff' },
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      series: waterfallSeries
    })
  }

  // 振动频域图 - 柱状图风格
  if (freqChartRef.value) {
    freqChartInstance.value = echarts.init(freqChartRef.value)
    freqChartInstance.value.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: 'rgba(50, 50, 50, 0.9)',
        textStyle: { color: '#fff' },
        axisPointer: { type: 'shadow' }
      },
      grid: { top: 30, left: 40, right: 30, bottom: 50 },
      xAxis: {
        type: 'value',
        name: 'Hz',
        min: 0,
        max: 2000,
        nameTextStyle: { color: '#fff' },
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: 'm/s²',
        min: 0,
        nameTextStyle: { color: '#fff' },
        axisLabel: { color: '#fff', formatter: '{value}' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
        {
          type: 'slider',
          xAxisIndex: [0],
          bottom: 10,
          height: 20,
          fillerColor: 'rgba(126, 203, 161, 0.3)',
          borderColor: 'rgba(126, 203, 161, 0.5)',
          handleStyle: { color: '#7ecba1' },
          filterMode: 'none'
        }
      ],
      series: [{
        type: 'bar',
        barWidth: 2,
        data: generateFreqData(),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#7ecba1' },
            { offset: 0.5, color: '#5fb98b' },
            { offset: 1, color: '#d4a853' }
          ])
        }
      }]
    })
  }

  // 振动时域图 - 密集波形面积图
  if (timeChartRef.value) {
    timeChartInstance.value = echarts.init(timeChartRef.value)
    timeChartInstance.value.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: 'rgba(50, 50, 50, 0.9)',
        textStyle: { color: '#fff' }
      },
      grid: { top: 30, left: 40, right: 40, bottom: 50 },
      xAxis: {
        type: 'value',
        name: 's',
        min: 0,
        max: 5,
        nameTextStyle: { color: '#fff' },
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: 'm/s²',
        nameTextStyle: { color: '#fff' },
        axisLabel: { color: '#fff' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
        {
          type: 'slider',
          xAxisIndex: [0],
          bottom: 10,
          height: 20,
          fillerColor: 'rgba(126, 203, 161, 0.3)',
          borderColor: 'rgba(126, 203, 161, 0.5)',
          handleStyle: { color: '#7ecba1' },
          filterMode: 'none'
        }
      ],
      series: [{
        type: 'line',
        smooth: false,
        showSymbol: false,
        sampling: 'lttb',
        data: generateTimeData(),
        lineStyle: { color: '#7ecba1', width: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(126, 203, 161, 0.8)' },
            { offset: 1, color: 'rgba(126, 203, 161, 0.2)' }
          ])
        }
      }]
    })

    // 图表联动
    connectCharts([freqChartInstance.value, timeChartInstance.value]);

    // 启用滚轮缩放功能
    enableMouseWheelZoomForCharts([freqChartInstance.value, timeChartInstance.value]);
  }
}

// 生成瀑布图的多条线series（模拟3D效果）
const generateWaterfallSeries = () => {
  const series: any[] = []
  const lineCount = 5

  for (let i = 0; i < lineCount; i++) {
    // 每条线的Y轴偏移量（模拟Z轴深度）
    const yOffset = i * 0.5
    const lineData = generateSingleWaterfallLine(yOffset)

    series.push({
      type: 'line',
      smooth: false,
      showSymbol: false,
      data: lineData,
      lineStyle: {
        color: waterfallColors[i],
        width: 1
      },
      z: lineCount - i, // 控制层叠顺序
      // 添加右侧时间标签
      markPoint: {
        symbol: 'none',
        label: {
          show: true,
          position: 'right',
          formatter: waterfallTimeLabels[i],
          color: waterfallColors[i],
          fontSize: 10
        },
        data: [{
          coord: [600, yOffset + 0.3],
          value: waterfallTimeLabels[i]
        }]
      }
    })
  }

  return series
}

// 生成单条瀑布线数据
const generateSingleWaterfallLine = (yOffset: number) => {
  const data = []
  for (let x = 300; x <= 600; x += 2) {
    // 模拟频域振动数据
    const baseValue = Math.random() * 0.3
    const spike = Math.random() > 0.95 ? Math.random() * 1.5 : 0
    const y = yOffset + baseValue + spike
    data.push([x, y])
  }
  return data
}

// 生成频域图数据（柱状图）
const generateFreqData = () => {
  const data = []
  for (let x = 0; x <= 2000; x += 10) {
    let y = 0
    if (x < 200) {
      // 低频区域有较高的幅值
      y = Math.random() * 0.15 + 0.03
      if (x < 50) y += 0.05
    } else {
      // 高频区域幅值很低
      y = Math.random() * 0.01 + 0.000002
    }
    data.push([x, y])
  }
  return data
}

// 生成时域图数据（密集振动波形）
const generateTimeData = () => {
  const data = []
  const sampleRate = 1000 // 每秒1000个采样点
  const duration = 5 // 5秒
  const totalPoints = sampleRate * duration

  for (let i = 0; i < totalPoints; i++) {
    const t = i / sampleRate
    // 模拟真实振动信号：基础值 + 随机噪声
    const baseValue = 9.5
    const noise = (Math.random() - 0.5) * 1.5
    const y = baseValue + noise
    data.push([t, y])
  }
  return data
}

const { bindResize: bindWaterfall } = useChartResize(waterfallChartInstance, waterfallChartRef)
const { bindResize: bindFreq } = useChartResize(freqChartInstance, freqChartRef)
const { bindResize: bindTime } = useChartResize(timeChartInstance, timeChartRef)

onMounted(() => {
  initCharts()
  bindWaterfall()
  bindFreq()
  bindTime()
})

onUnmounted(() => {
  waterfallChartInstance.value?.dispose()
  freqChartInstance.value?.dispose()
  timeChartInstance.value?.dispose()
})

watch(
  () => route.fullPath,
  () => {
    setTimeout(() => {
      initCharts()
      bindWaterfall()
      bindFreq()
      bindTime()
    }, 0)
  }
)

const goBack = () => {
  router.back()
}
</script>

<style lang="scss" scoped>
.vibration-point-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .main-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 15px;
    box-sizing: border-box;
  }

  .top-row {
    display: flex;
    height: 60%;
    gap: 15px;
    min-height: 0;
  }

  .bottom-row {
    display: flex;
    height: 40%;
    gap: 15px;
    min-height: 0;
  }

  .card-item {
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 20px 0 20px;

      .card-title {
        font-size: clamp(16px, 1.5vw, 20px);
        font-weight: bold;
        color: #fff;
      }
    }

    .chart-container {
      flex: 1;
      width: 100%;
      min-height: 0;
      padding: 20px;
    }
  }

  .stats-card {
    width: 33.33%;
    background: url('@/assets/images/background/首页-数据统计背景.png') no-repeat center center;
    background-size: 100% 100%;

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 15px;
      flex: 1;
      padding: 20px;

      .stat-box {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;

        .stat-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 5px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: #00f2fe;

          .unit {
            font-size: 12px;
            font-weight: normal;
            color: rgba(255, 255, 255, 0.5);
            margin-left: 4px;
          }
        }
      }
    }
  }

  .waterfall-card {
    width: 66.66%;
    background: url('@/assets/images/background/首页-预警总览背景.png') no-repeat center center;
    background-size: 100% 100%;
  }

  .freq-card,
  .time-card {
    width: 50%;
    background: url('@/assets/images/background/设备详情页-点位列表背景.png') no-repeat center center;
    background-size: 100% 100%;
  }
}
</style>