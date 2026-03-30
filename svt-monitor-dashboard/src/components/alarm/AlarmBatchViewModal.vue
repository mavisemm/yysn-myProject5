<template>
  <el-dialog
    v-model="visible"
    title="预警详情"
    width="1100px"
    height="90vh"
    align-center
    class="alarm-batch-view-dialog"
    destroy-on-close
  >
    <div class="voiceContainer">
      <div class="voiceContainerItem">
        <div class="panelTitle">预警信息：{{ currentEventTypeName }}</div>
        <div class="panelRow">
          <span class="k">发生时间：</span>
          <span class="v">{{ eventTimeText }}</span>
        </div>
        <div class="panelRow">
          <span class="k">预警类型：</span>
          <span class="v">{{ currentEventTypeName }}</span>
        </div>
        <div class="panelRow">
          <span class="k">设备名称：</span>
          <span class="v">{{ currentDeviceName }}</span>
        </div>
        <div class="panelRow">
          <span class="k">点位名称：</span>
          <span class="v">{{ currentPointName }}</span>
        </div>
        <div class="panelRow">
          <span class="k">听筒名称：</span>
          <span class="v">{{ currentReceiverName }}</span>
        </div>
        <div class="panelRow">
          <span class="k">偏差值：</span>
          <span class="v">{{ currentDeviationValueText }}</span>
        </div>
        <div class="audioRow">
          <audio v-if="audioSrc" class="audioPlayer" :src="audioSrc" controls />
          <div v-else class="audioEmpty">暂无音频</div>
        </div>
      </div>

      <div class="voiceContainerItem">
        <div class="panelTitle">操作</div>
        <div class="controlsBox">
          <div class="controlsRow">
            <el-button
              type="success"
              size="large"
              :disabled="!currentEventId"
              class="controlBtnLarge"
              @click="onConfirmYes"
            >
              确认预警
            </el-button>
            <el-button
              type="warning"
              size="large"
              :disabled="!currentEventId"
              class="controlBtnLarge"
              @click="notVisible = true"
            >
              确认误报
            </el-button>
          </div>
          <div class="controlsRow controlsRow--ai">
            <el-button
              type="primary"
              size="large"
              :disabled="!currentEventId"
              class="controlBtnLarge"
              @click="openAIModal"
            >
              智能故障分析
            </el-button>
          </div>
        </div>
      </div>

      <div class="voiceContainerItem">
        <div class="panelTitle">能量曲线图</div>
        <div ref="energyChartRef" class="chart-dom" />
        <div v-if="!canRenderCharts" class="no-chart no-chart--overlay">暂无能量曲线</div>
      </div>

      <div class="voiceContainerItem">
        <div class="panelTitle">密度曲线图</div>
        <div ref="densityChartRef" class="chart-dom" />
        <div v-if="!canRenderCharts" class="no-chart no-chart--overlay">暂无密度曲线</div>
      </div>
    </div>

    <el-dialog
      v-model="notVisible"
      title="选择误报类型"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="resetNotModal"
    >
      <div class="modalBlock">
        <div class="modalLabel">选择误报类型</div>
        <el-select v-model="notType" placeholder="请选择" style="width: 100%" size="small">
          <el-option v-for="it in notTypeList" :key="it.key" :label="it.text" :value="it.key" />
        </el-select>
      </div>
      <div class="modalBlock">
        <div class="modalLabel">误报名称</div>
        <el-input v-model="notName" placeholder="请输入" size="small" />
      </div>
      <template #footer>
        <el-button size="small" @click="notVisible = false">取消</el-button>
        <el-button size="small" type="warning" @click="onConfirmNot">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="yesVisible"
      title="异常预警"
      width="620px"
      destroy-on-close
      :close-on-click-modal="false"
      @open="onYesModalOpen"
      @closed="resetYesModal"
    >
      <div class="modalBlock">
        <el-select
          v-model="yesExceptionId"
          placeholder="历史异常库"
          style="width: 100%"
          size="small"
          class="historySelect"
          popper-class="historySelectPopper"
        >
          <el-option label="重置" value="" />
          <el-option v-for="it in abnormalList" :key="it.id" :label="it.name" :value="it.id" />
        </el-select>
      </div>
      <div class="modalBlock">
        <div class="modalLabel">新增异常预警名称</div>
        <el-input v-model="yesNewName" placeholder="请输入" size="small" />
      </div>
      <div class="modalHint">提示：历史异常库或新增异常库 二选一。</div>
      <template #footer>
        <el-button size="small" @click="yesVisible = false">取消</el-button>
        <el-button size="small" type="success" @click="onConfirmSoundYes">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="aiModalVisible"
      title="智能故障分析"
      width="760px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="resetAiModal"
    >
      <div class="aiHeader">
        <div class="aiMeta">设备名称：{{ nosceneVoiceRet?.productName ?? '暂无' }}</div>
        <div class="aiMeta">点位名称：{{ nosceneVoiceRet?.subProductName ?? '暂无' }}</div>
        <div class="aiMeta">设备参数：{{ nosceneVoiceRet?.deviceModel ?? '暂无' }}</div>
        <div class="aiMeta">生产厂家：{{ nosceneVoiceRet?.productionFactory ?? '暂无' }}</div>
      </div>

      <div class="modalBlock">
        <div class="modalLabel">分析补充信息（可选）</div>
        <el-input v-model="aiTextMessage" type="textarea" :rows="5" placeholder="请输入" />
      </div>

      <div class="aiButtons">
        <el-button size="small" type="primary" :loading="aiLoading" @click="fetchAIModelAnalysis(false)">
          开始分析
        </el-button>
        <el-button size="small" :loading="aiLoading" @click="fetchAIModelAnalysis(true)">
          更新分析
        </el-button>
      </div>

      <div v-if="aiLoading" class="aiLoading">正在分析故障原因...</div>
      <div v-else class="aiResult">
        <div v-if="!aiHtmlContent" class="aiEmpty">暂无分析结果</div>
        <div v-else class="aiContent" v-html="aiHtmlContent" />
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

import { apiConfirmYes } from '@/api/modules/alarmBatch'
import {
  apiConfirmSoundNot,
  apiConfirmSoundYes,
  apiGetAbnormalHistory,
  apiGetDevicePosition,
  apiGetEventById
} from '@/api/modules/alarmDetail'
import {
  askAIModel,
  getLatestFrequencyByReceiver,
  getLatestFrequencyByReceiverNoScene,
  getWavByFreqGroupIdUrl
} from '@/api/modules/voiceSound'

import { getTenantId } from '@/api/tenant'
import { enableMouseWheelZoom } from '@/utils/chart'

const props = defineProps<{
  modelValue: boolean
  row: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const energyChartRef = ref<HTMLDivElement | null>(null)
const densityChartRef = ref<HTMLDivElement | null>(null)
const energyChart = shallowRef<echarts.ECharts | null>(null)
const densityChart = shallowRef<echarts.ECharts | null>(null)
const chartLinkGroup = 'alarm-batch-view-link-group'

const disposeCharts = () => {
  try {
    energyChart.value?.dispose()
  } catch {
    
  }
  try {
    densityChart.value?.dispose()
  } catch {
    
  }
  energyChart.value = null
  densityChart.value = null
}

function safeParseJson(input: any): any {
  if (!input) return undefined
  if (typeof input === 'object') return input
  if (typeof input !== 'string') return undefined
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

const eventDetail = ref<any | null>(null)
const dataParse = ref<any | null>(null)
const position = ref<any | null>(null)

const notVisible = ref(false)
const notTypeList = [
  { key: '0', text: '环境干扰' },
  { key: '1', text: '新场景' }
]
const notType = ref<string>('0')
const notName = ref('')

const yesVisible = ref(false)
const abnormalList = ref<Array<{ id: string; name: string }>>([])
const yesExceptionId = ref<string | undefined>(undefined)
const yesNewName = ref('')

const aiModalVisible = ref(false)
const aiLoading = ref(false)
const aiTextMessage = ref('')
const aiMarkdownContent = ref<string>('')
const aiHtmlContent = ref<string>('')
const nosceneVoiceRet = ref<any | null>(null)

const currentEventId = computed(() => {
  return String(eventDetail.value?.id ?? eventDetail.value?.eventId ?? props.row?.id ?? props.row?.eventId ?? '')
})

const currentEventTypeCode = computed(() => {
  return String(eventDetail.value?.eventTypeCode ?? props.row?.eventTypeCode ?? '')
})
const isNoSceneSoundWarn = computed(() => currentEventTypeCode.value === 'NO_SCENE_SOUND_WARN')

const currentEventTypeName = computed(() => {
  return eventDetail.value?.eventType?.name ?? currentEventTypeCode.value ?? '-'
})

function formatDateTime(input: unknown): string {
  if (input == null || input === '') return '-'
  const raw = String(input).trim()
  if (!raw) return '-'

  const n = Number(raw)
  let date: Date
  if (Number.isFinite(n)) {
    const ms = n < 1e12 ? n * 1000 : n
    date = new Date(ms)
  } else {
    date = new Date(raw)
  }
  if (Number.isNaN(date.getTime())) return raw

  const pad = (v: number) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const eventTimeText = computed(() => {
  const t = eventDetail.value?.time ?? props.row?.time ?? eventDetail.value?._timeText ?? props.row?._timeText
  return formatDateTime(t)
})

const currentStatusText = computed(() => {
  return eventDetail.value?.statusText ?? eventDetail.value?.statusCode ?? props.row?.statusText ?? props.row?.statusCode ?? '-'
})

const currentDeviceName = computed(() =>
  eventDetail.value?.deviceName
  ?? props.row?.deviceName
  ?? (isNoSceneSoundWarn.value ? nosceneVoiceRet.value?.deviceName : undefined)
  ?? (isNoSceneSoundWarn.value ? nosceneVoiceRet.value?.productName : undefined)
  ?? eventDetail.value?.equipmentName
  ?? props.row?.equipmentName
  ?? '-'
)
const currentPointName = computed(() =>
  (isNoSceneSoundWarn.value ? nosceneVoiceRet.value?.subProductName : undefined)
  ?? eventDetail.value?.subProductName
  ?? props.row?.subProductName
  ?? eventDetail.value?.pointName
  ?? props.row?.pointName
  ?? '-'
)
const currentReceiverName = computed(() =>
  (isNoSceneSoundWarn.value ? nosceneVoiceRet.value?.receiverName : undefined)
  ?? eventDetail.value?.receiverName
  ?? props.row?.receiverName
  ?? '-'
)

const currentDeviationValueText = computed(() => {
  const raw =
    dataParse.value?.deviationValue ??
    dataParse.value?.deviation_value ??
    dataParse.value?.deviation ??
    dataParse.value?.deviationVal ??
    eventDetail.value?.deviationValue ??
    eventDetail.value?.deviation ??
    (props.row as any)?.deviationValue ??
    (props.row as any)?.deviation

  if (raw == null || raw === '') return '-'
  if (typeof raw === 'string') return raw.trim() || '-'
  const num = Number(raw)
  if (!Number.isFinite(num)) return String(raw)

  
  let s = num.toFixed(4)
  s = s.replace(/\.?0+$/, '')
  return s || '-'
})

const currentFreqGroupId = computed<string>(() => {
  
  const id = dataParse.value?.frepGroupId
  return id == null || id === '' ? '' : String(id)
})

const audioSrc = computed(() => {
  
  const freqGroupId = currentFreqGroupId.value
  if (!freqGroupId) return ''
  try {
    return getWavByFreqGroupIdUrl(freqGroupId)
  } catch {
    return ''
  }
})

const receiverId = computed(() => {
  
  return (
    dataParse.value?.receiverId ??
    dataParse.value?.receiverID ??
    dataParse.value?.receiver_id ??
    eventDetail.value?.receiverId ??
    eventDetail.value?.receiverID ??
    (props.row as any)?.receiverId ??
    (props.row as any)?.receiverID ??
    ''
  )
})

const deviceId = computed(() =>
  eventDetail.value?.equipmentId
  ?? dataParse.value?.equipmentId
  ?? props.row?.equipmentId
  ?? ''
)
const pointId = computed(() =>
  dataParse.value?.pointId
  ?? dataParse.value?.point_id
  ?? dataParse.value?.subProductId
  ?? eventDetail.value?.pointId
  ?? eventDetail.value?.subProductId
  ?? (props.row as any)?.pointId
  ?? (props.row as any)?.subProductId
  ?? localStorage.getItem('pointId')
  ?? ''
)

const positionText = computed(() => {
  if (position.value == null) return '-'
  
  return '已获取位置/点位信息'
})

const canRenderCharts = computed(() => {
  const code = currentEventTypeCode.value
  return !!receiverId.value && (code === 'FREQUENCY_SOUND_WARN' || code === 'SOUND_HISTORY_WARN' || code === 'NO_SCENE_SOUND_WARN')
})

const renderEnergyDensityChartsFromFrequency = async (bins: Array<any>) => {
  if (!energyChartRef.value || !densityChartRef.value) return
  disposeCharts()
  await nextTick()
  energyChart.value = echarts.init(energyChartRef.value)
  densityChart.value = echarts.init(densityChartRef.value)
  energyChart.value.group = chartLinkGroup
  densityChart.value.group = chartLinkGroup
  echarts.connect(chartLinkGroup)

  const xArr: string[] = []
  const nowDbArr: (number | undefined)[] = []
  const nowDensityArr: number[] = []

  for (const item of bins ?? []) {
    const f1 = Number(item?.freq1 ?? 0)
    const f2 = Number(item?.freq2 ?? 0)
    xArr.push(Number(Math.sqrt(f1 * f2)).toFixed(0))
    nowDbArr.push(item?.db != null ? Number(Number(item.db).toFixed(2)) : undefined)
    nowDensityArr.push(Number(Number(item?.density ?? 0).toFixed(4)))
  }

  const baseGrid = { left: 40, right: 20, top: 30, bottom: 50 }
  const dataZoom = [
    { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
    { type: 'slider', xAxisIndex: [0], bottom: 10, height: 20, filterMode: 'none' }
  ]

  energyChart.value.setOption({
    tooltip: { trigger: 'axis', appendToBody: true, extraCssText: 'z-index:99999 !important;' },
    grid: baseGrid,
    legend: { show: false },
    xAxis: [{ type: 'category', data: xArr, boundaryGap: false }],
    yAxis: [{ type: 'value', name: '能量' }],
    dataZoom,
    series: [{ name: '能量', type: 'line', data: nowDbArr, symbolSize: 1, lineStyle: { width: 1 } }]
  })

  densityChart.value.setOption({
    tooltip: { trigger: 'axis', appendToBody: true, extraCssText: 'z-index:99999 !important;' },
    grid: baseGrid,
    legend: { show: false },
    xAxis: [{ type: 'category', data: xArr, boundaryGap: false }],
    yAxis: [{ type: 'value', name: '密度' }],
    dataZoom,
    series: [{ name: '密度', type: 'line', data: nowDensityArr, symbolSize: 1, lineStyle: { width: 1 } }]
  })

  enableMouseWheelZoom(energyChart.value)
  enableMouseWheelZoom(densityChart.value)
}

const renderEnergyDensityChartsFromNoScene = async (ret: any) => {
  if (!energyChartRef.value || !densityChartRef.value) return
  disposeCharts()
  await nextTick()
  energyChart.value = echarts.init(energyChartRef.value)
  densityChart.value = echarts.init(densityChartRef.value)
  energyChart.value.group = chartLinkGroup
  densityChart.value.group = chartLinkGroup
  echarts.connect(chartLinkGroup)

  const soundFrequencyDtoList = Array.isArray(ret?.soundFrequencyDtoList) ? ret.soundFrequencyDtoList : []
  const soundAvgFrequencyDtoList = Array.isArray(ret?.soundAvgFrequencyDtoList) ? ret.soundAvgFrequencyDtoList : []

  const xArr: string[] = []
  const nowDbArr: (number | undefined)[] = []
  const nowDensityArr: number[] = []
  const avgDbArr: (number | undefined)[] = []
  const avgDensityArr: number[] = []

  for (const item of soundFrequencyDtoList) {
    const f1 = Number(item?.freq1 ?? 0)
    const f2 = Number(item?.freq2 ?? 0)
    xArr.push(Number(Math.sqrt(f1 * f2)).toFixed(0))
    nowDbArr.push(item?.db != null ? Number(Number(item.db).toFixed(2)) : undefined)
    nowDensityArr.push(Number(Number(item?.density ?? 0).toFixed(4)))
  }

  for (const item of soundAvgFrequencyDtoList) {
    avgDbArr.push(item?.db != null ? Number(Number(item.db).toFixed(2)) : undefined)
    avgDensityArr.push(Number(Number(item?.density ?? 0).toFixed(4)))
  }

  const baseGrid = { left: 40, right: 20, top: 30, bottom: 50 }
  const dataZoom = [
    { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
    { type: 'slider', xAxisIndex: [0], bottom: 10, height: 20, filterMode: 'none' }
  ]

  energyChart.value.setOption({
    tooltip: { trigger: 'axis', appendToBody: true, extraCssText: 'z-index:99999 !important;' },
    grid: baseGrid,
    legend: { show: false },
    xAxis: [{ type: 'category', data: xArr, boundaryGap: false }],
    yAxis: [{ type: 'value', name: '能量' }],
    dataZoom,
    series: [
      { name: '能量', type: 'line', data: nowDbArr, symbolSize: 1, lineStyle: { width: 1 } },
      ...(avgDbArr.length > 0 ? [{ name: '标准能量线', type: 'line', data: avgDbArr, symbolSize: 1, lineStyle: { width: 1 } }] : [])
    ]
  })

  densityChart.value.setOption({
    tooltip: { trigger: 'axis', appendToBody: true, extraCssText: 'z-index:99999 !important;' },
    grid: baseGrid,
    legend: { show: false },
    xAxis: [{ type: 'category', data: xArr, boundaryGap: false }],
    yAxis: [{ type: 'value', name: '密度' }],
    dataZoom,
    series: [
      { name: '密度', type: 'line', data: nowDensityArr, symbolSize: 1, lineStyle: { width: 1 } },
      ...(avgDensityArr.length > 0 ? [{ name: '标准密度线', type: 'line', data: avgDensityArr, symbolSize: 1, lineStyle: { width: 1 } }] : [])
    ]
  })

  enableMouseWheelZoom(energyChart.value)
  enableMouseWheelZoom(densityChart.value)
}

const loadEvent = async () => {
  if (!props.row?.id) return

  eventDetail.value = null
  dataParse.value = null
  position.value = null
  disposeCharts()

  try {
    const res = await apiGetEventById({ id: props.row.id })
    if (res?.rc === 0 && res?.ret) {
      eventDetail.value = res.ret
    } else {
      
      eventDetail.value = props.row
    }
  } catch {
    eventDetail.value = props.row
  }

  const rawDataJson = eventDetail.value?.dataJson ?? props.row?.dataJson
  dataParse.value = safeParseJson(rawDataJson) ?? {}

  
  try {
    if (deviceId.value) {
      const posRes = await apiGetDevicePosition({ objectId: deviceId.value })
      if (posRes?.rc === 0 && posRes?.ret) position.value = posRes.ret
    }
  } catch {
    position.value = null
  }

  
  const code = currentEventTypeCode.value
  const rid = receiverId.value
  if (rid && code === 'FREQUENCY_SOUND_WARN') {
    const r = await getLatestFrequencyByReceiver({ receiverId: String(rid), type: 2 })
    await renderEnergyDensityChartsFromFrequency((r as any)?.ret ?? [])
  } else if (rid && code === 'SOUND_HISTORY_WARN') {
    const r = await getLatestFrequencyByReceiver({ receiverId: String(rid), type: 2 })
    await renderEnergyDensityChartsFromFrequency((r as any)?.ret ?? [])
  } else if (rid && code === 'NO_SCENE_SOUND_WARN') {
    const r = await getLatestFrequencyByReceiverNoScene({ receiverId: String(rid), type: 2 })
    nosceneVoiceRet.value = (r as any)?.ret ?? null
    await renderEnergyDensityChartsFromNoScene((r as any)?.ret ?? {})
  } else {
    
    disposeCharts()
  }
}

watch(
  () => [visible.value, props.row],
  async ([v]) => {
    if (!v) {
      eventDetail.value = null
      dataParse.value = null
      position.value = null
      disposeCharts()
      return
    }
    try {
      await loadEvent()
    } catch (e) {
      console.error('AlarmBatchViewModal loadEvent failed:', e)
      ElMessage.error('预警详情加载失败')
    }
  },
  { immediate: false }
)

const resultDtoList = computed(() => {
  const list = dataParse.value?.resultDtoList
  return Array.isArray(list) ? list : []
})

const onConfirmYes = async () => {
  const id = currentEventId.value
  if (!id) return

  try {
    
    if (currentEventTypeCode.value === 'NO_SCENE_SOUND_WARN' && resultDtoList.value.length === 0) {
      yesVisible.value = true
      return
    }

    await apiConfirmYes([id])
    ElMessage.success('操作成功')
    visible.value = false
  } catch (e) {
    console.error(e)
    ElMessage.error('确认预警失败')
  }
}

const resetNotModal = () => {
  notVisible.value = false
  notType.value = '0'
  notName.value = ''
}

const onConfirmNot = async () => {
  const id = currentEventId.value
  if (!id) return
  if (!notName.value.trim()) {
    ElMessage.error('请填写误报名称')
    return
  }

  try {
    await apiConfirmSoundNot({
      type: notType.value,
      name: notName.value.trim(),
      id,
      tenantId: getTenantId() || ''
    })
    ElMessage.success('操作成功')
    notVisible.value = false
    visible.value = false
  } catch (e) {
    console.error(e)
    ElMessage.error('确认误报失败')
  }
}

const resetYesModal = () => {
  yesExceptionId.value = undefined
  yesNewName.value = ''
}

const onYesModalOpen = async () => {
  yesExceptionId.value = undefined
  yesNewName.value = ''

  const pid = pointId.value
  if (!pid) return

  try {
    const tid = getTenantId() || ''
    const payload = {
      filterPropertyMap: [
        { code: 'tenantId', operate: 'EQ', value: tid },
        { code: 'type', operate: 'EQ', value: 0 },
        { code: 'pointId', operate: 'EQ', value: pid }
      ],
      sortValueMap: [{ code: 'time', sort: 'desc' }]
    }
    const res = await apiGetAbnormalHistory(payload)
    abnormalList.value = (res as any)?.ret?.items ?? (res as any)?.ret?.item ?? []
  } catch (e) {
    console.error(e)
    abnormalList.value = []
  }
}

const onConfirmSoundYes = async () => {
  const id = currentEventId.value
  if (!id) return

  const tid = getTenantId() || ''

  if (yesNewName.value.trim() && yesExceptionId.value) {
    ElMessage.error('历史异常库或者新增异常库二选一！')
    return
  }
  if (!yesNewName.value.trim() && !yesExceptionId.value) {
    ElMessage.error('历史异常库或者新增异常库二选一,不能同时为空！')
    return
  }

  try {
    await apiConfirmSoundYes({
      name: yesNewName.value.trim() || undefined,
      exceptionId: yesExceptionId.value,
      id,
      tenantId: tid
    })
    ElMessage.success('操作成功')
    yesVisible.value = false
    visible.value = false
  } catch (e) {
    console.error(e)
    ElMessage.error('确认异常预警失败')
  }
}

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) {
    return '<div style="text-align:center; color:#666; padding:20px;">暂无故障分析结果</div>'
  }
  let html = markdown
    .replace(/\*\*([^*]+?)\*\*/g, '<strong style="font-weight:bold; color:#333;">$1</strong>')
    .replace(/\n{0,2}---\n{0,2}/g, '<hr style="border:none; border-top:1px solid #777; margin:25px 0; width:100%;" />')
    .replace(/\n{2,}/g, '</div><div style="margin:15px 0; line-height:1.6;">')
    .replace(/\n/g, '<br/>')
  if (!html.startsWith('<div')) html = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif; color:#333; padding:0 5px;">' + html
  html = html + '</div>'
  return html
}

const fetchNoSceneVoiceRet = async () => {
  if (nosceneVoiceRet.value) return nosceneVoiceRet.value
  const rid = receiverId.value
  if (!rid) return null
  const r = await getLatestFrequencyByReceiverNoScene({ receiverId: String(rid), type: 2 })
  nosceneVoiceRet.value = (r as any)?.ret ?? null
  return nosceneVoiceRet.value
}

const openAIModal = async () => {
  aiModalVisible.value = true
  aiLoading.value = false
  aiTextMessage.value = ''
  aiMarkdownContent.value = ''
  aiHtmlContent.value = ''

  try {
    await fetchNoSceneVoiceRet()
  } catch {
    
  }
}

const resetAiModal = () => {
  aiLoading.value = false
  aiTextMessage.value = ''
  aiMarkdownContent.value = ''
  aiHtmlContent.value = ''
}

const fetchAIModelAnalysis = async (isUpdate: boolean) => {
  const id = currentEventId.value
  if (!id) return

  const base = await fetchNoSceneVoiceRet()
  if (!base) {
    ElMessage.warning('暂无基础数据，无法进行故障分析')
    return
  }

  try {
    aiLoading.value = true
    aiMarkdownContent.value = ''
    aiHtmlContent.value = ''

    const tid = getTenantId() || ''
    const requestParams = {
      ...base,
      tenantId: tid,
      textMessage: aiTextMessage.value,
      update: isUpdate ? 1 : 0
    }

    const res = await askAIModel(requestParams)
    const md = (res as any)?.ret ?? (res as any)?.data?.ret
    if ((res as any)?.rc === 0 && md) {
      aiMarkdownContent.value = md
      aiHtmlContent.value = parseMarkdownToHtml(md)
      aiLoading.value = false
      return
    }

    aiLoading.value = false
    ElMessage.error('请求失败，请稍后重试')
  } catch (e) {
    console.error(e)
    aiLoading.value = false
    ElMessage.error('故障分析接口调用失败')
  }
}

onBeforeUnmount(() => {
  disposeCharts()
})
</script>

<style scoped lang="scss">
.alarm-batch-view-dialog {
  height: 90vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.alarm-batch-view-dialog :deep(.el-dialog__wrapper) {
  height: 90vh;
  max-height: 90vh;
}

.alarm-batch-view-dialog :deep(.el-dialog) {
  height: 90vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  font-size: 15px;
}

.alarm-batch-view-dialog :deep(.el-dialog__body) {
  padding: 12px 16px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.voiceContainer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  height: 100%;
  min-height: 0;
  color: #303133;
}

.voiceContainerItem {
  background: #fff;
  height: 100%;
  position: relative;
  overflow-y: auto;
  border-radius: 10px;
  border: 1px solid rgba(30, 144, 255, 0.18);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panelTitle {
  flex-shrink: 0;
  padding: 10px 12px 6px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.72);
  font-size: 16px;
}

.panelRow {
  padding: 8px 12px;
  color: rgba(0, 0, 0, 0.78);
  font-size: 14px;
  display: flex;
  gap: 8px;
}

.k {
  color: rgba(0, 0, 0, 0.55);
  min-width: 46px;
}

.chart-dom {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.chartStack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 0 6px 6px;
}

.chartSubTitle {
  flex: 0 0 auto;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  padding: 0 6px;
}

.chart-dom--half {
  height: 38%;
  flex: 0 0 auto;
}

.no-chart {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}

.no-chart--overlay {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0 10px;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 10px;
}

.controlsBox {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 6px 6px;
  justify-content: center;
  align-items: center;
}

.controlsRow {
  display: flex;
  gap: 10px;
  flex-wrap: nowrap;
  width: 100%;
  max-width: 320px;
  justify-content: center;
}

.modalBlock {
  margin-bottom: 12px;
}

.modalLabel {
  margin-bottom: 6px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
}

.modalHint {
  color: #e74c3c;
  font-size: 13px;
  margin: -6px 0 12px;
}

.aiHeader {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  margin-bottom: 12px;
}

.aiMeta {
  font-size: 14px;
  margin-bottom: 6px;
  color: rgba(0, 0, 0, 0.65);
}

.aiButtons {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.aiLoading {
  padding: 30px 0;
  text-align: center;
  color: rgba(0, 0, 0, 0.65);
}

.aiResult {
  max-height: 45vh;
  overflow-y: auto;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
  padding: 12px;
}

.aiEmpty {
  color: rgba(0, 0, 0, 0.45);
  text-align: center;
  padding: 40px 0;
}

.aiContent {
  color: rgba(0, 0, 0, 0.78);
  line-height: 1.7;
}

.audioRow {
  margin-top: auto;
  padding: 0 6px 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audioPlayer {
  width: 100%;
}

.audioEmpty {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  padding: 10px 0;
}

.controlBtnLarge {
  width: 180px;
  min-width: 180px;
  height: 44px;
  font-size: 16px;
}

.controlsRow--ai {
  justify-content: center;
}

.historySelect :deep(.el-input__inner) {
  font-size: 12px !important;
}

:deep(.historySelectPopper .el-select-dropdown__item),
:deep(.historySelectPopper .el-select-dropdown__item span) {
  font-size: 12px !important;
}
</style>

