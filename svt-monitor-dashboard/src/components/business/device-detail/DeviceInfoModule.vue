<template>
  <div class="device-info-module">
    <div class="module-header">
      <div class="header-main">
        <h3 class="module-title app-section-title">设备详情</h3>
      </div>
    </div>
    <div class="device-main">
      <div class="device-image-container">
        <img v-if="deviceImageSrc" :src="deviceImageSrc" alt="设备图片" class="device-image" />
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
          <div class="gauge-title">声音健康度</div>
          <div class="gauge-wrapper">
            <div ref="soundGaugeRef" class="gauge"></div>
          </div>
        </div>
        <div class="gauge-block">
          <div class="gauge-title">振动健康度</div>
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
        <el-button type="primary" size="small" @click="openAddFieldDialog" class="add-field-btn">
          添加信息
        </el-button>
        <el-button type="primary" size="small" @click="toggleEdit" class="edit-btn">
          {{ isEditing ? '保存' : '编辑' }}
        </el-button>
      </div>

      <div v-if="!hasDeviceInfo" class="device-no-data">暂无数据</div>
      <div v-else class="device-basic-info">
        <div class="info-row" v-if="!isEditing">
          <div class="info-item">
            <span class="info-label">设备名称：</span>
            <span class="info-value">{{ deviceInfo.equipmentName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">设备型号：</span>
            <span class="info-value">{{ deviceInfo.deviceModel }}</span>
          </div>
        </div>

        <div class="info-row" v-else>
          <div class="info-item">
            <span class="info-label">设备名称：</span>
            <el-input v-model="editForm.equipmentName" size="small" class="info-input" />
          </div>
          <div class="info-item">
            <span class="info-label">设备型号：</span>
            <el-input v-model="editForm.deviceModel" size="small" class="info-input" />
          </div>
        </div>

        <div class="info-row" v-if="!isEditing">
          <div class="info-item">
            <span class="info-label">生产厂家：</span>
            <span class="info-value">{{ deviceInfo.deviceFactory }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">安装位置：</span>
            <span class="info-value">{{ deviceInfo.locationDetail }}</span>
          </div>
        </div>
        <div class="info-row" v-else>
          <div class="info-item">
            <span class="info-label">生产厂家：</span>
            <el-input v-model="editForm.deviceFactory" size="small" class="info-input" />
          </div>
          <div class="info-item">
            <span class="info-label">安装位置：</span>
            <el-input v-model="editForm.locationDetail" size="small" class="info-input" />
          </div>
        </div>

        <div class="info-row" v-if="!isEditing">
          <div class="info-item">
            <span class="info-label">额定转速：</span>
            <span class="info-value">{{
              formatValueWithUnit(deviceInfo.rotationSpeed, 'rpm')
              }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">设计流量：</span>
            <span class="info-value">{{ formatValueWithUnit(deviceInfo.designFlow, 'm³/h') }}</span>
          </div>
        </div>
        <div class="info-row" v-else>
          <div class="info-item">
            <span class="info-label">额定转速：</span>
            <el-input v-model="editForm.rotationSpeed" size="small" class="info-input" />
          </div>
          <div class="info-item">
            <span class="info-label">设计流量：</span>
            <el-input v-model="editForm.designFlow" size="small" class="info-input" />
          </div>
        </div>

        <div class="info-row" v-if="!isEditing">
          <div class="info-item">
            <span class="info-label">压力：</span>
            <span class="info-value">{{ formatValueWithUnit(deviceInfo.pressure, 'MPa') }}</span>
          </div>
          <div v-if="extraFields.length > 0" class="info-item">
            <span class="info-label">{{ extraFields[0]?.label }}：</span>
            <span class="info-value">{{ extraFields[0]?.value }}</span>
          </div>
        </div>
        <div class="info-row" v-else>
          <div class="info-item">
            <span class="info-label">压力：</span>
            <el-input v-model="editForm.pressure" size="small" class="info-input" />
          </div>
          <div class="info-item"></div>
        </div>

        <div class="info-row" v-for="(row, rowIndex) in extraFieldRows" :key="'extra-row-' + rowIndex"
          v-if="!isEditing">
          <div v-for="(field, index) in row" :key="'extra-' + rowIndex + '-' + index" class="info-item">
            <span class="info-label">{{ field.label }}：</span>
            <span class="info-value">{{ field.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="addFieldDialogVisible" title="添加设备信息" width="360px" :close-on-click-modal="false"
      :teleported="true" :append-to-body="true" :modal-append-to-body="true">
      <div class="add-field-form">
        <div class="form-row">
          <span class="form-label">名称：</span>
          <el-input v-model="newField.label" size="small" placeholder="例如：维护周期" />
        </div>
        <div class="form-row">
          <span class="form-label">值：</span>
          <el-input v-model="newField.value" size="small" placeholder="例如：每3个月" />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button size="small" @click="addFieldDialogVisible = false">取消</el-button>
          <el-button size="small" type="primary" @click="confirmAddField">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { ElButton, ElInput, ElMessage, ElForm, ElFormItem } from 'element-plus'
import * as echarts from 'echarts'
import {
  getDeviceInfoByEquipmentId,
  editEquipmentInfo,
  getEquipmentHealth,
  type DeviceInfoDto,
  type DeviceHealthResponse,
} from '@/api/modules/hardware'
import { service } from '@/api/request'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'

const deviceImages = import.meta.glob('@/assets/images/background/*.{webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const normalizeDeviceImageKey = (name: string) =>
  String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[-_]/g, '')

const deviceImageByBaseName = (() => {
  const map = new Map<string, string>()
  for (const [path, url] of Object.entries(deviceImages)) {
    const fileName = path.split('/').pop() ?? ''
    const base = fileName.replace(/\.[^.]+$/, '')
    if (!base) continue
    map.set(base, url)
  }
  return map
})()

const resolveDeviceImageFromName = (equipmentName: string): string => {
  const rawName = String(equipmentName ?? '').trim()
  if (!rawName) return ''

  const exact = deviceImageByBaseName.get(rawName)
  if (exact) return exact

  const normalizedRawName = normalizeDeviceImageKey(rawName)
  if (!normalizedRawName) return ''
  for (const [baseName, url] of deviceImageByBaseName.entries()) {
    if (normalizeDeviceImageKey(baseName) === normalizedRawName) {
      return url
    }
  }

  for (const [baseName, url] of deviceImageByBaseName.entries()) {
    const normalizedBase = normalizeDeviceImageKey(baseName)
    if (!normalizedBase) continue
    if (normalizedBase.includes(normalizedRawName) || normalizedRawName.includes(normalizedBase)) {
      return url
    }
  }

  return ''
}

const formatValueWithUnit = (value: unknown, unit: string) => {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' ? value.trim() : value
  if (raw === '') return ''
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(num) || num === 0) return ''
  return `${raw} ${unit}`
}

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

const emit = defineEmits<{
  (e: 'edit-status-change', status: { isEditing: boolean; hasChanges: boolean }): void
}>()

const hasDeviceInfo = ref(true)

interface ExtraField {
  label: string
  value: string
  type: 'input' | 'select'
  options?: string[]
}

const extraFields = ref<ExtraField[]>([])

const extraFieldRows = computed<ExtraField[][]>(() => {
  const rows: ExtraField[][] = []
  const list = extraFields.value.slice(1)
  for (let i = 0; i < list.length; i += 2) {
    rows.push(list.slice(i, i + 2))
  }
  return rows
})
const addFieldDialogVisible = ref(false)
const newField = ref<ExtraField>({ label: '', value: '', type: 'input' })
const newFieldType = ref<'input' | 'select'>('input')
const newOptionInput = ref('')
const newFieldOptions = ref<string[]>([])

type DateRange = [string, string] | null
const soundStageReport = reactive({
  dialogVisible: false,
  dateRange: null as DateRange,
  downloading: false,
})

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

const deviceImageSrc = computed<string>(() => {
  if (!isDeviceInfoLoaded.value) return ''
  return resolveDeviceImageFromName(deviceInfo.value.equipmentName)
})

const isDeviceInfoLoaded = ref(false)
let currentDeviceInfoRequestId = 0

const syncExtraFieldsFromDeviceInfo = () => {
  const raw = (deviceInfo.value as any).deviceNewInfo
  const parsed: ExtraField[] = []
  if (!raw) {
    extraFields.value = []
    return
  }

  if (Array.isArray(raw)) {
    raw.forEach((it: any) => {
      const label = String(it?.label ?? '').trim()
      const value = String(it?.value ?? '').trim()
      if (label && value) parsed.push({ label, value, type: 'input' })
    })
    extraFields.value = parsed
    return
  }

  let idx = 1
  let foundAny = false
  while (idx <= 50) {
    const itemKey = `item${idx}`
    const item = raw[itemKey]
    if (!item) break
    const labelKey = `label${idx}`
    const valueKey = `value${idx}`
    const label = String(item[labelKey] ?? '').trim()
    const value = String(item[valueKey] ?? '').trim()
    if (label && value) {
      parsed.push({ label, value, type: 'input' })
      foundAny = true
    }
    idx++
  }

  if (!foundAny) {
    let j = 1
    while (j <= 50) {
      const labelKey = `label${j}`
      const valueKey = `value${j}`
      if (!(labelKey in raw) || !(valueKey in raw)) break
      const label = String(raw[labelKey] ?? '').trim()
      const value = String(raw[valueKey] ?? '').trim()
      if (label && value) parsed.push({ label, value, type: 'input' })
      j++
    }
  }

  extraFields.value = parsed
}

const openAddFieldDialog = () => {
  newField.value = { label: '', value: '', type: 'input' }
  newFieldType.value = 'input'
  newOptionInput.value = ''
  newFieldOptions.value = []
  addFieldDialogVisible.value = true
}

const addOption = () => {
  const v = newOptionInput.value.trim()
  if (!v) {
    ElMessage.warning('请输入选项值')
    return
  }
  if (newFieldOptions.value.includes(v)) {
    ElMessage.warning('该选项已存在')
    return
  }
  newFieldOptions.value.push(v)
  newOptionInput.value = ''
}

const removeOption = (index: number) => {
  newFieldOptions.value.splice(index, 1)
}

const openSoundStageReportDialog = () => {
  soundStageReport.dialogVisible = true
}

const sanitizeFilename = (name: string) => name.replace(/[\\/:*?"<>|]/g, '-')

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
      typeof (blob as any).text === 'function' &&
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
    const fileName = sanitizeFilename(`声音健康度阶段性报告_${startTime}_${endTime}`)
    a.href = url
    a.download = `${fileName}.pdf`
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
      const raw: any = response.ret
      deviceInfo.value = {
        ...response.ret,
        equipmentId: raw.equipmentId ?? '',
        equipmentName: raw.equipmentName ?? '',
      } as any
      hasDeviceInfo.value = true
      syncExtraFieldsFromDeviceInfo()
    } else {
      hasDeviceInfo.value = false
    }
  } catch (error) {
    console.error('获取设备信息失败:', error)
    hasDeviceInfo.value = false
  }
}

const loadDeviceDataParallel = async () => {
  if (!props.deviceId) return
  const requestId = ++currentDeviceInfoRequestId
  isDeviceInfoLoaded.value = false

  deviceInfo.value.equipmentName = ''

  try {
    const [infoResponse, soundHealthResponse, vibrationHealthResponse] = await Promise.all([
      getDeviceInfoByEquipmentId(props.deviceId),
      getEquipmentHealth({
        equipmentId: props.deviceId,
        type: 'sound',
      }),
      getEquipmentHealth({
        equipmentId: props.deviceId,
        type: 'vibration',
      }),
    ])

    if (infoResponse.rc === 0 && infoResponse.ret) {
      const raw: any = infoResponse.ret
      if (requestId !== currentDeviceInfoRequestId) return
      deviceInfo.value = {
        ...infoResponse.ret,
        equipmentId: raw.equipmentId ?? '',
        equipmentName: raw.equipmentName ?? '',
      } as any
      syncExtraFieldsFromDeviceInfo()
      isDeviceInfoLoaded.value = true
    } else {
      ElMessage.error('获取设备信息失败')
    }

    if (soundHealthResponse.rc === 0 && soundHealthResponse.ret) {
      const ret: any = soundHealthResponse.ret
      const score = typeof ret.healthScore === 'number' ? ret.healthScore : null
      const grade = extractHealthGrade(ret)
      hasSoundHealthData.value = score !== null || !!grade
      soundHealthScore.value = score ?? 0
      soundHealthGrade.value = grade
    } else {
      hasSoundHealthData.value = false
      soundHealthScore.value = 0
      soundHealthGrade.value = ''
    }

    if (vibrationHealthResponse.rc === 0 && vibrationHealthResponse.ret) {
      const ret: any = vibrationHealthResponse.ret
      const grade = extractHealthGrade(ret)
      hasVibrationHealthData.value = !!grade
      vibrationHealthGrade.value = grade
      vibrationHealthScore.value = mapGradeToScore(grade)
    } else {
      hasVibrationHealthData.value = false
      vibrationHealthGrade.value = ''
      vibrationHealthScore.value = 0
    }

    nextTick(() => {
      initGaugeCharts()
    })
  } catch (error) {
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
    if (newId) {
      loadDeviceDataParallel()
    }
  },
  { immediate: true },
)

const isEditing = ref(false)
const editForm = ref<DeviceInfo>({ ...deviceInfo.value })

const buildDeviceNewInfo = (fields: ExtraField[]): Array<{ label: string; value: string }> => {
  const arr: Array<{ label: string; value: string }> = []
  for (const f of fields) {
    const label = String(f.label ?? '').trim()
    if (!label) continue
    const value =
      f.type === 'select'
        ? String(f.value || (f.options && f.options[0]) || '').trim()
        : String(f.value ?? '').trim()
    if (!value) continue
    arr.push({ label, value })
  }
  return arr
}

const confirmAddField = () => {
  const label = newField.value.label.trim()
  if (!label) {
    ElMessage.warning('请填写名称')
    return
  }

  if (newFieldType.value === 'input') {
    const value = newField.value.value.trim()
    if (!value) {
      ElMessage.warning('请填写值')
      return
    }
    extraFields.value.push({ label, value, type: 'input' })
  } else {
    if (newFieldOptions.value.length === 0) {
      ElMessage.warning('请至少添加一个选项')
      return
    }
    extraFields.value.push({
      label,
      value: newFieldOptions.value[0] ?? '',
      type: 'select',
      options: [...newFieldOptions.value],
    })
  }

  ElMessage.success('已添加')
  addFieldDialogVisible.value = false
}

const soundHealthScore = ref(0)
const vibrationHealthScore = ref(0)

const hasSoundHealthData = ref(false)

const hasVibrationHealthData = ref(false)

const soundHealthGrade = ref<'A' | 'B' | 'C' | 'D' | ''>('')
const vibrationHealthGrade = ref<'A' | 'B' | 'C' | 'D' | ''>('')

const soundGaugeRef = ref<HTMLDivElement>()
const vibrationGaugeRef = ref<HTMLDivElement>()
let soundGaugeChart: echarts.ECharts | null = null
let vibrationGaugeChart: echarts.ECharts | null = null

const calculateResponsiveFontSize = (
  baseSize: number,
  containerWidth: number,
  containerHeight: number,
) => {
  const baseDimension = Math.min(containerWidth, containerHeight)
  const scaleRatio = Math.min(baseDimension / 200, 2)
  return Math.max(baseSize * scaleRatio, baseSize * 0.5)
}
const calculateResponsiveDistance = (
  baseDistance: number,
  containerWidth: number,
  containerHeight: number,
) => {
  const baseDimension = Math.min(containerWidth, containerHeight)
  const scaleRatio = Math.min(baseDimension / 200, 2)
  return Math.max(baseDistance * scaleRatio, baseDistance * 0.5)
}

const extractHealthGrade = (ret: any): 'A' | 'B' | 'C' | 'D' | '' => {
  if (!ret) return ''
  const raw = ret.healthGrade ?? ret.health_grade ?? ret.grade ?? ''
  if (!raw || typeof raw !== 'string') return ''
  const upper = raw.toUpperCase()
  if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') {
    return upper
  }
  return ''
}

const mapGradeToScore = (grade: 'A' | 'B' | 'C' | 'D' | ''): number => {
  switch (grade) {
    case 'A':
      return 90
    case 'B':
      return 70
    case 'C':
      return 40
    case 'D':
      return 15
    default:
      return 0
  }
}

type GaugeMode = 'sound' | 'vibration'

const resolveHealthColor = (score: number, grade: 'A' | 'B' | 'C' | 'D' | '') => {
  if (grade === 'D') return '#ff5722'
  if (grade === 'C') return '#f2b504'
  if (grade === 'B') return '#85ea8c'
  if (grade === 'A') return '#309735'

  if (score >= 80) return '#309735'
  if (score >= 60) return '#85ea8c'
  if (score >= 20) return '#f2b504'
  return '#ff5722'
}

const buildGaugeOption = (mode: GaugeMode, containerWidth: number, containerHeight: number) => {
  const isVibration = mode === 'vibration'
  const score = isVibration ? vibrationHealthScore.value : soundHealthScore.value
  const grade = isVibration ? vibrationHealthGrade.value : soundHealthGrade.value

  const hasData = isVibration ? hasVibrationHealthData.value : hasSoundHealthData.value
  const healthColor = hasData ? resolveHealthColor(score, grade) : 'rgba(255,255,255,0.65)'

  const axisLabelFontSize = Math.round(
    calculateResponsiveFontSize(15, containerWidth, containerHeight),
  )
  const titleFontSize = Math.round(calculateResponsiveFontSize(20, containerWidth, containerHeight))
  const detailFontSize = Math.round(
    calculateResponsiveFontSize(24, containerWidth, containerHeight),
  )

  const total = 10 + 8 + 8 + 10
  const dEnd = 10 / total
  const cEnd = (10 + 8) / total
  const bEnd = (10 + 8 + 8) / total

  return {
    series: [
      {
        type: 'gauge',
        center: ['50%', '60%'],
        radius: '80%',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 10,
        progress: { show: false },
        pointer: { show: false },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: Math.round(12 * Math.min(containerWidth / 300, 2)),

            color: [
              [dEnd, '#ff5722'],
              [cEnd, '#f2b504'],
              [bEnd, '#85ea8c'],
              [1, '#309735'],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: true,

          distance: calculateResponsiveDistance(
            isVibration ? -130 : -105,
            containerWidth,
            containerHeight,
          ),
          fontSize: axisLabelFontSize,
          color: '#fff',
          formatter: function (value: number) {
            if (isVibration) {
              const total = 10 + 8 + 8 + 10
              const dEnd = 10 / total
              const cEnd = (10 + 8) / total
              const bEnd = (10 + 8 + 8) / total
              const roundToTick = (percent: number) => Math.round(percent / 10) * 10
              const dCenter = roundToTick((0 + dEnd * 100) / 2)
              const cCenter = roundToTick(((dEnd + cEnd) * 100) / 2)
              const bCenter = roundToTick(((cEnd + bEnd) * 100) / 2)
              const aCenter = roundToTick(((bEnd + 1) * 100) / 2)

              if (value === dCenter) return '{gradeD|D\n不允许}'
              if (value === cCenter) return '{gradeC|C\n注意}'
              if (value === bCenter) return '{gradeB|B\n可接受}'
              if (value === aCenter) return '{gradeA|A\n良好}'
              return ''
            }

            if (value === 0) return '{stop|0}'
            if (value === 10) return '{stop|停机}'
            if (value === 20) return '{stop|20}'
            if (value === 40) return '{inspect|巡检}'
            if (value === 60) return '{inspect|60}'
            if (value === 70) return '{focus|关注}'
            if (value === 80) return '{focus|80}'
            if (value === 90) return '{health|健康}'
            if (value === 100) return '{health|100}'
            return ''
          },
          rich: {
            stop: { color: '#ff5722', fontSize: axisLabelFontSize },
            inspect: { color: '#f2b504', fontSize: axisLabelFontSize },
            focus: { color: '#85ea8c', fontSize: axisLabelFontSize },
            health: { color: '#309735', fontSize: axisLabelFontSize },

            gradeD: {
              color: '#ff5722',
              fontSize: Math.round(axisLabelFontSize * 0.85),
              fontWeight: 'bold',
              lineHeight: axisLabelFontSize,
            },
            gradeC: {
              color: '#f2b504',
              fontSize: Math.round(axisLabelFontSize * 0.85),
              fontWeight: 'bold',
              lineHeight: axisLabelFontSize,
            },
            gradeB: {
              color: '#85ea8c',
              fontSize: Math.round(axisLabelFontSize * 0.85),
              fontWeight: 'bold',
              lineHeight: axisLabelFontSize,
            },
            gradeA: {
              color: '#309735',
              fontSize: Math.round(axisLabelFontSize * 0.85),
              fontWeight: 'bold',
              lineHeight: axisLabelFontSize,
            },
          },
        },
        anchor: { show: false },
        title: {
          show: true,
          color: healthColor,
          fontSize: titleFontSize,
          fontWeight: 'bolder',
          offsetCenter: [0, '0%'],
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-30%'],
          fontSize: detailFontSize,
          fontWeight: 'bolder',

          formatter: function (value: number) {
            if (isVibration) return grade || '-'
            if (!hasSoundHealthData.value) return '-'
            return String(Math.round(value))
          },
          color: healthColor,
        },
        data: [{ value: score, name: isVibration ? '振动健康度' : '声音健康度' }],
      },
    ],
  }
}

const toggleEdit = async () => {
  if (isEditing.value) {
    try {
      const deviceInfoDto: DeviceInfoDto = {
        id: deviceInfo.value.id,
        equipmentId: props.deviceId,
        equipmentName: editForm.value.equipmentName,
        deviceModel: editForm.value.deviceModel,
        deviceFactory: editForm.value.deviceFactory,
        locationDetail: editForm.value.locationDetail,
        pressure: Number(editForm.value.pressure),
        rotationSpeed: Number(editForm.value.rotationSpeed),
        designFlow: Number(editForm.value.designFlow),
        onlineStatus: deviceInfo.value.onlineStatus,
      }

        ; (deviceInfoDto as any).deviceNewInfo = buildDeviceNewInfo(extraFields.value)

      const response = await editEquipmentInfo(props.deviceId, deviceInfoDto)

      if (response.rc === 0) {
        Object.assign(deviceInfo.value, editForm.value)
        ElMessage.success('设备信息更新成功')
        isEditing.value = false
        emit('edit-status-change', { isEditing: false, hasChanges: false })
      } else {
        ElMessage.error(response.err || '设备信息更新失败')
      }
    } catch (error) {
      console.error('更新设备信息失败:', error)
      ElMessage.error('设备信息更新失败')
    }
  } else {
    Object.assign(editForm.value, deviceInfo.value)
    isEditing.value = true
    emit('edit-status-change', { isEditing: true, hasChanges: false })
  }
}

const initOneGauge = (mode: GaugeMode) => {
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

let gaugeRetryTimerId: number | null = null

const setupGaugeResizeObserver = () => {
  if (soundGaugeRef.value && vibrationGaugeRef.value) {
    resizeObserver = new ResizeObserver(resizeGauge)
    resizeObserver.observe(soundGaugeRef.value)
    resizeObserver.observe(vibrationGaugeRef.value)
  } else {
    if (gaugeRetryTimerId) {
      clearTimeout(gaugeRetryTimerId)
    }
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

onMounted(async () => {
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
  padding-bottom: 20px;

  overflow: hidden;

  .module-header {
    padding: 10px 10px 0 20px;

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

    .add-field-btn {
      margin-right: -12px;
    }
  }

  .device-main {
    padding: 10px 10px 20px 20px;
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

      .device-image {
        width: 100%;
        height: auto;
        object-fit: contain;
        display: block;
        border-radius: 8px;
      }
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

    .module-header {
      .header-main {
        .module-title {
          font-size: 1.4rem;
        }
      }
    }

    .device-main {
      .device-basic-info {
        .info-row {
          .info-item {
            .info-label,
            .info-value {
              font-size: 1.1rem;
            }
          }
        }
      }

      .health-gauge-container {
        .gauge-title {
          font-size: 1.4rem;
        }
      }
    }
  }
}
</style>
