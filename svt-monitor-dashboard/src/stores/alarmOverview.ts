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

function makeHealthyPoint(i: number): MeasurementPoint {
  return { name: `测点${i + 1}`, status: 'healthy' }
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

    // 新结构有时字段可能不完整；优先 data.xxx，data 不全则从 rawDataJson 兜底
    const parsedFromRaw = safeParseJson((input as any).rawDataJson)
    return {
      deviceId,
      deviceName: input.equipmentName ? String(input.equipmentName) : undefined,
      shopName: input.workshopName ? String(input.workshopName) : undefined,
      time: t,
      alarmTypeCode: input.alarmTypeCode ? String(input.alarmTypeCode) : undefined,
      statusCode: input.statusCode ? String(input.statusCode) : undefined,
      point: {
        channelNo: input.data?.channelNo ?? parsedFromRaw?.channelNo,
        level: (input.data?.level ?? parsedFromRaw?.level) ? String(input.data?.level ?? parsedFromRaw?.level) : undefined,
        pointName: (input.data?.pointName ?? parsedFromRaw?.pointName) ? String(input.data?.pointName ?? parsedFromRaw?.pointName) : undefined
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
  // 预警总览 UI 的点位高亮依赖 measurementPoints 的下标 (i+1)。
  // 你给的数据里 channelNo 可能是字母串，因此必须优先从 pointName 抽取数字（如 "19号点位" -> 19）。
  const BASE_TOTAL = 16

  const pointName = point?.pointName ? String(point.pointName) : ''
  const pointNumFromName = (() => {
    if (!pointName) return null
    const m = pointName.match(/(\d+)/)
    if (!m) return null
    const n = Number(m[1])
    return Number.isFinite(n) && n > 0 ? n : null
  })()

  const pointNumFromChannel = (() => {
    if (point?.channelNo == null) return null
    const n = Number(point.channelNo)
    return Number.isFinite(n) && n > 0 ? n : null
  })()

  const pointNum = pointNumFromName ?? pointNumFromChannel
  const pointStatus = mapLevelToStatus(point?.level)

  const total = Math.max(BASE_TOTAL, pointNum ?? 0)
  const list: MeasurementPoint[] = Array.from({ length: total }).map((_, i) => ({
    name: `测点${i + 1}`,
    status: 'healthy'
  }))

  if (pointNum != null && pointNum >= 1 && pointNum <= list.length) {
    const existing = list[pointNum - 1]
    list[pointNum - 1] = {
      name: pointName || existing?.name || `测点${pointNum}`,
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
    const idx = alarms.value.findIndex((a) => a.id === deviceId)

    const deviceName = evt.deviceName ? String(evt.deviceName) : deviceId
    const shopName = evt.shopName ? String(evt.shopName) : ''

    const d = new Date(evt.time)
    const timeStr = isNaN(d.getTime()) ? '' : d.toISOString()

    // 点位高亮：基于 MACHINE_VIBRATION 直接标记为 alarm（即使后端 level 字段缺失/不一致）
    const derivedPointStatus: MeasurementPoint['status'] = isFaultAlarm ? 'alarm' : mapLevelToStatus(evt.point.level)

    // 更新当前设备已有的测点状态（避免每次 websocket 只保留一个点位的 alarm/warning）
    const prev = idx >= 0 ? alarms.value[idx] : undefined
    const pointName = evt.point.pointName ? String(evt.point.pointName) : ''
    const pointNum = (() => {
      if (pointName) {
        const m = pointName.match(/(\d+)/)
        if (m) {
          const n = Number(m[1])
          if (Number.isFinite(n) && n > 0) return n
        }
      }
      if (evt.point.channelNo != null) {
        const n = Number(evt.point.channelNo)
        if (Number.isFinite(n) && n > 0) return n
      }
      return null
    })()

    const BASE_TOTAL = 16
    const prevPoints = prev?.measurementPoints ?? []
    const total = Math.max(BASE_TOTAL, prevPoints.length, pointNum ?? 0)

    const measurementPoints: MeasurementPoint[] = (() => {
      if (!prevPoints.length) {
        // 首次：用 buildMeasurementPointsFromPoint 的逻辑创建基础列表（并确保总长度包含点位）
        const built = buildMeasurementPointsFromPoint({
          ...evt.point,
          // buildMeasurementPointsFromPoint 内部用 level 推导 status；这里先按当前 derivedPointStatus 覆盖
          level: evt.point.level
        })
        // 确保点位索引能覆盖该点
        if (pointNum != null && built.length < pointNum) {
          const expanded = Array.from({ length: total }).map((_, i) => built[i] ?? makeHealthyPoint(i))
          return expanded.map((p, i) => (i === (pointNum - 1) ? { ...p, name: pointName || p.name, status: derivedPointStatus } : p))
        }
        return built.map((p, i) => (pointNum != null && i === (pointNum - 1) ? { ...p, name: pointName || p.name, status: derivedPointStatus } : p))
      }

      // 已有测点：在原数组基础上更新一个点位状态
      const next = Array.from({ length: total }).map((_, i) => {
        return prevPoints[i] ?? makeHealthyPoint(i)
      })

      if (pointNum != null && pointNum >= 1 && pointNum <= next.length) {
        next[pointNum - 1] = {
          name: pointName || next[pointNum - 1]?.name || `测点${pointNum}`,
          status: derivedPointStatus
        }
      }

      return next
    })()

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

