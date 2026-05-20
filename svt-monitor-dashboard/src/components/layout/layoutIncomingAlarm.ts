export type IncomingAlarmPreview = {
  alarmId: string
  shopName: string
  deviceName: string
  pointName: string
  pointNum: number
  alarmTimeText: string
  status: 'alarm' | 'warning'
}

export function escapeHtml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function safeParseJson(input: unknown): any {
  if (!input) return undefined
  if (typeof input === 'object') return input
  if (typeof input !== 'string') return undefined
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

export function formatAlarmPreviewTime(input: unknown): string {
  const timestamp = Number(input)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ''
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return ''
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日${hour}:${minute}`
}

export function normalizeIncomingAlarm(payload: any): IncomingAlarmPreview | null {
  if (!payload || typeof payload !== 'object') return null
  const hasEventTypeCode = 'eventTypeCode' in payload
  const parsedData = safeParseJson(payload.dataJson)
  const parsedRaw = safeParseJson(payload.rawDataJson)

  const alarmId = String(payload.equipmentId ?? payload.deviceId ?? '').trim()
  if (!alarmId) return null

  const pointNameRaw =
    payload.data?.pointName ??
    parsedData?.pointName ??
    parsedData?.pointname ??
    parsedRaw?.pointName ??
    parsedRaw?.pointname
  const pointName = String(pointNameRaw ?? '').trim() || '未知点位'

  const pointNum = (() => {
    const fromName = pointName.match(/(\d+)/)
    if (fromName) {
      const n = Number(fromName[1])
      if (Number.isFinite(n) && n > 0) return n
    }
    const ch = payload.data?.channelNo ?? parsedData?.channelNo ?? parsedRaw?.channelNo
    const channelNo = Number(ch)
    return Number.isFinite(channelNo) && channelNo > 0 ? channelNo : 0
  })()

  const level = String(payload.data?.level ?? parsedData?.level ?? parsedRaw?.level ?? '').toUpperCase()
  const alarmTypeCode = String(payload.alarmTypeCode ?? '').toUpperCase()
  const status: 'alarm' | 'warning' =
    hasEventTypeCode || level === 'WARNING' || level === 'WARN'
      ? 'warning'
      : alarmTypeCode === 'MACHINE_VIBRATION' || level === 'ALARM'
        ? 'alarm'
        : 'warning'

  return {
    alarmId,
    shopName: String(payload.workshopName ?? parsedData?.shopName ?? parsedRaw?.shopName ?? '').trim() || '未知车间',
    deviceName: String(payload.equipmentName ?? payload.deviceName ?? '').trim() || alarmId,
    pointName,
    pointNum,
    alarmTimeText: formatAlarmPreviewTime(
      payload.alarmTime ?? parsedData?.alarmTime ?? parsedRaw?.alarmTime,
    ),
    status,
  }
}
