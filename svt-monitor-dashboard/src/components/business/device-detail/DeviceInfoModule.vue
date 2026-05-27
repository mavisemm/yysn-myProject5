<template>
  <div class="device-info-module">
    <div class="module-header">
      <div class="header-main">
        <h3 class="module-title app-section-title">设备详情</h3>
      </div>
    </div>
    <div class="device-main">
      <div v-if="deviceImageUrls.length" class="device-image-container">
        <EquipmentImageGallery variant="detail" :urls="deviceImageUrls" alt="设备图片" />
      </div>

      <div class="health-gauge-container">
        <div class="gauge-block">
          <!-- <div class="gauge-block-topbar">
            <el-button
              class="stage-report-btn"
              type="primary"
              size="small"
              @click="openSoundStageReportDialog"
            >
              阶段性报告
            </el-button>
          </div> -->
          <div class="gauge-title app-section-title mobile-font-title">声音健康度</div>
          <div class="gauge-wrapper">
            <div ref="soundGaugeRef" class="gauge"></div>
          </div>
        </div>
        <div class="gauge-block">
          <div class="gauge-title app-section-title mobile-font-title">振动健康度</div>
          <div class="gauge-wrapper">
            <div ref="vibrationGaugeRef" class="gauge"></div>
          </div>
        </div>
      </div>

      <el-dialog v-model="soundStageReport.dialogVisible" title="阶段性报告" width="530px" :close-on-click-modal="true"
        destroy-on-close :teleported="true" :append-to-body="true" :modal-append-to-body="true">
        <div class="sound-stage-report-row">
          <CommonDateTimePicker v-model="soundStageReport.dateRange" width="100%" />
          <el-button class="sound-stage-report-download" size="small" type="primary"
            :loading="soundStageReport.downloading" @click="downloadSoundStageReport">
            下载
          </el-button>
        </div>
      </el-dialog>

      <div class="header-actions">
        <el-button type="primary" size="small" @click="manageDialogVisible = true" class="edit-btn mobile-font-title">
          更多
        </el-button>
      </div>

      <div v-if="!hasDeviceInfo" class="device-no-data">暂无数据</div>
      <div v-else class="device-basic-info">
        <div class="info-row">
          <div class="info-item">
            <span class="info-label mobile-font-title">设备名称：</span>
            <span class="info-value mobile-font-title">{{ deviceInfo.equipmentName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label mobile-font-title">设备型号：</span>
            <span class="info-value mobile-font-title">{{ deviceInfo.deviceModel }}</span>
          </div>
        </div>

        <div class="info-row">
          <div class="info-item">
            <span class="info-label mobile-font-title">生产厂家：</span>
            <span class="info-value mobile-font-title">{{ deviceInfo.deviceFactory }}</span>
          </div>
          <div class="info-item">
            <span class="info-label mobile-font-title">安装位置：</span>
            <span class="info-value mobile-font-title">{{ deviceInfo.locationDetail }}</span>
          </div>
        </div>

        <div class="info-row">
          <div class="info-item">
            <span class="info-label mobile-font-title">额定转速：</span>
            <span class="info-value mobile-font-title">{{
              formatDeviceInfoValueWithUnit(deviceInfo.rotationSpeed, 'rpm')
            }}</span>
          </div>
          <div class="info-item">
            <span class="info-label mobile-font-title">设计流量：</span>
            <span class="info-value mobile-font-title">{{ formatDeviceInfoValueWithUnit(deviceInfo.designFlow, 'm³/h') }}</span>
          </div>
        </div>

        <div class="info-row">
          <div class="info-item">
            <span class="info-label mobile-font-title">压力：</span>
            <span class="info-value mobile-font-title">{{ formatDeviceInfoValueWithUnit(deviceInfo.pressure, 'MPa') }}</span>
          </div>
        </div>
      </div>
    </div>

    <DeviceInfoManageDialog
      v-model="manageDialogVisible"
      :device-id="props.deviceId"
      :equipment-name="deviceInfo.equipmentName"
      :device-info="manageDialogDeviceInfo"
      @saved="onManageDialogSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  getDeviceInfoByEquipmentId,
  getEquipmentHealth,
  getEquipmentImages,
} from '@/api/modules/hardware'
import { service } from '@/api/request'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'
import DeviceInfoManageDialog from './DeviceInfoManageDialog.vue'
import EquipmentImageGallery from './EquipmentImageGallery.vue'
import {
  extractEquipmentImageUrls,
  formatDeviceInfoValueWithUnit,
} from './deviceImageUtils'
import {
  buildHealthGaugeOption,
  parseSoundHealthRet,
  parseVibrationHealthRet,
  type HealthGaugeMode,
  type HealthGaugeViewState,
  type HealthGrade,
} from './deviceHealthGauge'
import { normalizeDeviceInfoRet } from './deviceInfoLoaders'

interface DeviceInfo {
  id: number
  equipmentId: string
  equipmentName: string
  deviceModel: string
  deviceFactory: string
  locationDetail: string
  pressure: number
  rotationSpeed: number
  designFlow: number
  onlineStatus: number
  createdTime: string | null
  updatedTime: string | null
  deviceNewInfo?: Array<{ label: string; value: string }>
}

const props = defineProps<{
  deviceId: string
}>()

const hasDeviceInfo = ref(true)
const manageDialogVisible = ref(false)

const deviceInfo = ref<DeviceInfo>({
  id: 0,
  equipmentId: '',
  equipmentName: '',
  deviceModel: '',
  deviceFactory: '',
  locationDetail: '',
  pressure: 0,
  rotationSpeed: 0,
  designFlow: 0,
  onlineStatus: 0,
  createdTime: null,
  updatedTime: null,
  deviceNewInfo: [],
})

const manageDialogDeviceInfo = computed(() => ({
  id: deviceInfo.value.id,
  equipmentName: deviceInfo.value.equipmentName,
  deviceModel: deviceInfo.value.deviceModel,
  deviceFactory: deviceInfo.value.deviceFactory,
  locationDetail: deviceInfo.value.locationDetail,
  pressure: deviceInfo.value.pressure,
  rotationSpeed: deviceInfo.value.rotationSpeed,
  designFlow: deviceInfo.value.designFlow,
  onlineStatus: deviceInfo.value.onlineStatus,
}))

type DateRange = [string, string] | null
const soundStageReport = reactive({
  dialogVisible: false,
  dateRange: null as DateRange,
  downloading: false,
})

const deviceImageUrls = ref<string[]>([])

const isDeviceInfoLoaded = ref(false)
let currentDeviceInfoRequestId = 0

const applyDeviceInfoRet = (ret: unknown) => {
  deviceInfo.value = normalizeDeviceInfoRet(ret) as DeviceInfo
  hasDeviceInfo.value = true
}

const onManageDialogSaved = async () => {
  await loadDeviceInfo()
}

const sanitizeFilename = (name: string) => name.replace(/[\/:*?"<>|]/g, '-')

const downloadSoundStageReport = async () => {
  if (!props.deviceId) {
    ElMessage.warning('缺少设备ID')
    return
  }
  const range = soundStageReport.dateRange
  if (!range || range.length !== 2 || !range[0] || !range[1]) {
    ElMessage.warning('请选择时间范围')
    return
  }

  const [startTime, endTime] = range
  soundStageReport.downloading = true
  try {
    const res = await service.get(`/hardware/device/health-report/${props.deviceId}`, {
      params: { startTime, endTime, type: 'sound' },
      responseType: 'blob',
      showLoading: true,
    })

    const blob = res as unknown as Blob
    if (
      blob &&
      typeof (blob as { text?: () => Promise<string> }).text === 'function' &&
      blob.type?.includes('application/json')
    ) {
      const text = await blob.text()
      try {
        const json = JSON.parse(text)
        const msg = json?.message || json?.err || json?.msg || '下载失败'
        ElMessage.error(String(msg))
      } catch {
        ElMessage.error('下载失败')
      }
      return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeFilename(`声音健康度阶段性报告_${startTime}_${endTime}`)}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    soundStageReport.dialogVisible = false
  } catch (e) {
    console.error('下载阶段性报告失败:', e)
    ElMessage.error('下载失败')
  } finally {
    soundStageReport.downloading = false
  }
}

const loadDeviceInfo = async () => {
  if (!props.deviceId) return
  try {
    const response = await getDeviceInfoByEquipmentId(props.deviceId)
    if (response.rc === 0 && response.ret) {
      applyDeviceInfoRet(response.ret)
    } else {
      hasDeviceInfo.value = false
    }
  } catch (error) {
    console.error('获取设备信息失败:', error)
    hasDeviceInfo.value = false
  }
}

const soundHealthScore = ref(0)
const vibrationHealthScore = ref(0)
const hasSoundHealthData = ref(false)
const hasVibrationHealthData = ref(false)
const soundHealthGrade = ref<HealthGrade>('')
const vibrationHealthGrade = ref<HealthGrade>('')

const gaugeViewState = computed<HealthGaugeViewState>(() => ({
  soundScore: soundHealthScore.value,
  vibrationScore: vibrationHealthScore.value,
  soundGrade: soundHealthGrade.value,
  vibrationGrade: vibrationHealthGrade.value,
  hasSoundHealthData: hasSoundHealthData.value,
  hasVibrationHealthData: hasVibrationHealthData.value,
}))

const loadDeviceDataParallel = async () => {
  if (!props.deviceId) return
  const requestId = ++currentDeviceInfoRequestId
  isDeviceInfoLoaded.value = false
  deviceInfo.value.equipmentName = ''
  deviceImageUrls.value = []

  try {
    const [infoResult, soundHealthResult, vibrationHealthResult, imagesResult] =
      await Promise.allSettled([
        getDeviceInfoByEquipmentId(props.deviceId),
        getEquipmentHealth({ equipmentId: props.deviceId, type: 'sound' }),
        getEquipmentHealth({ equipmentId: props.deviceId, type: 'vibration' }),
        getEquipmentImages({ equipmentId: props.deviceId }),
      ])

    const infoResponse = infoResult.status === 'fulfilled' ? infoResult.value : null
    const soundHealthResponse = soundHealthResult.status === 'fulfilled' ? soundHealthResult.value : null
    const vibrationHealthResponse =
      vibrationHealthResult.status === 'fulfilled' ? vibrationHealthResult.value : null
    const imagesResponse = imagesResult.status === 'fulfilled' ? imagesResult.value : null

    if (requestId !== currentDeviceInfoRequestId) return

    if (imagesResponse?.rc === 0) {
      deviceImageUrls.value = extractEquipmentImageUrls(imagesResponse.ret)
    }

    if (infoResponse?.rc === 0 && infoResponse.ret) {
      applyDeviceInfoRet(infoResponse.ret)
      isDeviceInfoLoaded.value = true
    } else {
      hasDeviceInfo.value = false
      ElMessage.error('获取设备信息失败')
    }

    if (soundHealthResponse?.rc === 0 && soundHealthResponse.ret) {
      const parsed = parseSoundHealthRet(soundHealthResponse.ret)
      hasSoundHealthData.value = parsed.hasData
      soundHealthScore.value = parsed.score
      soundHealthGrade.value = parsed.grade
    } else {
      hasSoundHealthData.value = false
      soundHealthScore.value = 0
      soundHealthGrade.value = ''
    }

    if (vibrationHealthResponse?.rc === 0 && vibrationHealthResponse.ret) {
      const parsed = parseVibrationHealthRet(vibrationHealthResponse.ret)
      hasVibrationHealthData.value = parsed.hasData
      vibrationHealthGrade.value = parsed.grade
      vibrationHealthScore.value = parsed.score
    } else {
      hasVibrationHealthData.value = false
      vibrationHealthGrade.value = ''
      vibrationHealthScore.value = 0
    }

    nextTick(() => initGaugeCharts())
  } catch {
    ElMessage.error('获取设备数据失败')
  } finally {
    if (requestId === currentDeviceInfoRequestId && !isDeviceInfoLoaded.value) {
      isDeviceInfoLoaded.value = true
    }
  }
}

watch(
  () => props.deviceId,
  (newId) => {
    if (newId) loadDeviceDataParallel()
  },
  { immediate: true },
)

const soundGaugeRef = ref<HTMLDivElement>()
const vibrationGaugeRef = ref<HTMLDivElement>()
let soundGaugeChart: echarts.ECharts | null = null
let vibrationGaugeChart: echarts.ECharts | null = null

const buildGaugeOption = (mode: HealthGaugeMode, w: number, h: number) =>
  buildHealthGaugeOption(mode, gaugeViewState.value, w, h)

const initOneGauge = (mode: HealthGaugeMode) => {
  const el = mode === 'sound' ? soundGaugeRef.value : vibrationGaugeRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  if (mode === 'sound') {
    if (soundGaugeChart) soundGaugeChart.dispose()
    soundGaugeChart = echarts.init(el)
    soundGaugeChart.setOption(buildGaugeOption('sound', el.clientWidth, el.clientHeight))
  } else {
    if (vibrationGaugeChart) vibrationGaugeChart.dispose()
    vibrationGaugeChart = echarts.init(el)
    vibrationGaugeChart.setOption(buildGaugeOption('vibration', el.clientWidth, el.clientHeight))
  }
}

const initGaugeCharts = () => {
  initOneGauge('sound')
  initOneGauge('vibration')
}

let resizeObserver: ResizeObserver | null = null
let parentResizeObserver: ResizeObserver | null = null
let gaugeRetryTimerId: number | null = null

const resizeGauge = () => {
  setTimeout(() => {
    try {
      if (soundGaugeChart && soundGaugeRef.value) {
        soundGaugeChart.resize()
        const w = soundGaugeRef.value.clientWidth
        const h = soundGaugeRef.value.clientHeight
        if (w > 0 && h > 0) soundGaugeChart.setOption(buildGaugeOption('sound', w, h))
      }
      if (vibrationGaugeChart && vibrationGaugeRef.value) {
        vibrationGaugeChart.resize()
        const w = vibrationGaugeRef.value.clientWidth
        const h = vibrationGaugeRef.value.clientHeight
        if (w > 0 && h > 0) vibrationGaugeChart.setOption(buildGaugeOption('vibration', w, h))
      }
    } catch (e) {
      console.warn('Error resizing gauge chart:', e)
      nextTick(() => initGaugeCharts())
    }
  }, 50)
}

const setupGaugeResizeObserver = () => {
  if (soundGaugeRef.value && vibrationGaugeRef.value) {
    resizeObserver = new ResizeObserver(resizeGauge)
    resizeObserver.observe(soundGaugeRef.value)
    resizeObserver.observe(vibrationGaugeRef.value)
  } else {
    if (gaugeRetryTimerId) clearTimeout(gaugeRetryTimerId)
    gaugeRetryTimerId = window.setTimeout(setupGaugeResizeObserver, 100)
  }
}

const setupParentResizeObserver = () => {
  const parentElement = document.querySelector('.device-info-module') as HTMLDivElement
  if (parentElement) {
    parentResizeObserver = new ResizeObserver(resizeGauge)
    parentResizeObserver.observe(parentElement)
  }
}

onMounted(() => {
  nextTick(() => {
    initGaugeCharts()
    setupGaugeResizeObserver()
    setupParentResizeObserver()
  })
})

onUnmounted(() => {
  if (soundGaugeChart) soundGaugeChart.dispose()
  if (vibrationGaugeChart) vibrationGaugeChart.dispose()
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (parentResizeObserver) {
    parentResizeObserver.disconnect()
    parentResizeObserver = null
  }
  if (gaugeRetryTimerId) {
    clearTimeout(gaugeRetryTimerId)
    gaugeRetryTimerId = null
  }
})
</script>

<style lang="scss" scoped>
.device-info-module {
  width: 33%;
  min-width: 200px;
  max-width: 400px;
  flex: 0 0 auto;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: 0;

  overflow: hidden;

  .module-header {
    padding: 10px 10px 0 0;

    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;

      .module-title {
        margin: 0;
      }
    }
  }

  .header-actions {
    margin-top: 12px;
    margin-bottom: 4px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .device-main {
    padding: 10px 10px 0 0;
    flex: 1;

    .device-no-data {
      color: rgba(255, 255, 255, 0.6);
      padding: 20px;
    }

    width: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;

    .device-basic-info {
      margin-top: 20px;

      .info-row {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        flex: 0 0 auto;

        .info-item {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;

          .info-label {
            color: #ccc;
            font-size: 0.9rem;
          }

          .info-value {
            font-size: 0.9rem;
            margin-bottom: 5px;
            font-weight: 500;
            white-space: normal;

            overflow: visible;

            text-overflow: clip;

            word-wrap: break-word;
          }

          .info-input {
            width: 100%;

            :deep(.el-input__wrapper) {
              .el-input__inner {
                white-space: normal;
                word-wrap: break-word;
                // color: #333 !important;
              }
            }
          }
        }
      }

      .add-field-form {
        .form-row {
          display: flex;
          align-items: center;
          margin-bottom: 10px;

          .form-label {
            width: 60px;
            flex-shrink: 0;
            color: #ccc;
          }
        }
      }
    }

    .health-gauge-container {
      flex: 0 0 auto;
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;

      .gauge-block {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .gauge-block-topbar {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        margin-bottom: 2px;
      }

      .gauge-title {
        color: rgba(255, 255, 255);
        font-size: 1rem;
        font-weight: 500;
        text-align: left;
      }

      .stage-report-btn {
        flex: 0 0 auto;
      }

      .gauge-wrapper {
        position: relative;
        height: 170px;
        width: 100%;
        min-height: 150px;

        .gauge {
          width: 100%;
          height: 100%;
        }

        .gauge-center-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;

          .gauge-score {
            color: white;
          }
        }
      }
    }

    .sound-stage-report-row {
      display: flex;
      align-items: center;
      gap: 10px;

      .sound-stage-report-download {
        flex: 0 0 auto;
      }
    }

    .device-image-container {
      flex: 0 0 auto;
    }
  }
}

@media (max-width: 800px) {
  .device-info-module {
    width: 100%;
    max-width: none;
    min-width: 0;
    flex: 0 0 auto;
    padding-bottom: 0;

    .device-main {
      .device-basic-info {
        .info-row {
          .info-item {
          }
        }
      }

    }
  }
}
</style>
