import { computed, nextTick, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { formatDateTime, normalizeEndDateTimeBySelectedDay } from '@/utils/datetime'
import { useAlarmBatchStore } from '@/stores/alarmBatch'

export const SAME_WIDTH_POPPER_OPTIONS = {
  modifiers: [
    {
      name: 'sameWidth',
      enabled: true,
      phase: 'beforeWrite',
      requires: ['computeStyles'],
      fn: ({ state }: { state: { styles: { popper: { width?: string } }; rects: { reference: { width: number } } } }) => {
        state.styles.popper.width = `${state.rects.reference.width}px`
      },
    },
  ],
} as const

export function useResponsiveDialogWidth() {
  const isMobile = computed(() => window.innerWidth <= 800)
  const dialogWidth = computed(() => (isMobile.value ? '100vw' : '70vw'))
  return { isMobile, dialogWidth }
}

export function useAlarmBatchDropdownOptions() {
  const store = useAlarmBatchStore()
  const deviceOptions = computed(() =>
    (store.deviceNameList ?? []).map((x: any) => ({
      value: String(x.key ?? ''),
      label: String(x.text ?? ''),
    })),
  )
  const typeOptions = computed(() =>
    (store.typeList ?? []).map((x: any) => ({
      value: String(x.key ?? ''),
      label: String(x.text ?? ''),
    })),
  )
  return { store, deviceOptions, typeOptions }
}

export function useDialogOpenEffect(visible: () => boolean, onOpen: () => void) {
  watch(visible, (v) => {
    if (!v) return
    nextTick(onOpen)
  })
}

export function useUiPageIndex(getIndex: () => number, setIndex: (v: number) => void) {
  return computed({
    get: () => getIndex() + 1,
    set: (v: number) => setIndex(Math.max(0, v - 1)),
  })
}

const getDatePart = (value?: string) => {
  const raw = String(value ?? '').trim()
  return raw ? (raw.split(' ')[0] ?? '') : ''
}

const capEndTimeToNow = (normalized?: string) => {
  if (!normalized) return normalized
  const picked = new Date(normalized.replace(' ', 'T'))
  const now = new Date()
  if (Number.isNaN(picked.getTime()) || picked.getTime() <= now.getTime()) return normalized
  return formatDateTime(now)
}

export function useAlarmBatchEndTimePicker(
  getStartTime: () => string | undefined,
  getEndTime: () => string | undefined,
  setEndTime: (value: string | undefined) => void,
) {
  const endDatePart = ref('')

  const normalizeAndApplyEndTime = (rawValue?: string, forceApplyRule = false) => {
    const normalized = normalizeEndDateTimeBySelectedDay(rawValue, forceApplyRule)
    const finalValue = capEndTimeToNow(normalized)
    if (finalValue !== rawValue) setEndTime(finalValue)
    endDatePart.value = getDatePart(getEndTime())
  }

  const toDateTimeText = (value: unknown): string | undefined => {
    if (value == null || value === '') return undefined
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : formatDateTime(value)
    }
    return String(value)
  }

  const onEndTimeChange = (value?: string) => normalizeAndApplyEndTime(value)
  const onEndModelValue = (value?: string) => {
    const nextDatePart = getDatePart(value)
    const prevDatePart = endDatePart.value || getDatePart(getEndTime())
    const forceApplyRule = !!nextDatePart && !!prevDatePart && nextDatePart !== prevDatePart
    normalizeAndApplyEndTime(value, forceApplyRule)
  }
  const onEndPanelChange = (value: unknown) => normalizeAndApplyEndTime(toDateTimeText(value))
  const onEndCalendarChange = (value: unknown) => {
    const picked = Array.isArray(value) ? value[value.length - 1] : value
    normalizeAndApplyEndTime(toDateTimeText(picked))
  }

  const disableFutureDate = (time: Date) => time.getTime() > Date.now()

  const isTodayByValue = (rawValue?: string) => {
    const raw = String(rawValue ?? '').trim()
    if (!raw) return false
    const selected = new Date(raw.replace(' ', 'T'))
    if (Number.isNaN(selected.getTime())) return false
    const now = new Date()
    return (
      selected.getFullYear() === now.getFullYear() &&
      selected.getMonth() === now.getMonth() &&
      selected.getDate() === now.getDate()
    )
  }

  const getDisabledHoursByRaw = (rawValue?: string) => {
    if (!isTodayByValue(rawValue)) return []
    const h = new Date().getHours()
    return Array.from({ length: 24 - (h + 1) }, (_, i) => h + 1 + i)
  }

  const getDisabledMinutesByRaw = (rawValue: string | undefined, hour: number) => {
    if (!isTodayByValue(rawValue)) return []
    const now = new Date()
    if (hour !== now.getHours()) return []
    const m = now.getMinutes()
    return Array.from({ length: 60 - (m + 1) }, (_, i) => m + 1 + i)
  }

  const getDisabledSecondsByRaw = (rawValue: string | undefined, hour: number, minute: number) => {
    if (!isTodayByValue(rawValue)) return []
    const now = new Date()
    if (hour !== now.getHours() || minute !== now.getMinutes()) return []
    const s = now.getSeconds()
    return Array.from({ length: 60 - (s + 1) }, (_, i) => s + 1 + i)
  }

  return {
    onEndTimeChange,
    onEndModelValue,
    onEndPanelChange,
    onEndCalendarChange,
    disableFutureDate,
    getDisabledStartHours: () => getDisabledHoursByRaw(getStartTime()),
    getDisabledStartMinutes: (hour: number) => getDisabledMinutesByRaw(getStartTime(), hour),
    getDisabledStartSeconds: (hour: number, minute: number) =>
      getDisabledSecondsByRaw(getStartTime(), hour, minute),
    getDisabledEndHours: () => getDisabledHoursByRaw(getEndTime()),
    getDisabledEndMinutes: (hour: number) => getDisabledMinutesByRaw(getEndTime(), hour),
    getDisabledEndSeconds: (hour: number, minute: number) =>
      getDisabledSecondsByRaw(getEndTime(), hour, minute),
  }
}

function splitDeviceName(rawName: unknown): { main: string; sub: string } {
  const raw = String(rawName || '-')
  const idxCn = raw.indexOf('（')
  const idxEn = raw.indexOf('(')
  const idx = idxCn !== -1 ? idxCn : idxEn
  if (idx <= 0) return { main: raw, sub: '' }
  return {
    main: raw.slice(0, idx).trim(),
    sub: raw
      .slice(idx)
      .replace(/^（|^\(/, '')
      .replace(/）$|\)$/, '')
      .trim(),
  }
}

export function useAlarmBatchRowLabels(options?: { parseDataJson?: boolean }) {
  const parsedRowCache = new Map<string, unknown>()
  const MAX_PARSED_ROW_CACHE = 300

  const clearParsedRowCache = () => parsedRowCache.clear()

  const ensureRowParsed = (row: Record<string, unknown> | null | undefined) => {
    if (!row?.dataJson) return undefined
    const rowId = row.id != null ? String(row.id) : ''
    if (!rowId) return undefined
    if (parsedRowCache.has(rowId)) return parsedRowCache.get(rowId)

    let parsed: unknown
    try {
      parsed = typeof row.dataJson === 'string' ? JSON.parse(row.dataJson) : row.dataJson
    } catch {
      parsed = undefined
    }
    parsedRowCache.set(rowId, parsed)
    if (parsedRowCache.size > MAX_PARSED_ROW_CACHE) {
      const firstKey = parsedRowCache.keys().next().value
      if (firstKey != null) parsedRowCache.delete(firstKey)
    }
    return parsed
  }

  const getDeviceMainName = (row: Record<string, any>) => {
    const deviceName = row?.deviceName
    const main = deviceName ? splitDeviceName(deviceName).main : ''
    return row?._deviceMainName || main || String(deviceName ?? '')
  }

  const getDeviceSubName = (row: Record<string, any>) => {
    const deviceName = row?.deviceName
    const shopName = row?.shopName
    if (shopName) return String(shopName)
    if (!deviceName) return row?._deviceSubName || ''
    return splitDeviceName(deviceName).sub || row?._deviceSubName || ''
  }

  const getPointName = (row: Record<string, any>) => {
    if (options?.parseDataJson) {
      const parsed = ensureRowParsed(row) as { pointName?: string } | undefined
      const pointName = parsed?.pointName ?? row?.pointName
      return pointName ? String(pointName) : ''
    }
    return row?.pointName ? String(row.pointName) : ''
  }

  const getReceiverName = (row: Record<string, any>) => {
    if (options?.parseDataJson) {
      const parsed = ensureRowParsed(row) as { receiverName?: string } | undefined
      const receiverName = parsed?.receiverName ?? row?.receiverName
      return receiverName ? String(receiverName) : ''
    }
    return row?.receiverName ? String(row.receiverName) : ''
  }

  return {
    getDeviceMainName,
    getDeviceSubName,
    getPointName,
    getReceiverName,
    clearParsedRowCache,
  }
}

export type BatchConfirmType = 'yes' | 'not' | 'delete'

const BATCH_ACTION_LABEL: Record<BatchConfirmType, string> = {
  yes: '批量确认警报',
  not: '批量确认误报',
  delete: '批量确认删除',
}

const ALL_ACTION_LABEL: Record<BatchConfirmType, string> = {
  yes: '全部确认警报',
  not: '全部确认误报',
  delete: '全部删除',
}

export async function confirmBatchAction(
  type: BatchConfirmType,
  handlers: Record<BatchConfirmType, () => Promise<void>>,
  scope: 'batch' | 'all' = 'batch',
) {
  const actionText = scope === 'all' ? ALL_ACTION_LABEL[type] : BATCH_ACTION_LABEL[type]
  await ElMessageBox.confirm(`确认要执行【${actionText}】吗？`, '提示', { type: 'warning' })
  await handlers[type]()
}

export type AlarmBatchQuery = {
  startTime?: string
  endTime?: string
  deviceId?: string
  eventTypeCode?: string
}

type SelectOption = { value: string; label: string }

export function buildVibrationDeleteAllConfirmMessage(
  query: AlarmBatchQuery,
  deviceOptions: SelectOption[],
  typeOptions: SelectOption[],
): string {
  const lines: string[] = []
  if (query.startTime) lines.push(`开始时间：${query.startTime}`)
  if (query.endTime) lines.push(`结束时间：${query.endTime}`)
  if (query.deviceId) {
    const label = deviceOptions.find((o) => o.value === String(query.deviceId))?.label
    lines.push(`设备名称：${label ?? query.deviceId}`)
  }
  if (query.eventTypeCode) {
    const label = typeOptions.find((o) => o.value === String(query.eventTypeCode))?.label
    lines.push(`报警类型：${label ?? query.eventTypeCode}`)
  }
  if (!lines.length) return '确认删除所有数据吗？'
  return ['确认删除符合以下条件的所有数据吗？', ...lines].join('<br/>')
}

export async function confirmVibrationDeleteAll(
  query: AlarmBatchQuery,
  deviceOptions: SelectOption[],
  typeOptions: SelectOption[],
  handler: () => Promise<void>,
) {
  const message = buildVibrationDeleteAllConfirmMessage(query, deviceOptions, typeOptions)
  await ElMessageBox.confirm(message, '提示', {
    type: 'warning',
    dangerouslyUseHTMLString: true,
  })
  await handler()
}

