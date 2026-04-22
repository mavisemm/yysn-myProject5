import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getTenantId } from '@/api/tenant'
import { VibrationWsClient, type VibrationEventPayload } from '@/services/vibrationWs'
import { SoundWarningWsClient } from '@/services/soundWarningWs'
import { fetchVibrationAlarmsForOverview } from '@/api/modules/vibrationEvent'
import { apiSoundAlarmFind, type EventRow } from '@/api/modules/alarmBatch'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import type { DeviceNode } from '@/types/device'

export interface MeasurementPoint {
  name: string
  status: 'healthy' | 'warning' | 'alarm' | 'offline'
  lastAlarmTime?: number
}

export interface AlarmItem {
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
  // HTTP 数组顺序：越大越新（items[0] 最大）
  latestOrderKey?: number
  statusPriority?: number
  sortTimeTs?: number
  searchText?: string
  displayStatus?: 'alarm' | 'warning' | 'healthy' | 'offline'
  /**
   * 来自设备树的“预填充”占位项（避免空白），在 HTTP 初始化完成前不参与展示，
   * 以避免进入首页时先显示健康(绿)再被真实告警覆盖(红)的闪烁。
   */
  prefilled?: boolean
}

function makeHealthyPoint(i: number): MeasurementPoint {
  return { name: `测点${i + 1}`, status: 'healthy' }
}

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
  // 只要具备告警时间/告警类型等关键信息，就按告警载荷处理
  // 避免因 payload 是否带 `data` 字段不同，导致时间字段走了不同分支
  return (
    !!x && typeof x === 'object' && ('alarmTypeCode' in x || 'alarmTime' in x || 'alarmId' in x)
  )
}

function mapLevelToStatus(level: string | undefined): MeasurementPoint['status'] {
  const v = String(level ?? '').toUpperCase()
  if (v === 'ALARM') return 'alarm'
  if (v === 'WARNING' || v === 'WARN') return 'warning'
  return 'healthy'
}

function maxPointStatus(
  a: MeasurementPoint['status'],
  b: MeasurementPoint['status'],
): MeasurementPoint['status'] {
  const order: Record<MeasurementPoint['status'], number> = {
    alarm: 3,
    warning: 2,
    healthy: 1,
    offline: 0,
  }
  return (order[a] ?? 0) >= (order[b] ?? 0) ? a : b
}

type OverviewNormalized = {
  deviceId: string
  deviceName?: string
  shopName?: string
  time: number
  alarmTypeCode?: string
  statusCode?: string
  receiverId?: string
  isEventTypeMessage?: boolean
  kind: AlarmItem['kind']
  point: {
    channelNo?: string | number
    level?: string
    pointName?: string
  }
}

type DeviceResolvedByPoint = {
  deviceId: string
  deviceName?: string
  shopName?: string
}

function statusRank(status: MeasurementPoint['status']): number {
  const order: Record<MeasurementPoint['status'], number> = {
    alarm: 3,
    warning: 2,
    healthy: 1,
    offline: 0,
  }
  return order[status] ?? 0
}

const MAX_OVERVIEW_ITEMS = 800
const MAX_DEBUG_MAP_SIZE = 300
const ENABLE_OVERVIEW_DEBUG_LOG = Boolean(
  import.meta.env.DEV && import.meta.env.VITE_ALARM_OVERVIEW_DEBUG === '1',
)

function trimMapSize<K, V>(map: Map<K, V>, maxSize: number) {
  while (map.size > maxSize) {
    const firstKey = map.keys().next().value
    if (firstKey == null) break
    map.delete(firstKey)
  }
}

function parsePointStatus(level: string | undefined): MeasurementPoint['status'] | null {
  const v = String(level ?? '').toUpperCase()
  if (v === 'ALARM') return 'alarm'
  if (v === 'WARNING' || v === 'WARN') return 'warning'
  return null
}

function derivePointStatus(
  alarmTypeCode: string | undefined,
  level: string | undefined,
): MeasurementPoint['status'] {
  const byLevel = parsePointStatus(level)
  if (byLevel) return byLevel
  const code = String(alarmTypeCode ?? '').toUpperCase()
  if (!code) return 'healthy'
  if (code === 'MACHINE_VIBRATION') return 'alarm'
  return 'warning'
}

function normalizeToOverviewEvent(input: any): OverviewNormalized | null {
  // 优先规则：只要包含 eventTypeCode，就按“声音预警”处理，
  // 不再受 alarmTypeCode（例如 MACHINE_VIBRATION）影响。
  if (input && typeof input === 'object' && 'eventTypeCode' in input) {
    const parsedFromData = safeParseJson((input as any).dataJson)
    const parsedFromRaw = safeParseJson((input as any).rawDataJson)
    const pointNameRaw =
      parsedFromData?.pointName ??
      parsedFromData?.pointname ??
      parsedFromRaw?.pointName ??
      parsedFromRaw?.pointname
    const receiverIdRaw =
      parsedFromData?.receiverId ??
      parsedFromData?.receiverid ??
      parsedFromRaw?.receiverId ??
      parsedFromRaw?.receiverid
    const deviceId = String((input as any).equipmentId ?? '').trim()
    const t = Number((input as any).time ?? (input as any).alarmTime ?? 0)
    if (!deviceId || !Number.isFinite(t) || t <= 0) return null

    return {
      deviceId,
      deviceName: (input as any).equipmentName ? String((input as any).equipmentName) : undefined,
      shopName: (input as any).workshopName ? String((input as any).workshopName) : undefined,
      time: t,
      alarmTypeCode: (input as any).eventTypeCode
        ? String((input as any).eventTypeCode)
        : undefined,
      statusCode: (input as any).statusCode ? String((input as any).statusCode) : undefined,
      receiverId: receiverIdRaw ? String(receiverIdRaw) : undefined,
      isEventTypeMessage: true,
      kind: 'sound',
      point: {
        channelNo: parsedFromData?.channelNo ?? parsedFromRaw?.channelNo,
        level:
          (parsedFromData?.level ?? parsedFromRaw?.level)
            ? String(parsedFromData?.level ?? parsedFromRaw?.level)
            : undefined,
        pointName: pointNameRaw ? String(pointNameRaw) : undefined,
      },
    }
  }

  if (isAlarmWsPayload(input)) {
    const parsedFromData = safeParseJson((input as any).dataJson)
    const parsedFromRaw = safeParseJson((input as any).rawDataJson)
    // 预警总览卡片合并主键：严格使用 equipmentId
    const deviceId = String(input.equipmentId ?? '').trim()
    const receiverIdRaw =
      (input as any).receiverId ?? parsedFromData?.receiverId ?? parsedFromRaw?.receiverId
    const t = Number(input.alarmTime ?? input.time ?? 0)
    if (!deviceId || !Number.isFinite(t) || t <= 0) return null

    return {
      deviceId,
      deviceName: input.equipmentName ? String(input.equipmentName) : undefined,
      shopName: input.workshopName ? String(input.workshopName) : undefined,
      time: t,
      alarmTypeCode: input.alarmTypeCode ? String(input.alarmTypeCode) : undefined,
      statusCode: input.statusCode ? String(input.statusCode) : undefined,
      receiverId: receiverIdRaw ? String(receiverIdRaw) : undefined,
      isEventTypeMessage: false,
      kind: 'vibration',
      point: {
        channelNo: input.data?.channelNo ?? parsedFromData?.channelNo ?? parsedFromRaw?.channelNo,
        level:
          (input.data?.level ?? parsedFromData?.level ?? parsedFromRaw?.level)
            ? String(input.data?.level ?? parsedFromData?.level ?? parsedFromRaw?.level)
            : undefined,
        pointName:
          (input.data?.pointName ?? parsedFromData?.pointName ?? parsedFromRaw?.pointName)
            ? String(input.data?.pointName ?? parsedFromData?.pointName ?? parsedFromRaw?.pointName)
            : undefined,
      },
    }
  }

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
    receiverId: parsed?.receiverId ? String(parsed.receiverId) : undefined,
    shopName: parsed?.shopName ? String(parsed.shopName) : undefined,
    isEventTypeMessage: true,
    kind: 'sound',
    point: {
      channelNo: parsed?.channelNo,
      level: parsed?.level ? String(parsed.level) : undefined,
      pointName: parsed?.pointName ? String(parsed.pointName) : undefined,
    },
  }
}

function buildMeasurementPointsFromPoint(point: OverviewNormalized['point']): MeasurementPoint[] {
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
    status: 'healthy',
    lastAlarmTime: undefined,
  }))

  if (pointNum != null && pointNum >= 1 && pointNum <= list.length) {
    const existing = list[pointNum - 1]
    list[pointNum - 1] = {
      name: pointName || existing?.name || `测点${pointNum}`,
      status: pointStatus,
    }
  }

  return list
}

export const useAlarmOverviewStore = defineStore('alarmOverview', () => {
  const alarms = ref<AlarmItem[]>([])

  const connectedTenantId = ref('')
  const connecting = ref(false)
  const httpInitialized = ref(false)
  let vibrationWsClient: VibrationWsClient | null = null
  let soundWsClient: SoundWarningWsClient | null = null
  let treeWatchStopper: (() => void) | null = null
  let treePrefilled = false
  // 用于排查“预警总览 HTTP 初始化 vs websocket 更新”展示时间差异
  const httpLatestAlarmTimeByDeviceId = new Map<string, number>()
  const lastWsLoggedTsByDeviceId = new Map<string, number>()
  const lastHttpLoggedTsByDeviceId = new Map<string, number>()

  const resolveDisplayStatus = (
    points: MeasurementPoint[],
  ): NonNullable<AlarmItem['displayStatus']> => {
    let hasWarning = false
    for (const p of points) {
      if (p.status === 'alarm') return 'alarm'
      if (p.status === 'warning') hasWarning = true
    }
    return hasWarning ? 'warning' : 'healthy'
  }

  const applyDerivedFields = (item: AlarmItem): AlarmItem => {
    const displayStatus = resolveDisplayStatus(item.measurementPoints ?? [])
    const statusPriorityMap: Record<NonNullable<AlarmItem['displayStatus']>, number> = {
      alarm: 0,
      warning: 1,
      healthy: 2,
      offline: 3,
    }
    const timeTs = Number(item.time ?? 0)
    const normalizedTs = Number.isFinite(timeTs) && timeTs > 0 ? timeTs : 0
    const searchText =
      `${item.deviceName ?? ''} ${item.shopName ?? ''} ${item.deviceNameWithShop ?? ''}`.toLowerCase()
    return {
      ...item,
      displayStatus,
      statusPriority: statusPriorityMap[displayStatus],
      sortTimeTs: normalizedTs,
      searchText,
    }
  }

  const trimOverviewItems = () => {
    if (alarms.value.length <= MAX_OVERVIEW_ITEMS) return
    alarms.value = alarms.value.slice(0, MAX_OVERVIEW_ITEMS)
  }

  const tsToLocalTimeStr = (ts: number): string => {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return 'Invalid Date'
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  function collectDeviceNodes(nodes: DeviceNode[]): DeviceNode[] {
    const result: DeviceNode[] = []
    const stack: DeviceNode[] = [...nodes]
    while (stack.length) {
      const node = stack.pop()
      if (!node) continue
      if (node.type === 'device') result.push(node)
      if (node.children?.length) stack.push(...node.children)
    }
    return result
  }

  function resolveDeviceByPoint(
    receiverId?: string,
    pointName?: string,
  ): DeviceResolvedByPoint | null {
    const rid = String(receiverId ?? '').trim()
    const pName = String(pointName ?? '').trim()
    if (!rid && !pName) return null
    const candidates: DeviceResolvedByPoint[] = []
    const stack: Array<{ node: DeviceNode; parent?: DeviceNode; workshopName?: string }> = []
    for (const n of useDeviceTreeStore().deviceTreeData ?? []) {
      stack.push({ node: n, parent: undefined, workshopName: '' })
    }

    while (stack.length) {
      const cur = stack.pop()
      if (!cur) continue
      const node = cur.node
      const workshopName = node.type === 'workshop' ? node.name : (cur.workshopName ?? '')

      if (node.type === 'point') {
        const nodeReceiverId = String(node.receiverId ?? node.id ?? '').trim()
        const nodePointName = String(node.pointName ?? node.name ?? '').trim()
        const hitByReceiver = !!rid && nodeReceiverId === rid
        const hitByPointName = !!pName && nodePointName === pName
        if (hitByReceiver || hitByPointName) {
          const parentDevice = cur.parent && cur.parent.type === 'device' ? cur.parent : undefined
          if (parentDevice) {
            const deviceId = String(parentDevice.equipmentId ?? parentDevice.id ?? '').trim()
            if (deviceId) {
              candidates.push({
                deviceId,
                deviceName: String(parentDevice.equipmentName ?? parentDevice.name ?? deviceId),
                shopName: String(parentDevice.workshopName ?? workshopName ?? ''),
              })
            }
          }
        }
      }

      for (const child of node.children ?? []) {
        stack.push({ node: child, parent: node, workshopName })
      }
    }

    if (!candidates.length) return null
    if (rid) {
      const exact = candidates[0]
      if (exact) return exact
    }
    return candidates.length === 1 ? (candidates[0] ?? null) : null
  }

  function pickLeadingPoint(points: MeasurementPoint[]): {
    status: MeasurementPoint['status']
    timeKey: number
    pointNum?: number
  } {
    let bestStatus: MeasurementPoint['status'] = 'healthy'
    let bestTime = 0
    let bestPointNum: number | undefined = undefined
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      if (!p) continue
      const t = Number(p.lastAlarmTime ?? 0)
      const r = statusRank(p.status)
      const br = statusRank(bestStatus)
      const pointNum = i + 1
      if (
        r > br ||
        (r === br && t > bestTime) ||
        (r === br && t === bestTime && bestPointNum == null)
      ) {
        bestStatus = p.status
        bestTime = Number.isFinite(t) && t > 0 ? t : 0
        bestPointNum = pointNum
      }
    }
    return { status: bestStatus, timeKey: bestTime, pointNum: bestPointNum }
  }

  function buildHealthyAlarmFromDevice(deviceNode: DeviceNode): AlarmItem {
    const deviceId = String(deviceNode.equipmentId ?? deviceNode.id ?? '')
    const deviceName = String(deviceNode.equipmentName ?? deviceNode.name ?? deviceId)
    const shopName = String(deviceNode.workshopName ?? '')

    const measurementPoints: MeasurementPoint[] = Array.from({ length: 16 }).map((_, i) =>
      makeHealthyPoint(i),
    )

    return {
      id: deviceId,
      kind: 'vibration',
      deviceName,
      shopName,
      deviceNameWithShop: `${deviceName}（${shopName || ''}）`,
      status: 'healthy',
      statusText: '健康',
      time: '',
      measurementPoints,
      prefilled: true,
    }
  }

  function prefillHealthyFromDeviceTree(deviceTreeData: DeviceNode[]) {
    if (treePrefilled) return
    if (!deviceTreeData?.length) return

    const deviceNodes = collectDeviceNodes(deviceTreeData)
    if (!deviceNodes.length) return

    const existingById = new Map(alarms.value.map((a) => [a.id, a] as const))
    const treeIds = new Set<string>()

    const healthyList: AlarmItem[] = deviceNodes
      .map((d) => {
        const id = String(d.equipmentId ?? d.id ?? '')
        if (!id) return null
        treeIds.add(id)
        return existingById.get(id) ?? buildHealthyAlarmFromDevice(d)
      })
      .filter((x): x is AlarmItem => Boolean(x))

    const leftovers = alarms.value.filter((a) => !treeIds.has(a.id))

    alarms.value = [...healthyList, ...leftovers]
    treePrefilled = true
  }

  function upsertAlarmFromEvent(
    input: any,
    source: 'http' | 'ws' = 'ws',
    opts?: { keepPrevAsLatest?: boolean; orderKey?: number },
  ) {
    const evt = normalizeToOverviewEvent(input)
    if (!evt) return

    const isFaultAlarm =
      !evt.isEventTypeMessage &&
      String(evt.alarmTypeCode ?? '').toUpperCase() === 'MACHINE_VIBRATION'
    const resolvedByPoint = resolveDeviceByPoint(evt.receiverId, evt.point.pointName)
    const rawDeviceId = String(evt.deviceId ?? '').trim()
    // 同一设备允许同时存在“振动卡片 + 声音卡片”
    const deviceId = rawDeviceId
    if (!deviceId) return
    const cardId = `${evt.kind}:${deviceId}`
    const idx = alarms.value.findIndex((a) => `${a.kind}:${a.id}` === cardId)

    const t = Number(evt.time)
    const timeStr = Number.isFinite(t) && t > 0 ? String(t) : ''

    const prev = idx >= 0 ? alarms.value[idx] : undefined
    const prevTs = prev?.time ? Number(prev.time) : NaN
    // HTTP 初始化返回的 items 不保证按时间倒序。
    // 如果后续遍历到的记录更旧，只“不覆盖卡片上的 time”，但仍需要合并测点状态，
    // 否则同一设备不同测点的告警会被整条忽略（你遇到的现象）。
    const keepPrevAsLatest = Boolean(opts?.keepPrevAsLatest)
    const isOlderOrSameTime =
      keepPrevAsLatest || (Number.isFinite(prevTs) && Number.isFinite(t) && t > 0 && t <= prevTs)

    if ((source === 'ws' || source === 'http') && Number.isFinite(t) && t > 0) {
      const prevLogged = lastWsLoggedTsByDeviceId.get(deviceId) ?? 0
      const prevHttpLogged = lastHttpLoggedTsByDeviceId.get(deviceId) ?? 0
      // 只记录更“新”的时间，避免乱序时把 last* 写回旧值。
      if (source === 'ws' && t > prevLogged) lastWsLoggedTsByDeviceId.set(deviceId, t)
      if (source === 'http' && t > prevHttpLogged) lastHttpLoggedTsByDeviceId.set(deviceId, t)
      trimMapSize(lastWsLoggedTsByDeviceId, MAX_DEBUG_MAP_SIZE)
      trimMapSize(lastHttpLoggedTsByDeviceId, MAX_DEBUG_MAP_SIZE)
    }

    const derivedPointStatus: MeasurementPoint['status'] =
      evt.kind === 'sound' ? 'warning' : derivePointStatus(evt.alarmTypeCode, evt.point.level)

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

    const prevLatestPointNum = prev?.latestPointNum
    const prevLatestOrderKey = prev?.latestOrderKey
    const mergeOrderKey = (() => {
      const ok = Number(opts?.orderKey)
      return Number.isFinite(ok) && ok > 0 ? ok : Number.isFinite(t) && t > 0 ? t : 0
    })()
    const eventTimeKey = Number.isFinite(t) && t > 0 ? t : 0
    const keepMax = (prevValue: unknown, nextValue: number): number => {
      const prevNum = Number(prevValue ?? 0)
      const prevOk = Number.isFinite(prevNum) && prevNum > 0 ? prevNum : 0
      return nextValue > prevOk ? nextValue : prevOk
    }
    const shouldOverwritePoint = (prevValue: unknown, nextValue: number): boolean => {
      const prevNum = Number(prevValue ?? 0)
      const prevOk = Number.isFinite(prevNum) && prevNum > 0 ? prevNum : 0
      // orderKey 越大越新：只有“更大”(更靠前) 才允许覆盖
      return nextValue > prevOk
    }

    // 卡片“设备名/车间名”只允许由更“新”的记录覆盖。
    // 否则 HTTP items 乱序/后续更旧记录会把标题覆盖成旧值，造成你看到的现象。
    const canOverwriteMeta =
      !prev ||
      (!isOlderOrSameTime && shouldOverwritePoint(prevLatestOrderKey, mergeOrderKey)) ||
      (prevLatestOrderKey == null && !isOlderOrSameTime)

    const nextDeviceNameCandidate = evt.deviceName ? String(evt.deviceName) : ''
    const nextShopNameCandidate = evt.shopName ? String(evt.shopName) : ''

    const deviceName = canOverwriteMeta
      ? nextDeviceNameCandidate
      : String(prev?.deviceName ?? nextDeviceNameCandidate)
    const shopName = canOverwriteMeta
      ? nextShopNameCandidate
      : String(prev?.shopName ?? nextShopNameCandidate)

    const measurementPoints: MeasurementPoint[] = (() => {
      if (!prevPoints.length) {
        const built = buildMeasurementPointsFromPoint({
          ...evt.point,

          level: evt.point.level,
        })

        if (pointNum != null && built.length < pointNum) {
          const expanded = Array.from({ length: total }).map(
            (_, i) => built[i] ?? makeHealthyPoint(i),
          )
          return expanded.map((p, i) =>
            i === pointNum - 1
              ? {
                  ...p,
                  name: pointName || p.name,
                  status: maxPointStatus(p.status, derivedPointStatus),
                  lastAlarmTime: keepMax(p.lastAlarmTime, eventTimeKey),
                }
              : p,
          )
        }
        return built.map((p, i) =>
          pointNum != null && i === pointNum - 1
            ? {
                ...p,
                name: pointName || p.name,
                status: maxPointStatus(p.status, derivedPointStatus),
                lastAlarmTime: keepMax(p.lastAlarmTime, eventTimeKey),
              }
            : p,
        )
      }

      const next = Array.from({ length: total }).map((_, i) => {
        return prevPoints[i] ?? makeHealthyPoint(i)
      })

      if (pointNum != null && pointNum >= 1 && pointNum <= next.length) {
        const prevPoint = next[pointNum - 1]
        const prevKey = prevPoint?.lastAlarmTime
        const overwrite = shouldOverwritePoint(prevKey, mergeOrderKey)
        const prevStatus = prevPoint?.status ?? 'healthy'
        const prevRank = statusRank(prevStatus)
        const nextRank = statusRank(derivedPointStatus)
        const useNewAsPrimary = nextRank > prevRank || (nextRank === prevRank && overwrite)
        const nextPrimaryStatus = useNewAsPrimary ? derivedPointStatus : prevStatus
        const nextPrimaryTime = useNewAsPrimary
          ? Number.isFinite(eventTimeKey) && eventTimeKey > 0
            ? eventTimeKey
            : Number(prevKey ?? 0)
          : Number(prevKey ?? 0)
        next[pointNum - 1] = {
          // 严格按数组顺序：更旧的记录不允许覆盖更新的点位名称/排序键
          name: overwrite
            ? pointName || prevPoint?.name || `测点${pointNum}`
            : prevPoint?.name || pointName || `测点${pointNum}`,
          // 点位状态和时间必须来自同一条“主事件”
          status: nextPrimaryStatus,
          lastAlarmTime:
            Number.isFinite(nextPrimaryTime) && nextPrimaryTime > 0
              ? nextPrimaryTime
              : keepMax(prevKey, eventTimeKey),
        }
      }

      return next
    })()

    const leading = pickLeadingPoint(measurementPoints)
    const latestPointNum = leading.pointNum ?? prevLatestPointNum ?? pointNum ?? undefined
    const latestOrderKey =
      Number.isFinite(mergeOrderKey) && mergeOrderKey > 0 ? mergeOrderKey : prevLatestOrderKey

    const deviceStatus: AlarmItem['status'] =
      leading.status === 'alarm'
        ? 'alarm'
        : leading.status === 'warning'
          ? 'warning'
          : isFaultAlarm
            ? 'alarm'
            : 'healthy'
    const statusText =
      deviceStatus === 'alarm' ? '报警' : deviceStatus === 'warning' ? '预警' : '健康'

    const item: AlarmItem = applyDerivedFields({
      id: deviceId,
      kind: evt.kind,
      deviceName,
      shopName,
      deviceNameWithShop: `${deviceName}（${shopName || ''}）`,
      status: deviceStatus,
      statusText,
      // 卡片时间与展示状态保持一致：来自“主事件”对应的点位时间。
      time:
        (leading.status === 'alarm' || leading.status === 'warning') &&
        Number.isFinite(leading.timeKey) &&
        leading.timeKey > 0
          ? String(leading.timeKey)
          : '',
      measurementPoints,
      latestPointNum,
      latestOrderKey,
      prefilled: false,
    })

    if (idx >= 0) alarms.value.splice(idx, 1, item)
    else alarms.value.unshift(item)
    trimOverviewItems()

    // 关键：写入完再读取一次，确认 store 里最终值是否仍是写入值
    if ((source === 'ws' || source === 'http') && Number.isFinite(t) && t > 0) {
      const actualAfterWrite = alarms.value.find((a) => a.id === deviceId)?.time ?? null
      void actualAfterWrite
    }
  }

  async function initOverviewOnceByHttp(tId: string) {
    const [vibrationRes, soundRes] = await Promise.allSettled([
      fetchVibrationAlarmsForOverview({ tenantId: tId, pageIndex: 0, pageSize: 5000 }),
      apiSoundAlarmFind({
        filterPropertyMap: [
          { code: 'statusCode', operate: 'EQ', value: 'VALID' },
          { code: 'tenantId', operate: 'EQ', value: tId },
        ],
        sortValueMap: [{ code: 'time', sort: 'desc' }],
        pageIndex: 0,
        pageSize: 5000,
      }),
    ])

    const rawItems = vibrationRes.status === 'fulfilled' ? (vibrationRes.value ?? []) : []
    if (vibrationRes.status !== 'fulfilled') {
      console.warn('预警总览振动预警初始化获取失败:', vibrationRes.reason)
    }
    // 约定：HTTP 接口返回 items 已按“最新在前”排序。
    // 因此无需再排序；但仍过滤掉非 VALID / 无时间的数据，避免比较键混乱。
    const items = (rawItems ?? []).filter((it: any) => {
      const statusCode = it?.statusCode
      const isValid = statusCode == null || String(statusCode).toUpperCase() === 'VALID'
      const ts = Number(it?.alarmTime ?? 0)
      return isValid && Number.isFinite(ts) && ts > 0
    })

    // 调试：输出 9/2/4 号点位第一次出现的数组顺序（idx）
    try {
      const preview = items.slice(0, 5000).map((it, idx) => {
        const pointName = String((it as any)?.data?.pointName ?? (it as any)?.pointName ?? '')
        const m = pointName.match(/(\d+)/)
        const pointNum = m ? Number(m[1]) : NaN
        return {
          idx,
          equipmentId: String((it as any)?.equipmentId ?? ''),
          equipmentName: String((it as any)?.equipmentName ?? ''),
          alarmTime: Number((it as any)?.alarmTime ?? 0),
          pointName,
          pointNum: Number.isFinite(pointNum) ? pointNum : null,
        }
      })

      const firstIdxByPointNum: Record<number, number | null> = { 9: null, 2: null, 4: null }
      for (const row of preview) {
        const pn = row.pointNum
        if (pn == null) continue
        if ((pn === 9 || pn === 2 || pn === 4) && firstIdxByPointNum[pn] == null) {
          firstIdxByPointNum[pn] = row.idx
        }
        if (
          firstIdxByPointNum[9] != null &&
          firstIdxByPointNum[2] != null &&
          firstIdxByPointNum[4] != null
        )
          break
      }

      if (ENABLE_OVERVIEW_DEBUG_LOG) {
        console.groupCollapsed('[AlarmOverview][HTTP] items preview (up to 5000)')
        console.table(preview)
        console.log('[AlarmOverview][HTTP] first idx by pointNum (9/2/4):', firstIdxByPointNum)
        console.groupEnd()
      }
    } catch {
      // ignore debug failures
    }

    httpLatestAlarmTimeByDeviceId.clear()
    for (const it of items) {
      const deviceId = String((it as any).equipmentId ?? '')
      const ts = Number((it as any).alarmTime ?? 0)
      if (!deviceId || !Number.isFinite(ts) || ts <= 0) continue
      const prev = httpLatestAlarmTimeByDeviceId.get(deviceId) ?? 0
      if (ts > prev) httpLatestAlarmTimeByDeviceId.set(deviceId, ts)
    }
    // items 已按 alarmTime 倒序：同一设备第一次出现视为“最新”，后续只合并测点状态。
    const seenLatestByDeviceId = new Set<string>()
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx]
      const deviceId = String((it as any).equipmentId ?? '')
      const isOlder = deviceId ? seenLatestByDeviceId.has(deviceId) : false
      // 统一比较口径：用 alarmTime 作为“新旧覆盖”的排序键（越大越新）
      const orderKey = Number((it as any).alarmTime ?? 0)
      upsertAlarmFromEvent(it, 'http', { keepPrevAsLatest: isOlder, orderKey })
      if (deviceId) seenLatestByDeviceId.add(deviceId)
    }

    if (soundRes.status === 'fulfilled') {
      const soundItems = (soundRes.value?.ret?.items ?? []) as EventRow[]
      for (let i = 0; i < soundItems.length; i++) {
        const it = soundItems[i]
        const statusCode = String((it as any)?.statusCode ?? '')
        if (statusCode && statusCode.toUpperCase() !== 'VALID') continue
        const orderKey = Number((it as any)?.time ?? 0)
        upsertAlarmFromEvent(it, 'http', { keepPrevAsLatest: false, orderKey })
      }
    } else {
      console.warn('预警总览声音预警初始化获取失败:', soundRes.reason)
    }
  }

  async function start(params?: {
    token?: string
    tenantId?: string
    onIncomingEvent?: (payload: unknown) => void
  }) {
    const tId = (params?.tenantId ?? getTenantId() ?? '').trim()
    if (!tId) return

    if (connectedTenantId.value === tId && vibrationWsClient && soundWsClient) return

    stop()
    alarms.value = []
    treePrefilled = false
    httpInitialized.value = false

    connecting.value = true
    connectedTenantId.value = tId
    try {
      const deviceTreeStore = useDeviceTreeStore()
      const tryPrefill = () => {
        prefillHealthyFromDeviceTree(deviceTreeStore.deviceTreeData)
      }

      tryPrefill()
      if (!treePrefilled) {
        treeWatchStopper?.()
        treeWatchStopper = watch(
          () => deviceTreeStore.deviceTreeData,
          () => {
            if (treePrefilled) return
            prefillHealthyFromDeviceTree(deviceTreeStore.deviceTreeData)
            if (treePrefilled) {
              treeWatchStopper?.()
              treeWatchStopper = null
            }
          },
          { immediate: false, deep: false },
        )
      }

      const token = params?.token ?? localStorage.getItem('token') ?? undefined
      const pendingVibrationWsClient = new VibrationWsClient({
        token,
      })
      const pendingSoundWsClient = new SoundWarningWsClient({
        token,
      })
      vibrationWsClient = pendingVibrationWsClient
      soundWsClient = pendingSoundWsClient

      const vibrationWsReadyPromise = pendingVibrationWsClient
        .connect()
        .then(() => {
          if (vibrationWsClient !== pendingVibrationWsClient) return
          pendingVibrationWsClient.subscribeVibrationTopic(tId, (payload) => {
            upsertAlarmFromEvent(payload, 'ws')
            try {
              params?.onIncomingEvent?.(payload)
            } catch (e) {
              console.warn('预警总览振动 websocket onIncomingEvent 回调异常:', e)
            }
          })
        })
        .catch((e) => {
          if (vibrationWsClient !== pendingVibrationWsClient) return
          console.warn('预警总览振动 websocket 连接失败:', e)
        })

      const soundWsReadyPromise = pendingSoundWsClient
        .connect()
        .then(() => {
          if (soundWsClient !== pendingSoundWsClient) return
          pendingSoundWsClient.subscribeSoundTopic(tId, (payload) => {
            upsertAlarmFromEvent(payload, 'ws')
            try {
              params?.onIncomingEvent?.(payload)
            } catch (e) {
              console.warn('预警总览声音 websocket onIncomingEvent 回调异常:', e)
            }
          })
        })
        .catch((e) => {
          if (soundWsClient !== pendingSoundWsClient) return
          console.warn('预警总览声音 websocket 连接失败:', e)
        })

      try {
        await initOverviewOnceByHttp(tId)
      } catch (e) {
        console.warn('预警总览初始化接口获取失败:', e)
      } finally {
        // 无论成功与否，都标记“HTTP 初始化流程已结束”，避免一直隐藏预填充项
        httpInitialized.value = true
      }

      await Promise.all([vibrationWsReadyPromise, soundWsReadyPromise])
    } finally {
      connecting.value = false
    }
  }

  function stop() {
    connecting.value = false
    connectedTenantId.value = ''
    httpInitialized.value = false
    try {
      vibrationWsClient?.disconnect()
    } catch {}
    vibrationWsClient = null
    try {
      soundWsClient?.disconnect()
    } catch {}
    soundWsClient = null

    treeWatchStopper?.()
    treeWatchStopper = null
    treePrefilled = false
    httpLatestAlarmTimeByDeviceId.clear()
    lastWsLoggedTsByDeviceId.clear()
    lastHttpLoggedTsByDeviceId.clear()
  }

  function reset() {
    stop()
    alarms.value = []
  }

  return {
    alarms,
    connecting,
    connectedTenantId,
    httpInitialized,
    start,
    stop,
    reset,
    upsertAlarmFromEvent,
  }
})
