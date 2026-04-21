<template>
  <div class="alarm-overview">
    <div class="header-section home-title home-title--device-monitor">
      <div class="header-section__left home-title__left">
        <img class="header-section__icon home-title__icon" src="@/assets/images/background/小图标.webp" alt=""
          loading="lazy" decoding="async" />
        <div class="title-with-legend">
          <h3 class="app-section-title">预警总览</h3>
          <div class="batch-actions">
            <el-button size="small" class="batch-btn" @click="openRealtimeBatch">
              声音实时预警
            </el-button>
            <el-button size="small" class="batch-btn" @click="openHistoryBatch">
              声音历史预警
            </el-button>
            <el-button size="small" class="batch-btn" @click="openRealtimeAlarmBatch">
              振动实时报警
            </el-button>
            <el-button size="small" class="batch-btn" @click="openHistoryAlarmBatch">
              振动历史报警
            </el-button>
          </div>
        </div>
      </div>
      <div class="search-section">
        <!-- <div class="device-search-wrapper">
                    <el-input v-model="deviceSearch" placeholder="请输入设备名称" :prefix-icon="Search" size="small" clearable
                        style="width: 140px;" @focus="showDeviceDropdown" @blur="hideDeviceDropdown"
                        @keyup.enter="handleSearch" @clear="handleClear" class="custom-search-input" />
                    <div v-if="showDropdown" class="dropdown-list">
                        <div v-for="device in filteredDevices" :key="device.id" class="dropdown-item"
                            @click="selectDevice(device)">
                            <span class="device-name">{{ device.deviceName }}</span>
                            <span class="workshop-name">({{ device.workshopName }})</span>
                        </div>
                    </div>
                </div> -->

        <div class="time-section">
          <CommonDateTimePicker v-model="dateRange" width="320px" />
          <el-button @click="toggleSortOrder" class="sort-btn" :icon="sortIcon"> </el-button>
        </div>
      </div>
    </div>

    <div class="status-legend">
      <div class="status-legend__item">
        <img class="status-legend__icon" src="@/assets/images/background/首页-报警图例.webp" alt="报警图例" loading="lazy"
          decoding="async" />
        <span class="status-legend__text">报警</span>
      </div>
      <div class="status-legend__item">
        <img class="status-legend__icon" src="@/assets/images/background/首页-预警图例.webp" alt="预警图例" loading="lazy"
          decoding="async" />
        <span class="status-legend__text">预警</span>
      </div>
      <div class="status-legend__item">
        <img class="status-legend__icon" src="@/assets/images/background/首页-健康图例.webp" alt="健康图例" loading="lazy"
          decoding="async" />
        <span class="status-legend__text">健康</span>
      </div>
      <div class="status-legend__item">
        <img class="status-legend__icon" src="@/assets/images/background/首页-离线图例.webp" alt="离线图例" loading="lazy"
          decoding="async" />
        <span class="status-legend__text">离线</span>
      </div>
    </div>

    <div v-if="filteredAlarms.length === 0" class="alarm-empty">
      <CommonEmptyState />
    </div>
    <div v-else class="alarm-grid" :style="{
      'grid-template-columns': `repeat(${responsivePageSize.columns}, 1fr)`,
      'grid-template-rows': `repeat(${responsivePageSize.rows}, 1fr)`,
    }">
      <div v-for="alarm in displayedAlarms" :key="alarm.cardId" class="alarm-card"
        :class="`alarm-card--${getDeviceDisplayStatus(alarm)}`" @click="goToDeviceDetail(alarm)">
        <div class="card-header">
          <span class="device-name" :title="alarm.deviceName">{{ alarm.deviceName }}</span>
          <span :class="['status-dot', getDeviceDisplayStatus(alarm)]"></span>
        </div>

        <div class="alarm-time">
          <template v-if="
            getDeviceDisplayStatus(alarm) !== 'healthy' &&
            getDeviceDisplayStatus(alarm) !== 'offline'
          ">
            {{ alarm.shopName ? alarm.shopName + ' ' : '' }}&nbsp;&nbsp;{{
              formatAlarmTime(alarm.time)
            }}
          </template>
          <template v-else>
            {{ alarm.shopName ? alarm.shopName : '' }}
          </template>
        </div>

        <div class="measurement-grid">
          <div v-for="item in getDisplayPoints(
            alarm.measurementPoints,
            alarm.latestPointNum,
            alarm.cardType,
            getDeviceDisplayStatus(alarm),
          )" :key="item.pointNum" :class="[
            'point-item',
            getPointStyleClass(item.point.status, getDeviceDisplayStatus(alarm)),
          ]" @click.stop="handlePointItemClick(alarm, item)">
            {{ item.pointNum }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="filteredAlarms.length > 0" class="pagination-wrapper">
      <span class="pagination-page-meta">共 {{ alarmTotalPages }} 页，第 {{ currentPage }} 页</span>
      <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="filteredAlarms.length"
        layout="prev, pager, next" @current-change="handleCurrentChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { Search, Sort } from '@element-plus/icons-vue'
import { ElInput, ElButton, ElDatePicker, ElPagination } from 'element-plus'
import { useLocale } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import type { DeviceNode } from '@/types/device'
import { formatDateTime, disabledFutureDate, getDefaultDateRange } from '@/utils/datetime'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue'
import type { VibrationEventPayload } from '@/services/vibrationWs'
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useAlarmOverviewStore } from '@/stores/alarmOverview'
import { resolveRealtimeDeviceKey } from '@/utils/realtimeAlarmNavigator'

const { t } = useLocale()

const alarmBatchStore = useAlarmBatchStore()

const openRealtimeBatch = () => {
  void alarmBatchStore.openRealtime()
}

const openHistoryBatch = () => {
  void alarmBatchStore.openHistory()
}

const openRealtimeAlarmBatch = () => {
  void alarmBatchStore.openRealtimeAlarm()
}

const openHistoryAlarmBatch = () => {
  void alarmBatchStore.openHistoryAlarm()
}

const router = useRouter()
const deviceTreeStore = useDeviceTreeStore()

interface MeasurementPoint {
  name: string
  status: 'healthy' | 'warning' | 'alarm' | 'offline'
  lastAlarmTime?: number
}

interface AlarmItem {
  id: string
  kind: 'vibration' | 'sound'
  deviceName: string
  shopName: string
  deviceNameWithShop: string
  status: 'alarm' | 'warning' | 'healthy' | 'offline'
  statusText: string
  time: string
  measurementPoints: MeasurementPoint[]
  latestPointNum?: number
  latestOrderKey?: number
  statusPriority?: number
  sortTimeTs?: number
  searchText?: string
  displayStatus?: 'alarm' | 'warning' | 'healthy' | 'offline'
}

interface DisplayAlarmItem extends AlarmItem {
  cardId: string
  cardType: 'vibration' | 'sound'
}
interface AlarmWsPayload {
  alarmId?: string
  tenantId?: string

  equipmentId?: string
  equipmentName?: string
  deviceId?: string
  deviceName?: string
  workshopId?: string | null
  workshopName?: string | null
  alarmTime?: number
  alarmTypeCode?: string
  alarmTypeName?: string
  statusCode?: string
  probability?: number
  judgeFlag?: boolean
  data?: {
    channelNo?: string | number
    value?: number
    threshold?: number
    level?: string
    unit?: string
    pointName?: string
    amplitude?: number
  }
  rawDataJson?: string
  [k: string]: unknown
}

interface DeviceItem {
  id: string | number
  name: string
  deviceName: string
  workshopName: string
}

const extractDevicesFromTree = (nodes: DeviceNode[]): DeviceItem[] => {
  const devices: DeviceItem[] = []

  nodes.forEach((factory) => {
    factory.children?.forEach((workshop) => {
      workshop.children?.forEach((device) => {
        if (device.type === 'device') {
          devices.push({
            id: device.id,
            name: `${device.name}（${workshop.name}）`,
            deviceName: device.name,
            workshopName: workshop.name,
          })
        }
      })
    })
  })

  return devices
}

const deviceSearch = ref('')
const debouncedDeviceSearch = ref('')
let deviceSearchDebounceTimer: number | null = null
const dateRange = ref<[string, string]>(['', ''])
const showDropdown = ref(false)
const currentPage = ref(1)

const containerWidth = ref(window.innerWidth)
const containerHeight = ref(window.innerHeight)

const responsivePageSize = computed(() => {
  return { pageSize: 4, columns: 4, rows: 1 }
})

const rowsCount = computed(() => {
  const { pageSize, columns } = responsivePageSize.value
  return Math.ceil(pageSize / columns)
})

const pageSize = ref(responsivePageSize.value.pageSize)

const sortOrder = ref<'asc' | 'desc'>('desc')
const displayPointsCache = new Map<string, { point: MeasurementPoint; pointNum: number }[]>()
const MAX_DISPLAY_POINTS_CACHE = 500

const alarmOverviewStore = useAlarmOverviewStore()
const { alarms, httpInitialized } = storeToRefs(alarmOverviewStore)
const parsePickerDateTime = (s: string): Date => {
  const str = (s ?? '').trim()
  if (!str) return new Date(NaN)

  if (!str.includes(' ')) return new Date(str)

  const parts = str.split(' ')
  const datePart = parts[0]
  const timePart = parts[1]
  if (!datePart || !timePart) return new Date(NaN)

  const dateParts = datePart.split('-')
  if (dateParts.length !== 3) return new Date(NaN)
  const y = Number(dateParts[0])
  const m = Number(dateParts[1])
  const d = Number(dateParts[2])

  const timeParts = String(timePart).split(':')

  const hh = Number(timeParts[0])
  const mm = Number(timeParts[1])
  const ss = Number(timeParts[2] ?? '0')

  if (![y, m, d, hh, mm, ss].every((n) => Number.isFinite(n))) return new Date(NaN)

  return new Date(y, m - 1, d, hh, mm, ss, 0)
}
const parseAlarmTime = (timeStr: string | undefined, fallbackYear: number): Date | null => {
  if (!timeStr) return null
  const raw = String(timeStr).trim()
  if (!raw) return null

  const ts = Number(raw)
  if (Number.isFinite(ts) && ts > 0) {
    const d = new Date(ts)
    return isNaN(d.getTime()) ? null : d
  }

  if (/\d{4}/.test(raw)) {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }

  const m = raw.match(/^(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }

  const month = Number(m[1])
  const day = Number(m[2])
  const hh = Number(m[3])
  const mm = Number(m[4])
  const ss = Number(m[5] ?? 0)

  if (![month, day, hh, mm, ss].every((n) => Number.isFinite(n))) return null
  return new Date(fallbackYear, month - 1, day, hh, mm, ss, 0)
}

watch(
  () => dateRange.value,
  () => {
    currentPage.value = 1
  },
  { deep: true },
)

watch(
  () => deviceSearch.value,
  (value) => {
    if (deviceSearchDebounceTimer) clearTimeout(deviceSearchDebounceTimer)
    deviceSearchDebounceTimer = window.setTimeout(() => {
      debouncedDeviceSearch.value = String(value ?? '')
    }, 160)
  },
  { immediate: true },
)

function findDeviceInfo(deviceId: string): { deviceName: string; shopName: string } {
  const walk = (
    nodes: DeviceNode[],
    currentWorkshopName = '',
  ): { deviceName: string; shopName: string } | null => {
    for (const node of nodes) {
      if (node.type === 'workshop') {
        const res = walk(node.children ?? [], node.name)
        if (res) return res
      } else if (node.type === 'device') {
        if (node.id === deviceId || node.customerDeviceId === deviceId) {
          return { deviceName: node.name, shopName: node.workshopName ?? currentWorkshopName }
        }
        const res = walk(node.children ?? [], currentWorkshopName)
        if (res) return res
      } else if (node.children?.length) {
        const res = walk(node.children, currentWorkshopName)
        if (res) return res
      }
    }
    return null
  }
  return walk(deviceTreeStore.deviceTreeData) ?? { deviceName: '', shopName: '' }
}

function mapLevelToStatus(level: string | undefined): MeasurementPoint['status'] {
  const v = String(level ?? '').toUpperCase()
  if (v === 'ALARM') return 'alarm'
  if (v === 'WARNING' || v === 'WARN') return 'warning'
  return 'healthy'
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

function isAlarmWsPayload(x: any): x is AlarmWsPayload {
  // 只要具备告警时间/告警类型等关键信息，就按告警载荷处理
  // 避免因 payload 是否带 `data` 字段不同，导致时间字段走了不同分支
  return (
    !!x && typeof x === 'object' && ('alarmTypeCode' in x || 'alarmTime' in x || 'alarmId' in x)
  )
}

type OverviewNormalized = {
  deviceId: string
  deviceName?: string
  shopName?: string
  time: number
  alarmTypeCode?: string
  statusCode?: string
  point: {
    channelNo?: string | number
    level?: string
    pointName?: string
  }
}

function normalizeToOverviewEvent(input: any): OverviewNormalized | null {
  if (isAlarmWsPayload(input)) {
    const deviceId = String(input.equipmentId ?? '')
    const t = Number(input.alarmTime ?? 0)
    if (!deviceId || !Number.isFinite(t) || t <= 0) return null
    return {
      deviceId,
      deviceName: input.equipmentName ? String(input.equipmentName) : undefined,
      shopName: input.workshopName ? String(input.workshopName) : undefined,
      time: t,
      alarmTypeCode: input.alarmTypeCode ? String(input.alarmTypeCode) : undefined,
      statusCode: input.statusCode ? String(input.statusCode) : undefined,
      point: {
        channelNo: input.data?.channelNo,
        level: input.data?.level ? String(input.data.level) : undefined,
        pointName: input.data?.pointName ? String(input.data.pointName) : undefined,
      },
    }
  }

  const evt = input as Partial<VibrationEventPayload>
  if (!evt || typeof evt !== 'object') return null
  const deviceId = String(evt.deviceId ?? '')
  const t = Number(evt.time ?? 0)
  if (!deviceId || !Number.isFinite(t) || t <= 0) return null

  const parsed = safeParseJson(evt.dataJson)
  return {
    deviceId,
    time: t,
    alarmTypeCode: evt.eventTypeCode ? String(evt.eventTypeCode) : undefined,
    statusCode: evt.statusCode ? String(evt.statusCode) : undefined,
    shopName: parsed?.shopName ? String(parsed.shopName) : undefined,
    point: {
      channelNo: parsed?.channelNo,
      level: parsed?.level ? String(parsed.level) : undefined,
      pointName: parsed?.pointName ? String(parsed.pointName) : undefined,
    },
  }
}

function buildMeasurementPointsFromPoint(point: OverviewNormalized['point']): MeasurementPoint[] {
  const channelNo = point?.channelNo != null ? Number(point.channelNo) : NaN
  const pointStatus = mapLevelToStatus(point?.level)
  const pointName = point?.pointName ? String(point.pointName) : ''

  const total = 10
  const list: MeasurementPoint[] = Array.from({ length: total }).map((_, i) => ({
    name: i === 0 && pointName ? pointName : `测点${i + 1}`,
    status: 'healthy',
  }))

  if (!isNaN(channelNo) && channelNo >= 1 && channelNo <= total) {
    const existing = list[channelNo - 1]
    list[channelNo - 1] = {
      name: pointName || existing?.name || `测点${channelNo}`,
      status: pointStatus,
    }
  }
  return list
}

function upsertAlarmFromEvent(input: any) {
  const evt = normalizeToOverviewEvent(input)
  if (!evt) return

  if (evt.statusCode && String(evt.statusCode).toUpperCase() !== 'VALID') return

  const isFaultAlarm = String(evt.alarmTypeCode ?? '').toUpperCase() === 'MACHINE_VIBRATION'

  const deviceId = evt.deviceId
  const deviceName = evt.deviceName ? String(evt.deviceName) : ''
  const shopName = evt.shopName && evt.shopName !== '未知车间' ? String(evt.shopName) : ''

  const t = Number(evt.time)
  const timeStr = Number.isFinite(t) && t > 0 ? String(t) : ''

  const measurementPoints = buildMeasurementPointsFromPoint(evt.point)

  const deviceStatus: AlarmItem['status'] = isFaultAlarm ? 'alarm' : 'healthy'

  const statusText = deviceStatus === 'alarm' ? '报警' : '健康'

  const item: AlarmItem = {
    id: deviceId,
    kind: isFaultAlarm ? 'vibration' : 'sound',
    deviceName,
    shopName,
    deviceNameWithShop: `${deviceName}（${shopName || ''}）`,
    status: deviceStatus,
    statusText,
    time: timeStr,
    measurementPoints,
  }

  const idx = alarms.value.findIndex((a) => a.id === deviceId)
  if (idx >= 0) alarms.value.splice(idx, 1, item)
  else alarms.value.unshift(item)
}

const allDevices = computed(() => {
  return extractDevicesFromTree(deviceTreeStore.deviceTreeData)
})

const filteredDevices = computed(() => {
  if (!deviceSearch.value) {
    return allDevices.value
  }
  const search = deviceSearch.value.toLowerCase()
  return allDevices.value.filter(
    (device) =>
      device.deviceName.toLowerCase().includes(search) ||
      device.workshopName.toLowerCase().includes(search) ||
      device.name.toLowerCase().includes(search),
  )
})

const filteredAlarms = computed(() => {
  // HTTP 初始化完成前，先隐藏“预填充健康卡片”，避免首页进入时绿->红闪烁
  const source = httpInitialized.value
    ? (alarms.value ?? [])
    : (alarms.value ?? []).filter((a) => !a?.prefilled)

  let result: DisplayAlarmItem[] = source.map((item: AlarmItem) => ({
    ...item,
    cardId: `${item.kind}:${item.id}`,
    cardType: item.kind,
  }))
  const keyword = debouncedDeviceSearch.value.trim().toLowerCase()
  if (keyword) {
    const searchMatch = keyword.match(/^(.+)\((.+)\)$/)
    if (searchMatch && searchMatch[1] && searchMatch[2]) {
      const searchDeviceName = searchMatch[1]
      const searchWorkshopName = searchMatch[2]
      result = result.filter(
        (alarm) =>
          alarm.deviceName.toLowerCase().includes(searchDeviceName) &&
          alarm.shopName.toLowerCase().includes(searchWorkshopName),
      )
    } else {
      result = result.filter((alarm) => String(alarm.searchText ?? '').includes(keyword))
    }
  }

  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    const startDate = parsePickerDateTime(dateRange.value[0])
    let endDate = parsePickerDateTime(dateRange.value[1])
    const fallbackYear = startDate.getFullYear()

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return result

    const now = new Date()
    if (endDate.getTime() > now.getTime()) {
      endDate = now
    }

    result = result.filter((alarm) => {
      if (alarm.status === 'healthy' || alarm.status === 'offline') return true
      const sortTs = Number((alarm as any).sortTimeTs ?? 0)
      if (!Number.isFinite(sortTs) || sortTs <= 0) return false
      return sortTs >= startDate.getTime() && sortTs <= endDate.getTime()
    })
  }

  result.sort((a, b) => {
    const aStatus = Number(a.statusPriority ?? 9)
    const bStatus = Number(b.statusPriority ?? 9)

    const statusDiff = aStatus - bStatus
    if (statusDiff !== 0) return statusDiff

    // 关键：如果 store 提供了“HTTP 数组顺序 key”，优先按它排序（越大越新）
    const aKey = Number(a.latestOrderKey ?? 0)
    const bKey = Number(b.latestOrderKey ?? 0)
    const aHasKey = Number.isFinite(aKey) && aKey > 0
    const bHasKey = Number.isFinite(bKey) && bKey > 0
    if (aHasKey || bHasKey) {
      if (aHasKey && !bHasKey) return -1
      if (!aHasKey && bHasKey) return 1
      if (aHasKey && bHasKey && aKey !== bKey) return bKey - aKey
    }

    const timeA = Number(a.sortTimeTs ?? NaN)
    const timeB = Number(b.sortTimeTs ?? NaN)

    const aHasTime = !isNaN(timeA)
    const bHasTime = !isNaN(timeB)

    if (aHasTime && !bHasTime) return -1
    if (!aHasTime && bHasTime) return 1
    if (!aHasTime && !bHasTime) return 0

    return sortOrder.value === 'desc' ? timeB - timeA : timeA - timeB
  })

  return result
})

const alarmTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAlarms.value.length / pageSize.value)),
)

const displayedAlarms = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return filteredAlarms.value.slice(startIndex, endIndex)
})

watch(
  () => displayedAlarms.value.map((item) => `${item.cardId}:${item.latestOrderKey ?? 0}`).join('|'),
  () => {
    displayPointsCache.clear()
  },
)

const showDeviceDropdown = () => {
  showDropdown.value = true
}

let hideDropdownTimerId: number | null = null

const hideDeviceDropdown = () => {
  if (hideDropdownTimerId) {
    clearTimeout(hideDropdownTimerId)
  }
  hideDropdownTimerId = window.setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

const selectDevice = (device: DeviceItem) => {
  const match = device.name.match(/^(.+)\((.+)\)$/)
  if (match) {
    const deviceName = match[1]
    const workshopName = match[2]
    deviceSearch.value = device.name
  } else {
    deviceSearch.value = device.name
  }

  showDropdown.value = false
  currentPage.value = 1
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleClear = () => {
  deviceSearch.value = ''
  currentPage.value = 1
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  currentPage.value = 1
}
const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

const sortIcon = Sort

const updateContainerSize = () => {
  containerWidth.value = window.innerWidth
  containerHeight.value = window.innerHeight
  pageSize.value = responsivePageSize.value.pageSize
  if (currentPage.value > Math.ceil(filteredAlarms.value.length / pageSize.value)) {
    currentPage.value = 1
  }
}

onMounted(() => {
  window.addEventListener('resize', updateContainerSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize)

  if (hideDropdownTimerId) {
    clearTimeout(hideDropdownTimerId)
    hideDropdownTimerId = null
  }
  if (deviceSearchDebounceTimer) {
    clearTimeout(deviceSearchDebounceTimer)
    deviceSearchDebounceTimer = null
  }
  displayPointsCache.clear()
})

const isValidDevice = (deviceId: string): boolean => {
  const findDeviceInTree = (nodes: DeviceNode[]): boolean => {
    for (const node of nodes) {
      if (node.id === deviceId && node.type === 'device') {
        return true
      }
      if (node.children && node.children.length > 0) {
        if (findDeviceInTree(node.children)) {
          return true
        }
      }
    }
    return false
  }

  return findDeviceInTree(deviceTreeStore.deviceTreeData)
}
function getDeviceDisplayStatus(
  alarm: AlarmItem | DisplayAlarmItem,
): 'alarm' | 'warning' | 'offline' | 'healthy' {
  if ((alarm as any).displayStatus) return (alarm as any).displayStatus
  if (alarm.status === 'offline') return 'offline'
  const points = alarm.measurementPoints ?? []
  const hasAlarm = points.some((p) => p.status === 'alarm')
  const hasWarning = points.some((p) => p.status === 'warning')
  if (hasAlarm) return 'alarm'
  if (hasWarning) return 'warning'
  return 'healthy'
}

function getPointStyleClass(
  pointStatus: MeasurementPoint['status'],
  deviceStatus: 'alarm' | 'warning' | 'offline' | 'healthy',
): string {
  if (deviceStatus === 'healthy') return 'healthy'
  if (deviceStatus === 'offline') return 'offline'
  if (deviceStatus === 'alarm') return pointStatus === 'alarm' ? 'alarm' : 'alarm-device'
  if (deviceStatus === 'warning') return pointStatus === 'warning' ? 'warning' : 'warning-device'
  return 'healthy'
}

function getDisplayPoints(
  points: MeasurementPoint[],
  latestPointNum?: number,
  cardType?: 'vibration' | 'sound',
  deviceStatus?: 'alarm' | 'warning' | 'offline' | 'healthy',
): { point: MeasurementPoint; pointNum: number }[] {
  const cacheKey = `${cardType ?? 'all'}|${deviceStatus ?? 'unknown'}|${latestPointNum ?? 'none'}|${(points ?? []).map((p, i) => `${i + 1}:${p.status}:${p.lastAlarmTime ?? 0}`).join(',')}`
  const cached = displayPointsCache.get(cacheKey)
  if (cached) return cached
  const list = points ?? []
  const withNum = list
    .map((p, i) => ({ point: p, pointNum: i + 1 }))
    .filter((item) => {
      // 健康/离线卡片：展示基础点位编号，避免看起来“没有点位”
      if (deviceStatus === 'healthy' || deviceStatus === 'offline') return true
      if (!cardType) return true
      // 声音卡片只展示预警点位；振动卡片只展示报警点位（保持“卡片内部只按时间”）
      if (cardType === 'sound') return item.point.status === 'warning'
      if (cardType === 'vibration') return item.point.status === 'alarm'
      return true
    })
  const order = { alarm: 0, warning: 1, healthy: 2, offline: 3 }
  const sorted = withNum.sort((a, b) => {
    // 约定：latestPointNum 对应“最新点位”，强制置顶（即使其它点位的 lastAlarmTime 更大）
    if (latestPointNum != null) {
      const aIsLatest = a.pointNum === latestPointNum
      const bIsLatest = b.pointNum === latestPointNum
      if (aIsLatest !== bIsLatest) return aIsLatest ? -1 : 1
    }
    const aTime = a.point.lastAlarmTime ?? 0
    const bTime = b.point.lastAlarmTime ?? 0
    if (aTime !== bTime) return bTime - aTime // 最近的时间排前面
    return a.pointNum - b.pointNum
  })
  const result = sorted.slice(0, 8)
  displayPointsCache.set(cacheKey, result)
  if (displayPointsCache.size > MAX_DISPLAY_POINTS_CACHE) {
    const firstKey = displayPointsCache.keys().next().value
    if (firstKey != null) displayPointsCache.delete(firstKey)
  }
  return result
}
function formatAlarmTime(time: string | undefined): string {
  if (!time) return '暂无'
  const raw = String(time).trim()
  const ts = Number(raw)
  const d = Number.isFinite(ts) && ts > 0 ? new Date(ts) : new Date(raw)
  if (isNaN(d.getTime())) return '暂无'
  const month = d.getMonth() + 1
  const day = d.getDate()
  const h = d.getHours()
  const m = d.getMinutes()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(month)}-${pad(day)} ${pad(h)}:${pad(m)}`
}

const handlePointItemClick = async (
  alarm: AlarmItem,
  clicked: { point: MeasurementPoint; pointNum: number },
) => {
  const point = clicked?.point
  if (!point || (point.status !== 'alarm' && point.status !== 'warning')) return
  await alarmBatchStore.ensureDropdowns()
  const deviceId = resolveRealtimeDeviceKey({
    alarmId: String(alarm.id ?? ''),
    pointNum: Number(clicked?.pointNum ?? 0),
    pointName: point.name,
    deviceTreeData: deviceTreeStore.deviceTreeData ?? [],
    deviceOptions: (alarmBatchStore.deviceNameList ?? []) as any[],
  })
  if (point.status === 'warning') {
    alarmBatchStore.resetRealtime()
    if (deviceId) {
      alarmBatchStore.realtimeQuery.deviceId = deviceId
    }
    void alarmBatchStore.openRealtime()
    return
  }

  alarmBatchStore.resetRealtimeAlarm()
  if (deviceId) {
    alarmBatchStore.realtimeAlarmQuery.deviceId = deviceId
  }
  void alarmBatchStore.openRealtimeAlarm()
}

const goToDeviceDetail = (alarm: AlarmItem) => {
  const equipmentId = alarm.id
  if (!equipmentId) {
    console.warn('缺少设备ID，无法跳转:', alarm)
    return
  }

  deviceTreeStore.setSelectedDeviceId(equipmentId)
  router
    .push({
      name: 'DeviceDetail',
      params: { id: equipmentId },
    })
    .catch((err) => {
      console.error('路由跳转失败:', err)
    })
}
</script>

<style lang="scss" scoped>
.alarm-overview {
  height: 100%;
  min-height: 0;
  padding: 10px 10px 0 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: nowrap;
    min-width: 0;

    .header-section__left {
      flex: 1 1 auto;
      min-width: 0;
    }

    .title-with-legend {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1 1 auto;
      min-width: 0;
    }

    h3 {
      margin: 0;
      font-weight: 500;
      white-space: nowrap;
    }

    .status-legend {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      margin-left: auto;
      align-self: flex-end;
    }

    .batch-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;

      .batch-btn {
        flex: 1 1 0;
        min-width: 0;
        max-width: 9.5em;
        font-size: 0.8rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: rgba(255, 255, 255) !important;

        :deep(.el-button__text) {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .search-section {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: flex-end;
      gap: 10px;
      flex: 0 0 auto;

      .device-search-wrapper {
        position: relative;
        right: 1vw;
      }

      .time-section {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-right: 1vw;

        .time-search-input {
          :deep(.el-input__wrapper) {
            background-size: 100% 100%;
            border-radius: 4px;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
            border: none;

            .el-input__inner {
              color: white;
              background: transparent;
            }

            .el-input__prefix {
              color: white;
            }
          }
        }

        .sort-btn {
          width: 14px;
          height: 14px;
          background: transparent;
          border: none;
          padding: 0;
          color: #fff;

          :deep(.el-icon) {
            color: #fff;
          }
        }
      }
    }
  }

  .status-legend {
    padding: 10px 0 0;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    align-self: flex-end;
  }

  .status-legend__item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 14px;
  }

  .status-legend__icon {
    display: block;
    height: 0.8rem;
    width: auto;
    object-fit: contain;
  }

  .status-legend__text {
    font-size: 0.78rem;
    line-height: 1;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
  }

  .alarm-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }

  .alarm-grid {
    display: grid;
    gap: 10px;
    flex: 1;
    overflow-y: auto;
    padding-top: 10px;
    width: 100%;
    box-sizing: border-box;
    -ms-overflow-style: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    .alarm-card {
      width: 16vw;
      height: 20vh;
      padding: 12px;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      max-height: 170px;
      min-height: 0;
      overflow: hidden;
      cursor: pointer;
      background-repeat: no-repeat;
      background-position: center center;
      background-size: 100% 100%;

      &.alarm-card--healthy {
        background-image: url('@/assets/images/background/首页-预警总览-健康设备背景.webp');
      }

      &.alarm-card--offline {
        background-image: url('@/assets/images/background/首页-预警总览-离线设备背景.webp');
      }

      &.alarm-card--alarm {
        background-image: url('@/assets/images/background/首页-预警总览-报警设备背景.webp');
      }

      &.alarm-card--warning {
        background-image: url('@/assets/images/background/首页-预警总览-预警设备背景.webp');
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding: 2px 0;
        background-repeat: no-repeat;
        background-position: center center;
        background-size: 100% 100%;

        .device-name {
          font-weight: 600;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 1);
          font-size: 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        .status-dot {
          width: 2.2vw;
          height: 0.6vh;
          display: inline-block;
          vertical-align: middle;
          margin-left: 8px;
          background-repeat: no-repeat;
          background-position: center center;
          background-size: contain;

          &.alarm {
            background-image: url('@/assets/images/background/首页-预警总览-报警.webp');
          }

          &.warning {
            background-image: url('@/assets/images/background/首页-预警总览-预警.webp');
          }

          &.healthy {
            background-image: url('@/assets/images/background/首页-预警总览-健康.webp');
          }

          &.offline {
            background-image: url('@/assets/images/background/首页-预警总览-离线.webp');
          }
        }
      }

      &.alarm-card--healthy .card-header {
        background-image: url('@/assets/images/background/首页-预警总览-健康标题.webp');
      }

      &.alarm-card--offline .card-header {
        background-image: url('@/assets/images/background/首页-预警总览-离线标题.webp');
      }

      &.alarm-card--alarm .card-header {
        background-image: url('@/assets/images/background/首页-预警总览-报警标题.webp');
      }

      &.alarm-card--warning .card-header {
        background-image: url('@/assets/images/background/首页-预警总览-预警标题.webp');
      }

      .alarm-time {
        font-size: 0.9rem;
        font-weight: 400;
        letter-spacing: 0.78px;
        color: rgba(255, 255, 255, 1);
        white-space: nowrap;
        margin-bottom: 8px;
        text-align: left;
      }

      .measurement-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
        flex: 1;
        min-height: 0;

        .point-item {
          width: 3.3vw;
          height: 3.5vh;
          display: flex;
          align-items: center;
          justify-content: center;
          max-height: 35px;
          font-size: 0.75rem;
          white-space: nowrap;
          text-align: center;
          border-radius: 4px;
          padding: 1px;
          word-break: break-word;
          overflow: hidden;
          color: white;

          &.healthy {
            background: url('@/assets/images/background/首页-预警总览-健康点位.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.offline {
            background: url('@/assets/images/background/首页-预警总览-离线点位.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.warning {
            background: url('@/assets/images/background/首页-预警总览-预警点位.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.alarm {
            background: url('@/assets/images/background/首页-预警总览-报警点位.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.alarm-device {
            background: url('@/assets/images/background/首页-预警总览-报警设备.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.warning-device {
            background: url('@/assets/images/background/首页-预警总览-预警设备.webp') no-repeat center center;
            background-size: 100% 100%;
          }
        }
      }
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    width: 100%;
    overflow: hidden;
    padding-top: 10px;
  }

  .pagination-page-meta {
    color: #fff;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  @keyframes status-dot-blink {

    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.35;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .status-dot.alarm {
      animation: none;
    }
  }

  @media (max-width: 768px) {
    .header-section {
      gap: 8px;
    }

    .header-section .title-with-legend {
      gap: 10px;
    }

    .header-section .batch-actions {
      gap: 6px;
    }

    .header-section .batch-actions .batch-btn {
      max-width: 7.5em;

      :deep(.el-button__text) {
        white-space: normal;
        word-break: break-all;
        line-height: 1.15;
        display: -webkit-box;
        line-clamp: 2;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    }
  }

  :deep(.el-pagination) {
    font-size: 0.9rem;

    .el-pager li {
      background-color: transparent;
      color: white;
      border: 1px solid transparent;

      &.is-active {
        font-size: 1rem;
        color: rgba(153, 240, 255, 0.7);
        background-color: transparent;
        border: 1px solid transparent;
      }

      &:hover {
        background-color: transparent;
      }
    }

    .btn-prev,
    .btn-next {
      background-color: transparent !important;
      color: white !important;

      &:hover {
        color: rgba(153, 240, 255, 0.7) !important;
      }

      &.is-disabled {
        color: #a8abb4 !important;
      }
    }

    .el-pagination__sizes .el-input__inner {
      height: 18px;
      background-color: transparent;
      color: #111 !important;
      font-size: 0.8rem;
    }
  }
}
</style>
