import type { VibrationEventPayload } from '@/services/vibrationWs'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import type { DeviceNode } from '@/types/device'

/** 设备树下「point」子节点数量优先于接口 `pointCount`（后者常偏大或与真实挂接不一致）。 */
export function resolvePointCountForDeviceNode(d: DeviceNode): number | undefined {
  const fromChildren = (d.children ?? []).filter((c) => c.type === 'point').length
  if (fromChildren > 0) return fromChildren
  const n = Number(d.pointCount ?? 0)
  if (Number.isFinite(n) && n > 0) return Math.floor(n)
  return undefined
}

export function resolveDevicePointCountFromTree(deviceId: string): number | undefined {
  const id = String(deviceId ?? '').trim()
  if (!id) return undefined
  const norm = (v: unknown) => String(v ?? '').trim()
  const stack: DeviceNode[] = [...(useDeviceTreeStore().deviceTreeData ?? [])]
  while (stack.length) {
    const node = stack.pop()
    if (!node) continue
    if (node.type === 'device') {
      const match = norm(node.equipmentId) === id || norm(node.id) === id
      if (match) return resolvePointCountForDeviceNode(node)
    }
    if (node.children?.length) stack.push(...node.children)
  }
  return undefined
}

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
  latestOrderKey?: number
  statusPriority?: number
  sortTimeTs?: number
  searchText?: string
  displayStatus?: 'alarm' | 'warning' | 'healthy' | 'offline'
  prefilled?: boolean
  devicePointCount?: number
}

const BASE_POINT_SLOTS = 16
const MAX_OVERVIEW_ITEMS = 800

const STATUS_RANK: Record<MeasurementPoint['status'], number> = {
  alarm: 3,
  warning: 2,
  healthy: 1,
  offline: 0,
}

const DISPLAY_STATUS_PRIORITY: Record<NonNullable<AlarmItem['displayStatus']>, number> = {
  alarm: 0,
  warning: 1,
  healthy: 2,
  offline: 3,
}

const ENABLE_OVERVIEW_DEBUG_LOG = Boolean(
  import.meta.env.DEV && import.meta.env.VITE_ALARM_OVERVIEW_DEBUG === '1',
)

export const overviewLimits = { maxItems: MAX_OVERVIEW_ITEMS }

export function makeHealthyPoint(i: number): MeasurementPoint {
  return { name: `测点${i + 1}`, status: 'healthy' }
}

interface AlarmWsPayload {
  alarmId?: string
  equipmentId?: string
  equipmentName?: string
  workshopName?: string | null
  alarmTime?: number
  alarmTypeCode?: string
  statusCode?: string
  time?: number
  data?: { channelNo?: string | number; level?: string; pointName?: string }
  dataJson?: string
  rawDataJson?: string
  [k: string]: unknown
}

export type OverviewNormalized = {
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

export function safeParseJson(input: unknown): unknown {
  if (!input) return undefined
  if (typeof input === 'object') return input
  if (typeof input !== 'string') return undefined
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

const isAlarmWsPayload = (x: unknown): x is AlarmWsPayload =>
  !!x &&
  typeof x === 'object' &&
  ('alarmTypeCode' in x || 'alarmTime' in x || 'alarmId' in x)

export function statusRank(status: MeasurementPoint['status']): number {
  return STATUS_RANK[status] ?? 0
}

export function maxPointStatus(
  a: MeasurementPoint['status'],
  b: MeasurementPoint['status'],
): MeasurementPoint['status'] {
  return statusRank(a) >= statusRank(b) ? a : b
}

function mapLevelToStatus(level: string | undefined): MeasurementPoint['status'] {
  const v = String(level ?? '').toUpperCase()
  if (v === 'ALARM') return 'alarm'
  if (v === 'WARNING' || v === 'WARN') return 'warning'
  return 'healthy'
}

export function derivePointStatus(
  alarmTypeCode: string | undefined,
  level: string | undefined,
): MeasurementPoint['status'] {
  const v = String(level ?? '').toUpperCase()
  if (v === 'ALARM') return 'alarm'
  if (v === 'WARNING' || v === 'WARN') return 'warning'
  const code = String(alarmTypeCode ?? '').toUpperCase()
  if (!code) return 'healthy'
  if (code === 'MACHINE_VIBRATION') return 'alarm'
  return 'warning'
}

function pickJsonField(parsedData: any, parsedRaw: any, ...keys: string[]) {
  for (const key of keys) {
    const fromData = parsedData?.[key]
    if (fromData != null && fromData !== '') return fromData
    const fromRaw = parsedRaw?.[key]
    if (fromRaw != null && fromRaw !== '') return fromRaw
  }
  return undefined
}

function buildSoundOverviewEvent(input: Record<string, unknown>): OverviewNormalized | null {
  const parsedFromData = safeParseJson(input.dataJson) as any
  const parsedFromRaw = safeParseJson(input.rawDataJson) as any
  const pointNameRaw = pickJsonField(parsedFromData, parsedFromRaw, 'pointName', 'pointname')
  const receiverIdRaw = pickJsonField(parsedFromData, parsedFromRaw, 'receiverId', 'receiverid')
  const deviceId = String(input.equipmentId ?? '').trim()
  const t = Number(input.time ?? input.alarmTime ?? 0)
  if (!deviceId || !Number.isFinite(t) || t <= 0) return null

  const levelRaw = pickJsonField(parsedFromData, parsedFromRaw, 'level')
  return {
    deviceId,
    deviceName: input.equipmentName ? String(input.equipmentName) : undefined,
    shopName: input.workshopName ? String(input.workshopName) : undefined,
    time: t,
    alarmTypeCode: input.eventTypeCode ? String(input.eventTypeCode) : undefined,
    statusCode: input.statusCode ? String(input.statusCode) : undefined,
    receiverId: receiverIdRaw ? String(receiverIdRaw) : undefined,
    isEventTypeMessage: true,
    kind: 'sound',
    point: {
      channelNo: pickJsonField(parsedFromData, parsedFromRaw, 'channelNo'),
      level: levelRaw ? String(levelRaw) : undefined,
      pointName: pointNameRaw ? String(pointNameRaw) : undefined,
    },
  }
}

function buildVibrationWsOverviewEvent(input: AlarmWsPayload): OverviewNormalized | null {
  const parsedFromData = safeParseJson(input.dataJson) as any
  const parsedFromRaw = safeParseJson(input.rawDataJson) as any
  const deviceId = String(input.equipmentId ?? '').trim()
  const receiverIdRaw =
    (input as any).receiverId ?? pickJsonField(parsedFromData, parsedFromRaw, 'receiverId')
  const t = Number(input.alarmTime ?? input.time ?? 0)
  if (!deviceId || !Number.isFinite(t) || t <= 0) return null

  const levelRaw =
    input.data?.level ?? pickJsonField(parsedFromData, parsedFromRaw, 'level')
  const pointNameRaw =
    input.data?.pointName ?? pickJsonField(parsedFromData, parsedFromRaw, 'pointName')

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
      channelNo: input.data?.channelNo ?? pickJsonField(parsedFromData, parsedFromRaw, 'channelNo'),
      level: levelRaw ? String(levelRaw) : undefined,
      pointName: pointNameRaw ? String(pointNameRaw) : undefined,
    },
  }
}

export function normalizeToOverviewEvent(input: unknown): OverviewNormalized | null {
  if (input && typeof input === 'object' && 'eventTypeCode' in input) {
    return buildSoundOverviewEvent(input as Record<string, unknown>)
  }
  if (isAlarmWsPayload(input)) {
    return buildVibrationWsOverviewEvent(input)
  }

  const evt = input as Partial<VibrationEventPayload>
  if (!evt || typeof evt !== 'object') return null
  const deviceId = String(evt.deviceId ?? '')
  const t = Number(evt.time ?? 0)
  if (!deviceId || !Number.isFinite(t) || t <= 0) return null

  const parsed = safeParseJson((evt as { dataJson?: string }).dataJson) as any
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

export function parsePointNum(pointName: string, channelNo?: string | number | null): number | null {
  if (pointName) {
    const m = pointName.match(/(\d+)/)
    if (m) {
      const n = Number(m[1])
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  if (channelNo != null) {
    const n = Number(channelNo)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

export function buildMeasurementPointsFromPoint(point: OverviewNormalized['point']): MeasurementPoint[] {
  const pointName = point?.pointName ? String(point.pointName) : ''
  const pointNum = parsePointNum(pointName, point?.channelNo)
  const pointStatus = mapLevelToStatus(point?.level)
  const total = Math.max(BASE_POINT_SLOTS, pointNum ?? 0)
  const list: MeasurementPoint[] = Array.from({ length: total }, (_, i) => ({
    name: `测点${i + 1}`,
    status: 'healthy',
  }))

  if (pointNum != null && pointNum >= 1 && pointNum <= list.length) {
    list[pointNum - 1] = {
      name: pointName || list[pointNum - 1]?.name || `测点${pointNum}`,
      status: pointStatus,
    }
  }
  return list
}

export function collectDeviceNodes(nodes: DeviceNode[]): DeviceNode[] {
  const result: DeviceNode[] = []
  const stack = [...nodes]
  while (stack.length) {
    const node = stack.pop()
    if (!node) continue
    if (node.type === 'device') result.push(node)
    if (node.children?.length) stack.push(...node.children)
  }
  return result
}

export function pickLeadingPoint(points: MeasurementPoint[]): {
  status: MeasurementPoint['status']
  timeKey: number
  pointNum?: number
} {
  let bestStatus: MeasurementPoint['status'] = 'healthy'
  let bestTime = 0
  let bestPointNum: number | undefined

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (!p) continue
    const t = Number(p.lastAlarmTime ?? 0)
    const r = statusRank(p.status)
    const br = statusRank(bestStatus)
    const pointNum = i + 1
    if (r > br || (r === br && t > bestTime) || (r === br && t === bestTime && bestPointNum == null)) {
      bestStatus = p.status
      bestTime = Number.isFinite(t) && t > 0 ? t : 0
      bestPointNum = pointNum
    }
  }
  return { status: bestStatus, timeKey: bestTime, pointNum: bestPointNum }
}

export function buildHealthyAlarmFromDevice(deviceNode: DeviceNode): AlarmItem {
  const deviceId = String(deviceNode.equipmentId ?? deviceNode.id ?? '')
  const deviceName = String(deviceNode.equipmentName ?? deviceNode.name ?? deviceId)
  const shopName = String(deviceNode.workshopName ?? '')
  return {
    id: deviceId,
    kind: 'vibration',
    deviceName,
    shopName,
    deviceNameWithShop: `${deviceName}（${shopName || ''}）`,
    status: 'healthy',
    statusText: '健康',
    time: '',
    measurementPoints: Array.from({ length: BASE_POINT_SLOTS }, (_, i) => makeHealthyPoint(i)),
    devicePointCount: resolvePointCountForDeviceNode(deviceNode),
    prefilled: true,
  }
}

export function resolveDisplayStatus(
  points: MeasurementPoint[],
): NonNullable<AlarmItem['displayStatus']> {
  let hasWarning = false
  for (const p of points) {
    if (p.status === 'alarm') return 'alarm'
    if (p.status === 'warning') hasWarning = true
  }
  return hasWarning ? 'warning' : 'healthy'
}

export function applyDerivedFields(item: AlarmItem): AlarmItem {
  const displayStatus = resolveDisplayStatus(item.measurementPoints ?? [])
  const timeTs = Number(item.time ?? 0)
  const normalizedTs = Number.isFinite(timeTs) && timeTs > 0 ? timeTs : 0
  return {
    ...item,
    displayStatus,
    statusPriority: DISPLAY_STATUS_PRIORITY[displayStatus],
    sortTimeTs: normalizedTs,
    searchText:
      `${item.deviceName ?? ''} ${item.shopName ?? ''} ${item.deviceNameWithShop ?? ''}`.toLowerCase(),
  }
}

export function trimOverviewItems<T>(list: T[], max = MAX_OVERVIEW_ITEMS): T[] {
  return list.length <= max ? list : list.slice(0, max)
}

export function isValidOverviewHttpItem(it: unknown): boolean {
  const row = it as { statusCode?: string; alarmTime?: number }
  const statusCode = row?.statusCode
  const isValid = statusCode == null || String(statusCode).toUpperCase() === 'VALID'
  const ts = Number(row?.alarmTime ?? 0)
  return isValid && Number.isFinite(ts) && ts > 0
}

export function logVibrationHttpItemsDebug(items: unknown[]) {
  if (!ENABLE_OVERVIEW_DEBUG_LOG) return
  try {
    const preview = items.slice(0, 5000).map((it, idx) => {
      const row = it as any
      const pointName = String(row?.data?.pointName ?? row?.pointName ?? '')
      const m = pointName.match(/(\d+)/)
      const pointNum = m ? Number(m[1]) : NaN
      return {
        idx,
        equipmentId: String(row?.equipmentId ?? ''),
        equipmentName: String(row?.equipmentName ?? ''),
        alarmTime: Number(row?.alarmTime ?? 0),
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
      ) {
        break
      }
    }
  } catch {
    // ignore debug failures                                       
  }
}

export function keepMax(prevValue: unknown, nextValue: number): number {
  const prevNum = Number(prevValue ?? 0)
  const prevOk = Number.isFinite(prevNum) && prevNum > 0 ? prevNum : 0
  return nextValue > prevOk ? nextValue : prevOk
}

export function shouldOverwriteByOrderKey(prevValue: unknown, nextValue: number): boolean {
  const prevNum = Number(prevValue ?? 0)
  const prevOk = Number.isFinite(prevNum) && prevNum > 0 ? prevNum : 0
  return nextValue > prevOk
}
