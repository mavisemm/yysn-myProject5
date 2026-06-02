<template>
  <div class="device-svt-trend-panel">
    <div class="device-svt-trend-panel__chart">
      <div class="chart-header">
        <span class="chart-title app-section-title">声音趋势</span>
      </div>
      <div class="chart-host">
        <CommonEcharts
          :option="soundOption"
          :loading="soundLoading"
          empty-text="暂无数据"
          :enable-data-zoom="false"
          :not-merge="true"
          :tooltip-follow-mouse="true"
          :linkage-group="linkageGroup"
          :enable-linkage-zoom="true"
          :enable-wheel-zoom="true"
          :auto-y-axis-on-zoom="true"
        />
      </div>
    </div>
    <div class="device-svt-trend-panel__chart">
      <div class="chart-header">
        <span class="chart-title app-section-title">振动趋势</span>
        <span class="chart-unit special-font-color">（单位：mm/s）</span>
      </div>
      <div class="chart-host">
        <CommonEcharts
          :option="vibOption"
          :loading="vibLoading"
          empty-text="暂无数据"
          :enable-data-zoom="false"
          :not-merge="true"
          :tooltip-follow-mouse="true"
          :linkage-group="linkageGroup"
          :enable-linkage-zoom="true"
          :enable-wheel-zoom="true"
          :auto-y-axis-on-zoom="true"
        />
      </div>
    </div>
    <div class="device-svt-trend-panel__chart">
      <div class="chart-header">
        <span class="chart-title app-section-title">温度趋势</span>
        <span class="chart-unit special-font-color">（单位：℃）</span>
      </div>
      <div class="chart-host">
        <CommonEcharts
          :option="tempOption"
          :loading="tempLoading"
          empty-text="暂无数据"
          :enable-data-zoom="false"
          :not-merge="true"
          :tooltip-follow-mouse="true"
          :linkage-group="linkageGroup"
          :enable-linkage-zoom="true"
          :enable-wheel-zoom="true"
          :auto-y-axis-on-zoom="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  getTemperatureTrend,
  getVibrationTrend,
  getSoundTrend,
} from '@/api/modules/hardware'
import { CommonEcharts } from '@/components/common/chart'
import type { DeviceTrendChartData } from './deviceDetailTypes'
import {
  buildDeviceTrendChartOption,
  computeSoundTrendYAxisRange,
  computeTempTrendYAxisRange,
  computeVibTrendYAxisRange,
  mapTrendTimeLabels,
  normalizeTrendApiList,
} from './deviceDetailChartUtils'
import { dateRangeToEpochMs } from '@/utils/datetime'

const props = defineProps<{
  receiverId: string
  dateRange?: [string, string] | null
}>()

const chartTimeParams = () => dateRangeToEpochMs(props.dateRange ?? null)

const linkageGroup = 'device-svt-trend-panel'
const chartAxisColor = '#fff'
const chartSplitLineColor = 'rgba(150,150,150, 0.2)'

const tempChartData = ref<DeviceTrendChartData | null>(null)
const vibChartData = ref<DeviceTrendChartData | null>(null)
const soundChartData = ref<DeviceTrendChartData | null>(null)
const soundLoading = ref(false)
const vibLoading = ref(false)
const tempLoading = ref(false)

const trendChartLayout = {
  gridBottom: '15%',
  gridTop: '10%',
  dataZoomBottom: '5%',
  dataZoomSliderHeight: '10%',
}

const buildTrendOption = (kind: 'temp' | 'vib' | 'sound', data: DeviceTrendChartData | null) =>
  buildDeviceTrendChartOption({
    kind,
    data,
    layout: trendChartLayout,
    axisColor: chartAxisColor,
    splitLineColor: chartSplitLineColor,
  })

const tempOption = computed(() => buildTrendOption('temp', tempChartData.value))
const vibOption = computed(() => buildTrendOption('vib', vibChartData.value))
const soundOption = computed(() => buildTrendOption('sound', soundChartData.value))

const loadTemperatureData = async (receiverId: string) => {
  if (!receiverId) return
  tempLoading.value = true
  tempChartData.value = null
  try {
    const response = await getTemperatureTrend({ receiverId, ...chartTimeParams() })
    if (response.rc === 0 && Array.isArray(response.ret) && response.ret.length > 0) {
      const timeData = mapTrendTimeLabels(
        response.ret.map((item: { dateTime?: string; time?: string }) => item.dateTime || item.time || ''),
      )
      const tempData = response.ret.map((item: { temperature: number }) => item.temperature)
      const dataMin = tempData.length ? Math.min(...tempData) : 0
      const dataMax = tempData.length ? Math.max(...tempData) : 100
      const { min: yMin, max: yMax } = computeTempTrendYAxisRange(dataMin, dataMax)
      tempChartData.value = { timeLabels: timeData, values: tempData, yMin, yMax }
    } else {
      tempChartData.value = null
    }
  } catch {
    tempChartData.value = null
  } finally {
    tempLoading.value = false
  }
}

const loadVibrationData = async (receiverId: string) => {
  if (!receiverId) return
  vibLoading.value = true
  vibChartData.value = null
  try {
    const response = await getVibrationTrend({ receiverId, ...chartTimeParams() })
    const list = normalizeTrendApiList(response)
    if (list.length > 0) {
      const timeData = mapTrendTimeLabels(list.map((item: { time?: string }) => item.time || ''))
      const vibData = list.map((item: { sumRms: number }) => item.sumRms)
      const dataMin = vibData.length ? Math.min(...vibData) : 0
      const dataMax = vibData.length ? Math.max(...vibData) : 20
      const { min: yMin, max: yMax } = computeVibTrendYAxisRange(dataMin, dataMax)
      vibChartData.value = { timeLabels: timeData, values: vibData, yMin, yMax }
    } else {
      vibChartData.value = null
    }
  } catch {
    vibChartData.value = null
  } finally {
    vibLoading.value = false
  }
}

const loadSoundData = async (receiverId: string) => {
  if (!receiverId) return
  soundLoading.value = true
  soundChartData.value = null
  try {
    const response = await getSoundTrend({ receiverId, ...chartTimeParams() })
    const list = normalizeTrendApiList(response)
    if (list.length > 0) {
      const timeData = mapTrendTimeLabels(
        list.map((item: { time?: string; dateTime?: string }) => item.time || item.dateTime || ''),
      )
      const soundData = list.map(
        (item: { value?: number; soundLevel?: number }) => item.value ?? item.soundLevel ?? 0,
      )
      const dataMin = soundData.length ? Math.min(...soundData) : 0
      const dataMax = soundData.length ? Math.max(...soundData) : 100
      const { min: yMin, max: yMax } = computeSoundTrendYAxisRange(dataMin, dataMax)
      soundChartData.value = { timeLabels: timeData, values: soundData, yMin, yMax }
    } else {
      soundChartData.value = null
    }
  } catch {
    soundChartData.value = null
  } finally {
    soundLoading.value = false
  }
}

const loadAll = (receiverId: string) => {
  if (!receiverId) {
    soundChartData.value = null
    vibChartData.value = null
    tempChartData.value = null
    soundLoading.value = false
    vibLoading.value = false
    tempLoading.value = false
    return
  }
  void loadTemperatureData(receiverId)
  void loadVibrationData(receiverId)
  void loadSoundData(receiverId)
}

watch(
  () => [props.receiverId, props.dateRange?.[0], props.dateRange?.[1]] as const,
  ([id]) => {
    if (id) loadAll(id)
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.device-svt-trend-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;

  &__chart {
    flex: 1;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    padding: 10px 10px 0;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    min-width: 0;
  }

  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
    flex: 0 0 auto;

    .chart-title {
      font-size: 1rem;
      font-weight: 500;
      color: #fff;
    }

    .chart-unit {
      font-size: 0.8rem;
      color: #fff;
    }
  }

  .chart-host {
    flex: 1;
    min-height: 160px;
    min-width: 0;

    :deep(.common-echarts-wrapper),
    :deep(.common-echarts-inner) {
      height: 100%;
      min-height: inherit;
    }
  }
}
</style>
