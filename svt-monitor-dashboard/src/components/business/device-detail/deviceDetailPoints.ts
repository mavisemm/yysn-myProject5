import type { DeviceDetailPointInfo } from './deviceDetailTypes'

export function warningTypeToDisplay(t: string): string {
  const s = String(t || '').toLowerCase()
  if (s === 'vibration') return '振动'
  if (s === 'temperature') return '温度'
  if (s === 'sound') return '声音'
  return t || '无'
}

export function mapCheckPointsFromApi(rawList: unknown[]): DeviceDetailPointInfo[] {
  return rawList.map((item: any) => ({
    id: item.receiverId,
    name: item.receiverName || '未知点位',
    lastAlarmTime: item.warningTime != null && item.warningTime !== '' ? item.warningTime : '无',
    alarmType: warningTypeToDisplay(item.warningType),
    alarmValue:
      item.warningValue != null && Number(item.warningValue) !== 0
        ? String(item.warningValue)
        : '无',
    matchMesureValue: item.matchMesureValue,
    warningX: item.warningX,
    warningY: item.warningY,
    warningZ: item.warningZ,
    deviceId: item.deviceId,
    hasAlarm: item.isAlarm === 0,
  }))
}

export function sortPointsByAlarmTime(list: DeviceDetailPointInfo[]): DeviceDetailPointInfo[] {
  return [...list].sort((a, b) => {
    if (a.lastAlarmTime === '无' && b.lastAlarmTime === '无') return 0
    if (a.lastAlarmTime === '无') return 1
    if (b.lastAlarmTime === '无') return -1
    return new Date(b.lastAlarmTime).getTime() - new Date(a.lastAlarmTime).getTime()
  })
}

export function extractPointListFromResponse(ret: unknown): unknown[] {
  if (Array.isArray(ret)) return ret
  const obj = ret as { items?: unknown[]; records?: unknown[]; list?: unknown[] } | null
  return obj?.items ?? obj?.records ?? obj?.list ?? []
}

export function extractPointListTotal(ret: unknown, listLength: number): number {
  if (Array.isArray(ret)) return listLength
  const total = Number((ret as { total?: number; rowCount?: number })?.total
    ?? (ret as { rowCount?: number })?.rowCount
    ?? listLength)
  return Number.isFinite(total) ? total : listLength
}
