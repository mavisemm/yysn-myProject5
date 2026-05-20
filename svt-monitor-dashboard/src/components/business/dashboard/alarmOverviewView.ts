import type { AlarmItem, MeasurementPoint } from '@/stores/alarmOverviewLogic'
import { resolveDevicePointCountFromTree } from '@/stores/alarmOverviewLogic'
import { getTenantId } from '@/api/tenant'

export const TENANT_DEVICE_CARD_SUFFIX_DIGITS = '2b410e834b4b4ae49ab8d52f6d49e967'

export type DisplayAlarmItem = AlarmItem & {
  cardId: string
  cardType: 'vibration' | 'sound'
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function extractTrailingDigitLabel(name: string): string | null {
  const m = String(name ?? '').match(/(\d+)$/)
  if (!m?.[1]) return null
  const run = m[1]
  return run.length >= 2 ? run.slice(-2) : run
}

export function extractLastDigitRunSuffixForPoint(pointName: string): string | null {
  const matches = String(pointName ?? '').match(/\d+/g)
  if (!matches?.length) return null
  const run = matches[matches.length - 1]
  return run == null || run === '' ? null : run.length >= 2 ? run.slice(-2) : run
}

export function formatAlarmCardDeviceName(deviceName: string): string {
  if (getTenantId() !== TENANT_DEVICE_CARD_SUFFIX_DIGITS) return deviceName
  return extractTrailingDigitLabel(deviceName) ?? deviceName
}

export function formatAlarmCardPointLabel(point: MeasurementPoint, pointNum: number): string {
  if (getTenantId() !== TENANT_DEVICE_CARD_SUFFIX_DIGITS) return String(pointNum)
  return extractLastDigitRunSuffixForPoint(point.name) ?? String(pointNum)
}

export function parsePickerDateTime(s: string): Date {
  const str = (s ?? '').trim()
  if (!str) return new Date(NaN)
  if (!str.includes(' ')) return new Date(str)

  const [datePart, timePart] = str.split(' ')
  if (!datePart || !timePart) return new Date(NaN)

  const dateSegments = datePart.split('-').map(Number)
  if (dateSegments.length !== 3) return new Date(NaN)
  const [y, m, d] = dateSegments as [number, number, number]

  const timeSegments = String(timePart).split(':')
  const hh = Number(timeSegments[0])
  const mm = Number(timeSegments[1])
  const ss = Number(timeSegments[2] ?? '0')

  if (![y, m, d, hh, mm, ss].every((n) => Number.isFinite(n))) return new Date(NaN)
  return new Date(y, m - 1, d, hh, mm, ss, 0)
}

export function formatAlarmTime(time: string | undefined): string {
  if (!time) return '暂无'
  const raw = String(time).trim()
  const ts = Number(raw)
  const d = Number.isFinite(ts) && ts > 0 ? new Date(ts) : new Date(raw)
  if (Number.isNaN(d.getTime())) return '暂无'
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function formatTimestampDisplay(input: unknown): string {
  if (input == null || input === '') return '—'
  const raw = String(input).trim()
  if (!raw) return '—'

  const numeric = Number(raw)
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(raw)

  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

export function getDeviceDisplayStatus(
  alarm: AlarmItem | DisplayAlarmItem,
): 'alarm' | 'warning' | 'offline' | 'healthy' {
  if (alarm.displayStatus) return alarm.displayStatus
  if (alarm.status === 'offline') return 'offline'
  const points = alarm.measurementPoints ?? []
  if (points.some((p) => p.status === 'alarm')) return 'alarm'
  if (points.some((p) => p.status === 'warning')) return 'warning'
  return 'healthy'
}

export function getPointStyleClass(
  pointStatus: MeasurementPoint['status'],
  deviceStatus: ReturnType<typeof getDeviceDisplayStatus>,
): string {
  if (deviceStatus === 'healthy') return 'healthy'
  if (deviceStatus === 'offline') return 'offline'
  if (deviceStatus === 'alarm') return pointStatus === 'alarm' ? 'alarm' : 'alarm-device'
  if (deviceStatus === 'warning') return pointStatus === 'warning' ? 'warning' : 'warning-device'
  return 'healthy'
}

const displayPointsCache = new Map<string, { point: MeasurementPoint; pointNum: number }[]>()
const MAX_DISPLAY_POINTS_CACHE = 500

export function clearDisplayPointsCache() {
  displayPointsCache.clear()
}

export function getDisplayPoints(
  points: MeasurementPoint[],
  latestPointNum?: number,
  cardType?: 'vibration' | 'sound',
  deviceStatus?: ReturnType<typeof getDeviceDisplayStatus>,
  devicePointCount?: number,
  deviceId?: string,
): { point: MeasurementPoint; pointNum: number }[] {
  const raw = points ?? []
  const fromTree = deviceId ? resolveDevicePointCountFromTree(deviceId) : undefined
  const fromItem =
    devicePointCount != null && devicePointCount > 0 ? Math.floor(devicePointCount) : undefined
  const effective = fromTree ?? fromItem
  let cap = effective != null && effective > 0 ? Math.min(raw.length, effective) : raw.length

  if (latestPointNum != null && latestPointNum > cap) {
    cap = Math.min(raw.length, latestPointNum)
  }
  if (cardType === 'sound') {
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]?.status === 'warning') cap = Math.min(raw.length, Math.max(cap, i + 1))
    }
  } else if (cardType === 'vibration') {
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]?.status === 'alarm') cap = Math.min(raw.length, Math.max(cap, i + 1))
    }
  }

  const list = raw.slice(0, cap)
  const cacheKey = `${cardType ?? 'all'}|${deviceStatus ?? 'unknown'}|${latestPointNum ?? 'none'}|dpc:${effective ?? 'na'}|${list.map((p, i) => `${i + 1}:${p.status}:${p.lastAlarmTime ?? 0}`).join(',')}`
  const cached = displayPointsCache.get(cacheKey)
  if (cached) return cached

  const withNum = list
    .map((p, i) => ({ point: p, pointNum: i + 1 }))
    .filter((item) => {
      if (deviceStatus === 'healthy' || deviceStatus === 'offline') return true
      if (!cardType) return true
      if (cardType === 'sound') return item.point.status === 'warning'
      if (cardType === 'vibration') return item.point.status === 'alarm'
      return true
    })

  const sorted = withNum.sort((a, b) => {
    if (latestPointNum != null) {
      const aIsLatest = a.pointNum === latestPointNum
      const bIsLatest = b.pointNum === latestPointNum
      if (aIsLatest !== bIsLatest) return aIsLatest ? -1 : 1
    }
    const aTime = a.point.lastAlarmTime ?? 0
    const bTime = b.point.lastAlarmTime ?? 0
    if (aTime !== bTime) return bTime - aTime
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

export function buildFilteredOverviewAlarms(
  source: AlarmItem[],
  options: {
    httpInitialized: boolean
    keyword: string
    dateRange: [string, string]
    sortOrder: 'asc' | 'desc'
  },
): DisplayAlarmItem[] {
  const list = options.httpInitialized ? source : source.filter((a) => !a.prefilled)

  let result: DisplayAlarmItem[] = list.map((item) => ({
    ...item,
    cardId: `${item.kind}:${item.id}`,
    cardType: item.kind,
  }))

  const keyword = options.keyword.trim().toLowerCase()
  if (keyword) {
    const searchMatch = keyword.match(/^(.+)\((.+)\)$/)
    if (searchMatch?.[1] && searchMatch?.[2]) {
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

  if (options.dateRange[0] && options.dateRange[1]) {
    const startDate = parsePickerDateTime(options.dateRange[0])
    let endDate = parsePickerDateTime(options.dateRange[1])
    const fallbackYear = startDate.getFullYear()

    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      const now = new Date()
      if (endDate.getTime() > now.getTime()) endDate = now

      result = result.filter((alarm) => {
        if (alarm.status === 'healthy' || alarm.status === 'offline') return true
        const sortTs = Number(alarm.sortTimeTs ?? 0)
        if (!Number.isFinite(sortTs) || sortTs <= 0) return false
        return sortTs >= startDate.getTime() && sortTs <= endDate.getTime()
      })
    }
  }

  const deviceIdsWithAlarmOrWarning = new Set<string>()
  for (const row of result) {
    const st = getDeviceDisplayStatus(row)
    if (st === 'alarm' || st === 'warning') deviceIdsWithAlarmOrWarning.add(row.id)
  }
  result = result.filter((alarm) => {
    if (getDeviceDisplayStatus(alarm) !== 'healthy') return true
    return !deviceIdsWithAlarmOrWarning.has(alarm.id)
  })

  result.sort((a, b) => {
    const statusDiff = Number(a.statusPriority ?? 9) - Number(b.statusPriority ?? 9)
    if (statusDiff !== 0) return statusDiff

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
    const aHasTime = !Number.isNaN(timeA)
    const bHasTime = !Number.isNaN(timeB)
    if (aHasTime && !bHasTime) return -1
    if (!aHasTime && bHasTime) return 1
    if (!aHasTime && !bHasTime) return 0

    return options.sortOrder === 'desc' ? timeB - timeA : timeA - timeB
  })

  return result
}
