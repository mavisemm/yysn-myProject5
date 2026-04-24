<template>
  <div class="sound-point-container">
    <SoundPointCharts
      :deviation-list="deviationList"
      :point-list="[]"
      :selected-point-id="receiverId"
      @chart-init="handleChartInit"
      ref="chartsComponentRef"
    />

    <div class="bottom-section">
      <SoundDataTable
        :deviation-list="deviationList"
        @select-change="handleSelectChange"
        @view-details="viewDetails"
        @download-file="downloadFile"
        @play-audio="playAudio"
        @row-click="handleRowClick"
      />

      <SoundPointInfo
        :point-name="pointName"
        :device-name="deviceName"
        :current-data-time="currentDataTime"
        :audio-path="audioPath"
        :cluster-name="clusterName"
        :production-equipment="productionEquipment"
        :sub-component="subComponent"
        :detection-equipment="detectionEquipment"
        :microphone="microphone"
        :deviation-value="currentDeviationValue"
      />
    </div>
  </div>

  <el-dialog
    v-model="voiceVisible"
    title="详情"
    width="70vw"
    align-center
    class="voice-detail-dialog"
    destroy-on-close
    :z-index="3000"
    :teleported="true"
    :append-to-body="true"
    :modal-append-to-body="true"
    @opened="handleModalOpened"
    @closed="handleModalClosed"
  >
    <div class="modal-charts">
      <div class="modal-chart-item">
        <div ref="modalEnergyChartRef" class="modal-chart-dom"></div>
      </div>
      <div class="modal-chart-item">
        <div ref="modalDensityChartRef" class="modal-chart-dom"></div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, shallowRef, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import { ElMessage, ElDialog } from 'element-plus'
import { enableMouseWheelZoom } from '@/utils/chart'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { usePointMessageStore } from '@/stores/pointMessage'

const deviceTreeStore = useDeviceTreeStore()
const pointMessageStore = usePointMessageStore()
import {
  getLatestDeviationByReceiver,
  getStandardFrequencyList,
  findLatestFrequencyById,
  getWavByFreqGroupIdUrl,
  type SoundDeviationItem,
} from '@/api/modules/voiceSound'

const route = useRoute()
const receiverId = computed(() => {
  const rid = route.params.receiverId
  const resolved = Array.isArray(rid) ? rid[0] : rid
  return typeof resolved === 'string' ? resolved : ''
})

const equipmentIdFromQuery = computed(() => {
  const q = route.query.equipmentId
  if (typeof q === 'string') return q
  if (Array.isArray(q) && q[0]) return String(q[0])
  return ''
})

const pointNameFromQuery = computed(() => {
  const q = route.query.pointName
  if (typeof q === 'string') return q
  if (Array.isArray(q) && q[0]) return String(q[0])
  return ''
})

const syncTreeSelectionFromRoute = () => {
  const rid = receiverId.value.trim()
  if (!rid) return
  const eid = equipmentIdFromQuery.value.trim()
  const pname = pointNameFromQuery.value.trim()
  const treeKey = deviceTreeStore.resolveTreeKeyForPoint(rid, eid || undefined, {
    pointName: pname || undefined,
  })
  if (treeKey) deviceTreeStore.setSelectedDeviceId(treeKey)
}

import SoundPointCharts from '@/components/business/sound-point/SoundPointCharts.vue'
import SoundDataTable from '@/components/business/sound-point/SoundDataTable.vue'
import SoundPointInfo from '@/components/business/sound-point/SoundPointInfo.vue'
const chartsComponentRef = ref<any>(null)
const modalEnergyChartRef = ref<HTMLDivElement>()
const modalDensityChartRef = ref<HTMLDivElement>()

const modalEnergyChartInstance = shallowRef<echarts.ECharts | null>(null)
const modalDensityChartInstance = shallowRef<echarts.ECharts | null>(null)
const modalChartLinkGroup = 'sound-point-modal-link-group'
let dataZoomSyncing = false
let modalChartsResizeObserver: ResizeObserver | null = null

const audioPath = ref('')
const voiceVisible = ref(false)

const pointName = ref('')
const deviceName = ref('')
const currentDataTime = ref('')

const clusterName = ref('')
const productionEquipment = ref('')
const subComponent = ref('')
const detectionEquipment = ref('')
const microphone = ref('')
const currentDeviationValue = ref('0.00')

const colors = [
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
  '#d48265',
  '#91c7ae',
  '#749f83',
  '#ca8622',
  '#bda29a',
  '#6e7074',
  '#8ec6ad',
  '#ff9f7f',
  '#fb7293',
  '#e7bcf3',
  '#ffdb5c',
  '#9fe6b8',
  '#ff9e7d',
]

// y 轴刻度最多保留小数点后两位（并去掉无意义的尾随 0）
const formatYAxisTick = (v: unknown) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(2)))
}

interface DeviationListItem {
  id: string
  time: string
  deviationValue: number
  visible: boolean
  color?: string
  dbArr: (number | string)[]
  densityArr: (number | string)[]
  freqs: string[]
  filePath?: string
  receiverId?: string
  sampleSec?: number
  deviceName?: string
  pointName?: string
  clusterName?: string
  productionEquipment?: string
  subComponent?: string
  detectionEquipment?: string
  microphone?: string
}

const deviationList = ref<DeviationListItem[]>([])

const syncSelectedColors = () => {
  const selected = deviationList.value.filter((item) => item.visible)
  selected.forEach((item, index) => {
    item.color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`
  })
  deviationList.value.forEach((item) => {
    if (!item.visible) item.color = undefined
  })
}

function applyStorePointInfo() {
  const rid = receiverId.value
  if (!rid) return
  const point = pointMessageStore.getPointByKey(rid)
  if (!point) return
  clusterName.value = point.groupName ?? ''
  productionEquipment.value = point.productName ?? ''
  subComponent.value = point.subProductName ?? ''
  detectionEquipment.value = point.detectorName ?? ''
  microphone.value = point.receiverName ?? ''
  pointName.value = point.pointName ?? ''
  deviceName.value = point.productName ?? ''
}

const handleRowClick = (row: any) => {
  row.visible = !row.visible
  currentDataTime.value = row.time
  currentDeviationValue.value = row.deviationValue.toFixed(2)
  handleSelectChange()
}

const handleChartInit = (charts: any) => {}

const handleSelectChange = () => {
  syncSelectedColors()
  loadFrequencyData()
}

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
    const raw = item as any
    return {
      id: String(item.id ?? index),
      time: formatDateTime(item.time),
      deviationValue: Number(item.deviationValue || 0),
      visible: index === 0,
      color: index === 0 ? colors[0] : undefined,
      dbArr: item.dbArray ?? [],
      densityArr: item.densityArray ?? [],
      freqs,
      filePath: item.filePath,
      receiverId: item.receiverId,
      sampleSec: item.sampleSec,
      deviceName: raw.deviceName ?? '',
      pointName: raw.pointName ?? '',
      clusterName: raw.sceneName ?? '',
      productionEquipment: raw.deviceName ?? '',
      subComponent: raw.subProductName ?? '',
      detectionEquipment: raw.detectorName ?? '',
      microphone: raw.receiverName ?? '',
    }
  })
}

const loadDeviationList = async () => {
  try {
    const res = await getLatestDeviationByReceiver({
      receiverId: receiverId.value || undefined,
    })
    const rawList = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray((res as any)?.ret)
          ? (res as any).ret
          : []
    const mapped = normalizeDeviationList(rawList)
    deviationList.value = mapped
    syncSelectedColors()

    const firstRaw = rawList[0] as any
    const firstItem = mapped[0]
    if (firstItem) {
      currentDataTime.value = firstItem.time
      currentDeviationValue.value = firstItem.deviationValue.toFixed(2)
    }
    if (firstRaw && typeof firstRaw === 'object') {
      pointName.value = firstRaw.pointName ?? ''
      deviceName.value = firstRaw.deviceName ?? ''
      clusterName.value = firstRaw.sceneName ?? ''
      productionEquipment.value = firstRaw.deviceName ?? ''
      subComponent.value = firstRaw.subProductName ?? ''
      detectionEquipment.value = firstRaw.detectorName ?? ''

      microphone.value = firstRaw.receiverName ?? ''
      if (firstItem?.id) {
        audioPath.value = getWavByFreqGroupIdUrl(firstItem.id)
      }
    } else {
      pointName.value = ''
      deviceName.value = ''
      clusterName.value = ''
      productionEquipment.value = ''
      subComponent.value = ''
      detectionEquipment.value = ''
      microphone.value = ''
      audioPath.value = ''
    }

    applyStorePointInfo()

    await loadFrequencyData()
  } catch (error) {
    console.error('加载声音偏差数据失败:', error)
    ElMessage.error('声音偏差数据加载失败，请稍后重试')
  }
}

const applyFrequencyResponse = (
  freqs: number[],
  responseList: any[],
  mode: 'energy' | 'density',
) => {
  if (!Array.isArray(responseList) || responseList.length === 0) return
  responseList.forEach((res) => {
    const recordId = (res as any)?.recordId
    const recordIdStr = recordId != null ? String(recordId) : ''
    const recordIdNum = typeof recordId === 'number' ? recordId : Number(recordId)
    const recordIdNumValid = Number.isFinite(recordIdNum)

    const target = deviationList.value.find((item) => {
      const itemIdStr = item?.id != null ? String(item.id) : ''
      if (recordIdStr && itemIdStr && recordIdStr === itemIdStr) return true
      if (recordIdNumValid) {
        const itemIdNum = Number(item?.id)
        return Number.isFinite(itemIdNum) && itemIdNum === recordIdNum
      }
      return false
    })
    if (!target) return
    const dbArr = Array.isArray(res.dbArray) ? res.dbArray : []
    const densityArr = Array.isArray(res.densityArray) ? res.densityArray : []
    const sourceArr = mode === 'energy' ? dbArr : densityArr
    const xFreqs =
      freqs.length > 0
        ? freqs
        : sourceArr.length > 0
          ? Array.from({ length: sourceArr.length }, (_, i) => i + 1)
          : target.freqs.map((f) => Number(f))

    if (xFreqs && xFreqs.length > 0) {
      target.freqs = xFreqs.map((f) => Number(f).toFixed(1))
    }

    if (mode === 'energy') {
      target.dbArr = dbArr
    } else {
      target.densityArr = densityArr
    }
  })

  const first = responseList[0]
  if (first?.time) {
    currentDataTime.value = formatDateTime(String(first.time))
  }

  if (chartsComponentRef.value && typeof chartsComponentRef.value.updateCharts === 'function') {
    chartsComponentRef.value.updateCharts()
  }
}

const loadFrequencyData = async () => {
  const selectedIds = deviationList.value
    .filter((item) => item.visible)
    .map((item) => (item?.id != null ? String(item.id) : ''))
    .filter(Boolean)
  if (selectedIds.length === 0) {
    if (chartsComponentRef.value && typeof chartsComponentRef.value.updateCharts === 'function') {
      chartsComponentRef.value.updateCharts()
    }
    return
  }

  const loadOnce = async (type: number, mode: 'energy' | 'density') => {
    const res = await getStandardFrequencyList({
      recordIdList: selectedIds,
      type,
    })
    const body = (res as any)?.data ?? (res as any)?.ret ?? res
    const freqs = Array.isArray(body?.freqs) ? body.freqs : []
    const responseList = Array.isArray(body?.responseList) ? body.responseList : []
    applyFrequencyResponse(freqs, responseList, mode)
  }

  try {
    await loadOnce(0, 'energy')
    await loadOnce(1, 'density')
  } catch (error) {
    console.error('加载频率曲线失败:', error)
    ElMessage.error('频率曲线加载失败')
  }
}

const viewDetails = async (row: any) => {
  try {
    const res = await findLatestFrequencyById({ id: row.id, type: 2 })
    const ret = (res as any)?.ret ?? res
    const soundFrequencyDtoList = ret?.soundFrequencyDtoList ?? []
    // 仅展示能量/密度曲线，不展示标准曲线
    // const soundAvgFrequencyDtoList = ret?.soundAvgFrequencyDtoList ?? []

    const XARR: string[] = []
    const nowdbArr: (number | undefined)[] = []
    const nowdensityArr: number[] = []
    // const avgdbArr: (number | undefined)[] = []
    // const avgdensityArr: number[] = []

    for (let i = 0; i < soundFrequencyDtoList.length; i++) {
      const item = soundFrequencyDtoList[i]
      const f1 = Number(item?.freq1 ?? 0)
      const f2 = Number(item?.freq2 ?? 0)
      XARR.push(Number(Math.sqrt(f1 * f2)).toFixed(1))
      // “查看曲线”弹窗内的 y 值保留 6 位小数（不影响 y 轴刻度 formatter）
      nowdbArr.push(item?.db != null ? Number(Number(item.db).toFixed(6)) : undefined)
      nowdensityArr.push(Number(Number(item?.density ?? 0).toFixed(6)))
    }
    // 不再组装标准曲线数据

    voiceVisible.value = true
    nextTick(() => {
      const baseGrid = { left: 40, right: 30, top: 30, bottom: 50, containLabel: true }
      const dataZoom = [
        { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
        { type: 'slider', xAxisIndex: [0], bottom: 10, height: 20, filterMode: 'none' },
      ]

      const applyDataZoom = (source: echarts.ECharts, target: echarts.ECharts | null) => {
        if (!target || dataZoomSyncing) return
        const opt = source.getOption()
        const dz = (opt as any).dataZoom as Array<{ start?: number; end?: number }> | undefined
        const first = Array.isArray(dz) && dz.length > 0 ? dz[0] : undefined
        if (first) {
          const start = first.start
          const end = first.end
          if (start != null && end != null) {
            dataZoomSyncing = true
            target.setOption({
              dataZoom: [
                { type: 'inside', xAxisIndex: [0], filterMode: 'none', start, end },
                {
                  type: 'slider',
                  xAxisIndex: [0],
                  bottom: 10,
                  height: 20,
                  filterMode: 'none',
                  start,
                  end,
                },
              ],
            } as any)
            setTimeout(() => {
              dataZoomSyncing = false
            }, 0)
          }
        }
      }

      if (modalEnergyChartRef.value) {
        if (modalEnergyChartInstance.value) {
          modalEnergyChartInstance.value.dispose()
          modalEnergyChartInstance.value = null
        }
        modalEnergyChartInstance.value = echarts.init(modalEnergyChartRef.value)
        modalEnergyChartInstance.value.group = modalChartLinkGroup
        modalEnergyChartInstance.value.setOption({
          tooltip: {
            trigger: 'axis',
            triggerOn: 'mousemove|click',
            className: 'echarts-tooltip',
            appendToBody: true,
            extraCssText: 'z-index: 99999 !important;',
          },
          axisPointer: { link: [{ xAxisIndex: 'all' }] },
          grid: baseGrid,
          legend: { show: false },
          xAxis: [
            {
              type: 'category',
              data: XARR,
              boundaryGap: false,
              axisLabel: { fontSize: 12, margin: 8, showMaxLabel: true, hideOverlap: true },
            },
          ],
          yAxis: [{ type: 'value', name: '能量', axisLabel: { formatter: formatYAxisTick } }],
          dataZoom: [...dataZoom],
          series: [
            { name: '能量', type: 'line', data: nowdbArr, symbolSize: 1 },
          ],
        })
        enableMouseWheelZoom(modalEnergyChartInstance.value)
        modalEnergyChartInstance.value.on('dataZoom', () => {
          const src = modalEnergyChartInstance.value
          const tgt = modalDensityChartInstance.value
          if (src && tgt) applyDataZoom(src, tgt)
        })
      }

      if (modalDensityChartRef.value) {
        if (modalDensityChartInstance.value) {
          modalDensityChartInstance.value.dispose()
          modalDensityChartInstance.value = null
        }
        modalDensityChartInstance.value = echarts.init(modalDensityChartRef.value)
        modalDensityChartInstance.value.group = modalChartLinkGroup
        modalDensityChartInstance.value.setOption({
          tooltip: {
            trigger: 'axis',
            triggerOn: 'mousemove|click',
            className: 'echarts-tooltip',
            appendToBody: true,
            extraCssText: 'z-index: 99999 !important;',
          },
          axisPointer: { link: [{ xAxisIndex: 'all' }] },
          grid: baseGrid,
          legend: { show: false },
          xAxis: [
            {
              type: 'category',
              data: XARR,
              boundaryGap: false,
              axisLabel: { fontSize: 10, margin: 8, showMaxLabel: true, hideOverlap: true },
            },
          ],
          yAxis: [{ type: 'value', name: '密度', axisLabel: { formatter: formatYAxisTick } }],
          dataZoom: [...dataZoom],
          series: [
            { name: '密度', type: 'line', data: nowdensityArr, symbolSize: 1 },
          ],
        })
        enableMouseWheelZoom(modalDensityChartInstance.value)
        modalDensityChartInstance.value.on('dataZoom', () => {
          const src = modalDensityChartInstance.value
          const tgt = modalEnergyChartInstance.value
          if (src && tgt) applyDataZoom(src, tgt)
        })
      }

      if (modalEnergyChartInstance.value && modalDensityChartInstance.value) {
        echarts.connect(modalChartLinkGroup)
      }
    })
  } catch (e) {
    console.error('查看曲线失败', e)
    ElMessage.error('加载曲线数据失败')
  }
}

const downloadFile = async (id: string) => {
  const url = getWavByFreqGroupIdUrl(id)
  ElMessage.info('正在下载文件')
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) throw new Error(res.statusText)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sound_${id}.wav`
    a.click()
    URL.revokeObjectURL(a.href)
    ElMessage.success('下载完成')
  } catch {
    window.location.href = url
    setTimeout(() => ElMessage.success('下载完成'), 2000)
  }
}

const playAudio = (row: DeviationListItem) => {
  pointName.value = row.pointName ?? ''
  deviceName.value = row.deviceName ?? ''
  clusterName.value = row.clusterName ?? ''
  productionEquipment.value = row.productionEquipment ?? ''
  subComponent.value = row.subComponent ?? ''
  detectionEquipment.value = row.detectionEquipment ?? ''
  microphone.value = row.microphone ?? ''
  currentDataTime.value = row.time
  currentDeviationValue.value = row.deviationValue.toFixed(2)
  audioPath.value = getWavByFreqGroupIdUrl(row.id)
  nextTick(() => {
    const el = document.querySelector('.info-section-right audio') as HTMLAudioElement
    if (el) el.play().catch(() => {})
  })
  ElMessage.success('正在播放音频')
}

const handleModalOpened = () => {
  document.body.style.overflow = 'hidden'
  modalChartsResizeObserver?.disconnect()
  modalChartsResizeObserver = null
  const doResize = () => {
    try {
      modalEnergyChartInstance.value?.resize()
      modalDensityChartInstance.value?.resize()
    } catch (error) {
      console.warn('Modal chart resize failed:', error)
    }
  }
  setTimeout(doResize, 0)
  const container = document.querySelector('.voice-detail-dialog .el-dialog__body')
  if (container) {
    modalChartsResizeObserver = new ResizeObserver(() => setTimeout(doResize, 0))
    modalChartsResizeObserver.observe(container)
  }
}

const handleModalClosed = () => {
  document.body.style.overflow = ''
  modalChartsResizeObserver?.disconnect()
  modalChartsResizeObserver = null
  echarts.disconnect(modalChartLinkGroup)
  if (modalEnergyChartInstance.value) {
    modalEnergyChartInstance.value.dispose()
    modalEnergyChartInstance.value = null
  }
  if (modalDensityChartInstance.value) {
    modalDensityChartInstance.value.dispose()
    modalDensityChartInstance.value = null
  }
}

const handleResize = () => {
  if (!voiceVisible.value) return
  setTimeout(() => {
    try {
      modalEnergyChartInstance.value?.resize()
      modalDensityChartInstance.value?.resize()
    } catch (error) {
      console.warn('Modal chart resize failed:', error)
    }
  }, 0)
}

watch(
  () => route.params.receiverId,
  (newId, oldId) => {
    if (newId !== oldId) {
      syncTreeSelectionFromRoute()
      applyStorePointInfo()
      loadDeviationList()
    }
  },
)

watch(equipmentIdFromQuery, () => {
  syncTreeSelectionFromRoute()
})

watch(pointNameFromQuery, () => {
  syncTreeSelectionFromRoute()
})

watch(
  () => deviceTreeStore.deviceTreeData.length,
  () => {
    syncTreeSelectionFromRoute()
  },
)

watch(
  () => deviceTreeStore.loading,
  (loading) => {
    if (!loading) syncTreeSelectionFromRoute()
  },
)

onMounted(() => {
  syncTreeSelectionFromRoute()
  applyStorePointInfo()
  loadDeviationList()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  echarts.disconnect(modalChartLinkGroup)
  modalEnergyChartInstance.value?.dispose()
  modalDensityChartInstance.value?.dispose()
})
</script>

<style lang="scss" scoped>
.sound-point-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .bottom-section {
    display: flex;
    flex: 1;
    gap: 10px;
    height: 50%;
    overflow: hidden;
  }
}

:deep(.voice-detail-dialog) {
  overflow: hidden !important;

  .el-dialog {
    height: 95vh;
    max-height: 95vh;
    margin: 0 !important;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .el-dialog__header {
    flex-shrink: 0;
  }

  .el-dialog__body {
    flex: 1;
    min-height: 0;
    overflow: hidden !important;
    padding: 12px 20px;
    display: flex;
    flex-direction: column;
  }
}

.modal-charts {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  min-height: 0;
  flex: 1;

  .modal-chart-item {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .modal-chart-dom {
      width: 100%;
      height: 40vh;
    }
  }
}
</style>
