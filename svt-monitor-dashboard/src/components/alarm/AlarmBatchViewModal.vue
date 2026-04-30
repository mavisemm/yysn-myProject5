<template>
  <el-dialog
    v-model="visible"
    :title="isWarningEvent ? '预警详情' : '报警详情'"
    width="1100px"
    height="90vh"
    align-center
    class="alarm-batch-view-dialog"
    destroy-on-close>
    <div class="voiceContainer">
      <div class="voiceContainerItem">
        <div class="panelTitle">
          {{ isWarningEvent ? '预警信息' : '报警信息' }}：{{ currentEventTypeName }}
        </div>
        <div class="panelRow">
          <span class="k">发生时间：</span>
          <span class="v">{{ eventTimeText }}</span>
        </div>
        <div class="panelRow">
          <span class="k">{{ isWarningEvent ? '预警类型：' : '报警类型：' }}</span>
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
          <span class="k">{{ isWarningEvent ? '偏差值：' : '报警值：' }}</span>
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
              type="danger"
              size="large"
              :disabled="!currentEventId"
              class="controlBtnLarge"
              @click="onConfirmYes"
            >
              {{ isWarningEvent ? '确认预警' : '确认报警' }}
            </el-button>
            <el-button type="warning" size="large" :disabled="!currentEventId" class="controlBtnLarge"
              @click="notVisible = true">
              确认误报
            </el-button>
          </div>
          <div class="controlsRow controlsRow--ai">
            <el-button type="primary" size="large" :disabled="!currentEventId" class="controlBtnLarge"
              @click="openAIModal">
              智能故障分析
            </el-button>
          </div>
        </div>
      </div>

      <div class="voiceContainerItem">
        <div class="panelTitle panelTitle--with-actions">
          <span>{{ isWarningEvent ? '能量曲线图' : '振动频域图' }}</span>
          <div v-if="!isWarningEvent" class="chartTitleActions">
            <el-select v-model="freqAxis" size="small" class="axisSelect">
              <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-button text size="small" class="fullscreenBtn" @click="openFreqFullscreen">
              全屏显示
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </div>
        </div>
        <div v-if="isWarningEvent" ref="energyChartRef" class="chart-dom" />
        <div v-else ref="vibrationFreqChartRef" class="chart-dom" />
        <div v-if="showEnergyNoChart" class="no-chart no-chart--overlay">
          {{ isWarningEvent ? '暂无能量曲线' : '暂无振动频域图' }}
        </div>
      </div>

      <div class="voiceContainerItem">
        <div class="panelTitle panelTitle--with-actions">
          <span>{{ isWarningEvent ? '密度曲线图' : '振动时域图' }}</span>
          <div v-if="!isWarningEvent" class="chartTitleActions">
            <el-select v-model="timeAxis" size="small" class="axisSelect">
              <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-button text size="small" class="fullscreenBtn" @click="openTimeFullscreen">
              全屏显示
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </div>
        </div>
        <div v-if="isWarningEvent" ref="densityChartRef" class="chart-dom" />
        <div v-else ref="vibrationTimeChartRef" class="chart-dom" />
        <div v-if="showDensityNoChart" class="no-chart no-chart--overlay">
          {{ isWarningEvent ? '暂无密度曲线' : '暂无振动时域图' }}
        </div>
      </div>
    </div>

    <el-dialog v-model="notVisible" title="选择误报类型" width="520px" class="alarm-batch-sub-dialog" destroy-on-close
      :close-on-click-modal="false" @closed="resetNotModal">
      <div class="modalBlock">
        <div class="modalLabel">选择误报类型</div>
        <el-select v-model="notType" placeholder="请选择" style="width: 100%" size="small" class="notTypeSelect"
          popper-class="notTypeSelectPopper">
          <el-option v-for="it in notTypeList" :key="it.key" :label="it.text" :value="it.key" />
        </el-select>
      </div>
      <div class="modalBlock">
        <div class="modalLabel">误报名称</div>
        <el-input v-model="notName" placeholder="请输入" size="small" />
      </div>
      <template #footer>
        <el-button size="small" @click="notVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="onConfirmNot">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="yesVisible" title="异常预警" width="620px" class="alarm-batch-sub-dialog" destroy-on-close
      :close-on-click-modal="false" @open="onYesModalOpen" @closed="resetYesModal">
      <div class="modalBlock">
        <el-select v-model="yesExceptionId" placeholder="历史异常库" style="width: 100%" size="small" class="historySelect"
          popper-class="historySelectPopper" @change="onYesExceptionChange">
          <el-option label="重置" :value="YES_RESET_VALUE" />
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
        <el-button size="small" type="primary" @click="onConfirmSoundYes">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="aiModalVisible" title="智能故障分析" width="760px" class="alarm-batch-sub-dialog" destroy-on-close
      :close-on-click-modal="false" @closed="resetAiModal">
      <div class="aiHeader">
        <div class="aiMeta">设备名称：{{ nosceneVoiceRet?.productName ?? '暂无' }}</div>
        <div class="aiMeta">点位名称：{{ nosceneVoiceRet?.subProductName ?? '暂无' }}</div>
        <div class="aiMeta">
          设备参数：{{
            getTenantId() === '39ad1946358f48d7a90067761aed48d5'
              ? '6203-2RZ'
              : (nosceneVoiceRet?.deviceModel ?? '暂无')
          }}
        </div>
        <div class="aiMeta">
          生产厂家：{{
            getTenantId() === '39ad1946358f48d7a90067761aed48d5'
              ? '洛阳轴承集团'
              : (nosceneVoiceRet?.productionFactory ?? '暂无')
          }}
        </div>
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

    <el-dialog
      v-model="freqFullscreenVisible"
      fullscreen
      append-to-body
      destroy-on-close
      class="alarm-vibration-fullscreen-dialog"
      modal-class="alarm-vibration-fullscreen-modal"
      @opened="onFreqFullscreenOpened"
      @closed="onFreqFullscreenClosed">
      <template #header>
        <div class="vibrationFullscreenHeader">
          <span>振动频域图</span>
          <el-select v-model="freqAxis" size="small" class="axisSelect axisSelect--fullscreen">
            <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
      </template>
      <div class="freq-fullscreen-top">
        <span class="freq-fullscreen-divider" aria-hidden="true" />
        <div class="freq-filter-inline">
          <span class="freq-filter-label">频率筛选：</span>
          <el-input-number v-model="fullscreenRangeMin" :min="safeFullscreenRangeDataMin"
            :max="safeFullscreenRangeDataMax" :step="FREQ_FILTER_STEP" size="small" placeholder="最小"
            controls-position="right" class="freq-filter-num" @blur="confirmFullscreenRange" />
          <span class="freq-filter-sep">~</span>
          <el-input-number v-model="fullscreenRangeMax" :min="safeFullscreenRangeDataMin"
            :max="safeFullscreenRangeDataMax" :step="FREQ_FILTER_STEP" size="small" placeholder="最大"
            controls-position="right" class="freq-filter-num" @blur="confirmFullscreenRange" />
          <el-button size="small" type="primary" @click="confirmFullscreenRange">确认</el-button>
          <el-button size="small" @click="resetFullscreenRange">重置</el-button>
          <span class="freq-filter-divider" aria-hidden="true" />
          <span class="freq-filter-label">打标功能：</span>
          <el-button size="small" :disabled="!currentPinnedPointId" @click="clearCurrentPinnedPoint">
            清除当前标记
          </el-button>
          <el-button size="small" :disabled="!pinnedFreqPoints.length" @click="clearAllPinnedPoints">
            清除全部标记
          </el-button>
        </div>
      </div>
      <div ref="freqFullscreenChartRef" class="vibrationFullscreenChart" />
    </el-dialog>

    <el-dialog
      v-model="timeFullscreenVisible"
      fullscreen
      append-to-body
      destroy-on-close
      class="alarm-vibration-fullscreen-dialog"
      modal-class="alarm-vibration-fullscreen-modal"
      @opened="onTimeFullscreenOpened"
      @closed="onTimeFullscreenClosed">
      <template #header>
        <div class="vibrationFullscreenHeader">
          <span>振动时域图</span>
          <el-select v-model="timeAxis" size="small" class="axisSelect axisSelect--fullscreen">
            <el-option v-for="opt in axisOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
      </template>
      <div ref="timeFullscreenChartRef" class="vibrationFullscreenChart" />
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { FullScreen } from '@element-plus/icons-vue'

import { apiConfirmYes } from '@/api/modules/alarmBatch'
import {
  apiConfirmSoundNot,
  apiConfirmSoundYes,
  apiGetAbnormalHistory,
  apiGetDevicePosition,
  apiGetEventById,
} from '@/api/modules/alarmDetail'
import {
  askAIModel,
  getLatestFrequencyByReceiver,
  getLatestFrequencyByReceiverNoScene,
  getWavByFreqGroupIdUrl,
} from '@/api/modules/voiceSound'
import { getVibrationFrequencyData, getVibrationTimeDomainData, type VibrationAxis } from '@/api/modules/device'

import { getTenantId } from '@/api/tenant'
import { enableMouseWheelZoom } from '@/utils/chart'
import { useRangeControls } from '@/composables/useRangeControls'
import {
  buildPersistentMarkPointData,
  removeCurrentPersistentPoint,
  upsertPersistentPoint,
  type EchartsPersistentPoint,
} from '@/utils/echartsPointMarker'

const props = defineProps<{
  modelValue: boolean
  row: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const energyChartRef = ref<HTMLDivElement | null>(null)
const densityChartRef = ref<HTMLDivElement | null>(null)
const vibrationFreqChartRef = ref<HTMLDivElement | null>(null)
const vibrationTimeChartRef = ref<HTMLDivElement | null>(null)
const freqFullscreenChartRef = ref<HTMLDivElement | null>(null)
const timeFullscreenChartRef = ref<HTMLDivElement | null>(null)
const energyChart = shallowRef<echarts.ECharts | null>(null)
const densityChart = shallowRef<echarts.ECharts | null>(null)
const vibrationFreqChart = shallowRef<echarts.ECharts | null>(null)
const vibrationTimeChart = shallowRef<echarts.ECharts | null>(null)
const vibrationFreqFullscreenChart = shallowRef<echarts.ECharts | null>(null)
const vibrationTimeFullscreenChart = shallowRef<echarts.ECharts | null>(null)
const chartLinkGroup = 'alarm-batch-view-link-group'
const axisOptions: { label: string; value: VibrationAxis }[] = [
  { label: 'X轴', value: 'X' },
  { label: 'Y轴', value: 'Y' },
  { label: 'Z轴', value: 'Z' },
]
const freqAxis = ref<VibrationAxis>('X')
const timeAxis = ref<VibrationAxis>('X')
const freqFullscreenVisible = ref(false)
const timeFullscreenVisible = ref(false)
const pointerBaseFreq = ref<number | null>(null)
let markLineRafId: number | null = null
let lastHarmonicBaseFreq: number | null = null
const FREQ_FILTER_STEP = 1
const FREQ_FILTER_PRECISION = 6
const pinnedFreqPoints = ref<EchartsPersistentPoint[]>([])
const currentPinnedPointId = ref<string>('')
const vibrationFreqData = ref<{ frequency: number[]; freqSpeedData: number[] }>({
  frequency: [],
  freqSpeedData: [],
})
const vibrationTimeData = ref<number[]>([])
const vibrationTotalTime = ref(0)

const disposeCharts = () => {
  try {
    energyChart.value?.dispose()
  } catch { }
  try {
    densityChart.value?.dispose()
  } catch { }
  try {
    vibrationFreqChart.value?.dispose()
  } catch { }
  try {
    vibrationTimeChart.value?.dispose()
  } catch { }
  try {
    vibrationFreqFullscreenChart.value?.dispose()
  } catch { }
  try {
    vibrationTimeFullscreenChart.value?.dispose()
  } catch { }
  energyChart.value = null
  densityChart.value = null
  vibrationFreqChart.value = null
  vibrationTimeChart.value = null
  vibrationFreqFullscreenChart.value = null
  vibrationTimeFullscreenChart.value = null
  pointerBaseFreq.value = null
  lastHarmonicBaseFreq = null
  if (markLineRafId != null) {
    cancelAnimationFrame(markLineRafId)
    markLineRafId = null
  }
}

// y 轴刻度最多保留小数点后两位（并去掉无意义的尾随 0）
const formatYAxisTick = (v: unknown) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(2)))
}

const formatFreqYAxisTick = (v: number | string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(5)
}

const getSortedFreqChartData = () => {
  return vibrationFreqData.value.frequency
    .map((freq, index) => [Number(freq), Number(vibrationFreqData.value.freqSpeedData[index] ?? 0)] as [number, number])
    .filter((it) => Number.isFinite(it[0]) && Number.isFinite(it[1]))
    .sort((a, b) => a[0] - b[0])
}

const formatFrequency = (v: number | string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(6)))
}

const toFreqKey = (v: number) => Number(v).toFixed(6)

const buildHarmonicMarkLineData = (baseFreq: number) => {
  if (!Number.isFinite(baseFreq) || baseFreq <= 0) return []
  const chartData = getSortedFreqChartData()
  const xMax = chartData.length > 0 ? Math.max(...chartData.map((x) => x[0])) : 0
  const pointMap = new Map<string, [number, number]>()
  for (const item of chartData) pointMap.set(toFreqKey(item[0]), item)
  const hasExactPoint = (x: number) => pointMap.has(toFreqKey(x))
  const candidates: Array<{ x: number; color: string; requirePoint: boolean }> = [
    { x: baseFreq, color: '#7ecba1', requirePoint: false },
    { x: baseFreq * 2, color: '#60a5fa', requirePoint: true },
    { x: baseFreq * 3, color: '#f59e0b', requirePoint: true },
    { x: baseFreq * 4, color: '#f472b6', requirePoint: true },
  ]
  return candidates
    .filter((item) => item.x > 0 && item.x <= xMax)
    .filter((item) => (item.requirePoint ? hasExactPoint(item.x) : true))
    .map((item) => ({
      xAxis: item.x,
      lineStyle: { type: 'dashed', width: 1, color: item.color, opacity: 0.9 },
      label: { show: false },
    }))
}

const buildVibrationFreqOption = (theme: 'inline' | 'fullscreen' = 'inline') => {
  const chartData = getSortedFreqChartData()
  if (!chartData.length) return {}
  const axisColor = theme === 'fullscreen' ? '#fff' : '#303133'
  const splitLineColor = theme === 'fullscreen' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
  const xMin = Math.min(...chartData.map((x) => x[0]))
  const xMax = Math.max(...chartData.map((x) => x[0]))
  const yValues = chartData.map((item) => item[1])
  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 1
  const yMargin = (yMax - yMin) * 0.1
  const yMinWithMargin = Math.max(0, yMin - yMargin)
  const yMaxWithMargin = yMax + yMargin
  const pointMap = new Map<string, [number, number]>(chartData.map((item) => [toFreqKey(item[0]), item]))
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params?.length || !params[0]?.value) return ''
        const value = params[0].value
        const x = Number(value[0])
        const y = Number(value[1])
        if (!Number.isFinite(x) || !Number.isFinite(y)) return ''
        let text = `${formatFrequency(x)}Hz：${y.toFixed(10)}`
        const append = (mult: number, label: string) => {
          const fx = x * mult
          const p = pointMap.get(toFreqKey(fx))
          if (p) text += `<br/>${label}：${formatFrequency(fx)}Hz：${p[1].toFixed(10)}`
        }
        append(2, '二倍频')
        append(3, '三倍频')
        append(4, '四倍频')
        return text
      },
    },
    grid: { top: 30, left: 40, right: 50, bottom: 35, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Hz',
      min: xMin,
      max: xMax,
      nameTextStyle: { color: axisColor },
      axisLabel: { color: axisColor, margin: 8, showMaxLabel: true, hideOverlap: true },
      axisLine: { lineStyle: { color: axisColor } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'mm/s',
      min: yMinWithMargin,
      max: yMaxWithMargin,
      nameTextStyle: { color: axisColor },
      axisLabel: { color: axisColor, formatter: formatFreqYAxisTick },
      axisLine: { lineStyle: { color: axisColor } },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
      { type: 'slider', xAxisIndex: [0], bottom: 10, height: 20, filterMode: 'none' },
    ],
    series: [
      {
        id: 'freq-series',
        type: 'line',
        smooth: false,
        showSymbol: false,
        animation: false,
        data: chartData,
        lineStyle: { color: '#7ecba1', width: 1 },
        markLine: { silent: true, symbol: ['none', 'none'], animation: false, data: [] },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(126, 203, 161, 0.8)' },
            { offset: 1, color: 'rgba(126, 203, 161, 0.2)' },
          ]),
        },
      },
    ],
  }
}

const buildVibrationTimeOption = (theme: 'inline' | 'fullscreen' = 'inline') => {
  if (vibrationTimeData.value.length === 0 || vibrationTotalTime.value <= 0) return {}
  const axisColor = theme === 'fullscreen' ? '#fff' : '#303133'
  const splitLineColor = theme === 'fullscreen' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
  const dataPoints = vibrationTimeData.value.length
  const step = dataPoints > 1 ? vibrationTotalTime.value / (dataPoints - 1) : 0
  const chartData = vibrationTimeData.value.map((value, index) => [dataPoints > 1 ? index * step : 0, value])
  return {
    tooltip: { trigger: 'axis' },
    grid: { top: 30, left: 40, right: 50, bottom: 35, containLabel: true },
    xAxis: {
      type: 'value',
      name: 's',
      min: 0,
      max: vibrationTotalTime.value,
      nameTextStyle: { color: axisColor },
      axisLabel: { color: axisColor, margin: 8, showMaxLabel: true, hideOverlap: true },
      axisLine: { lineStyle: { color: axisColor } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'mm/s',
      nameTextStyle: { color: axisColor },
      axisLabel: { color: axisColor, formatter: formatYAxisTick },
      axisLine: { lineStyle: { color: axisColor } },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
      { type: 'slider', xAxisIndex: [0], bottom: 10, height: 20, filterMode: 'none' },
    ],
    series: [
      {
        type: 'line',
        smooth: false,
        showSymbol: false,
        sampling: 'lttb',
        data: chartData,
        lineStyle: { color: '#7ecba1', width: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(126, 203, 161, 0.8)' },
            { offset: 1, color: 'rgba(126, 203, 161, 0.2)' },
          ]),
        },
      },
    ],
  }
}

const getPinnedMarkPointData = () =>
  buildPersistentMarkPointData(
    pinnedFreqPoints.value,
    currentPinnedPointId.value,
    {
      formatX: (v) => `${formatFrequency(v)}Hz`,
      formatY: (v) => Number(v).toFixed(10),
    },
    {
      activeSymbolSize: 9,
      inactiveSymbolSize: 7,
      activeColor: '#ffd166',
      inactiveColor: '#ff6b6b',
      borderColor: '#fff',
      borderWidth: 1,
    },
  )

const patchPinnedMarkPoints = () => {
  const patch = {
    series: [{ id: 'freq-series', markPoint: { animation: false, data: getPinnedMarkPointData() } }],
  } as any
  try { vibrationFreqChart.value?.setOption(patch, { notMerge: false, lazyUpdate: true }) } catch { }
  try { vibrationFreqFullscreenChart.value?.setOption(patch, { notMerge: false, lazyUpdate: true }) } catch { }
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
  { key: '1', text: '新场景' },
]
const notType = ref<string>('0')
const notName = ref('')

const yesVisible = ref(false)
const abnormalList = ref<Array<{ id: string; name: string }>>([])
const yesExceptionId = ref<string | undefined>(undefined)
const yesNewName = ref('')

const YES_RESET_VALUE = '__RESET__'
const onYesExceptionChange = (v: any) => {
  if (v === YES_RESET_VALUE) {
    yesExceptionId.value = undefined
  }
}

const aiModalVisible = ref(false)
const aiLoading = ref(false)
const aiTextMessage = ref('')
const aiMarkdownContent = ref<string>('')
const aiHtmlContent = ref<string>('')
const nosceneVoiceRet = ref<any | null>(null)

const currentEventId = computed(() => {
  return String(eventDetail.value?.id ?? props.row?.id ?? '')
})

const currentEventTypeCode = computed(() => {
  return String(eventDetail.value?.eventTypeCode ?? props.row?.eventTypeCode ?? '')
})
const isNoSceneSoundWarn = computed(() => currentEventTypeCode.value === 'NO_SCENE_SOUND_WARN')

const isWarningEvent = computed(() => {
  const code = currentEventTypeCode.value || ''
  // 声音侧：以 *_WARN 结尾的事件视为“预警”，其余为“报警”（主要是振动报警）
  return code.endsWith('_WARN')
})

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
  const t =
    eventDetail.value?.time ??
    props.row?.time ??
    eventDetail.value?._timeText ??
    props.row?._timeText
  return formatDateTime(t)
})

const alarmTime = computed(() => {
  const raw =
    (eventDetail.value as any)?.alarmTime ??
    (props.row as any)?.alarmTime ??
    eventDetail.value?.time ??
    props.row?.time
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
})

const currentStatusText = computed(() => {
  return (
    eventDetail.value?.statusText ??
    eventDetail.value?.statusCode ??
    props.row?.statusText ??
    props.row?.statusCode ??
    '-'
  )
})

const currentDeviceName = computed(
  () => eventDetail.value?.deviceName ?? props.row?.deviceName ?? '-',
)
const currentPointName = computed(() => eventDetail.value?.pointName ?? props.row?.pointName ?? '-')
const currentReceiverName = computed(
  () => eventDetail.value?.receiverName ?? props.row?.receiverName ?? '-',
)

const currentDeviationValueText = computed(() => {
  const raw =
    dataParse.value?.deviationValue ??
    eventDetail.value?.deviationValue ??
    (props.row as any)?.deviationValue

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
    eventDetail.value?.receiverId ??
    (props.row as any)?.receiverId ??
    ''
  )
})

const deviceId = computed(() => {
  // 振动报警频域接口需要的 deviceId：优先使用当前行数据的 deviceId
  return (
    (eventDetail.value as any)?.deviceId ??
    (props.row as any)?.deviceId ??
    (eventDetail.value as any)?.equipmentId ??
    (props.row as any)?.equipmentId ??
    dataParse.value?.equipmentId ??
    ''
  )
})
const pointId = computed(
  () => dataParse.value?.pointId ?? eventDetail.value?.pointId ?? (props.row as any)?.pointId ?? '',
)

const positionText = computed(() => {
  if (position.value == null) return '-'

  return '已获取位置/点位信息'
})

const canRenderCharts = computed(() => {
  const code = currentEventTypeCode.value
  // 声音预警：使用声音频谱接口
  if (isWarningEvent.value) {
    return (
      !!receiverId.value &&
      (code === 'FREQUENCY_SOUND_WARN' ||
        code === 'SOUND_HISTORY_WARN' ||
        code === 'NO_SCENE_SOUND_WARN')
    )
  }
  // 振动报警：需要有设备和测点（听筒）信息
  return !!deviceId.value && !!receiverId.value
})

const hasVibrationFrequencyData = ref(false)
const hasVibrationTimeData = ref(false)

const showEnergyNoChart = computed(() => {
  if (isWarningEvent.value) return !canRenderCharts.value
  return !hasVibrationFrequencyData.value
})

const showDensityNoChart = computed(() => {
  if (isWarningEvent.value) return !canRenderCharts.value
  return !hasVibrationTimeData.value
})

const logFrequencyDebugInfo = (tag: string, payload: any) => {
  const bins = Array.isArray(payload) ? payload : []
  const dbList = bins
    .map((x: any) => Number(x?.db))
    .filter((n: number) => Number.isFinite(n))
  const densityList = bins
    .map((x: any) => Number(x?.density))
    .filter((n: number) => Number.isFinite(n))
  const maxDb = dbList.length ? Math.max(...dbList) : undefined
  const minDb = dbList.length ? Math.min(...dbList) : undefined
  const maxDensity = densityList.length ? Math.max(...densityList) : undefined
  const minDensity = densityList.length ? Math.min(...densityList) : undefined
  const sample = bins.slice(0, 5).map((x: any) => ({
    freq1: x?.freq1,
    freq2: x?.freq2,
    db: x?.db,
    density: x?.density,
  }))
}

const toSafeNumber = (
  value: unknown,
  opts: { min?: number; max?: number; fixed?: number } = {},
): number | undefined => {
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  if (opts.min != null && n < opts.min) return undefined
  if (opts.max != null && n > opts.max) return undefined
  if (opts.fixed == null) return n
  return Number(n.toFixed(opts.fixed))
}

const openFreqFullscreen = () => {
  if (isWarningEvent.value) return
  freqFullscreenVisible.value = true
}

const openTimeFullscreen = () => {
  if (isWarningEvent.value) return
  timeFullscreenVisible.value = true
}

const applyHarmonicMarkLines = (baseFreq: number) => {
  const data = buildHarmonicMarkLineData(baseFreq)
  const patch = { series: [{ id: 'freq-series', markLine: { data } }] } as any
  try { vibrationFreqChart.value?.setOption(patch, { notMerge: false, lazyUpdate: true }) } catch { }
  try { vibrationFreqFullscreenChart.value?.setOption(patch, { notMerge: false, lazyUpdate: true }) } catch { }
}

const scheduleHarmonicMarkLines = (baseFreq: number) => {
  if (markLineRafId != null) cancelAnimationFrame(markLineRafId)
  markLineRafId = requestAnimationFrame(() => {
    markLineRafId = null
    if (lastHarmonicBaseFreq != null && Math.abs(lastHarmonicBaseFreq - baseFreq) < 1e-6) return
    lastHarmonicBaseFreq = baseFreq
    applyHarmonicMarkLines(baseFreq)
  })
}

const onFreqUpdateAxisPointer = (params: any) => {
  const info = Array.isArray(params?.axesInfo) ? params.axesInfo[0] : null
  const n = Number(info?.value)
  if (!Number.isFinite(n)) return
  pointerBaseFreq.value = n
  scheduleHarmonicMarkLines(n)
}

const pickNearestFreqPointByX = (x: number): [number, number] | null => {
  const chartData = getSortedFreqChartData()
  if (!chartData.length || !Number.isFinite(x)) return null
  let nearest: [number, number] | null = null
  let minDist = Number.POSITIVE_INFINITY
  for (const point of chartData) {
    const dist = Math.abs(point[0] - x)
    if (dist < minDist) {
      minDist = dist
      nearest = point
    }
  }
  return nearest
}

const refreshPinnedMarkPoints = () => {
  patchPinnedMarkPoints()
  void nextTick(() => patchPinnedMarkPoints())
}

const addPinnedFreqPoint = (x: number, y: number) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  const nextState = upsertPersistentPoint(pinnedFreqPoints.value, x, y, currentPinnedPointId.value)
  pinnedFreqPoints.value = nextState.points
  currentPinnedPointId.value = nextState.currentId
  refreshPinnedMarkPoints()
}

const addPinnedByPixel = (offsetX: number, offsetY: number) => {
  const inst = vibrationFreqFullscreenChart.value
  if (!inst || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return
  if (Number.isFinite(pointerBaseFreq.value)) {
    const nearestByPointer = pickNearestFreqPointByX(Number(pointerBaseFreq.value))
    if (nearestByPointer) {
      addPinnedFreqPoint(nearestByPointer[0], nearestByPointer[1])
      return
    }
  }
  let axisValue: unknown
  try {
    axisValue = inst.convertFromPixel({ xAxisIndex: 0 }, offsetX as any)
    if (!Number.isFinite(Array.isArray(axisValue) ? Number(axisValue[0]) : Number(axisValue))) {
      axisValue = inst.convertFromPixel({ xAxisIndex: 0 }, [offsetX, offsetY])
    }
  } catch {
    return
  }
  const x = Array.isArray(axisValue) ? Number(axisValue[0]) : Number(axisValue)
  if (!Number.isFinite(x)) return
  const nearest = pickNearestFreqPointByX(x)
  if (!nearest) return
  addPinnedFreqPoint(nearest[0], nearest[1])
}

const onFreqFullscreenChartClick = (params: any) => {
  const value = params?.value
  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0])
    const y = Number(value[1])
    if (Number.isFinite(x) && Number.isFinite(y)) {
      addPinnedFreqPoint(x, y)
      return
    }
  }
  addPinnedByPixel(Number(params?.event?.offsetX), Number(params?.event?.offsetY))
}

const clearCurrentPinnedPoint = () => {
  if (!currentPinnedPointId.value) return
  const nextState = removeCurrentPersistentPoint(pinnedFreqPoints.value, currentPinnedPointId.value)
  pinnedFreqPoints.value = nextState.points
  currentPinnedPointId.value = nextState.currentId
  refreshPinnedMarkPoints()
}

const clearAllPinnedPoints = () => {
  pinnedFreqPoints.value = []
  currentPinnedPointId.value = ''
  refreshPinnedMarkPoints()
}

const onFreqFullscreenZrClick = (evt: any) => {
  addPinnedByPixel(Number(evt?.offsetX), Number(evt?.offsetY))
}

const renderVibrationCharts = async () => {
  if (!vibrationFreqChartRef.value || !vibrationTimeChartRef.value) return
  try { vibrationFreqChart.value?.dispose() } catch { }
  try { vibrationTimeChart.value?.dispose() } catch { }
  vibrationFreqChart.value = echarts.init(vibrationFreqChartRef.value)
  vibrationTimeChart.value = echarts.init(vibrationTimeChartRef.value)
  vibrationFreqChart.value.setOption(buildVibrationFreqOption('inline'))
  vibrationTimeChart.value.setOption(buildVibrationTimeOption('inline'))
  vibrationFreqChart.value.off('updateAxisPointer', onFreqUpdateAxisPointer)
  vibrationFreqChart.value.on('updateAxisPointer', onFreqUpdateAxisPointer)
  enableMouseWheelZoom(vibrationFreqChart.value)
  enableMouseWheelZoom(vibrationTimeChart.value)
  patchPinnedMarkPoints()
  if (pointerBaseFreq.value && Number.isFinite(pointerBaseFreq.value)) {
    applyHarmonicMarkLines(pointerBaseFreq.value)
  }
}

const onFreqFullscreenOpened = async () => {
  await nextTick()
  if (!freqFullscreenChartRef.value) return
  try { vibrationFreqFullscreenChart.value?.dispose() } catch { }
  vibrationFreqFullscreenChart.value = echarts.init(freqFullscreenChartRef.value)
  vibrationFreqFullscreenChart.value.setOption(buildVibrationFreqOption('fullscreen'))
  vibrationFreqFullscreenChart.value.off('updateAxisPointer', onFreqUpdateAxisPointer)
  vibrationFreqFullscreenChart.value.on('updateAxisPointer', onFreqUpdateAxisPointer)
  vibrationFreqFullscreenChart.value.off('click', onFreqFullscreenChartClick)
  vibrationFreqFullscreenChart.value.on('click', onFreqFullscreenChartClick)
  vibrationFreqFullscreenChart.value.off('datazoom', handleFullscreenDataZoom as any)
  vibrationFreqFullscreenChart.value.on('datazoom', handleFullscreenDataZoom as any)
  const zr = vibrationFreqFullscreenChart.value.getZr?.()
  zr?.on?.('click', onFreqFullscreenZrClick)
  refreshPinnedMarkPoints()
  if (pointerBaseFreq.value && Number.isFinite(pointerBaseFreq.value)) {
    applyHarmonicMarkLines(pointerBaseFreq.value)
  }
}

const onFreqFullscreenClosed = () => {
  try { vibrationFreqFullscreenChart.value?.off('click', onFreqFullscreenChartClick) } catch { }
  try { vibrationFreqFullscreenChart.value?.off('datazoom', handleFullscreenDataZoom as any) } catch { }
  try { vibrationFreqFullscreenChart.value?.getZr?.().off?.('click', onFreqFullscreenZrClick) } catch { }
  try { vibrationFreqFullscreenChart.value?.dispose() } catch { }
  vibrationFreqFullscreenChart.value = null
  clearAllPinnedPoints()
}

const onTimeFullscreenOpened = async () => {
  await nextTick()
  if (!timeFullscreenChartRef.value) return
  try { vibrationTimeFullscreenChart.value?.dispose() } catch { }
  vibrationTimeFullscreenChart.value = echarts.init(timeFullscreenChartRef.value)
  vibrationTimeFullscreenChart.value.setOption(buildVibrationTimeOption('fullscreen'))
}

const onTimeFullscreenClosed = () => {
  try { vibrationTimeFullscreenChart.value?.dispose() } catch { }
  vibrationTimeFullscreenChart.value = null
}

const {
  rangeMin: fullscreenRangeMin,
  rangeMax: fullscreenRangeMax,
  rangeDataMin: fullscreenRangeDataMin,
  rangeDataMax: fullscreenRangeDataMax,
  applyRange: applyFullscreenRange,
  resetRange: resetFullscreenRange,
  handleDataZoom: handleFullscreenDataZoom,
} = useRangeControls({
  option: computed(() => buildVibrationFreqOption() as any),
  showRangeControls: computed(() => true),
  rangeControlsData: computed(() => vibrationFreqData.value.frequency || []),
  rangeControlsXAxisIndex: computed(() => 0),
  rangeControlsMin: computed(() => undefined),
  rangeControlsMax: computed(() => undefined),
  rangeControlsStep: computed(() => FREQ_FILTER_STEP),
  rangeControlsPrecision: computed(() => FREQ_FILTER_PRECISION),
  rangeControlsDebounceMs: computed(() => 600),
  preserveDataZoom: computed(() => true),
  doDataZoom: ({ startValue, endValue }) => {
    const action: any = { type: 'dataZoom', startValue, endValue, xAxisIndex: 0 }
    try { vibrationFreqFullscreenChart.value?.dispatchAction(action) } catch { }
  },
})

const confirmFullscreenRange = () => {
  applyFullscreenRange()
}

const safeFullscreenRangeDataMin = computed(() => {
  const v = Number(fullscreenRangeDataMin.value)
  return Number.isFinite(v) ? v : 0
})

const safeFullscreenRangeDataMax = computed(() => {
  const v = Number(fullscreenRangeDataMax.value)
  if (Number.isFinite(v) && v >= safeFullscreenRangeDataMin.value) return v
  return safeFullscreenRangeDataMin.value
})

const loadVibrationFrequencyByAxis = async () => {
  if (!deviceId.value || !receiverId.value) {
    vibrationFreqData.value = { frequency: [], freqSpeedData: [] }
    hasVibrationFrequencyData.value = false
    return
  }
  try {
    const res = await getVibrationFrequencyData(
      String(deviceId.value),
      String(receiverId.value),
      freqAxis.value,
      alarmTime.value,
    )
    const frequency = (res?.ret as any)?.frequency
    const freqSpeedData = (res?.ret as any)?.freqSpeedData
    if (res?.rc === 0 && Array.isArray(frequency) && Array.isArray(freqSpeedData) && frequency.length > 0 && freqSpeedData.length > 0) {
      vibrationFreqData.value = { frequency, freqSpeedData }
      hasVibrationFrequencyData.value = true
      await nextTick()
      await renderVibrationCharts()
      return
    }
  } catch (e) {
    console.error('load vibration frequency failed:', e)
  }
  vibrationFreqData.value = { frequency: [], freqSpeedData: [] }
  hasVibrationFrequencyData.value = false
  await nextTick()
  await renderVibrationCharts()
}

const loadVibrationTimeByAxis = async () => {
  if (!deviceId.value || !receiverId.value) {
    vibrationTimeData.value = []
    vibrationTotalTime.value = 0
    hasVibrationTimeData.value = false
    return
  }
  try {
    const res = await getVibrationTimeDomainData(String(deviceId.value), String(receiverId.value), timeAxis.value)
    if (res?.rc === 0 && res?.ret) {
      const raw = (res.ret as any).timedomaindata
      const parsed: number[] = Array.isArray(raw)
        ? raw.map((v: any) => (typeof v === 'number' ? v : parseFloat(String(v).trim()))).filter((n) => Number.isFinite(n))
        : String(raw ?? '').split(',').map((s) => parseFloat(s.trim())).filter((n) => Number.isFinite(n))
      const total = Number((res.ret as any).time)
      if (parsed.length > 0 && Number.isFinite(total) && total > 0) {
        vibrationTimeData.value = parsed
        vibrationTotalTime.value = total
        hasVibrationTimeData.value = true
        await nextTick()
        await renderVibrationCharts()
        return
      }
    }
  } catch (e) {
    console.error('load vibration time failed:', e)
  }
  vibrationTimeData.value = []
  vibrationTotalTime.value = 0
  hasVibrationTimeData.value = false
  await nextTick()
  await renderVibrationCharts()
}

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
  const nowDensityArr: (number | undefined)[] = []

  for (const item of bins ?? []) {
    const f1 = Number(item?.freq1 ?? 0)
    const f2 = Number(item?.freq2 ?? 0)
    xArr.push(Number(Math.sqrt(f1 * f2)).toFixed(0))
    nowDbArr.push(toSafeNumber(item?.db, { min: -2000, max: 2000, fixed: 2 }))
    nowDensityArr.push(toSafeNumber(item?.density, { min: -2000, max: 2000, fixed: 4 }))
  }

  const baseGrid = { left: 40, right: 20, top: 30, bottom: 50 }
  const dataZoom = [
    { type: 'inside', xAxisIndex: [0], filterMode: 'filter' },
    { type: 'slider', xAxisIndex: [0], bottom: 10, height: 20, filterMode: 'filter' },
  ]

  energyChart.value.setOption({
    tooltip: { trigger: 'axis', appendToBody: true, extraCssText: 'z-index:99999 !important;' },
    grid: baseGrid,
    legend: { show: false },
    xAxis: [{ type: 'category', data: xArr, boundaryGap: false }],
    yAxis: [{ type: 'value', name: '能量', axisLabel: { formatter: formatYAxisTick } }],
    dataZoom,
    series: [
      { name: '能量', type: 'line', data: nowDbArr, symbolSize: 1, lineStyle: { width: 1 } },
    ],
  })

  densityChart.value.setOption({
    tooltip: { trigger: 'axis', appendToBody: true, extraCssText: 'z-index:99999 !important;' },
    grid: baseGrid,
    legend: { show: false },
    xAxis: [{ type: 'category', data: xArr, boundaryGap: false }],
    yAxis: [{ type: 'value', name: '密度', axisLabel: { formatter: formatYAxisTick } }],
    dataZoom,
    series: [
      { name: '密度', type: 'line', data: nowDensityArr, symbolSize: 1, lineStyle: { width: 1 } },
    ],
  })

  enableMouseWheelZoom(energyChart.value)
  enableMouseWheelZoom(densityChart.value)
  hasVibrationFrequencyData.value = false
  hasVibrationTimeData.value = false
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

  const soundFrequencyDtoList = Array.isArray(ret?.soundFrequencyDtoList)
    ? ret.soundFrequencyDtoList
    : []
  const soundAvgFrequencyDtoList = Array.isArray(ret?.soundAvgFrequencyDtoList)
    ? ret.soundAvgFrequencyDtoList
    : []

  const xArr: string[] = []
  const nowDbArr: (number | undefined)[] = []
  const nowDensityArr: (number | undefined)[] = []
  const avgDbArr: (number | undefined)[] = []
  const avgDensityArr: (number | undefined)[] = []

  for (const item of soundFrequencyDtoList) {
    const f1 = Number(item?.freq1 ?? 0)
    const f2 = Number(item?.freq2 ?? 0)
    xArr.push(Number(Math.sqrt(f1 * f2)).toFixed(0))
    nowDbArr.push(toSafeNumber(item?.db, { min: -2000, max: 2000, fixed: 2 }))
    nowDensityArr.push(toSafeNumber(item?.density, { min: -2000, max: 2000, fixed: 4 }))
  }

  for (const item of soundAvgFrequencyDtoList) {
    avgDbArr.push(toSafeNumber(item?.db, { min: -2000, max: 2000, fixed: 2 }))
    avgDensityArr.push(toSafeNumber(item?.density, { min: -2000, max: 2000, fixed: 4 }))
  }

  const baseGrid = { left: 40, right: 20, top: 30, bottom: 50 }
  const dataZoom = [
    { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
    { type: 'slider', xAxisIndex: [0], bottom: 10, height: 20, filterMode: 'none' },
  ]

  energyChart.value.setOption({
    tooltip: { trigger: 'axis', appendToBody: true, extraCssText: 'z-index:99999 !important;' },
    grid: baseGrid,
    legend: { show: false },
    xAxis: [{ type: 'category', data: xArr, boundaryGap: false }],
    yAxis: [{ type: 'value', name: '能量', axisLabel: { formatter: formatYAxisTick } }],
    dataZoom,
    series: [
      { name: '能量', type: 'line', data: nowDbArr, symbolSize: 1, lineStyle: { width: 1 } },
      ...(avgDbArr.length > 0
        ? [
          {
            name: '标准能量线',
            type: 'line',
            data: avgDbArr,
            symbolSize: 1,
            lineStyle: { width: 1 },
          },
        ]
        : []),
    ],
  })

  densityChart.value.setOption({
    tooltip: { trigger: 'axis', appendToBody: true, extraCssText: 'z-index:99999 !important;' },
    grid: baseGrid,
    legend: { show: false },
    xAxis: [{ type: 'category', data: xArr, boundaryGap: false }],
    yAxis: [{ type: 'value', name: '密度', axisLabel: { formatter: formatYAxisTick } }],
    dataZoom,
    series: [
      { name: '密度', type: 'line', data: nowDensityArr, symbolSize: 1, lineStyle: { width: 1 } },
      ...(avgDensityArr.length > 0
        ? [
          {
            name: '标准密度线',
            type: 'line',
            data: avgDensityArr,
            symbolSize: 1,
            lineStyle: { width: 1 },
          },
        ]
        : []),
    ],
  })

  enableMouseWheelZoom(energyChart.value)
  enableMouseWheelZoom(densityChart.value)
}

const loadEvent = async () => {
  if (!props.row?.id) return

  eventDetail.value = null
  dataParse.value = null
  position.value = null
  hasVibrationFrequencyData.value = false
  hasVibrationTimeData.value = false
  vibrationFreqData.value = { frequency: [], freqSpeedData: [] }
  vibrationTimeData.value = []
  vibrationTotalTime.value = 0
  freqFullscreenVisible.value = false
  timeFullscreenVisible.value = false
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

  // 声音预警：沿用原有声音频谱接口
  if (isWarningEvent.value) {
    if (rid && code === 'FREQUENCY_SOUND_WARN') {
      const r = await getLatestFrequencyByReceiver({ receiverId: String(rid), type: 2 })
      logFrequencyDebugInfo('FREQUENCY_SOUND_WARN response', (r as any)?.ret ?? [])
      await renderEnergyDensityChartsFromFrequency((r as any)?.ret ?? [])
      return
    }
    if (rid && code === 'SOUND_HISTORY_WARN') {
      const r = await getLatestFrequencyByReceiver({ receiverId: String(rid), type: 2 })
      logFrequencyDebugInfo('SOUND_HISTORY_WARN response', (r as any)?.ret ?? [])
      await renderEnergyDensityChartsFromFrequency((r as any)?.ret ?? [])
      return
    }
    if (rid && code === 'NO_SCENE_SOUND_WARN') {
      const r = await getLatestFrequencyByReceiverNoScene({ receiverId: String(rid), type: 2 })
      nosceneVoiceRet.value = (r as any)?.ret ?? null
      logFrequencyDebugInfo(
        'NO_SCENE_SOUND_WARN response.soundFrequencyDtoList',
        (r as any)?.ret?.soundFrequencyDtoList ?? [],
      )
      logFrequencyDebugInfo(
        'NO_SCENE_SOUND_WARN response.soundAvgFrequencyDtoList',
        (r as any)?.ret?.soundAvgFrequencyDtoList ?? [],
      )
      await renderEnergyDensityChartsFromNoScene((r as any)?.ret ?? {})
      return
    }
    disposeCharts()
    return
  }

  // 振动报警：复用振动页频域/时域图数据能力（支持轴向切换与全屏）
  if (deviceId.value && rid) {
    await Promise.all([loadVibrationFrequencyByAxis(), loadVibrationTimeByAxis()])
  } else {
    vibrationFreqData.value = { frequency: [], freqSpeedData: [] }
    vibrationTimeData.value = []
    vibrationTotalTime.value = 0
  }
}

watch(
  () => [visible.value, props.row],
  async ([v]) => {
    if (!v) {
      eventDetail.value = null
      dataParse.value = null
      position.value = null
      vibrationFreqData.value = { frequency: [], freqSpeedData: [] }
      vibrationTimeData.value = []
      vibrationTotalTime.value = 0
      freqFullscreenVisible.value = false
      timeFullscreenVisible.value = false
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
  { immediate: false },
)

watch(freqAxis, async () => {
  if (!visible.value || isWarningEvent.value) return
  await loadVibrationFrequencyByAxis()
})

watch(timeAxis, async () => {
  if (!visible.value || isWarningEvent.value) return
  await loadVibrationTimeByAxis()
})

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
    ElMessage.error(isWarningEvent.value ? '确认预警失败' : '确认报警失败')
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
      tenantId: getTenantId() || '',
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
        { code: 'pointId', operate: 'EQ', value: pid },
      ],
      sortValueMap: [{ code: 'time', sort: 'desc' }],
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
      tenantId: tid,
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
    .replace(
      /\n{0,2}---\n{0,2}/g,
      '<hr style="border:none; border-top:1px solid #777; margin:25px 0; width:100%;" />',
    )
    .replace(/\n{2,}/g, '</div><div style="margin:15px 0; line-height:1.6;">')
    .replace(/\n/g, '<br/>')
  if (!html.startsWith('<div'))
    html =
      '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif; color:#333; padding:0 5px;">' +
      html
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
  } catch { }
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
      update: isUpdate ? 1 : 0,
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

.panelTitle--with-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chartTitleActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.axisSelect {
  width: 74px;
}

.fullscreenBtn {
  padding: 0 !important;
}

.axisSelect--fullscreen {
  width: 88px;
}

.vibrationFullscreenHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.92);
}

.vibrationFullscreenChart {
  width: 100%;
  height: calc(100vh - 130px);
  min-height: 300px;
}

.freq-fullscreen-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  margin-bottom: 10px;
}

.freq-filter-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.freq-filter-label {
  color: #fff;
  font-size: 12px;
}

.freq-filter-num {
  width: 110px;
}

.freq-filter-sep {
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
}

.freq-filter-divider,
.freq-fullscreen-divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.28);
  flex: 0 0 auto;
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

.notTypeSelect :deep(.el-input__inner) {
  font-size: 12px !important;
}

:deep(.historySelectPopper .el-select-dropdown__item),
:deep(.historySelectPopper .el-select-dropdown__item span) {
  font-size: 12px !important;
}

:deep(.historySelectPopper .el-select-dropdown__item) {
  height: 28px;
  line-height: 28px;
}
</style>

<style lang="scss">
.historySelectPopper .el-select-dropdown__item,
.historySelectPopper .el-select-dropdown__item span {
  font-size: 12px !important;
}

.historySelectPopper .el-select-dropdown__item {
  height: 28px;
  line-height: 28px;
}

.notTypeSelectPopper .el-select-dropdown__item,
.notTypeSelectPopper .el-select-dropdown__item span {
  font-size: 12px !important;
}

.notTypeSelectPopper .el-select-dropdown__item {
  height: 28px;
  line-height: 28px;
}

.alarm-vibration-fullscreen-modal .el-dialog {
  background: #142060 !important;
}

.alarm-vibration-fullscreen-modal .el-dialog__header {
  background: #142060 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.35);
}

.alarm-vibration-fullscreen-modal .el-dialog__title,
.alarm-vibration-fullscreen-modal .el-dialog__headerbtn .el-dialog__close {
  color: rgba(255, 255, 255, 0.92) !important;
}

.alarm-vibration-fullscreen-modal .el-dialog__body {
  background: #142060 !important;
  padding: 12px 16px 16px !important;
}

@media (max-width: 800px) {

  .alarm-batch-view-dialog,
  .alarm-batch-view-dialog.el-dialog,
  .alarm-batch-view-dialog .el-dialog,
  .alarm-batch-sub-dialog.el-dialog {
    width: 100vw !important;
    max-width: 100vw !important;
    margin: 0 !important;
  }

  .alarm-batch-view-dialog.el-dialog,
  .alarm-batch-view-dialog .el-dialog {
    height: 92vh !important;
    max-height: 92vh !important;
    display: flex;
    flex-direction: column;
  }

  .alarm-batch-view-dialog .el-dialog__body,
  .alarm-batch-sub-dialog .el-dialog__body {
    padding: 12px !important;
  }

  .alarm-batch-view-dialog .voiceContainer {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-auto-rows: 350px;
    height: auto;
    min-height: 100%;
    overflow: visible;
    padding-right: 0;
  }

  .alarm-batch-view-dialog .voiceContainerItem {
    min-height: 350px;
    height: 350px;
  }

  .alarm-batch-view-dialog .el-dialog__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
}
</style>
