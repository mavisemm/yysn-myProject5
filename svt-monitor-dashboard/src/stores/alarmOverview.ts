import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getTenantId } from '@/api/tenant'
import { VibrationWsClient, type VibrationEventPayload } from '@/services/vibrationWs'
import { fetchVibrationAlarmsForOverview } from '@/api/modules/vibrationEvent'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import type { DeviceNode } from '@/types/device'

export interface MeasurementPoint {
  name: string
  status: 'healthy' | 'warning' | 'alarm' | 'offline'
  lastAlarmTime?: number
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
  latestPointNum?: number
  // HTTP 数组顺序：越大越新（items[0] 最大）
  latestOrderKey?: number
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
  return !!x && typeof x === 'object' && ('alarmTypeCode' in x || 'alarmTime' in x || 'alarmId' in x)
}

function mapLevelToStatus(level: string | undefined): MeasurementPoint['status'] {
  const v = String(level ?? '').toUpperCase()
  if (v === 'ALARM') return 'alarm'
  if (v === 'WARNING' || v === 'WARN') return 'warning'
  return 'healthy'
}

function maxPointStatus(a: MeasurementPoint['status'], b: MeasurementPoint['status']): MeasurementPoint['status'] {
  const order: Record<MeasurementPoint['status'], number> = {
    alarm: 3,
    warning: 2,
    healthy: 1,
    offline: 0
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
  point: {
    channelNo?: string | number
    level?: string
    pointName?: string
  }
}

function normalizeToOverviewEvent(input: any): OverviewNormalized | null {
  if (isAlarmWsPayload(input)) {
    const deviceId = String(input.equipmentId ?? input.deviceId ?? '')
    const t = Number(input.alarmTime ?? 0)
    if (!deviceId || !Number.isFinite(t) || t <= 0) return null

    
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
    lastAlarmTime: undefined
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

  const connectedTenantId = ref('')
  const connecting = ref(false)
  let wsClient: VibrationWsClient | null = null
  let treeWatchStopper: (() => void) | null = null
  let treePrefilled = false
  // 用于排查“预警总览 HTTP 初始化 vs websocket 更新”展示时间差异
  const httpLatestAlarmTimeByDeviceId = new Map<string, number>()
  const lastWsLoggedTsByDeviceId = new Map<string, number>()
  const lastHttpLoggedTsByDeviceId = new Map<string, number>()

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

  function buildHealthyAlarmFromDevice(deviceNode: DeviceNode): AlarmItem {
    const deviceId = String(deviceNode.equipmentId ?? deviceNode.id ?? '')
    const deviceName = String(deviceNode.equipmentName ?? deviceNode.name ?? deviceId)
    const shopName = String(deviceNode.workshopName ?? '')

    
    const measurementPoints: MeasurementPoint[] = Array.from({ length: 16 }).map((_, i) => makeHealthyPoint(i))

    return {
      id: deviceId,
      deviceName,
      shopName,
      deviceNameWithShop: `${deviceName}（${shopName || ''}）`,
      status: 'healthy',
      statusText: '健康',
      time: '',
      measurementPoints
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
    opts?: { keepPrevAsLatest?: boolean; orderKey?: number }
  ) {
    const evt = normalizeToOverviewEvent(input)
    if (!evt) return

    
    

    const isFaultAlarm = String(evt.alarmTypeCode ?? '').toUpperCase() === 'MACHINE_VIBRATION'
    const deviceId = evt.deviceId
    const idx = alarms.value.findIndex((a) => a.id === deviceId)

    const deviceName = evt.deviceName ? String(evt.deviceName) : deviceId
    const shopName = evt.shopName ? String(evt.shopName) : ''

    const t = Number(evt.time)
    const timeStr = Number.isFinite(t) && t > 0 ? String(t) : ''

    const prev = idx >= 0 ? alarms.value[idx] : undefined
    const prevTs = prev?.time ? Number(prev.time) : NaN
    // HTTP 初始化返回的 items 不保证按时间倒序。
    // 如果后续遍历到的记录更旧，只“不覆盖卡片上的 time”，但仍需要合并测点状态，
    // 否则同一设备不同测点的告警会被整条忽略（你遇到的现象）。
    const keepPrevAsLatest = Boolean(opts?.keepPrevAsLatest)
    const isOlderOrSameTime =
      keepPrevAsLatest ||
      (Number.isFinite(prevTs) &&
        Number.isFinite(t) &&
        t > 0 &&
        t <= prevTs)

    if ((source === 'ws' || source === 'http') && Number.isFinite(t) && t > 0) {
      const prevLogged = lastWsLoggedTsByDeviceId.get(deviceId) ?? 0
      const prevHttpLogged = lastHttpLoggedTsByDeviceId.get(deviceId) ?? 0
      // 只记录更“新”的时间，避免乱序时把 last* 写回旧值。
      if (source === 'ws' && t > prevLogged) lastWsLoggedTsByDeviceId.set(deviceId, t)
      if (source === 'http' && t > prevHttpLogged) lastHttpLoggedTsByDeviceId.set(deviceId, t)
    }

    
    const derivedPointStatus: MeasurementPoint['status'] = isFaultAlarm ? 'alarm' : mapLevelToStatus(evt.point.level)

    
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
    const orderOrTime = (() => {
      const ok = Number(opts?.orderKey)
      return Number.isFinite(ok) && ok > 0 ? ok : (Number.isFinite(t) && t > 0 ? t : 0)
    })()
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

    const measurementPoints: MeasurementPoint[] = (() => {
      if (!prevPoints.length) {
        
        const built = buildMeasurementPointsFromPoint({
          ...evt.point,
          
          level: evt.point.level
        })
        
        if (pointNum != null && built.length < pointNum) {
          const expanded = Array.from({ length: total }).map((_, i) => built[i] ?? makeHealthyPoint(i))
          return expanded.map((p, i) =>
            i === pointNum - 1
              ? {
                ...p,
                name: pointName || p.name,
                status: maxPointStatus(p.status, derivedPointStatus),
                lastAlarmTime: keepMax(p.lastAlarmTime, orderOrTime)
              }
              : p
          )
        }
        return built.map((p, i) =>
          pointNum != null && i === pointNum - 1
            ? {
              ...p,
              name: pointName || p.name,
              status: maxPointStatus(p.status, derivedPointStatus),
              lastAlarmTime: keepMax(p.lastAlarmTime, orderOrTime)
            }
            : p
        )
      }

      
      const next = Array.from({ length: total }).map((_, i) => {
        return prevPoints[i] ?? makeHealthyPoint(i)
      })

      if (pointNum != null && pointNum >= 1 && pointNum <= next.length) {
        const prevPoint = next[pointNum - 1]
        const prevKey = prevPoint?.lastAlarmTime
        const overwrite = shouldOverwritePoint(prevKey, orderOrTime)
        next[pointNum - 1] = {
          // 严格按数组顺序：更旧的记录不允许覆盖更新的点位名称/排序键
          name: overwrite ? (pointName || prevPoint?.name || `测点${pointNum}`) : (prevPoint?.name || pointName || `测点${pointNum}`),
          // 不允许旧记录“降级”点位状态
          status: maxPointStatus(prevPoint?.status ?? 'healthy', derivedPointStatus),
          // 用 orderKey(或时间) 作为点位排序 key：只保留更“新”(更大) 的值
          lastAlarmTime: keepMax(prevKey, orderOrTime)
        }
      }

      return next
    })()

    const latestPointNum =
      !isOlderOrSameTime && pointNum != null
        ? pointNum
        : prevLatestPointNum ?? (pointNum ?? undefined)
    const latestOrderKey =
      !isOlderOrSameTime && Number.isFinite(orderOrTime) && orderOrTime > 0
        ? orderOrTime
        : prevLatestOrderKey

    const deviceStatus: AlarmItem['status'] = isFaultAlarm ? 'alarm' : 'healthy'
    const statusText = deviceStatus === 'alarm' ? '报警' : '健康'

    const item: AlarmItem = {
      id: deviceId,
      deviceName,
      shopName,
      deviceNameWithShop: `${deviceName}（${shopName || ''}）`,
      status: deviceStatus,
      statusText,
      // 旧告警也要合并测点，但卡片展示时间保持“最新”。
      time: isOlderOrSameTime && prev?.time ? prev.time : timeStr,
      measurementPoints,
      latestPointNum,
      latestOrderKey
    }

    if (idx >= 0) alarms.value.splice(idx, 1, item)
    else alarms.value.unshift(item)

    // 关键：写入完再读取一次，确认 store 里最终值是否仍是写入值
    if ((source === 'ws' || source === 'http') && Number.isFinite(t) && t > 0) {
      const actualAfterWrite = alarms.value.find((a) => a.id === deviceId)?.time ?? null
      void actualAfterWrite
    }
  }

  async function initOverviewOnceByHttp(tId: string) {
    
    const items = await fetchVibrationAlarmsForOverview({ tenantId: tId, pageIndex: 0, pageSize: 5000 })

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
          pointNum: Number.isFinite(pointNum) ? pointNum : null
        }
      })

      const firstIdxByPointNum: Record<number, number | null> = { 9: null, 2: null, 4: null }
      for (const row of preview) {
        const pn = row.pointNum
        if (pn == null) continue
        if ((pn === 9 || pn === 2 || pn === 4) && firstIdxByPointNum[pn] == null) {
          firstIdxByPointNum[pn] = row.idx
        }
        if (firstIdxByPointNum[9] != null && firstIdxByPointNum[2] != null && firstIdxByPointNum[4] != null) break
      }

      console.groupCollapsed('[AlarmOverview][HTTP] items preview (up to 5000)')
      console.table(preview)
      console.log('[AlarmOverview][HTTP] first idx by pointNum (9/2/4):', firstIdxByPointNum)
      console.groupEnd()
    } catch {
      // ignore debug failures
    }

    httpLatestAlarmTimeByDeviceId.clear()
    for (const it of items) {
      const deviceId = String((it as any).equipmentId ?? (it as any).deviceId ?? '')
      const statusCode = (it as any).statusCode
      const isValid = statusCode == null || String(statusCode).toUpperCase() === 'VALID'
      const ts = Number((it as any).alarmTime ?? 0)
      if (!deviceId || !isValid || !Number.isFinite(ts) || ts <= 0) continue
      const prev = httpLatestAlarmTimeByDeviceId.get(deviceId) ?? 0
      if (ts > prev) httpLatestAlarmTimeByDeviceId.set(deviceId, ts)
    }
    // 约定：HTTP 接口返回 items 已按“最新在前”排序。
    // 因此：同一设备第一次出现视为“最新”，后续只合并测点状态，不覆盖最新点位号/时间。
    const seenLatestByDeviceId = new Set<string>()
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx]
      const deviceId = String((it as any).equipmentId ?? (it as any).deviceId ?? '')
      const isOlder = deviceId ? seenLatestByDeviceId.has(deviceId) : false
      // 用“数组顺序”生成一个可比较的排序键：越靠前越大（越新）
      const orderKey = items.length - idx
      upsertAlarmFromEvent(it, 'http', { keepPrevAsLatest: isOlder, orderKey })
      if (deviceId) seenLatestByDeviceId.add(deviceId)
    }
  }

  async function start(params?: { token?: string; tenantId?: string }) {
    const tId = (params?.tenantId ?? getTenantId() ?? '').trim()
    if (!tId) return

    
    if (connectedTenantId.value === tId && wsClient) return

    
    stop()
    alarms.value = []
    treePrefilled = false

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
          { immediate: false, deep: false }
        )
      }

      try {
        await initOverviewOnceByHttp(tId)
      } catch (e) {
        
        console.warn('预警总览初始化接口获取失败:', e)
      }

      wsClient = new VibrationWsClient({ token: params?.token ?? (localStorage.getItem('token') ?? undefined) })
      await wsClient.connect()
      wsClient.subscribeVibrationTopic(tId, (payload) => {
        upsertAlarmFromEvent(payload, 'ws')
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
      
    }
    wsClient = null

    treeWatchStopper?.()
    treeWatchStopper = null
    treePrefilled = false
  }

  function reset() {
    stop()
    alarms.value = []
  }

  return {
    alarms,
    connecting,
    connectedTenantId,
    start,
    stop,
    reset,
    upsertAlarmFromEvent
  }
})

