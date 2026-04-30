import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readTenantIdFromStorageOrAddressBar } from '@/api/tenant'
import { usePointMessageStore } from '@/stores/pointMessage'
import {
  apiFindVibrationAlarmByCondition,
  apiConfirmNot,
  apiConfirmNotAll,
  apiConfirmVibrationNot,
  apiConfirmVibrationYes,
  apiConfirmYes,
  apiConfirmYesAll,
  apiDeleteAllValid,
  apiDeleteEvents,
  apiFindEvents,
  apiGetDeviceNameDropdownList,
  apiGetEventTypeDropdownList,
  type DropdownItem,
  type EventRow,
  type FilterProperty,
  type FindVibrationAlarmByConditionBody
} from '@/api/modules/alarmBatch'

type AlarmCode = 'ACCURATE_YES' | 'ACCURATE_NOT'

export interface RealtimeQuery {
  startTime?: string
  endTime?: string
  deviceId?: string
  
  
  equipmentId?: string
  eventTypeCode?: string
}

export interface HistoryQuery extends RealtimeQuery {
  alarmCode: AlarmCode
}

export interface AlarmQuery {
  startTime?: string
  endTime?: string
  deviceId?: string
  eventTypeCode?: string
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
  
  

  const typeList = ref<DropdownItem[]>([])
  const deviceNameList = ref<DropdownItem[]>([])
  const dropdownsLoading = ref(false)
  let dropdownsPromise: Promise<void> | null = null

  const realtimeVisible = ref(false)
  const historyVisible = ref(false)
  const realtimeAlarmVisible = ref(false)
  const historyAlarmVisible = ref(false)

  const realtimeQuery = ref<RealtimeQuery>({})
  const historyQuery = ref<HistoryQuery>({ alarmCode: 'ACCURATE_YES' })
  const realtimeAlarmQuery = ref<AlarmQuery>({})
  const historyAlarmQuery = ref<AlarmQuery>({})

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

  const realtimeAlarmRows = ref<EventRow[]>([])
  const realtimeAlarmTotal = ref(0)
  const realtimeAlarmPageIndex = ref(0)
  const realtimeAlarmPageSize = ref(30)
  const realtimeAlarmSelectedRowKeys = ref<string[]>([])
  const realtimeAlarmLoading = ref(false)

  const historyAlarmRows = ref<EventRow[]>([])
  const historyAlarmTotal = ref(0)
  const historyAlarmPageIndex = ref(0)
  const historyAlarmPageSize = ref(30)
  const historyAlarmSelectedRowKeys = ref<string[]>([])
  const historyAlarmLoading = ref(false)

  
  
  const REALTIME_LIST_CACHE_TTL_MS = 60_000
  const HISTORY_LIST_CACHE_TTL_MS = 60_000
  const MAX_LIST_CACHE_ENTRIES = 5

  type ListCacheEntry = { rows: EventRow[]; total: number; fetchedAt: number }
  const realtimeListCache = new Map<string, ListCacheEntry>()
  const historyListCache = new Map<string, ListCacheEntry>()
  const realtimeAlarmListCache = new Map<string, ListCacheEntry>()
  const historyAlarmListCache = new Map<string, ListCacheEntry>()
  const pointMessageStore = usePointMessageStore()
  let pointMessagePromise: Promise<void> | null = null

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
    
    
    
    const deviceName = r.deviceName
    const { main, sub } = splitDeviceName(deviceName)
    const shopName = r.shopName
    return {
      ...r,
      
      deviceName,
      _deviceMainName: main,
      _deviceSubName: shopName ? String(shopName) : sub,
      pointName: r.pointName,
      receiverName: r.receiverName,
      _timeText: formatTimeText(r.time)
    }
  }

  const normalizeAlarmRow = (raw: EventRow): EventRow => {
    const row = { ...raw }
    const parsed = safeParseJson(row.dataJson)
    const equipmentName = String((row as any).equipmentName ?? row.deviceName ?? '')
    const shopName = String(parsed?.workshopName ?? row.shopName ?? '')
    const pointName = String((row as any).pointName ?? (row as any).alarmObject ?? parsed?.pointName ?? '')
    const receiverName = String((row as any).receiverName ?? parsed?.pointName ?? (row as any).alarmObject ?? '')
    const rawEventTypeName = String((row as any).alarmType ?? (row as any).alarmTypeCode ?? row.eventType?.name ?? '')
    const eventTypeName = (() => {
      const code = rawEventTypeName.trim()
      if (code.toUpperCase() === 'MACHINE_VIBRATION') return '振动报警'
      return code
    })()
    const time = Number((row as any).alarmTime ?? (row as any).createTime ?? row.time ?? 0)
    const statusCode = String((row as any).statusCode ?? row.statusCode ?? '')
    const statusText =
      row.statusText ||
      (statusCode.trim().toUpperCase() === 'VALID' ? '未处理' : '')
    return normalizeOneRowLight({
      ...row,
      id: String(row.id ?? ''),
      deviceId: String((row as any).deviceId ?? ''),
      deviceName: equipmentName,
      shopName,
      pointName,
      receiverName,
      eventTypeCode: eventTypeName,
      eventType: { name: eventTypeName || 'MACHINE_VIBRATION' },
      statusCode,
      statusText: statusText || (String((row as any).alarmLevel ?? '').toUpperCase() === 'ALARM' ? '报警' : '-'),
      time
    })
  }

  const normalizeAlarmRows = (rows: EventRow[]) => rows.map(normalizeAlarmRow)

  const normalizeRows = (rows: EventRow[]) => rows.map(normalizeOneRow)

  
  
  
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
    
    const tId = readTenantIdFromStorageOrAddressBar()
    if (tId) filters.push({ code: 'tenantId', operate: 'EQ', value: tId })
    if (query.deviceId) filters.push({ code: 'deviceId', operate: 'EQ', value: query.deviceId })
    if (query.eventTypeCode) filters.push({ code: 'eventTypeCode', operate: 'EQ', value: query.eventTypeCode })

    const start = toMillis(query.startTime)
    const end = toMillis(query.endTime)
    if (start != null) filters.push({ code: 'time', operate: 'GTE' as FilterProperty['operate'], value: start })
    if (end != null) filters.push({ code: 'time', operate: 'LTE' as FilterProperty['operate'], value: end + 999 })
    return filters
  }

  const buildAlarmConditionBody = (
    query: AlarmQuery,
    statusCode: string,
    pageIndex: number,
    pageSize: number
  ): FindVibrationAlarmByConditionBody | null => {
    const tenantId = readTenantIdFromStorageOrAddressBar()
    if (!tenantId) return null
    return {
      alarmLevel: 'ALARM',
      alarmType: 'MACHINE_VIBRATION',
      pageIndex,
      pageSize,
      statusCode,
      tenantId,
      ...(query.deviceId ? { deviceId: String(query.deviceId) } : {}),
      ...(query.eventTypeCode ? { eventTypeCode: String(query.eventTypeCode) } : {}),
      ...(toMillis(query.startTime) != null ? { startTime: toMillis(query.startTime) } : {}),
      ...(toMillis(query.endTime) != null ? { endTime: toMillis(query.endTime) } : {})
    }
  }

  const ensurePointMessageLoaded = async () => {
    const tenantId = readTenantIdFromStorageOrAddressBar()
    if (!tenantId) return
    if (pointMessagePromise) {
      await pointMessagePromise
      return
    }
    pointMessagePromise = pointMessageStore.loadPointMessage(tenantId)
    try {
      await pointMessagePromise
    } finally {
      pointMessagePromise = null
    }
  }

  let realtimeFetchToken = 0
  const realtimeFetchInFlight = new Map<string, Promise<void>>()
  const buildRealtimeCacheKey = (pageIndex: number) => {
    const q = realtimeQuery.value ?? {}
    return JSON.stringify({
      tenantId: readTenantIdFromStorageOrAddressBar(),
      pageIndex,
      pageSize: realtimePageSize.value,
      startTime: q.startTime ?? '',
      endTime: q.endTime ?? '',
      deviceId: q.deviceId ?? '',
      eventTypeCode: q.eventTypeCode ?? ''
    })
  }

  const fetchRealtimeList = async (pageIndex = 0, force = false, normalizeMode: 'sync' | 'yield' | 'light' = 'sync') => {
    await ensurePointMessageLoaded()
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
    return JSON.stringify({
      tenantId: readTenantIdFromStorageOrAddressBar(),
      pageIndex,
      pageSize: historyPageSize.value,
      alarmCode: q.alarmCode ?? 'ACCURATE_YES',
      startTime: q.startTime ?? '',
      endTime: q.endTime ?? '',
      deviceId: q.deviceId ?? '',
      eventTypeCode: q.eventTypeCode ?? ''
    })
  }

  const fetchHistoryList = async (pageIndex = 0, force = false, normalizeMode: 'sync' | 'yield' | 'light' = 'sync') => {
    await ensurePointMessageLoaded()
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
          filterPropertyMap: [
            { code: 'alarmType', operate: 'EQ', value: 'NORMAL' },
            ...buildCommonFilters(historyQuery.value)
          ],
          pageIndex,
          pageSize: historyPageSize.value,
          sortValueMap: [{ code: 'createTime', sort: 'desc' }]
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

  let realtimeAlarmFetchToken = 0
  const realtimeAlarmFetchInFlight = new Map<string, Promise<void>>()
  const buildRealtimeAlarmCacheKey = (pageIndex: number) => JSON.stringify({
    tenantId: readTenantIdFromStorageOrAddressBar(),
    pageIndex,
    pageSize: realtimeAlarmPageSize.value,
    startTime: realtimeAlarmQuery.value.startTime ?? '',
    endTime: realtimeAlarmQuery.value.endTime ?? '',
    deviceId: realtimeAlarmQuery.value.deviceId ?? '',
    eventTypeCode: realtimeAlarmQuery.value.eventTypeCode ?? '',
    statusCode: 'VALID'
  })

  const fetchRealtimeAlarmList = async (pageIndex = 0, force = false) => {
    await ensurePointMessageLoaded()
    const cacheKey = buildRealtimeAlarmCacheKey(pageIndex)
    if (!force) {
      const cached = realtimeAlarmListCache.get(cacheKey)
      if (cached && Date.now() - cached.fetchedAt <= REALTIME_LIST_CACHE_TTL_MS) {
        realtimeAlarmPageIndex.value = pageIndex
        realtimeAlarmRows.value = cached.rows
        realtimeAlarmTotal.value = cached.total
        realtimeAlarmLoading.value = false
        return
      }
      const inFlight = realtimeAlarmFetchInFlight.get(cacheKey)
      if (inFlight) {
        realtimeAlarmPageIndex.value = pageIndex
        await inFlight
        realtimeAlarmLoading.value = false
        return
      }
    }

    const body = buildAlarmConditionBody(realtimeAlarmQuery.value, 'VALID', pageIndex, realtimeAlarmPageSize.value)
    if (!body) return
    const token = ++realtimeAlarmFetchToken
    realtimeAlarmPageIndex.value = pageIndex
    realtimeAlarmLoading.value = true
    const promise = (async () => {
      try {
        const res = await apiFindVibrationAlarmByCondition(body)
        if (token !== realtimeAlarmFetchToken) return
        const items = (res?.ret?.items ?? []) as EventRow[]
        const normalized = normalizeAlarmRows(items)
        const total = Number(res?.ret?.rowCount ?? res?.ret?.total ?? normalized.length ?? 0)
        realtimeAlarmRows.value = normalized
        realtimeAlarmTotal.value = total
        realtimeAlarmListCache.set(cacheKey, { rows: normalized, total, fetchedAt: Date.now() })
        evictOldestIfNeeded(realtimeAlarmListCache)
      } finally {
        if (token === realtimeAlarmFetchToken) realtimeAlarmLoading.value = false
      }
    })()
    realtimeAlarmFetchInFlight.set(cacheKey, promise)
    try {
      await promise
    } finally {
      if (realtimeAlarmFetchInFlight.get(cacheKey) === promise) realtimeAlarmFetchInFlight.delete(cacheKey)
    }
  }

  let historyAlarmFetchToken = 0
  const historyAlarmFetchInFlight = new Map<string, Promise<void>>()
  const buildHistoryAlarmCacheKey = (pageIndex: number) => JSON.stringify({
    tenantId: readTenantIdFromStorageOrAddressBar(),
    pageIndex,
    pageSize: historyAlarmPageSize.value,
    startTime: historyAlarmQuery.value.startTime ?? '',
    endTime: historyAlarmQuery.value.endTime ?? '',
    deviceId: historyAlarmQuery.value.deviceId ?? '',
    eventTypeCode: historyAlarmQuery.value.eventTypeCode ?? '',
    statusCode: ''
  })

  const fetchHistoryAlarmList = async (pageIndex = 0, force = false) => {
    await ensurePointMessageLoaded()
    const cacheKey = buildHistoryAlarmCacheKey(pageIndex)
    if (!force) {
      const cached = historyAlarmListCache.get(cacheKey)
      if (cached && Date.now() - cached.fetchedAt <= HISTORY_LIST_CACHE_TTL_MS) {
        historyAlarmPageIndex.value = pageIndex
        historyAlarmRows.value = cached.rows
        historyAlarmTotal.value = cached.total
        historyAlarmLoading.value = false
        return
      }
      const inFlight = historyAlarmFetchInFlight.get(cacheKey)
      if (inFlight) {
        historyAlarmPageIndex.value = pageIndex
        await inFlight
        historyAlarmLoading.value = false
        return
      }
    }

    const body = buildAlarmConditionBody(historyAlarmQuery.value, '', pageIndex, historyAlarmPageSize.value)
    if (!body) return
    const token = ++historyAlarmFetchToken
    historyAlarmPageIndex.value = pageIndex
    historyAlarmLoading.value = true
    const promise = (async () => {
      try {
        const res = await apiFindVibrationAlarmByCondition(body)
        if (token !== historyAlarmFetchToken) return
        const items = (res?.ret?.items ?? []) as EventRow[]
        const normalized = normalizeAlarmRows(items)
        const total = Number(res?.ret?.rowCount ?? res?.ret?.total ?? normalized.length ?? 0)
        historyAlarmRows.value = normalized
        historyAlarmTotal.value = total
        historyAlarmListCache.set(cacheKey, { rows: normalized, total, fetchedAt: Date.now() })
        evictOldestIfNeeded(historyAlarmListCache)
      } finally {
        if (token === historyAlarmFetchToken) historyAlarmLoading.value = false
      }
    })()
    historyAlarmFetchInFlight.set(cacheKey, promise)
    try {
      await promise
    } finally {
      if (historyAlarmFetchInFlight.get(cacheKey) === promise) historyAlarmFetchInFlight.delete(cacheKey)
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

  const resetRealtimeAlarm = () => {
    realtimeAlarmQuery.value = {}
    realtimeAlarmSelectedRowKeys.value = []
    realtimeAlarmPageIndex.value = 0
    realtimeAlarmPageSize.value = 30
    realtimeAlarmRows.value = []
    realtimeAlarmTotal.value = 0
    realtimeAlarmLoading.value = false
  }

  const resetHistoryAlarm = () => {
    historyAlarmQuery.value = {}
    historyAlarmSelectedRowKeys.value = []
    historyAlarmPageIndex.value = 0
    historyAlarmPageSize.value = 30
    historyAlarmRows.value = []
    historyAlarmTotal.value = 0
    historyAlarmLoading.value = false
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

  const openRealtimeAlarm = async () => {
    realtimeAlarmVisible.value = true
  }

  const closeRealtimeAlarm = () => {
    realtimeAlarmVisible.value = false
    resetRealtimeAlarm()
  }

  const openHistoryAlarm = async () => {
    historyAlarmVisible.value = true
  }

  const closeHistoryAlarm = () => {
    historyAlarmVisible.value = false
    resetHistoryAlarm()
  }

  let didPrefetchDefaultRealtime = false
  let didPrefetchDefaultHistory = false
  let didPrefetchDefaultRealtimeAlarm = false
  let didPrefetchDefaultHistoryAlarm = false
  
  let prefetchAuthEpoch = 0

  const hasAuthToken = () => Boolean(localStorage.getItem('token'))

  
  
  const prefetchRealtimeListForDefault = async () => {
    if (didPrefetchDefaultRealtime) return
    if (!hasAuthToken()) return
    didPrefetchDefaultRealtime = true
    const epoch = prefetchAuthEpoch
    
    await ensureDropdowns()
    if (epoch !== prefetchAuthEpoch) return
    if (!hasAuthToken()) return
    await fetchRealtimeList(0, false, 'light')
  }

  const prefetchHistoryListForDefault = async () => {
    if (didPrefetchDefaultHistory) return
    if (!hasAuthToken()) return
    didPrefetchDefaultHistory = true
    const epoch = prefetchAuthEpoch
    
    await ensureDropdowns()
    if (epoch !== prefetchAuthEpoch) return
    if (!hasAuthToken()) return
    await fetchHistoryList(0, false, 'light')
  }

  const prefetchRealtimeAlarmListForDefault = async () => {
    if (didPrefetchDefaultRealtimeAlarm) return
    if (!hasAuthToken()) return
    didPrefetchDefaultRealtimeAlarm = true
    const epoch = prefetchAuthEpoch
    await ensureDropdowns()
    if (epoch !== prefetchAuthEpoch) return
    if (!hasAuthToken()) return
    await fetchRealtimeAlarmList(0, false)
  }

  const prefetchHistoryAlarmListForDefault = async () => {
    if (didPrefetchDefaultHistoryAlarm) return
    if (!hasAuthToken()) return
    didPrefetchDefaultHistoryAlarm = true
    const epoch = prefetchAuthEpoch
    await ensureDropdowns()
    if (epoch !== prefetchAuthEpoch) return
    if (!hasAuthToken()) return
    await fetchHistoryAlarmList(0, false)
  }

  const resetPrefetchState = () => {
    didPrefetchDefaultRealtime = false
    didPrefetchDefaultHistory = false
    didPrefetchDefaultRealtimeAlarm = false
    didPrefetchDefaultHistoryAlarm = false
    prefetchAuthEpoch++
    
    typeList.value = []
    deviceNameList.value = []
    dropdownsPromise = null
    realtimeListCache.clear()
    historyListCache.clear()
    realtimeAlarmListCache.clear()
    historyAlarmListCache.clear()
  }

  const refreshRealtimeAfterBatch = async () => {
    
    await fetchRealtimeList(realtimePageIndex.value, true)
  }

  const refreshHistoryAfterBatch = async () => {
    
    await fetchHistoryList(historyPageIndex.value, true)
  }

  const refreshRealtimeAlarmAfterBatch = async () => {
    await fetchRealtimeAlarmList(realtimeAlarmPageIndex.value, true)
  }

  const refreshHistoryAlarmAfterBatch = async () => {
    await fetchHistoryAlarmList(historyAlarmPageIndex.value, true)
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

  const batchYesRealtimeAlarm = async () => {
    const ids = realtimeAlarmSelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmVibrationYes(ids)
    realtimeAlarmSelectedRowKeys.value = []
    await refreshRealtimeAlarmAfterBatch()
  }

  const batchNotRealtimeAlarm = async () => {
    const ids = realtimeAlarmSelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmVibrationNot(ids)
    realtimeAlarmSelectedRowKeys.value = []
    await refreshRealtimeAlarmAfterBatch()
  }

  const batchDeleteRealtimeAlarm = async () => {
    const ids = realtimeAlarmSelectedRowKeys.value
    if (!ids.length) return
    await apiDeleteEvents(ids)
    realtimeAlarmSelectedRowKeys.value = []
    await refreshRealtimeAlarmAfterBatch()
  }

  const batchYesHistoryAlarm = async () => {
    const ids = historyAlarmSelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmVibrationYes(ids)
    historyAlarmSelectedRowKeys.value = []
    await refreshHistoryAlarmAfterBatch()
  }

  const batchNotHistoryAlarm = async () => {
    const ids = historyAlarmSelectedRowKeys.value
    if (!ids.length) return
    await apiConfirmVibrationNot(ids)
    historyAlarmSelectedRowKeys.value = []
    await refreshHistoryAlarmAfterBatch()
  }

  const batchDeleteHistoryAlarm = async () => {
    const ids = historyAlarmSelectedRowKeys.value
    if (!ids.length) return
    await apiDeleteEvents(ids)
    historyAlarmSelectedRowKeys.value = []
    await refreshHistoryAlarmAfterBatch()
  }

  const fetchAllValidIds = async (): Promise<string[]> => {
    
    
    const pageSize = 1000
    const ids: string[] = []
    let pageIndex = 0
    
    while (true) {
      const res = await apiFindEvents({
        filterPropertyMap: [
          { code: 'statusCode', operate: 'EQ', value: 'VALID' },
          { code: 'tenantId', operate: 'EQ', value: readTenantIdFromStorageOrAddressBar() }
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

  const allYesHistoryAlarm = async () => {
    try {
      await apiConfirmYesAll(undefined)
    } catch (e) {
      const ids = await fetchAllValidIds()
      await apiConfirmYesAll(ids.length ? ids : undefined)
    }
    historyAlarmSelectedRowKeys.value = []
    await refreshHistoryAlarmAfterBatch()
  }

  const allNotHistoryAlarm = async () => {
    await apiConfirmNotAll()
    historyAlarmSelectedRowKeys.value = []
    await refreshHistoryAlarmAfterBatch()
  }

  const allDeleteHistoryAlarm = async () => {
    await apiDeleteAllValid()
    historyAlarmSelectedRowKeys.value = []
    await refreshHistoryAlarmAfterBatch()
  }

  return {
    typeList,
    deviceNameList,
    dropdownsLoading,

    realtimeVisible,
    historyVisible,
    realtimeAlarmVisible,
    historyAlarmVisible,

    realtimeQuery,
    historyQuery,
    realtimeAlarmQuery,
    historyAlarmQuery,

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
    realtimeAlarmRows,
    realtimeAlarmTotal,
    realtimeAlarmPageIndex,
    realtimeAlarmPageSize,
    realtimeAlarmSelectedRowKeys,
    realtimeAlarmLoading,
    historyAlarmRows,
    historyAlarmTotal,
    historyAlarmPageIndex,
    historyAlarmPageSize,
    historyAlarmSelectedRowKeys,
    historyAlarmLoading,

    ensureDropdowns,
    fetchRealtimeList,
    fetchHistoryList,
    fetchRealtimeAlarmList,
    fetchHistoryAlarmList,
    prefetchRealtimeListForDefault,
    prefetchHistoryListForDefault,
    prefetchRealtimeAlarmListForDefault,
    prefetchHistoryAlarmListForDefault,
    resetPrefetchState,
    resetRealtime,
    resetHistory,
    resetRealtimeAlarm,
    resetHistoryAlarm,
    openRealtime,
    closeRealtime,
    openHistory,
    closeHistory,
    openRealtimeAlarm,
    closeRealtimeAlarm,
    openHistoryAlarm,
    closeHistoryAlarm,

    batchYesRealtime,
    batchNotRealtime,
    batchDeleteRealtime,

    batchYesHistory,
    batchNotHistory,
    batchDeleteHistory,
    batchYesRealtimeAlarm,
    batchNotRealtimeAlarm,
    batchDeleteRealtimeAlarm,
    batchYesHistoryAlarm,
    batchNotHistoryAlarm,
    batchDeleteHistoryAlarm,

    allYesHistory,
    allNotHistory,
    allDeleteHistory,
    allYesHistoryAlarm,
    allNotHistoryAlarm,
    allDeleteHistoryAlarm
  }
})

