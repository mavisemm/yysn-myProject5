<template>
  <div class="charts-section">
    <div class="charts-row">
      <div class="chart-item">
        <div class="chart-title-row">
          <div class="chart-title app-section-title">能量曲线</div>
          <el-button class="energy-fullscreen-btn" text size="large" :disabled="!hasAnyChartData"
            @click="energyFullscreenVisible = true">
            全屏显示
            <el-icon>
              <FullScreen />
            </el-icon>
          </el-button>
        </div>
        <div class="chart-container">
          <CommonEcharts ref="energyChartRef" :option="energyOption" linkage-group="sound-point-charts"
            :enable-linkage-zoom="true" :enable-wheel-zoom="true" :tooltip-follow-mouse="true" :not-merge="true"
            :enable-data-zoom="false" :auto-y-axis-on-zoom="true" @chart-ready="onEnergyChartReady" />
        </div>
      </div>
      <div class="chart-item">
        <div class="chart-title-row">
          <div class="chart-title app-section-title">密度曲线</div>
        </div>
        <div class="chart-container">
          <CommonEcharts ref="densityChartRef" :option="densityOption" linkage-group="sound-point-charts"
            :enable-linkage-zoom="true" :enable-wheel-zoom="true" :tooltip-follow-mouse="true" :not-merge="true"
            :enable-data-zoom="false" :auto-y-axis-on-zoom="true" @chart-ready="onDensityChartReady" />
        </div>
      </div>
    </div>

    <div v-if="true" class="range-controls-bar" @mousedown.stop @wheel.stop>
      <span class="controls-label">频率筛选：</span>
      <el-input-number v-model="rangeMin" class="range-input" size="small" :min="safeRangeDataMin"
        :max="safeRangeDataMax" :step="0.1" :precision="1" controls-position="right" :disabled="rangeControlsDisabled"
        @change="applyRangeIfEnabled" />
      <span class="controls-sep">~</span>
      <el-input-number v-model="rangeMax" class="range-input" size="small" :min="safeRangeDataMin"
        :max="safeRangeDataMax" :step="0.1" :precision="1" controls-position="right" :disabled="rangeControlsDisabled"
        @change="applyRangeIfEnabled" />
      <span class="controls-unit">Hz</span>
      <el-button size="small" class="reset-btn" :disabled="rangeControlsDisabled"
        @click="resetRangeIfEnabled">重置</el-button>
      <el-button type="primary" size="small" class="trend-analysis-btn" @mousedown.stop @wheel.stop
        @click="handleTrendAnalysisClick">
        点位数据趋势分析
      </el-button>
    </div>
  </div>

  <el-dialog v-model="energyFullscreenVisible" title="能量 / 密度曲线" fullscreen destroy-on-close append-to-body align-center
    class="sound-energy-fullscreen-dialog" modal-class="sound-energy-fullscreen-modal" @opened="onEnergyFsOpened"
    @closed="onEnergyFsClosed">
    <div class="energy-fs-dialog-inner">
      <div class="energy-fs-controls-top" @mousedown.stop @wheel.stop>
        <span class="controls-label">频率筛选：</span>
        <el-input-number v-model="fullscreenRangeMin" class="range-input" size="small" :min="safeFullscreenRangeDataMin"
          :max="safeFullscreenRangeDataMax" :step="0.1" :precision="1" controls-position="right"
          :disabled="fullscreenRangeControlsDisabled" @change="applyFullscreenRangeIfEnabled" />
        <span class="controls-sep">~</span>
        <el-input-number v-model="fullscreenRangeMax" class="range-input" size="small" :min="safeFullscreenRangeDataMin"
          :max="safeFullscreenRangeDataMax" :step="0.1" :precision="1" controls-position="right"
          :disabled="fullscreenRangeControlsDisabled" @change="applyFullscreenRangeIfEnabled" />
        <span class="controls-unit">Hz</span>
        <el-button size="small" class="reset-btn" :disabled="fullscreenRangeControlsDisabled"
          @click="resetFullscreenRangeIfEnabled">重置</el-button>
      </div>
      <div class="energy-fs-charts-stack">
        <div class="energy-fs-chart-pane">
          <div class="energy-fs-chart-title app-section-title">能量曲线</div>
          <div ref="energyFullscreenChartEl" class="energy-fs-chart-host" />
        </div>
        <div class="energy-fs-chart-pane">
          <div class="energy-fs-chart-title app-section-title">密度曲线</div>
          <div ref="densityFullscreenChartEl" class="energy-fs-chart-host" />
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick, shallowRef } from 'vue'
import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts'
import { FullScreen } from '@element-plus/icons-vue'
import { CommonEcharts } from '@/components/common/chart'
import { useRangeControls } from '@/composables/useRangeControls'
import { getTenantId } from '@/api/tenant'
import { observeResize, enableMouseWheelZoom } from '@/utils/chart'

const emit = defineEmits(['chart-init'])
const props = defineProps<{
  deviationList: any[]
  pointList: any[]
  selectedPointId?: string
}>()

const handleTrendAnalysisClick = () => {
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const tenantId = getTenantId()

  const params = new URLSearchParams()
  if (tenantId) params.set('tenantId', tenantId)
  params.set('ip', '122.224.196.178')
  const url = `${normalizedBase}trend/trend.html?${params.toString()}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

const selectedPointId = computed(() => props.selectedPointId || (props.pointList?.[0]?.id ?? ''))
const pointList = computed(() => props.pointList || [])

const energyChartRef = ref<InstanceType<typeof CommonEcharts>>()
const densityChartRef = ref<InstanceType<typeof CommonEcharts>>()

const energyFullscreenVisible = ref(false)
const energyFullscreenChartEl = ref<HTMLDivElement | null>(null)
const densityFullscreenChartEl = ref<HTMLDivElement | null>(null)
const energyFullscreenChartInstance = shallowRef<echarts.ECharts | null>(null)
const densityFullscreenChartInstance = shallowRef<echarts.ECharts | null>(null)
let fsChartDisposers: Array<() => void> | null = null
const fsLinkGroup = 'sound-point-energy-density-fs-link-group'

const chartAxisColor = computed(() => '#fff')
const chartSplitLineColor = computed(() => 'rgba(150,150,150, 0.2)')

// y 轴刻度最多保留小数点后两位（并去掉无意义的尾随 0）
const formatYAxisTick = (v: unknown) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(2)))
}

const selectedItemsWithColor = computed(() => {
  const selected = props.deviationList.filter((item) => item.visible)
  return selected.map((item, index) => ({
    ...item,

    color: item?.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
  }))
})

const hasEnergyData = computed(() => {
  return selectedItemsWithColor.value.some(
    (item: any) => Array.isArray(item?.dbArr) && item.dbArr.length > 0,
  )
})
const hasDensityData = computed(() => {
  return selectedItemsWithColor.value.some(
    (item: any) => Array.isArray(item?.densityArr) && item.densityArr.length > 0,
  )
})
const hasAnyChartData = computed(() => hasEnergyData.value || hasDensityData.value)
const rangeControlsDisabled = computed(() => !hasAnyChartData.value)

const freqsRaw = computed<any[]>(() => selectedItemsWithColor.value[0]?.freqs || [])
const commonOptionBase = computed(() => {
  const c = chartAxisColor.value
  const s = chartSplitLineColor.value
  const freqs = freqsRaw.value || []
  return {
    textStyle: { color: c },
    tooltip: {
      trigger: 'axis' as const,
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50,50,50,0.8)',
      borderColor: 'rgba(50,50,50,0.8)',
      textStyle: { color: '#fff' },
      axisPointer: {
        // 仅保留竖线指示，不显示十字光标
        type: 'line' as const,
        axis: 'x' as const,
        label: { show: false },
      },
      position: function (pos: any, _params: any, _el: any, _elRect: any, size: any) {
        const [mouseX, mouseY] = pos
        const [contentWidth, contentHeight] = size.contentSize
        const [viewWidth] = size.viewSize
        let x = mouseX + 20
        if (x + contentWidth > viewWidth) {
          x = mouseX - contentWidth - 20
        }
        const y = Math.max(0, mouseY - contentHeight / 2)
        return [x, y]
      },
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' as const }],
      label: {
        backgroundColor: 'rgba(50,50,50,0.8)',
        color: c,
      },
    },
    grid: { left: 30, right: 30, top: 40, bottom: 35, containLabel: true },
    legend: { show: false },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
      {
        type: 'slider',
        xAxisIndex: [0],
        bottom: 10,
        height: 20,
        textStyle: { color: c },
        handleStyle: { color: c },
        filterMode: 'none',
      },
    ],
    xAxis: {
      type: 'category' as const,
      data: freqs,
      boundaryGap: false,
      axisLine: { lineStyle: { color: c } },
      axisLabel: {
        color: c,
        fontSize: 12,
        margin: 8,
        showMaxLabel: true,
        hideOverlap: true,
      },
      axisTick: { alignWithLabel: true },
    },
  }
})

const emptyGraphic = computed(() => {
  const c = chartAxisColor.value
  return [
    {
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: '暂无数据',
        fill: c,
        fontSize: 14,
        fontWeight: 500,
        opacity: 0.75,
      },
    },
  ]
})

const energyOption = computed<EChartsOption>(() => {
  const c = chartAxisColor.value
  const s = chartSplitLineColor.value
  const series = selectedItemsWithColor.value
    .filter((item: any) => Array.isArray(item?.dbArr) && item.dbArr.length > 0)
    .map((item: any) => ({
      name: item.time,
      type: 'line',
      data: item.dbArr,
      itemStyle: { color: item.color },
      smooth: true,
      symbolSize: 1,
    }))
  return {
    ...commonOptionBase.value,
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: c } },
      axisLabel: { color: c, formatter: formatYAxisTick },
      nameTextStyle: { color: c },
      splitLine: { lineStyle: { color: s } },
    },
    series,
    ...(series.length === 0 ? { graphic: emptyGraphic.value } : { graphic: [] }),
  } as EChartsOption
})

const densityOption = computed<EChartsOption>(() => {
  const c = chartAxisColor.value
  const s = chartSplitLineColor.value
  const series = selectedItemsWithColor.value
    .filter((item: any) => Array.isArray(item?.densityArr) && item.densityArr.length > 0)
    .map((item: any) => ({
      name: item.time,
      type: 'line',
      data: item.densityArr,
      itemStyle: { color: item.color },
      smooth: true,
      symbolSize: 1,
    }))
  return {
    ...commonOptionBase.value,
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: c } },
      axisLabel: { color: c, formatter: formatYAxisTick },
      nameTextStyle: { color: c },
      splitLine: { lineStyle: { color: s } },
    },
    series,
    ...(series.length === 0 ? { graphic: emptyGraphic.value } : { graphic: [] }),
  } as EChartsOption
})

let chartInitEmitted = false
let energyDataZoomCleanup: (() => void) | null = null
const onEnergyChartReady = () => {
  tryEmitChartInit()
}
const onDensityChartReady = () => {
  tryEmitChartInit()
}
const tryEmitChartInit = () => {
  if (chartInitEmitted) return
  const energy = energyChartRef.value?.chartInstance
  const density = densityChartRef.value?.chartInstance
  if (energy && density) {
    chartInitEmitted = true
    emit('chart-init', { energyChartInstance: energy, densityChartInstance: density })

    if (!energyDataZoomCleanup) {
      const handler = (params: any) => {
        handleDataZoom(params)
      }
        ; (energy as any).on('datazoom', handler)
      energyDataZoomCleanup = () => {
        ; (energy as any).off('datazoom', handler)
      }
    }
  }
}

const updateCharts = () => { }

defineExpose({ updateCharts })

const {
  showResolvedRangeControls,
  rangeMin,
  rangeMax,
  rangeDataMin,
  rangeDataMax,
  applyRange,
  resetRange,
  handleDataZoom,
  dispose: disposeRangeControls,
} = useRangeControls({
  option: energyOption,
  showRangeControls: computed(() => true),
  rangeControlsData: computed(() => freqsRaw.value || []),
  rangeControlsXAxisIndex: computed(() => 0),
  rangeControlsMin: computed(() => undefined),
  rangeControlsMax: computed(() => undefined),
  rangeControlsStep: computed(() => 0.1),
  rangeControlsPrecision: computed(() => 1),
  rangeControlsDebounceMs: computed(() => 600),
  preserveDataZoom: computed(() => true),
  doDataZoom: ({ startValue, endValue }) => {
    const energyInstance = energyChartRef.value?.chartInstance
    const densityInstance = densityChartRef.value?.chartInstance
    const payload: any = { type: 'dataZoom', startValue, endValue }
    const safeDispatch = (instance: any) => {
      if (!instance) return
      try {
        if (typeof instance.isDisposed === 'function' && instance.isDisposed()) return
        instance.dispatchAction(payload)
      } catch (e) {
        console.warn('[SoundPointCharts] dataZoom dispatch failed:', e)
      }
    }
    safeDispatch(energyInstance)
    safeDispatch(densityInstance)
  },
})

const {
  rangeMin: fullscreenRangeMin,
  rangeMax: fullscreenRangeMax,
  rangeDataMin: fullscreenRangeDataMin,
  rangeDataMax: fullscreenRangeDataMax,
  applyRange: applyFullscreenRange,
  resetRange: resetFullscreenRange,
  handleDataZoom: handleFullscreenDataZoom,
  dispose: disposeFullscreenRangeControls,
} = useRangeControls({
  option: energyOption,
  showRangeControls: computed(() => true),
  rangeControlsData: computed(() => freqsRaw.value || []),
  rangeControlsXAxisIndex: computed(() => 0),
  rangeControlsMin: computed(() => undefined),
  rangeControlsMax: computed(() => undefined),
  rangeControlsStep: computed(() => 0.1),
  rangeControlsPrecision: computed(() => 1),
  rangeControlsDebounceMs: computed(() => 600),
  preserveDataZoom: computed(() => true),
  doDataZoom: ({ startValue, endValue }) => {
    const fsEnergy = energyFullscreenChartInstance.value
    const fsDensity = densityFullscreenChartInstance.value
    const payload: any = { type: 'dataZoom', startValue, endValue }
    const safeDispatch = (instance: any) => {
      if (!instance) return
      try {
        if (typeof instance.isDisposed === 'function' && instance.isDisposed()) return
        instance.dispatchAction(payload)
      } catch (e) {
        console.warn('[SoundPointCharts] fullscreen dataZoom dispatch failed:', e)
      }
    }
    safeDispatch(fsEnergy)
    safeDispatch(fsDensity)
  },
})

const safeRangeDataMin = computed(() => {
  const v = Number(rangeDataMin.value)
  return Number.isFinite(v) ? v : 0
})
const safeRangeDataMax = computed(() => {
  const v = Number(rangeDataMax.value)
  if (Number.isFinite(v) && v >= safeRangeDataMin.value) return v
  return safeRangeDataMin.value
})
const safeFullscreenRangeDataMin = computed(() => {
  const v = Number(fullscreenRangeDataMin.value)
  return Number.isFinite(v) ? v : 0
})
const safeFullscreenRangeDataMax = computed(() => {
  const v = Number(fullscreenRangeDataMax.value)
  if (Number.isFinite(v) && v >= safeFullscreenRangeDataMin.value) return v
  return safeFullscreenRangeDataMin.value
})

const applyRangeIfEnabled = () => {
  if (rangeControlsDisabled.value) return
  applyRange()
}
const resetRangeIfEnabled = () => {
  if (rangeControlsDisabled.value) return
  resetRange()
}
const fullscreenRangeControlsDisabled = computed(() => !hasAnyChartData.value)
const applyFullscreenRangeIfEnabled = () => {
  if (fullscreenRangeControlsDisabled.value) return
  applyFullscreenRange()
}
const resetFullscreenRangeIfEnabled = () => {
  if (fullscreenRangeControlsDisabled.value) return
  resetFullscreenRange()
}

const patchSoundOptionForFsDialog = (opt: EChartsOption): EChartsOption => {
  const raw = opt as Record<string, unknown>
  const tooltip = raw.tooltip
  const next = { ...raw } as Record<string, unknown>
  if (tooltip && typeof tooltip === 'object') {
    next.tooltip = {
      ...(tooltip as Record<string, unknown>),
      appendToBody: true,
      extraCssText: 'z-index: 99999 !important;',
    }
  }
  return next as EChartsOption
}

const disposeEnergyFsChart = () => {
  if (fsChartDisposers) {
    fsChartDisposers.forEach((fn) => {
      try {
        fn()
      } catch {
        //
      }
    })
    fsChartDisposers = null
  }
  if (energyFullscreenChartInstance.value) {
    try {
      energyFullscreenChartInstance.value.dispose()
    } catch {
      //
    }
    energyFullscreenChartInstance.value = null
  }
  if (densityFullscreenChartInstance.value) {
    try {
      densityFullscreenChartInstance.value.dispose()
    } catch {
      //
    }
    densityFullscreenChartInstance.value = null
  }
}

const onEnergyFsOpened = async () => {
  await nextTick()
  disposeEnergyFsChart()
  const elE = energyFullscreenChartEl.value
  const elD = densityFullscreenChartEl.value
  if (!elE || !elD) return

  const disposers: Array<() => void> = []
  try {
    const instE = echarts.init(elE)
    const instD = echarts.init(elD)
    energyFullscreenChartInstance.value = instE
    densityFullscreenChartInstance.value = instD

      ; (instE as any).group = fsLinkGroup
      ; (instD as any).group = fsLinkGroup
    echarts.connect(fsLinkGroup)
    disposers.push(() => {
      try {
        echarts.disconnect(fsLinkGroup)
      } catch {
        //
      }
    })

    instE.setOption(patchSoundOptionForFsDialog(energyOption.value) as any, { notMerge: true })
    instD.setOption(patchSoundOptionForFsDialog(densityOption.value) as any, { notMerge: true })

    const dzHandler = (params: any) => {
      handleFullscreenDataZoom(params)
    }
    instE.on('datazoom', dzHandler)
    instD.on('datazoom', dzHandler)
    disposers.push(() => {
      try {
        instE.off('datazoom', dzHandler)
      } catch {
        //
      }
    })
    disposers.push(() => {
      try {
        instD.off('datazoom', dzHandler)
      } catch {
        //
      }
    })

    const wheelE = enableMouseWheelZoom(instE)
    const wheelD = enableMouseWheelZoom(instD)
    if (wheelE) disposers.push(wheelE)
    if (wheelD) disposers.push(wheelD)

    disposers.push(observeResize(instE, elE))
    disposers.push(observeResize(instD, elD))

    instE.resize()
    instD.resize()

    fsChartDisposers = disposers
  } catch {
    disposeEnergyFsChart()
  }
}

const onEnergyFsClosed = () => {
  disposeEnergyFsChart()
}

watch([energyOption, densityOption], () => {
  if (!energyFullscreenVisible.value) return
  try {
    const eInst = energyFullscreenChartInstance.value
    const dInst = densityFullscreenChartInstance.value
    if (eInst && !(eInst.isDisposed && eInst.isDisposed())) {
      eInst.setOption(patchSoundOptionForFsDialog(energyOption.value) as any, { notMerge: true })
    }
    if (dInst && !(dInst.isDisposed && dInst.isDisposed())) {
      dInst.setOption(patchSoundOptionForFsDialog(densityOption.value) as any, { notMerge: true })
    }
  } catch {
    //
  }
})

onUnmounted(() => {
  if (energyDataZoomCleanup) {
    energyDataZoomCleanup()
    energyDataZoomCleanup = null
  }
  disposeRangeControls()
  disposeFullscreenRangeControls()
  disposeEnergyFsChart()
})
</script>

<style lang="scss" scoped>
.charts-section {
  display: flex;
  flex-direction: column;
  height: 50%;

  .charts-row {
    display: flex;
    flex-direction: row;
    gap: 10px;
    flex: 1;
    min-height: 0;
  }

  .range-controls-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: nowrap;
    gap: 8px;
    padding: 10px 20px 20px;
    font-size: 12px;
    overflow-x: auto;
    overflow-y: hidden;

    .controls-label,
    .controls-sep,
    .controls-unit {
      white-space: nowrap;
      opacity: 0.9;
      flex: 0 0 auto;
      font-size: 0.8rem;
    }

    :deep(.el-input-number.range-input) {
      width: 100px;
      flex: 0 0 auto;
    }

    :deep(.el-input-number.range-input .el-input__wrapper) {
      width: 100%;
    }
  }

  display: flex;
  flex-direction: column;

  .chart-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-radius: 8px;

    border: none !important;
    background: transparent !important;

    .chart-title-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px 10px 0 20px;
      position: relative;

      .energy-fullscreen-btn {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        padding: 0 !important;
        gap: 4px;
        color: rgba(255, 255, 255, 0.95) !important;
        font-size: 0.8rem;
      }

      :deep(.energy-fullscreen-btn .el-icon) {
        color: rgba(255, 255, 255, 0.95);
        margin-left: 4px;
        font-size: 0.8rem;
      }

      :deep(.energy-fullscreen-btn:hover .el-icon),
      :deep(.energy-fullscreen-btn:focus .el-icon),
      :deep(.energy-fullscreen-btn:active .el-icon) {
        color: #ffffff;
      }

      :deep(.energy-fullscreen-btn:hover),
      :deep(.energy-fullscreen-btn:focus),
      :deep(.energy-fullscreen-btn:active) {
        background-color: transparent !important;
      }

      .chart-title {
        text-align: center;
      }
    }

    .chart-container {
      flex: 1;
      min-height: 200px;
      padding: 0 10px 0 20px;

      :deep(.common-echarts-wrapper) {
        height: 100%;
        min-height: inherit;
      }

      :deep(.common-echarts-inner) {
        min-height: inherit;
      }
    }
  }
}

:deep(.el-button.trend-analysis-btn) {
  height: 28px;
  padding: 0 12px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 500;
  font-size: 14px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

:deep(.el-button.reset-btn) {
  height: 28px;
  padding: 0 12px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
}

.energy-fs-dialog-inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;
}

.energy-fs-controls-top {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  box-sizing: border-box;
  flex-shrink: 0;
  padding: 4px 8px 8px;

  .controls-label,
  .controls-sep,
  .controls-unit {
    white-space: nowrap;
    opacity: 0.9;
    font-size: 0.8rem;
  }

  :deep(.el-input-number.range-input) {
    width: 100px;
  }
}

.energy-fs-charts-stack {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;

  .energy-fs-chart-pane {
    flex: 1;
    min-height: 0;
  }
}

.energy-fs-chart-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.energy-fs-chart-title {
  flex-shrink: 0;
  text-align: center;
  font-size: 1rem;
  padding: 4px 8px 8px;
  opacity: 0.95;
}

.energy-fs-chart-host {
  flex: 1;
  min-height: 160px;
  min-width: 0;
}

@media (max-width: 800px) {
  .charts-section {
    height: auto;
    min-height: 0;
  }

  .charts-section .charts-row {
    flex-direction: column;
    gap: 12px;
    flex: none;
  }

  .charts-section .chart-item {
    flex: none;
    min-height: 260px;
  }

  .charts-section .chart-item .chart-title-row {
    justify-content: flex-start;
    padding: 10px 12px 0;
  }

  .charts-section .chart-item .chart-title-row .energy-fullscreen-btn {
    position: static;
    transform: none;
    margin-left: auto;
  }

  .charts-section .chart-item .chart-container {
    min-height: 240px;
    padding: 0 12px;
  }

  .charts-section .range-controls-bar {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    overflow: visible;
    font-size: var(--mobile-font-size-body);
  }

  .charts-section .range-controls-bar .controls-label,
  .charts-section .range-controls-bar .controls-sep,
  .charts-section .range-controls-bar .controls-unit,
  .charts-section .range-controls-bar :deep(.el-input-number.range-input),
  .charts-section .range-controls-bar :deep(.el-button.reset-btn) {
    flex: 0 0 auto;
    font-size: var(--mobile-font-size-body);
  }

  .charts-section .range-controls-bar :deep(.el-button.trend-analysis-btn) {
    flex: 0 0 auto;
    width: auto;
    margin-top: 0;
    font-size: var(--mobile-font-size-body);
  }

  .charts-section .chart-item .chart-title-row .energy-fullscreen-btn,
  .charts-section .chart-item .chart-title-row :deep(.energy-fullscreen-btn .el-icon) {
    font-size: var(--mobile-font-size-title);
  }

  .energy-fs-dialog-inner {
    gap: 10px;
  }

  .energy-fs-controls-top {
    justify-content: flex-start;
    padding: 0;
    font-size: var(--mobile-font-size-title);
  }

  .energy-fs-controls-top .controls-label,
  .energy-fs-controls-top .controls-sep,
  .energy-fs-controls-top .controls-unit,
  .energy-fs-controls-top :deep(.el-input-number.range-input),
  .energy-fs-controls-top :deep(.el-button.reset-btn) {
    flex: 0 0 auto;
    font-size: var(--mobile-font-size-title);
  }

  .energy-fs-chart-host {
    min-height: 240px;
  }
}
</style>

<style lang="scss">
.sound-energy-fullscreen-modal .el-dialog {
  background: #142060 !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column;
  overflow: hidden;
  max-height: 100vh !important;
}

.sound-energy-fullscreen-modal .el-dialog__header {
  flex-shrink: 0;
  background: #142060 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.sound-energy-fullscreen-modal .el-dialog__title {
  color: rgba(255, 255, 255, 0.95) !important;
}

.sound-energy-fullscreen-modal .el-dialog__headerbtn .el-dialog__close {
  color: rgba(255, 255, 255, 0.85) !important;
}

.sound-energy-fullscreen-modal .el-dialog__body {
  flex: 1;
  min-height: 0;
  padding: 16px 20px 20px !important;
  background: #142060 !important;
  overflow: hidden !important;
  display: flex;
  flex-direction: column;
}

.sound-energy-fullscreen-modal .energy-fs-controls-top,
.sound-energy-fullscreen-modal .energy-fs-chart-title {
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 800px) {
  .sound-energy-fullscreen-modal .el-dialog {
    width: 100vw !important;
    max-width: 100vw !important;
    border-radius: 0 !important;
  }

  .sound-energy-fullscreen-modal .el-dialog__body {
    padding: 12px !important;
  }
}
</style>
