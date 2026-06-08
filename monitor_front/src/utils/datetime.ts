const pad2 = (n: number) => String(n).padStart(2, '0')

export function formatDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

export function isToday(date: Date): boolean {
  const toDayKey = (d: Date) => {
    const copy = new Date(d)
    copy.setHours(0, 0, 0, 0)
    return copy.getTime()
  }
  return toDayKey(new Date()) === toDayKey(date)
}

export function handleDatePickerChange(dateRange: [Date, Date] | null): [string, string] | null {
  if (!dateRange?.[0] || !dateRange?.[1]) return null
  return [formatDateTime(dateRange[0]), formatDateTime(dateRange[1])]
}

export function getLast24HoursRange(): [string, string] {
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  return [formatDateTime(start), formatDateTime(end)]
}

export function getDefaultDateRange(): [string, string] {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  return [formatDateTime(start), formatDateTime(end)]
}

/** 近一周：以当前时刻为终点，起点为连续 7×24 小时之前（振动频域瀑布图等默认范围） */
export function getRollingWeekDateRange(): [string, string] {
  const end = new Date()
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  return [formatDateTime(start), formatDateTime(end)]
}

export type DateRangePresetKey = 'today' | 'yesterday' | 'last3' | 'last7' | 'lastMonth'

/** 时间选择器 footer 快捷范围（今天 / 昨天 / 近三天…） */
export function getDateRangeByPreset(key: DateRangePresetKey): [string, string] {
  const end = new Date()
  const start = new Date()

  switch (key) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'yesterday': {
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'last3':
      start.setTime(end.getTime() - 3 * 24 * 60 * 60 * 1000)
      break
    case 'last7':
      start.setTime(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'lastMonth':
      start.setMonth(start.getMonth() - 1)
      break
    default:
      break
  }

  return [formatDateTime(start), formatDateTime(end)]
}

export function dateRangeToEpochMs(range: [string, string] | null | undefined): {
  startTime?: string
  endTime?: string
} {
  if (!range?.[0] || !range?.[1]) return {}
  const startMs = new Date(range[0]).getTime()
  const endMs = new Date(range[1]).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return {}
  return { startTime: String(startMs), endTime: String(endMs) }
}

export function disabledFutureDate(time: Date): boolean {
  return time.getTime() > Date.now()
}

export function initializeDateRange(startDate: Date, endDate: Date): [Date, Date] {
  const startWithDefaultTime = new Date(startDate)
  startWithDefaultTime.setHours(0, 0, 0, 0)

  const endWithDefaultTime = new Date(endDate)
  if (isToday(endDate)) {
    const now = new Date()
    endWithDefaultTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0)
  } else {
    endWithDefaultTime.setHours(23, 59, 59, 999)
  }

  return [startWithDefaultTime, endWithDefaultTime]
}

export function normalizeEndDateTimeBySelectedDay(
  value?: string | null,
  forceApplyRule = false,
): string | undefined {
  const raw = String(value ?? '').trim()
  if (!raw) return undefined

  const [datePart, timePart = ''] = raw.split(' ')
  if (!datePart) return undefined

  const dateSegments = datePart.split('-').map(Number)
  if (dateSegments.length !== 3 || dateSegments.some((n) => !Number.isFinite(n))) {
    return raw
  }
  const [year, month, day] = dateSegments as [number, number, number]

  if (!forceApplyRule && timePart && timePart !== '00:00:00') {
    return raw
  }

  const selectedDate = new Date(year, month - 1, day)
  if (Number.isNaN(selectedDate.getTime())) return raw

  return isToday(selectedDate) ? formatDateTime(new Date()) : `${datePart} 23:59:59`
}
