<template>
  <div class="device-spectrum-panel">
    <section class="device-spectrum-panel__sound">
      <div v-if="spectrumLoading" class="device-spectrum-panel__status">加载中</div>
      <div v-else-if="!deviationList.length" class="device-spectrum-panel__status">暂无数据</div>
      <SoundPointCharts
        v-else
        :deviation-list="deviationList"
        :point-list="[]"
        :selected-point-id="receiverId"
        hide-trend-button
        title-align-left
        pair-layout="vertical"
        spectrum-align
      />
    </section>
    <section class="device-spectrum-panel__vibration">
      <VibrationChartComparison
        :receiver-id="receiverId"
        :date-range="dateRange"
        stack-layout
        spectrum-align
        :y-axis-tick-decimals="2"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getLatestDeviationByReceiver,
  getStandardFrequencyList,
  type SoundDeviationItem,
} from '@/api/modules/voiceSound'
import { dateRangeToEpochMs } from '@/utils/datetime'
import { roundChartYValues2 } from '@/utils/chartAxis'
import SoundPointCharts from '@/components/business/sound-point/SoundPointCharts.vue'
import VibrationChartComparison from '@/components/business/vibration-point/VibrationChartComparison.vue'

interface DeviationListItem {
  id: string
  time: string
  deviationValue: number
  visible: boolean
  color?: string
  dbArr: (number | string)[]
  densityArr: (number | string)[]
  freqs: string[]
}

const props = defineProps<{
  receiverId: string
  dateRange?: [string, string] | null
}>()

const deviationList = ref<DeviationListItem[]>([])
const spectrumLoading = ref(false)

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const normalizeDeviationList = (list: SoundDeviationItem[]): DeviationListItem[] => {
  return list.map((item, index) => {
    const freqLength =
      item.dbArray && item.dbArray.length ? item.dbArray.length : item.densityArray?.length || 0
    const freqs = freqLength ? Array.from({ length: freqLength }, (_, i) => String(i + 1)) : []
    return {
      id: String(item.id ?? index),
      time: formatDateTime(item.time),
      deviationValue: Number(item.deviationValue || 0),
      visible: index === 0,
      color: index === 0 ? '#91cc75' : undefined,
      dbArr: roundChartYValues2(item.dbArray ?? []),
      densityArr: roundChartYValues2(item.densityArray ?? []),
      freqs,
    }
  })
}

const applyFrequencyResponse = (
  freqs: number[],
  responseList: any[],
  mode: 'energy' | 'density',
) => {
  if (!Array.isArray(responseList) || responseList.length === 0) return
  responseList.forEach((res) => {
    const recordId = (res as { recordId?: string | number })?.recordId
    const recordIdStr = recordId != null ? String(recordId) : ''
    const target = deviationList.value.find((item) => String(item.id) === recordIdStr)
    if (!target) return
    const dbArr = roundChartYValues2(Array.isArray(res.dbArray) ? res.dbArray : [])
    const densityArr = roundChartYValues2(Array.isArray(res.densityArray) ? res.densityArray : [])
    const sourceArr = mode === 'energy' ? dbArr : densityArr
    const xFreqs =
      freqs.length > 0
        ? freqs
        : sourceArr.length > 0
          ? Array.from({ length: sourceArr.length }, (_, i) => i + 1)
          : target.freqs.map((f) => Number(f))

    if (xFreqs.length > 0) {
      target.freqs = xFreqs.map((f) => Number(f).toFixed(1))
    }
    if (mode === 'energy') {
      target.dbArr = dbArr
    } else {
      target.densityArr = densityArr
    }
  })
}

const loadFrequencyData = async () => {
  const selectedIds = deviationList.value
    .filter((item) => item.visible)
    .map((item) => String(item.id))
    .filter(Boolean)
  if (!selectedIds.length) return

  const loadOnce = async (type: number, mode: 'energy' | 'density') => {
    const res = await getStandardFrequencyList({
      recordIdList: selectedIds,
      type,
    })
    const body = (res as { data?: unknown; ret?: unknown })?.data ?? (res as { ret?: unknown })?.ret ?? res
    const payload = body as { freqs?: number[]; responseList?: unknown[] }
    const freqs = Array.isArray(payload?.freqs) ? payload.freqs : []
    const responseList = Array.isArray(payload?.responseList) ? payload.responseList : []
    applyFrequencyResponse(freqs, responseList, mode)
  }

  await loadOnce(0, 'energy')
  await loadOnce(1, 'density')
}

const loadLatestData = async () => {
  const receiverId = props.receiverId?.trim()
  if (!receiverId) {
    deviationList.value = []
    spectrumLoading.value = false
    return
  }
  spectrumLoading.value = true
  deviationList.value = []
  try {
    const epoch = dateRangeToEpochMs(props.dateRange ?? null)
    const res = await getLatestDeviationByReceiver({
      receiverId,
      ...epoch,
    })
    const rawList = Array.isArray(res)
      ? res
      : Array.isArray((res as { data?: unknown })?.data)
        ? (res as { data: SoundDeviationItem[] }).data
        : Array.isArray((res as { ret?: unknown })?.ret)
          ? (res as { ret: SoundDeviationItem[] }).ret
          : []
    const mapped = normalizeDeviationList(rawList)
    if (mapped[0]) {
      mapped[0].visible = true
      mapped.forEach((item, index) => {
        if (index > 0) item.visible = false
      })
    }
    deviationList.value = mapped
    if (mapped.length) {
      await loadFrequencyData()
    }
  } catch {
    deviationList.value = []
    ElMessage.error('加载声音频谱数据失败')
  } finally {
    spectrumLoading.value = false
  }
}

watch(
  () => [props.receiverId, props.dateRange?.[0], props.dateRange?.[1]] as const,
  () => {
    void loadLatestData()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.device-spectrum-panel {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  overflow: hidden;

  &__sound,
  &__vibration {
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  &__status {
    flex: 1;
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.75);
    font-size: 0.9rem;
  }

  &__sound {
    :deep(.charts-section) {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    :deep(.charts-row) {
      flex: 1;
      min-height: 0;
    }

    :deep(.chart-item) {
      min-height: 0;
    }

    :deep(.chart-container) {
      min-height: 100px;
    }

  }

  &__vibration {
    :deep(.bottom-row) {
      height: 100%;
      min-height: 0;
    }
  }
}

@media (max-width: 800px) {
  .device-spectrum-panel {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
    overflow-y: auto;
  }
}
</style>
