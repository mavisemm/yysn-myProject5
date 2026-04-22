<template>
  <div class="card-item waterfall-card">
    <div class="card-header">
      <div class="card-header-leading">
        <div class="card-title app-section-title">频域瀑布图</div>
        <el-select v-model="waterfallAxis" class="waterfall-axis-select" size="small" teleported :show-arrow="false"
          popper-class="waterfall-axis-select-dropdown">
          <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>
      <div class="time-section">
        <div class="interval-input">
          <div class="interval-left">
            <span class="interval-label">间隔</span>
            <el-input-number v-model="intervalHours" :min="0.25" :max="24" :step="0.25" :precision="2" size="small"
              placeholder="小时" controls-position="right" class="interval-num" />
            <span class="interval-unit">小时</span>
          </div>
          <el-button class="waterfall-fullscreen-btn" text size="large" @click="openWaterfallFullscreen">
            全屏显示
            <el-icon>
              <FullScreen />
            </el-icon>
          </el-button>
        </div>
        <CommonDateTimePicker v-model="dateRange" width="320px" />
      </div>
    </div>
    <div class="chart-container">
      <CommonEcharts ref="waterfallChartRef" :option="waterfallOption" :enable-data-zoom="false" :not-merge="true"
        @fullscreen-chart-ready="onWaterfallFullscreenChartReady" use-gl enable-fullscreen fullscreen-title="频域瀑布图"
        fullscreen-background="#142060">
        <template #fullscreen-body-top>
          <div class="waterfall-fullscreen-filters">
            <el-select v-model="waterfallAxis" class="waterfall-axis-select" size="small" teleported
              :show-arrow="false" popper-class="waterfall-axis-select-dropdown">
              <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <div class="interval-input">
              <span class="interval-label">间隔</span>
              <el-input-number v-model="intervalHours" :min="0.25" :max="24" :step="0.25" :precision="2" size="small"
                placeholder="小时" controls-position="right" class="interval-num" />
              <span class="interval-unit">小时</span>
            </div>
            <CommonDateTimePicker v-model="dateRange" width="320px" />
            <div class="freq-filter">
              <span class="freq-filter-label">频率筛选：</span>
              <el-input-number v-model="freqFilterMin" :min="freqAxisDomain.min" :max="freqAxisDomain.max"
                :precision="0" :step="1" size="small" placeholder="最小" controls-position="right" class="freq-num" />
              <span class="freq-sep">—</span>
              <el-input-number v-model="freqFilterMax" :min="freqAxisDomain.min" :max="freqAxisDomain.max"
                :precision="0" :step="1" size="small" placeholder="最大" controls-position="right" class="freq-num" />
              <el-button type="primary" size="small" class="freq-apply-btn" @click="applyFreqFilter">
                应用
              </el-button>
              <el-button size="small" @click="resetFreqFilter"> 重置 </el-button>
            </div>
          </div>
        </template>
      </CommonEcharts>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { EChartsOption } from 'echarts'
import { getLast24HoursRange } from '@/utils/datetime'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'
import { CommonEcharts } from '@/components/common/chart'
import { FullScreen } from '@element-plus/icons-vue'
import { getVibrationFrequencyWaterfallData, type VibrationAxis } from '@/api/modules/device'
import { useDeviceTreeStore } from '@/stores/deviceTree'

const waterfallChartRef = ref<InstanceType<typeof CommonEcharts>>()
const route = useRoute()
const deviceTreeStore = useDeviceTreeStore()

const chartAxisColor = computed(() => '#ffffff')
const chartGridLineColor = computed(() => '#999999')

const intervalHours = ref(1)
const dateRange = ref<[string, string] | null>(getLast24HoursRange())
/** 频率筛选输入（点击「应用」后写入 freqDisplayRange） */
const freqFilterMin = ref<number | undefined>(undefined)
const freqFilterMax = ref<number | undefined>(undefined)
/** null 表示不过滤，使用接口返回全量频率；否则为闭区间 [min,max]（已与输入对齐） */
const freqDisplayRange = ref<{ min: number; max: number } | null>(null)
/** 频域 x 轴刻度间隔（Hz） */
const freqAxisTickInterval = 20
const axisOptions: { label: string; value: VibrationAxis }[] = [
  { label: 'X轴', value: 'X' },
  { label: 'Y轴', value: 'Y' },
  { label: 'Z轴', value: 'Z' },
]
const waterfallAxis = ref<VibrationAxis>('X')
const waterfallData = ref<{
  collectTime: string[]
  frequency: number[]
  freqSpeedData: number[][]
}>({
  collectTime: [],
  frequency: [],
  freqSpeedData: [],
})
let waterfallReloadTimer: ReturnType<typeof setTimeout> | null = null

const receiverIdFromParams = computed(() => {
  const rid = route.params.receiverId
  const resolved = Array.isArray(rid) ? rid[0] : rid
  return (typeof resolved === 'string' ? resolved : '') || ''
})

const resolvePointDeviceId = (rid: string): string => {
  if (!rid) return ''
  for (const factory of deviceTreeStore.deviceTreeData) {
    for (const workshop of factory.children ?? []) {
      for (const device of workshop.children ?? []) {
        if (device.type !== 'device') continue
        const hit = (device.children ?? []).find((p) => p.type === 'point' && p.id === rid)
        if (hit?.deviceId) return hit.deviceId
      }
    }
  }
  return ''
}

const pointDeviceId = computed(() => resolvePointDeviceId(receiverIdFromParams.value))

const openWaterfallFullscreen = () => {
  ; (waterfallChartRef.value as any)?.openFullscreen?.()
}

const applyFreqFilter = () => {
  const a = freqFilterMin.value
  const b = freqFilterMax.value
  if (a == null && b == null) {
    freqDisplayRange.value = null
    return
  }
  const lo = a ?? -Infinity
  const hi = b ?? Infinity
  freqDisplayRange.value = {
    min: Math.min(lo, hi),
    max: Math.max(lo, hi),
  }
}

/** 按频率区间切片后的展示数据（不改变原始 waterfallData） */
const filteredWaterfallDisplay = computed(() => {
  const freqs = waterfallData.value.frequency
  const matrix = waterfallData.value.freqSpeedData
  const range = freqDisplayRange.value
  if (!range || !freqs.length) {
    return { frequencies: freqs, speedMatrix: matrix }
  }
  const indices: number[] = []
  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i]
    if (f === undefined) continue
    if (f >= range.min && f <= range.max) indices.push(i)
  }
  if (indices.length === 0) {
    return { frequencies: [] as number[], speedMatrix: matrix.map(() => [] as number[]) }
  }
  const newFreqs = indices.map((i) => freqs[i]!)
  const newMatrix = matrix.map((row) => indices.map((i) => row[i] ?? 0))
  return { frequencies: newFreqs, speedMatrix: newMatrix }
})

/** 与 `xAxis3D` 使用同一套频率范围：用于全屏时输入框回填 + 输入框 min/max 绑定 */
const freqAxisDomain = computed(() => {
  const freqs = filteredWaterfallDisplay.value.frequencies
  const nums = freqs.map((n) => Number(n)).filter((n) => Number.isFinite(n))
  if (!nums.length) {
    return { min: 0, max: freqAxisTickInterval }
  }
  return { min: Math.min(...nums), max: Math.max(...nums) }
})

const onWaterfallFullscreenChartReady = () => {
  // 全屏打开后：把输入框回填为当前坐标轴频率范围，确保“数字与轴绑定”
  freqFilterMin.value = freqAxisDomain.value.min
  freqFilterMax.value = freqAxisDomain.value.max
}

const resetFreqFilter = () => {
  // 重置为“不过滤”：并把输入框回填为当前坐标轴范围
  freqDisplayRange.value = null
  freqFilterMin.value = freqAxisDomain.value.min
  freqFilterMax.value = freqAxisDomain.value.max
}

const toApiDateTime = (s: string) => s.replace('T', ' ')
const toApiInterval = (hours: number) => Number(hours).toFixed(1)
const formatTimeLabel = (timeStr: string) => {
  if (!timeStr) return ''
  const [datePart, hms] = timeStr.split(' ')
  if (!datePart || !hms) return timeStr
  const [, month = '', day = ''] = datePart.split('-')
  return `${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hms.slice(0, 5)}`
}

const loadWaterfallData = async () => {
  if (!pointDeviceId.value || !receiverIdFromParams.value) return
  const [startStr, endStr] =
    dateRange.value && dateRange.value[0] && dateRange.value[1]
      ? dateRange.value
      : getLast24HoursRange()
  try {
    const res = await getVibrationFrequencyWaterfallData(
      pointDeviceId.value,
      receiverIdFromParams.value,
      waterfallAxis.value,
      toApiInterval(intervalHours.value),
      toApiDateTime(startStr),
      toApiDateTime(endStr),
    )
    if (
      res.rc === 0 &&
      res.ret &&
      Array.isArray(res.ret.collectTime) &&
      Array.isArray(res.ret.frequency) &&
      Array.isArray(res.ret.freqSpeedData)
    ) {
      waterfallData.value = {
        collectTime: res.ret.collectTime,
        frequency: res.ret.frequency,
        freqSpeedData: res.ret.freqSpeedData,
      }
    } else {
      waterfallData.value = { collectTime: [], frequency: [], freqSpeedData: [] }
    }
  } catch (error) {
    console.error('获取频域瀑布图数据失败:', error)
    waterfallData.value = { collectTime: [], frequency: [], freqSpeedData: [] }
  }
}

const scheduleLoadWaterfallData = (delay = 400) => {
  if (waterfallReloadTimer) {
    clearTimeout(waterfallReloadTimer)
    waterfallReloadTimer = null
  }
  waterfallReloadTimer = setTimeout(() => {
    waterfallReloadTimer = null
    void loadWaterfallData()
  }, delay)
}

const waterfallOption = computed<EChartsOption>(() => {
  const times = waterfallData.value.collectTime.map(formatTimeLabel)
  const { frequencies, speedMatrix } = filteredWaterfallDisplay.value
  // 柔和一点的红色起点，避免过于刺眼
  const light = { r: 239, g: 83, b: 80 }
  const dark = { r: 34, g: 139, b: 34 }
  const generateGradientColors = (count: number) => {
    return Array.from({ length: count }, (_, i) => {
      const t = count > 1 ? i / (count - 1) : 1
      const r = Math.round(light.r + (dark.r - light.r) * t)
      const g = Math.round(light.g + (dark.g - light.g) * t)
      const b = Math.round(light.b + (dark.b - light.b) * t)
      return `rgb(${r},${g},${b})`
    })
  }
  const curveColors = generateGradientColors(times.length)
  const seriesList = times.map((time, timeIndex) => {
    const row = Array.isArray(speedMatrix[timeIndex]) ? speedMatrix[timeIndex] : []
    const points = frequencies.map((freq, freqIndex) => {
      const speed = Number(row[freqIndex] ?? 0)
      return [freq, timeIndex, speed, `${(speed || 0).toFixed(3)} mm/s`]
    })
    return {
      name: time,
      type: 'line3D' as const,
      data: points,
      lineStyle: {
        width: 2,
        color: curveColors[timeIndex % curveColors.length],
      },
      label: { show: false },
      emphasis: {
        label: {
          show: true,
          formatter: (params: any) => `${(params.value[2] || 0).toFixed(3)} mm/s`,
          fontSize: 12,
          color: '#ffffff',
        },
      },
    }
  })

  const c = chartAxisColor.value
  const gridColor = chartGridLineColor.value
  const freqMin = frequencies.length ? Math.min(...frequencies.map((n) => Number(n))) : 0
  const freqMax = frequencies.length
    ? Math.max(...frequencies.map((n) => Number(n)))
    : freqAxisTickInterval
  const freqSpan = freqMax - freqMin
  const freqSplitNumber =
    freqSpan > 0 ? Math.max(1, Math.round(freqSpan / freqAxisTickInterval)) : 1
  // 仍保持刻度线每 20Hz，但坐标轴文字每隔若干个刻度显示一次，避免全屏文字过密
  const freqAxisLabelEveryTicks = 5 // 20Hz * 2 = 40Hz 显示一条文字
  return {
    tooltip: {
      show: true,
      trigger: 'item',
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      borderColor: 'rgba(50, 50, 50, 0.9)',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const freq = params.value?.[0] ?? 0
        const seriesName = params.seriesName || ''
        const value = params.value?.[2] ?? 0
        const timeLabel =
          seriesName ||
          (typeof params.value?.[1] === 'number' ? (times[params.value[1]] ?? '') : '')

        return [
          `时间：${timeLabel}`,
          `频率：${freq.toFixed(0)} Hz`,
          `速度有效值：${value.toFixed(3)} mm/s`,
        ].join('<br/>')
      },
    },
    grid3D: {
      left: '-10%',
      top: '-2%',
      viewControl: {
        projection: 'orthographic',
        alpha: 15,
        beta: 20,
        distance: 250,
        rotateSensitivity: 1,
        zoomSensitivity: 0.5,
        panSensitivity: 1,
      },
      boxWidth: 100,
      boxHeight: 100,
      boxDepth: 100,
      axisPointer: {
        lineStyle: { color: '#063c83' },
      },
      splitLine: {
        lineStyle: { color: gridColor },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: '#F0f0f0',
          opacity: 1,
        },
      },
    },
    xAxis3D: {
      type: 'value',
      name: '频率(Hz)',
      nameTextStyle: {
        color: c,
        fontSize: '0.8rem',
      },
      nameGap: 40,
      axisLine: { lineStyle: { color: c } },
      axisTick: { lineStyle: { color: c } },
      axisLabel: {
        color: c,
        fontSize: '0.8rem',
        margin: 10,
        formatter: (value: number) => {
          const n = Number(value)
          if (!Number.isFinite(n)) return ''
          // 以 min 作为对齐基准计算当前刻度序号，达到“每 40Hz 显示一条”的效果
          const tickIndex = Math.round((n - freqMin) / freqAxisTickInterval)
          if (tickIndex % freqAxisLabelEveryTicks !== 0) return ''
          return `${Math.round(n)}`
        },
      },
      interval: freqAxisTickInterval,
      splitNumber: freqSplitNumber,
      min: freqMin,
      max: freqMax,
    },
    yAxis3D: {
      type: 'category',
      name: '时间',
      nameTextStyle: {
        color: c,
        fontSize: '0.8rem',
      },
      nameGap: 5,
      axisLine: { lineStyle: { color: c } },
      axisTick: { lineStyle: { color: c } },
      axisLabel: {
        color: c,
        fontSize: '0.8rem',
        margin: 20,
      },
      data: times,
    },
    legend: {
      show: true,
      data: times,
      textStyle: { color: c },
      pageTextStyle: { color: c },
      pageIconColor: '#ffffff',
      pageIconInactiveColor: 'rgba(255,255,255,0.5)',
      right: 10,
      top: 'middle',
      orient: 'vertical',
      type: 'scroll',
    },
    zAxis3D: {
      name: '速\n度\n有\n效\n值\n(mm/s)',
      nameTextStyle: {
        color: c,
        fontSize: '0.8rem',
      },
      nameGap: 35,
      nameRotate: 90,
      namemoveoverlap: true,
      axisLine: { lineStyle: { color: c } },
      axisTick: { lineStyle: { color: c } },
      axisLabel: {
        color: c,
        fontSize: '0.8rem',
        margin: 8,
      },
    },
    series: seriesList,
  } as EChartsOption
})

watch(
  [receiverIdFromParams, pointDeviceId],
  ([rid, pid]) => {
    if (!rid || !pid) return
    void loadWaterfallData()
  },
  { immediate: true },
)

watch(waterfallAxis, () => {
  if (!receiverIdFromParams.value || !pointDeviceId.value) return
  scheduleLoadWaterfallData()
})

watch(intervalHours, () => {
  if (!receiverIdFromParams.value || !pointDeviceId.value) return
  scheduleLoadWaterfallData()
})

watch(
  dateRange,
  (newRange, oldRange) => {
    if (!receiverIdFromParams.value || !pointDeviceId.value) return
    const newKey = Array.isArray(newRange) ? `${newRange[0] || ''}|${newRange[1] || ''}` : ''
    const oldKey = Array.isArray(oldRange) ? `${oldRange[0] || ''}|${oldRange[1] || ''}` : ''
    if (newKey === oldKey) return
    scheduleLoadWaterfallData()
  },
  { deep: true },
)

onUnmounted(() => {
  if (waterfallReloadTimer) {
    clearTimeout(waterfallReloadTimer)
    waterfallReloadTimer = null
  }
})
</script>

<style lang="scss" scoped>
.card-item {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 10px 10px 0 10px;

    .card-header-leading {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .card-title {
      color: #fff;
    }

    .time-section {
      width: 320px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;

      .interval-input {
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;

        .interval-left {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .interval-label {
          color: #fff;
        }

        .interval-num {
          width: 100px;
        }

        .interval-unit {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }

    :deep(.waterfall-fullscreen-btn) {
      color: #fff !important;
      padding: 0 !important;
      gap: 4px;
      font-size: 0.8rem;
    }

    :deep(.waterfall-fullscreen-btn:hover),
    :deep(.waterfall-fullscreen-btn:focus),
    :deep(.waterfall-fullscreen-btn:active) {
      background-color: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }

    :deep(.waterfall-fullscreen-btn .el-icon) {
      color: #fff !important;
      margin-left: 4px;
      font-size: 0.8rem;
    }
  }

  .chart-container {
    flex: 1;
    width: 100%;
    min-height: 0;
    padding: 10px 10px 20px 10px;
  }
}

.waterfall-card {
  width: 66.66%;
}
</style>

<style lang="scss">
.waterfall-axis-select {
  width: 72px;
  vertical-align: middle;
}

.waterfall-axis-select .el-select__wrapper {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  min-height: 30px;
  padding: 0 10px;
}

.waterfall-axis-select .el-select__placeholder,
.waterfall-axis-select .el-select__selected-item {
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
}

.waterfall-axis-select .el-select__caret {
  color: rgba(255, 255, 255, 0.65);
}

.waterfall-fullscreen-filters {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  flex-wrap: nowrap;
}

.waterfall-fullscreen-filters>* {
  flex: 0 0 auto;
}

.waterfall-fullscreen-filters .interval-input {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.waterfall-fullscreen-filters .interval-input .interval-label {
  color: #fff;
}

.waterfall-fullscreen-filters .interval-input .interval-num {
  width: 100px;
}

.waterfall-fullscreen-filters .interval-input .interval-unit {
  color: rgba(255, 255, 255, 0.8);
}

.waterfall-fullscreen-filters .freq-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.waterfall-fullscreen-filters .freq-filter-label {
  color: #fff;
  font-size: 0.8rem;
}

.waterfall-fullscreen-filters .freq-num {
  width: 92px;
}

.waterfall-fullscreen-filters .freq-sep {
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
}

.waterfall-fullscreen-filters .freq-apply-btn {
  padding: 0 12px;
}

.waterfall-axis-select-dropdown.el-popper {
  background: #1a2a6e !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  font-size: 12px;
  z-index: 10000 !important;
}

.waterfall-axis-select-dropdown .el-select-dropdown__item {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
}

.waterfall-axis-select-dropdown .el-select-dropdown__item.is-hovering,
.waterfall-axis-select-dropdown .el-select-dropdown__item:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
