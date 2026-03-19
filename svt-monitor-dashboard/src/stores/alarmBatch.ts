import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  apiConfirmNot,
  apiConfirmNotAll,
  apiConfirmYes,
  apiConfirmYesAll,
  apiDeleteAllValid,
  apiDeleteEvents,
  apiFindEvents,
  apiGetDeviceNameDropdownList,
  apiGetEventTypeDropdownList,
  type DropdownItem,
  type EventRow,
  type FilterProperty
} from '@/api/modules/alarmBatch'

type AlarmCode = 'ACCURATE_YES' | 'ACCURATE_NOT'

export interface RealtimeQuery {
  startTime?: string
  endTime?: string
  deviceId?: string
  eventTypeCode?: string
}

export interface HistoryQuery extends RealtimeQuery {
  alarmCode: AlarmCode
}

function toMillis(dateTime?: string): number | undefined {
  if (!dateTime) return undefined
  const d = new Date(dateTime.replace(' ', 'T'))
  const t = d.getTime()
  return Number.isFinite(t) ? t : undefined
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

function formatTimeText(time: any): string {
  const t = typeof time === 'number' ? time : Number(time)
  if (!Number.isFinite(t) || t <= 0) return '-'
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function splitDeviceName(rawName: any): { main: string; sub: string } {
  const raw = String(rawName || '-')
  const idxCn = raw.indexOf('（')
  const idxEn = raw.indexOf('(')
  const idx = idxCn !== -1 ? idxCn : idxEn
  if (idx <= 0) return { main: raw, sub: '' }
  const main = raw.slice(0, idx).trim()
  const sub = raw
    .slice(idx)
    .replace(/^（|^\(/, '')
    .replace(/）$|\)$/, '')
    .trim()
  return { main, sub }
}

export const useAlarmBatchStore = defineStore('alarmBatch', () => {
  const tenantId = computed(() => {
    // 优先用地址栏 tenantId（与路由守卫行为一致），fallback 到 localStorage
    const fromUrl = new URLSearchParams(window.location.search).get('tenantId')
    return (fromUrl && fromUrl.trim()) || (localStorage.getItem('tenantId') ?? '')
  })

  const typeList = ref<DropdownItem[]>([])
  const deviceNameList = ref<DropdownItem[]>([])
  const dropdownsLoading = ref(false)
  let dropdownsPromise: Promise<void> | null = null

  const realtimeVisible = ref(false)
  const historyVisible = ref(false)

  const realtimeQuery = ref<RealtimeQuery>({})
  const historyQuery = ref<HistoryQuery>({ alarmCode: 'ACCURATE_YES' })

  const realtimeRows = ref<EventRow[]>([])
  const realtimeTotal = ref(0)
  const realtimePageIndex = ref(0)
  const realtimePageSize = ref(20)
  const realtimeSelectedRowKeys = ref<string[]>([])
  const realtimeLoading = ref(false)

  const historyRows = ref<EventRow[]>([])
  const historyTotal = ref(0)
  const historyPageIndex = ref(0)
  const historyPageSize = ref(20)
  const historySelectedRowKeys = ref<string[]>([])
  const historyLoading = ref(false)

  const normalizeRows = (rows: EventRow[]) => {
    return rows.map((r) => {
      // `dataJson` 在部分环境里是一个很大的 JSON 字符串。
      // 直接对每行都 JSON.parse 会在弹窗打开/翻页时造成明显的主线程卡顿。
      // 这里改成“按需解析”：只有当我们确实需要从 dataJson 里补字段时才解析。
      const needsDataJson =
        (!r.deviceName && typeof r.dataJson === 'string') ||
        (!r.pointName && typeof r.dataJson === 'string') ||
        (!r.receiverName && typeof r.dataJson === 'string') ||
        (r.shopName == null && typeof r.dataJson === 'string')

      const dataJson = needsDataJson ? safeParseJson(r.dataJson) : (typeof r.dataJson === 'object' ? r.dataJson : undefined)
      const deviceName = r.deviceName ?? dataJson?.deviceName
      const { main, sub } = splitDeviceName(deviceName)
      const shopName = r.shopName ?? dataJson?.shopName
      return {
        ...r,
        // 保留原始 dataJson（字符串/对象）避免不必要的深拷贝；如需已解析对象再取上面的 dataJson 变量
        dataJson: dataJson ?? r.dataJson,
        deviceName,
        _deviceMainName: main,
        _deviceSubName: shopName ? String(shopName) : sub,
        pointName: r.pointName ?? dataJson?.pointName,
        receiverName: r.receiverName ?? dataJson?.receiverName,
        _timeText: formatTimeText(r.time)
      }
    })
  }

  const ensureDropdowns = async () => {
    if (typeList.value.length && deviceNameList.value.length) return
    if (dropdownsPromise) return dropdownsPromise

    dropdownsLoading.value = true
    dropdownsPromise = (async () => {
      try {
        const [types, devices] = await Promise.all([apiGetEventTypeDropdownList(), apiGetDeviceNameDropdownList()])
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[alarmBatch] dropdowns raw response:', { types, devices })
        }
        typeList.value = types?.ret ?? []
        deviceNameList.value = devices?.ret ?? []
      } finally {
        dropdownsLoading.value = false
        dropdownsPromise = null
      }
    })()

    return dropdownsPromise
  }

  const buildCommonFilters = (query: RealtimeQuery): FilterProperty[] => {
    const filters: FilterProperty[] = []
    const tId = tenantId.value
    if (tId) filters.push({ code: 'tenantId', operate: 'EQ', value: tId })
    if (query.deviceId) filters.push({ code: 'deviceId', operate: 'EQ', value: query.deviceId })
    if (query.eventTypeCode) filters.push({ code: 'eventTypeCode', operate: 'EQ', value: query.eventTypeCode })

    const start = toMillis(query.startTime)
    const end = toMillis(query.endTime)
    if (start != null) filters.push({ code: 'time', operate: 'GE', value: String(start) })
    if (end != null) filters.push({ code: 'time', operate: 'LE', value: String(end + 999) })
    return filters
  }

  let realtimeFetchToken = 0
  const fetchRealtimeList = async (pageIndex = 0) => {
    const token = ++realtimeFetchToken
    realtimePageIndex.value = pageIndex
    realtimeLoading.value = true
    try {
      const res = await apiFindEvents({
        filterPropertyMap: [{ code: 'statusCode', operate: 'EQ', value: 'VALID' }, ...buildCommonFilters(realtimeQuery.value)],
        pageIndex,
        pageSize: realtimePageSize.value,
        sortValueMap: [{ code: 'time', sort: 'desc' }]
      })
      if (token !== realtimeFetchToken) return
      const items = res?.ret?.items ?? []
      realtimeRows.value = normalizeRows(items)
      realtimeTotal.value = Number(res?.ret?.rowCount ?? res?.ret?.total ?? items.length ?? 0)
    } finally {
      if (token === realtimeFetchToken) realtimeLoading.value = false
    }
  }

  let historyFetchToken = 0
  const fetchHistoryList = async (pageIndex = 0) => {
    const token = ++historyFetchToken
    historyPageIndex.value = pageIndex
    historyLoading.value = true
    try {
      const res = await apiFindEvents({
        filterPropertyMap: [...buildCommonFilters(historyQuery.value)],
        pageIndex,
        pageSize: historyPageSize.value,
        sortValueMap: [{ code: 'time', sort: 'desc' }]
      })
      if (token !== historyFetchToken) return
      const items = res?.ret?.items ?? []
      historyRows.value = normalizeRows(items)
      historyTotal.value = Number(res?.ret?.rowCount ?? res?.ret?.total ?? items.length ?? 0)
    } finally {
      if (token === historyFetchToken) historyLoading.value = false
    }
  }

  const resetRealtime = () => {
    realtimeQuery.value = {}
    realtimeSelectedRowKeys.value = []
    realtimePageIndex.value = 0
    realtimePageSize.value = 20
    realtimeRows.value = []
    realtimeTotal.value = 0
    realtimeLoading.value = false
  }

  const resetHistory = () => {
    historyQuery.value = { alarmCode: 'ACCURATE_YES' }
    historySelectedRowKeys.value = []
    historyPageIndex.value = 0
    historyPageSize.value = 20
    historyRows.value = []
    historyTotal.value = 0
    historyLoading.value = false
  }

  const openRealtime = async () => {
    realtimeVisible.value = true
  }

  const closeRealtime = () => {
    realtimeVisible.value = false
    resetRealtime()
  }

  const openHistory = async () => {
    historyVisible.value = true
  }

  const closeHistory = () => {
    historyVisible.value = false
    resetHistory()
  }

  const refreshAfterBatch = async () => {
    await Promise.all([fetchRealtimeList(0), fetchHistoryList(0)])
  }

  const batchYesRealtime = async () => {
    const ids = realtimeSelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmYes(ids)
    realtimeSelectedRowKeys.value = []
    await refreshAfterBatch()
  }

  const batchNotRealtime = async () => {
    const ids = realtimeSelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmNot(ids)
    realtimeSelectedRowKeys.value = []
    await refreshAfterBatch()
  }

  const batchDeleteRealtime = async () => {
    const ids = realtimeSelectedRowKeys.value
    if (!ids.length) return
    await apiDeleteEvents(ids)
    realtimeSelectedRowKeys.value = []
    await refreshAfterBatch()
  }

  const batchYesHistory = async () => {
    const ids = historySelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmYes(ids)
    historySelectedRowKeys.value = []
    await refreshAfterBatch()
  }

  const batchNotHistory = async () => {
    const ids = historySelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmNot(ids)
    historySelectedRowKeys.value = []
    await refreshAfterBatch()
  }

  const batchDeleteHistory = async () => {
    const ids = historySelectedRowKeys.value
    if (!ids.length) return
    await apiDeleteEvents(ids)
    historySelectedRowKeys.value = []
    await refreshAfterBatch()
  }

  const fetchAllValidIds = async (): Promise<string[]> => {
    const res = await apiFindEvents({
      filterPropertyMap: [{ code: 'statusCode', operate: 'EQ', value: 'VALID' }, { code: 'tenantId', operate: 'EQ', value: tenantId.value }],
      pageIndex: 0,
      pageSize: 10000,
      sortValueMap: [{ code: 'time', sort: 'desc' }]
    })
    const items = res?.ret?.items ?? []
    return items.map((x) => String(x.id)).filter(Boolean)
  }

  const allYesHistory = async () => {
    const ids = await fetchAllValidIds()
    await apiConfirmYesAll(ids.length ? ids : undefined)
    historySelectedRowKeys.value = []
    await refreshAfterBatch()
  }

  const allNotHistory = async () => {
    await apiConfirmNotAll()
    historySelectedRowKeys.value = []
    await refreshAfterBatch()
  }

  const allDeleteHistory = async () => {
    await apiDeleteAllValid()
    historySelectedRowKeys.value = []
    await refreshAfterBatch()
  }

  return {
    typeList,
    deviceNameList,
    dropdownsLoading,

    realtimeVisible,
    historyVisible,

    realtimeQuery,
    historyQuery,

    realtimeRows,
    realtimeTotal,
    realtimePageIndex,
    realtimePageSize,
    realtimeSelectedRowKeys,
    realtimeLoading,

    historyRows,
    historyTotal,
    historyPageIndex,
    historyPageSize,
    historySelectedRowKeys,
    historyLoading,

    ensureDropdowns,
    fetchRealtimeList,
    fetchHistoryList,
    resetRealtime,
    resetHistory,
    openRealtime,
    closeRealtime,
    openHistory,
    closeHistory,

    batchYesRealtime,
    batchNotRealtime,
    batchDeleteRealtime,

    batchYesHistory,
    batchNotHistory,
    batchDeleteHistory,

    allYesHistory,
    allNotHistory,
    allDeleteHistory
  }
})

