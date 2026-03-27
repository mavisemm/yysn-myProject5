import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { VibrationWsClient, type VibrationEventPayload } from '@/services/vibrationWs'
import { fetchVibrationAlarmsForOverview } from '@/api/modules/vibrationEvent'

export interface MeasurementPoint {
  name: string
  status: 'healthy' | 'warning' | 'alarm' | 'offline'
}

export interface AlarmItem {
  id: string
  deviceName: string
  shopName: string
  deviceNameWithShop: string
  status: 'alarm' | 'warning' | 'healthy' | 'offline'
  statusText: string
  time: string
  measurementPoints: MeasurementPoint[]
}

/**
 * 预警总览 websocket 新返回结构（与 AlarmOverview.vue 里原逻辑一致）
 */
interface AlarmWsPayload {
  alarmId?: string
  tenantId?: string
  equipmentId?: string
  equipmentName?: string
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
  return !!x && typeof x === 'object' && ('alarmTypeCode' in x || 'alarmTime' in x || 'alarmId' in x) && 'data' in x
}

function mapLevelToStatus(level: string | undefined): MeasurementPoint['status'] {
  const v = String(level ?? '').toUpperCase()
  if (v === 'ALARM') return 'alarm'
  if (v === 'WARNING' || v === 'WARN') return 'warning'
  return 'healthy'
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
        pointName: input.data?.pointName ? String(input.data.pointName) : undefined
      }
    }
  }

  // 兼容旧 vibration 事件结构（VibrationEventPayload）
  const evt = input as Partial<VibrationEventPayload>
  if (!evt || typeof evt !== 'object') return null
  const deviceId = String(evt.deviceId ?? '')
  const t = Number(evt.time ?? 0)
  if (!deviceId || !Number.isFinite(t) || t <= 0) return null

  const parsed = safeParseJson((evt as any).dataJson)
  return {
    deviceId,
    time: t,
    alarmTypeCode: evt.eventTypeCode ? String(evt.eventTypeCode) : undefined,
    statusCode: evt.statusCode ? String(evt.statusCode) : undefined,
    shopName: parsed?.shopName ? String(parsed.shopName) : undefined,
    point: {
      channelNo: parsed?.channelNo,
      level: parsed?.level ? String(parsed.level) : undefined,
      pointName: parsed?.pointName ? String(parsed.pointName) : undefined
    }
  }
}

function buildMeasurementPointsFromPoint(point: OverviewNormalized['point']): MeasurementPoint[] {
  const channelNo = point?.channelNo != null ? Number(point.channelNo) : NaN
  const pointStatus = mapLevelToStatus(point?.level)
  const pointName = point?.pointName ? String(point.pointName) : ''

  const total = 10
  const list: MeasurementPoint[] = Array.from({ length: total }).map((_, i) => ({
    name: i === 0 && pointName ? pointName : `测点${i + 1}`,
    status: 'healthy'
  }))

  if (!isNaN(channelNo) && channelNo >= 1 && channelNo <= total) {
    const existing = list[channelNo - 1]
    list[channelNo - 1] = {
      name: pointName || existing?.name || `测点${channelNo}`,
      status: pointStatus
    }
  }
  return list
}

export const useAlarmOverviewStore = defineStore('alarmOverview', () => {
  const alarms = ref<AlarmItem[]>([])

  const tenantId = computed(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tenantId')
    return (fromUrl && fromUrl.trim()) || (localStorage.getItem('tenantId') ?? '')
  })

  const connectedTenantId = ref('')
  const connecting = ref(false)
  let wsClient: VibrationWsClient | null = null

  function upsertAlarmFromEvent(input: any) {
    const evt = normalizeToOverviewEvent(input)
    if (!evt) return

    // 仅展示未处理：VALID
    if (evt.statusCode && String(evt.statusCode).toUpperCase() !== 'VALID') return

    const isFaultAlarm = String(evt.alarmTypeCode ?? '').toUpperCase() === 'MACHINE_VIBRATION'
    const deviceId = evt.deviceId

    const deviceName = evt.deviceName ? String(evt.deviceName) : deviceId
    const shopName = evt.shopName ? String(evt.shopName) : ''

    const d = new Date(evt.time)
    const timeStr = isNaN(d.getTime()) ? '' : d.toISOString()

    const measurementPoints = buildMeasurementPointsFromPoint(evt.point)
    const deviceStatus: AlarmItem['status'] = isFaultAlarm ? 'alarm' : 'healthy'
    const statusText = deviceStatus === 'alarm' ? '报警' : '健康'

    const item: AlarmItem = {
      id: deviceId,
      deviceName,
      shopName,
      deviceNameWithShop: `${deviceName}（${shopName || ''}）`,
      status: deviceStatus,
      statusText,
      time: timeStr,
      measurementPoints
    }

    const idx = alarms.value.findIndex((a) => a.id === deviceId)
    if (idx >= 0) alarms.value.splice(idx, 1, item)
    else alarms.value.unshift(item)
  }

  async function initOverviewOnceByHttp(tId: string) {
    // 仅保留 findVibrationAlarm（不做 event/find 兜底）
    const items = await fetchVibrationAlarmsForOverview({ tenantId: tId, pageIndex: 0, pageSize: 50 })
    for (const it of items) upsertAlarmFromEvent(it)
  }

  async function start(params?: { token?: string; tenantId?: string }) {
    const tId = (params?.tenantId ?? tenantId.value ?? '').trim()
    if (!tId) return

    // 已经在同 tenantId 下启动过，则不重复启动
    if (connectedTenantId.value === tId && wsClient) return

    // 切 tenant：先停掉旧连接
    stop()

    connecting.value = true
    connectedTenantId.value = tId
    try {
      try {
        await initOverviewOnceByHttp(tId)
      } catch (e) {
        // 初始化失败不影响 websocket 实时
        console.warn('预警总览初始化接口获取失败:', e)
      }

      wsClient = new VibrationWsClient({ token: params?.token ?? (localStorage.getItem('token') ?? undefined) })
      await wsClient.connect()
      wsClient.subscribeVibrationTopic(tId, (payload) => {
        upsertAlarmFromEvent(payload)
      })
    } finally {
      connecting.value = false
    }
  }

  function stop() {
    connecting.value = false
    connectedTenantId.value = ''
    try {
      wsClient?.disconnect()
    } catch {
      // ignore
    }
    wsClient = null
  }

  function reset() {
    stop()
    alarms.value = []
  }

  return {
    alarms,
    tenantId,
    connecting,
    connectedTenantId,
    start,
    stop,
    reset,
    upsertAlarmFromEvent
  }
})

