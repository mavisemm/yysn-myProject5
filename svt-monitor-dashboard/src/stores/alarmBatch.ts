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
  // 兼容新地址字段名：设备详情页/点位页 query 使用 equipmentId
  // 这里语义等同于设备级 deviceId（后端过滤字段仍叫 deviceId）
  equipmentId?: string
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
  const realtimePageSize = ref(30)
  const realtimeSelectedRowKeys = ref<string[]>([])
  const realtimeLoading = ref(false)

  const historyRows = ref<EventRow[]>([])
  const historyTotal = ref(0)
  const historyPageIndex = ref(0)
  const historyPageSize = ref(30)
  const historySelectedRowKeys = ref<string[]>([])
  const historyLoading = ref(false)

  // 列表缓存：减少弹窗反复打开/重复触发时的二次请求与重渲染。
  // key 由「tenantId + 筛选条件 + pageIndex + pageSize」组成。
  const REALTIME_LIST_CACHE_TTL_MS = 60_000
  const HISTORY_LIST_CACHE_TTL_MS = 60_000
  const MAX_LIST_CACHE_ENTRIES = 5

  type ListCacheEntry = { rows: EventRow[]; total: number; fetchedAt: number }
  const realtimeListCache = new Map<string, ListCacheEntry>()
  const historyListCache = new Map<string, ListCacheEntry>()

  const evictOldestIfNeeded = (cache: Map<string, ListCacheEntry>) => {
    if (cache.size <= MAX_LIST_CACHE_ENTRIES) return
    const firstKey = cache.keys().next().value
    if (firstKey != null) cache.delete(firstKey)
  }

  const yieldToMainThread = () =>
    new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => resolve())
      } else {
        setTimeout(() => resolve(), 0)
      }
    })

  const normalizeOneRow = (r: EventRow): EventRow => {
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
  }

  const normalizeRows = (rows: EventRow[]) => rows.map(normalizeOneRow)

  // Light mode: 避免解析 `dataJson`，以减小主线程被 JSON.parse 占用的概率。
  // 只保留后端已经返回的 pointName/receiverName/deviceName 信息；
  // 如果缺失，交给 UI 在“单元格首次展示”时做按需解析（并缓存）。
  const normalizeOneRowLight = (r: EventRow): EventRow => {
    const deviceName = r.deviceName
    const shopName = r.shopName
    const mainSub = deviceName ? splitDeviceName(deviceName) : { main: '', sub: '' }
    return {
      ...r,
      dataJson: r.dataJson,
      deviceName,
      _deviceMainName: mainSub.main,
      _deviceSubName: shopName ? String(shopName) : mainSub.sub,
      pointName: r.pointName,
      receiverName: r.receiverName,
      _timeText: formatTimeText(r.time)
    }
  }

  const normalizeRowsLight = (rows: EventRow[]) => rows.map(normalizeOneRowLight)

  const normalizeRowsYielding = async (rows: EventRow[], budgetMs = 8) => {
    // time-slicing：保证在后台解析时不会长时间占用主线程
    const out: EventRow[] = []
    const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now())
    let lastYieldAt = now()
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      out.push(normalizeOneRow(row))
      const t = now()
      if (t - lastYieldAt >= budgetMs) {
        await yieldToMainThread()
        lastYieldAt = now()
      }
    }
    return out
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
    const effectiveDeviceId = query.deviceId ?? query.equipmentId
    if (effectiveDeviceId) filters.push({ code: 'deviceId', operate: 'EQ', value: effectiveDeviceId })
    if (query.eventTypeCode) filters.push({ code: 'eventTypeCode', operate: 'EQ', value: query.eventTypeCode })

    const start = toMillis(query.startTime)
    const end = toMillis(query.endTime)
    if (start != null) filters.push({ code: 'time', operate: 'GE', value: String(start) })
    if (end != null) filters.push({ code: 'time', operate: 'LE', value: String(end + 999) })
    return filters
  }

  let realtimeFetchToken = 0
  const realtimeFetchInFlight = new Map<string, Promise<void>>()
  const buildRealtimeCacheKey = (pageIndex: number) => {
    const q = realtimeQuery.value ?? {}
    const effectiveDeviceId = q.deviceId ?? q.equipmentId
    return JSON.stringify({
      tenantId: tenantId.value,
      pageIndex,
      pageSize: realtimePageSize.value,
      startTime: q.startTime ?? '',
      endTime: q.endTime ?? '',
      deviceId: effectiveDeviceId ?? '',
      eventTypeCode: q.eventTypeCode ?? ''
    })
  }

  const fetchRealtimeList = async (pageIndex = 0, force = false, normalizeMode: 'sync' | 'yield' | 'light' = 'sync') => {
    const cacheKey = buildRealtimeCacheKey(pageIndex)
    if (!force) {
      const cached = realtimeListCache.get(cacheKey)
      if (cached && Date.now() - cached.fetchedAt <= REALTIME_LIST_CACHE_TTL_MS) {
        realtimePageIndex.value = pageIndex
        realtimeRows.value = cached.rows
        realtimeTotal.value = cached.total
        realtimeLoading.value = false
        return
      }

      const inFlight = realtimeFetchInFlight.get(cacheKey)
      if (inFlight) {
        realtimePageIndex.value = pageIndex
        await inFlight
        realtimeLoading.value = false
        return
      }
    }

    const token = ++realtimeFetchToken
    realtimePageIndex.value = pageIndex
    realtimeLoading.value = true

    const promise = (async () => {
      try {
        const res = await apiFindEvents({
          filterPropertyMap: [{ code: 'statusCode', operate: 'EQ', value: 'VALID' }, ...buildCommonFilters(realtimeQuery.value)],
          pageIndex,
          pageSize: realtimePageSize.value,
          sortValueMap: [{ code: 'time', sort: 'desc' }]
        })
        if (token !== realtimeFetchToken) return
        const items = res?.ret?.items ?? []
        const normalized =
          normalizeMode === 'light'
            ? normalizeRowsLight(items)
            : normalizeMode === 'yield'
              ? await normalizeRowsYielding(items)
              : normalizeRows(items)
        const total = Number(res?.ret?.rowCount ?? res?.ret?.total ?? items.length ?? 0)
        realtimeRows.value = normalized
        realtimeTotal.value = total

        realtimeListCache.set(cacheKey, { rows: normalized, total, fetchedAt: Date.now() })
        evictOldestIfNeeded(realtimeListCache)
      } finally {
        if (token === realtimeFetchToken) realtimeLoading.value = false
      }
    })()

    realtimeFetchInFlight.set(cacheKey, promise)
    try {
      await promise
    } finally {
      if (realtimeFetchInFlight.get(cacheKey) === promise) realtimeFetchInFlight.delete(cacheKey)
    }
  }

  let historyFetchToken = 0
  const historyFetchInFlight = new Map<string, Promise<void>>()
  const buildHistoryCacheKey = (pageIndex: number) => {
    const q = historyQuery.value ?? { alarmCode: 'ACCURATE_YES' as AlarmCode }
    const effectiveDeviceId = q.deviceId ?? q.equipmentId
    return JSON.stringify({
      tenantId: tenantId.value,
      pageIndex,
      pageSize: historyPageSize.value,
      alarmCode: q.alarmCode ?? 'ACCURATE_YES',
      startTime: q.startTime ?? '',
      endTime: q.endTime ?? '',
      deviceId: effectiveDeviceId ?? '',
      eventTypeCode: q.eventTypeCode ?? ''
    })
  }

  const fetchHistoryList = async (pageIndex = 0, force = false, normalizeMode: 'sync' | 'yield' | 'light' = 'sync') => {
    const cacheKey = buildHistoryCacheKey(pageIndex)
    if (!force) {
      const cached = historyListCache.get(cacheKey)
      if (cached && Date.now() - cached.fetchedAt <= HISTORY_LIST_CACHE_TTL_MS) {
        historyPageIndex.value = pageIndex
        historyRows.value = cached.rows
        historyTotal.value = cached.total
        historyLoading.value = false
        return
      }

      const inFlight = historyFetchInFlight.get(cacheKey)
      if (inFlight) {
        historyPageIndex.value = pageIndex
        await inFlight
        historyLoading.value = false
        return
      }
    }

    const token = ++historyFetchToken
    historyPageIndex.value = pageIndex
    historyLoading.value = true

    const promise = (async () => {
      try {
        const res = await apiFindEvents({
          filterPropertyMap: [...buildCommonFilters(historyQuery.value)],
          pageIndex,
          pageSize: historyPageSize.value,
          sortValueMap: [{ code: 'time', sort: 'desc' }]
        })
        if (token !== historyFetchToken) return
        const items = res?.ret?.items ?? []
        const normalized =
          normalizeMode === 'light'
            ? normalizeRowsLight(items)
            : normalizeMode === 'yield'
              ? await normalizeRowsYielding(items)
              : normalizeRows(items)
        const total = Number(res?.ret?.rowCount ?? res?.ret?.total ?? items.length ?? 0)
        historyRows.value = normalized
        historyTotal.value = total

        historyListCache.set(cacheKey, { rows: normalized, total, fetchedAt: Date.now() })
        evictOldestIfNeeded(historyListCache)
      } finally {
        if (token === historyFetchToken) historyLoading.value = false
      }
    })()

    historyFetchInFlight.set(cacheKey, promise)
    try {
      await promise
    } finally {
      if (historyFetchInFlight.get(cacheKey) === promise) historyFetchInFlight.delete(cacheKey)
    }
  }

  const resetRealtime = () => {
    realtimeQuery.value = {}
    realtimeSelectedRowKeys.value = []
    realtimePageIndex.value = 0
    realtimePageSize.value = 30
    realtimeRows.value = []
    realtimeTotal.value = 0
    realtimeLoading.value = false
  }

  const resetHistory = () => {
    historyQuery.value = { alarmCode: 'ACCURATE_YES' }
    historySelectedRowKeys.value = []
    historyPageIndex.value = 0
    historyPageSize.value = 30
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

  let didPrefetchDefaultRealtime = false
  let didPrefetchDefaultHistory = false

  // 预热：在进入“预警总览”页面时先拉一页数据，避免用户点击弹窗后再等待首次渲染。
  // 只预热默认筛选（Realtime 空条件，History 默认 Accurate-Yes）。
  const prefetchRealtimeListForDefault = async () => {
    if (didPrefetchDefaultRealtime) return
    didPrefetchDefaultRealtime = true
    // dropdown 逻辑跟随 find 预热：只有当我们要预热列表时才确保下拉数据就绪
    await ensureDropdowns()
    await fetchRealtimeList(0, false, 'light')
  }

  const prefetchHistoryListForDefault = async () => {
    if (didPrefetchDefaultHistory) return
    didPrefetchDefaultHistory = true
    // dropdown 逻辑跟随 find 预热：只有当我们要预热列表时才确保下拉数据就绪
    await ensureDropdowns()
    await fetchHistoryList(0, false, 'light')
  }

  /**
   * 退出登录/切换用户时调用：清空“仅首次预热”标记与列表缓存，
   * 确保新用户登录进入 dashboard 后会重新执行预热。
   */
  const resetPrefetchState = () => {
    didPrefetchDefaultRealtime = false
    didPrefetchDefaultHistory = false
    // 切用户/退出登录后 dropdown 也应跟随重新预热逻辑再拉取
    typeList.value = []
    deviceNameList.value = []
    dropdownsPromise = null
    realtimeListCache.clear()
    historyListCache.clear()
  }

  const refreshRealtimeAfterBatch = async () => {
    // 保持当前页码刷新，避免批量操作后跳回第一页
    await fetchRealtimeList(realtimePageIndex.value, true)
  }

  const refreshHistoryAfterBatch = async () => {
    // 保持当前页码刷新，避免批量操作后跳回第一页
    await fetchHistoryList(historyPageIndex.value, true)
  }

  const batchYesRealtime = async () => {
    const ids = realtimeSelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmYes(ids)
    realtimeSelectedRowKeys.value = []
    await refreshRealtimeAfterBatch()
  }

  const batchNotRealtime = async () => {
    const ids = realtimeSelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmNot(ids)
    realtimeSelectedRowKeys.value = []
    await refreshRealtimeAfterBatch()
  }

  const batchDeleteRealtime = async () => {
    const ids = realtimeSelectedRowKeys.value
    if (!ids.length) return
    await apiDeleteEvents(ids)
    realtimeSelectedRowKeys.value = []
    await refreshRealtimeAfterBatch()
  }

  const batchYesHistory = async () => {
    const ids = historySelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmYes(ids)
    historySelectedRowKeys.value = []
    await refreshHistoryAfterBatch()
  }

  const batchNotHistory = async () => {
    const ids = historySelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmNot(ids)
    historySelectedRowKeys.value = []
    await refreshHistoryAfterBatch()
  }

  const batchDeleteHistory = async () => {
    const ids = historySelectedRowKeys.value
    if (!ids.length) return
    await apiDeleteEvents(ids)
    historySelectedRowKeys.value = []
    await refreshHistoryAfterBatch()
  }

  const fetchAllValidIds = async (): Promise<string[]> => {
    // 兜底：若后端 yesAll 不接受空 idList，再回退到分页拉取 id。
    // 这里用小一些的 pageSize，避免一次性返回过大数组导致前端主线程卡顿。
    const pageSize = 1000
    const ids: string[] = []
    let pageIndex = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await apiFindEvents({
        filterPropertyMap: [
          { code: 'statusCode', operate: 'EQ', value: 'VALID' },
          { code: 'tenantId', operate: 'EQ', value: tenantId.value }
        ],
        pageIndex,
        pageSize,
        sortValueMap: [{ code: 'time', sort: 'desc' }]
      })

      const items = res?.ret?.items ?? []
      for (const x of items) {
        if (x?.id != null) ids.push(String(x.id))
      }

      if (items.length < pageSize) break
      pageIndex++
    }
    return ids
  }

  const allYesHistory = async () => {
    // 优先让后端自己处理“全部”，避免前端拉取海量 id。
    // 若后端不接受空 idList，再回退到拉取 ids 的兜底方案。
    try {
      await apiConfirmYesAll(undefined)
    } catch (e) {
      const ids = await fetchAllValidIds()
      await apiConfirmYesAll(ids.length ? ids : undefined)
    }
    historySelectedRowKeys.value = []
    await refreshHistoryAfterBatch()
  }

  const allNotHistory = async () => {
    await apiConfirmNotAll()
    historySelectedRowKeys.value = []
    await refreshHistoryAfterBatch()
  }

  const allDeleteHistory = async () => {
    await apiDeleteAllValid()
    historySelectedRowKeys.value = []
    await refreshHistoryAfterBatch()
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
    prefetchRealtimeListForDefault,
    prefetchHistoryListForDefault,
    resetPrefetchState,
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

