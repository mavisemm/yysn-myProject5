import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getTenantId } from '@/api/tenant'
import { VibrationWsClient } from '@/services/vibrationWs'
import { SoundWarningWsClient } from '@/services/soundWarningWs'
import { fetchVibrationAlarmsForOverview } from '@/api/modules/vibrationEvent'
import { apiSoundAlarmFind, type EventRow } from '@/api/modules/alarmBatch'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import type { DeviceNode } from '@/types/device'
import {
  applyDerivedFields,
  buildHealthyAlarmFromDevice,
  buildMeasurementPointsFromPoint,
  collectDeviceNodes,
  derivePointStatus,
  isValidOverviewHttpItem,
  keepMax,
  logVibrationHttpItemsDebug,
  makeHealthyPoint,
  maxPointStatus,
  normalizeToOverviewEvent,
  overviewLimits,
  parsePointNum,
  pickLeadingPoint,
  resolveDevicePointCountFromTree,
  shouldOverwriteByOrderKey,
  statusRank,
  trimOverviewItems,
  type AlarmItem,
  type MeasurementPoint,
} from './alarmOverviewLogic'

export {
  resolvePointCountForDeviceNode,
  resolveDevicePointCountFromTree,
} from './alarmOverviewLogic'
export type { AlarmItem, MeasurementPoint } from './alarmOverviewLogic'

const BASE_POINT_SLOTS = 16

export const useAlarmOverviewStore = defineStore('alarmOverview', () => {
  const alarms = ref<AlarmItem[]>([])

  const connectedTenantId = ref('')
  const connecting = ref(false)
  const httpInitialized = ref(false)
  let vibrationWsClient: VibrationWsClient | null = null
  let soundWsClient: SoundWarningWsClient | null = null
  let treeWatchStopper: (() => void) | null = null
  let treePrefilled = false

  function prefillHealthyFromDeviceTree(deviceTreeData: DeviceNode[]) {
    if (treePrefilled || !deviceTreeData?.length) return

    const deviceNodes = collectDeviceNodes(deviceTreeData)
    if (!deviceNodes.length) return

    const existingById = new Map(alarms.value.map((a) => [a.id, a] as const))
    const treeIds = new Set<string>()

    const healthyList = deviceNodes
      .map((d) => {
        const id = String(d.equipmentId ?? d.id ?? '')
        if (!id) return null
        treeIds.add(id)
        return existingById.get(id) ?? buildHealthyAlarmFromDevice(d)
      })
      .filter((x): x is AlarmItem => Boolean(x))

    alarms.value = [...healthyList, ...alarms.value.filter((a) => !treeIds.has(a.id))]
    treePrefilled = true
  }

  function upsertAlarmFromEvent(
    input: unknown,
    _source: 'http' | 'ws' = 'ws',
    opts?: { keepPrevAsLatest?: boolean; orderKey?: number },
  ) {
    const evt = normalizeToOverviewEvent(input)
    if (!evt) return

    const isFaultAlarm =
      !evt.isEventTypeMessage &&
      String(evt.alarmTypeCode ?? '').toUpperCase() === 'MACHINE_VIBRATION'
    const deviceId = String(evt.deviceId ?? '').trim()
    if (!deviceId) return

    const cardId = `${evt.kind}:${deviceId}`
    const idx = alarms.value.findIndex((a) => `${a.kind}:${a.id}` === cardId)

    const t = Number(evt.time)
    const prev = idx >= 0 ? alarms.value[idx] : undefined
    const prevTs = prev?.time ? Number(prev.time) : NaN
    const keepPrevAsLatest = Boolean(opts?.keepPrevAsLatest)
    const isOlderOrSameTime =
      keepPrevAsLatest || (Number.isFinite(prevTs) && Number.isFinite(t) && t > 0 && t <= prevTs)

    const derivedPointStatus: MeasurementPoint['status'] =
      evt.kind === 'sound' ? 'warning' : derivePointStatus(evt.alarmTypeCode, evt.point.level)

    const pointName = evt.point.pointName ? String(evt.point.pointName) : ''
    const pointNum = parsePointNum(pointName, evt.point.channelNo)

    const prevPoints = prev?.measurementPoints ?? []
    const total = Math.max(BASE_POINT_SLOTS, prevPoints.length, pointNum ?? 0)
    const eventTimeKey = Number.isFinite(t) && t > 0 ? t : 0
    const mergeOrderKey = (() => {
      const ok = Number(opts?.orderKey)
      return Number.isFinite(ok) && ok > 0 ? ok : eventTimeKey
    })()

    const canOverwriteMeta =
      !prev ||
      (!isOlderOrSameTime && shouldOverwriteByOrderKey(prev.latestOrderKey, mergeOrderKey)) ||
      (prev.latestOrderKey == null && !isOlderOrSameTime)

    const nextDeviceName = evt.deviceName ? String(evt.deviceName) : ''
    const nextShopName = evt.shopName ? String(evt.shopName) : ''
    const deviceName = canOverwriteMeta ? nextDeviceName : String(prev?.deviceName ?? nextDeviceName)
    const shopName = canOverwriteMeta ? nextShopName : String(prev?.shopName ?? nextShopName)

    const measurementPoints: MeasurementPoint[] = (() => {
      const patchPoint = (p: MeasurementPoint, i: number) =>
        pointNum != null && i === pointNum - 1
          ? {
              ...p,
              name: pointName || p.name,
              status: maxPointStatus(p.status, derivedPointStatus),
              lastAlarmTime: keepMax(p.lastAlarmTime, eventTimeKey),
            }
          : p

      if (!prevPoints.length) {
        const built = buildMeasurementPointsFromPoint(evt.point)
        const base =
          pointNum != null && built.length < pointNum
            ? Array.from({ length: total }, (_, i) => built[i] ?? makeHealthyPoint(i))
            : built
        return base.map(patchPoint)
      }

      const next = Array.from({ length: total }, (_, i) => prevPoints[i] ?? makeHealthyPoint(i))
      if (pointNum != null && pointNum >= 1 && pointNum <= next.length) {
        const prevPoint = next[pointNum - 1]
        const prevKey = prevPoint?.lastAlarmTime
        const overwrite = shouldOverwriteByOrderKey(prevKey, mergeOrderKey)
        const prevRank = statusRank(prevPoint?.status ?? 'healthy')
        const nextRank = statusRank(derivedPointStatus)
        const useNewAsPrimary = nextRank > prevRank || (nextRank === prevRank && overwrite)
        const nextPrimaryStatus = useNewAsPrimary ? derivedPointStatus : (prevPoint?.status ?? 'healthy')
        const nextPrimaryTime = useNewAsPrimary
          ? eventTimeKey > 0
            ? eventTimeKey
            : Number(prevKey ?? 0)
          : Number(prevKey ?? 0)

        next[pointNum - 1] = {
          name: overwrite
            ? pointName || prevPoint?.name || `测点${pointNum}`
            : prevPoint?.name || pointName || `测点${pointNum}`,
          status: nextPrimaryStatus,
          lastAlarmTime:
            Number.isFinite(nextPrimaryTime) && nextPrimaryTime > 0
              ? nextPrimaryTime
              : keepMax(prevKey, eventTimeKey),
        }
      }
      return next
    })()

    const leading = pickLeadingPoint(measurementPoints)
    const deviceStatus: AlarmItem['status'] =
      leading.status === 'alarm'
        ? 'alarm'
        : leading.status === 'warning'
          ? 'warning'
          : isFaultAlarm
            ? 'alarm'
            : 'healthy'

    const item = applyDerivedFields({
      id: deviceId,
      kind: evt.kind,
      deviceName,
      shopName,
      deviceNameWithShop: `${deviceName}（${shopName || ''}）`,
      status: deviceStatus,
      statusText: deviceStatus === 'alarm' ? '报警' : deviceStatus === 'warning' ? '预警' : '健康',
      time:
        (leading.status === 'alarm' || leading.status === 'warning') && leading.timeKey > 0
          ? String(leading.timeKey)
          : '',
      measurementPoints,
      latestPointNum: leading.pointNum ?? prev?.latestPointNum ?? pointNum ?? undefined,
      latestOrderKey:
        mergeOrderKey > 0 ? mergeOrderKey : prev?.latestOrderKey,
      devicePointCount: resolveDevicePointCountFromTree(deviceId) ?? prev?.devicePointCount,
      prefilled: false,
    })

    if (idx >= 0) alarms.value.splice(idx, 1, item)
    else alarms.value.unshift(item)
    alarms.value = trimOverviewItems(alarms.value, overviewLimits.maxItems)
  }

  function applyVibrationOverviewFromHttp(rawItems: unknown[]) {
    const items = (rawItems ?? []).filter(isValidOverviewHttpItem)
    logVibrationHttpItemsDebug(items)

    const seenLatestByDeviceId = new Set<string>()
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx] as { equipmentId?: string; alarmTime?: number }
      const deviceId = String(it.equipmentId ?? '')
      const isOlder = deviceId ? seenLatestByDeviceId.has(deviceId) : false
      upsertAlarmFromEvent(it, 'http', {
        keepPrevAsLatest: isOlder,
        orderKey: Number(it.alarmTime ?? 0),
      })
      if (deviceId) seenLatestByDeviceId.add(deviceId)
    }
  }

  function applySoundOverviewFromHttp(soundItems: EventRow[]) {
    for (const it of soundItems) {
      const statusCode = String(it.statusCode ?? '')
      if (statusCode && statusCode.toUpperCase() !== 'VALID') continue
      upsertAlarmFromEvent(it, 'http', { orderKey: Number(it.time ?? 0) })
    }
  }

  async function initOverviewOnceByHttp(tId: string) {
    await Promise.allSettled([
      fetchVibrationAlarmsForOverview({ tenantId: tId, pageIndex: 0, pageSize: 5000 })
        .then((rawItems) => applyVibrationOverviewFromHttp(rawItems ?? []))
        .catch((reason) => console.warn('预警总览振动预警初始化获取失败:', reason)),
      apiSoundAlarmFind({
        filterPropertyMap: [
          { code: 'statusCode', operate: 'EQ', value: 'VALID' },
          { code: 'tenantId', operate: 'EQ', value: tId },
        ],
        sortValueMap: [{ code: 'time', sort: 'desc' }],
        pageIndex: 0,
        pageSize: 5000,
      })
        .then((res) => applySoundOverviewFromHttp((res?.ret?.items ?? []) as EventRow[]))
        .catch((reason) => console.warn('预警总览声音预警初始化获取失败:', reason)),
    ])
  }

  function connectWsClient<C extends { connect(): Promise<void> }>(
    label: string,
    pending: C,
    holder: { get: () => C | null; set: (c: C | null) => void },
    onConnected: (client: C) => void,
  ): Promise<void> {
    holder.set(pending)
    return pending
      .connect()
      .then(() => {
        if (holder.get() !== pending) return
        onConnected(pending)
      })
      .catch((e) => {
        if (holder.get() !== pending) return
        console.warn(`预警总览${label} websocket 连接失败:`, e)
      })
  }

  function handleIncomingEvent(
    payload: unknown,
    onIncomingEvent?: (payload: unknown) => void,
  ) {
    upsertAlarmFromEvent(payload, 'ws')
    try {
      onIncomingEvent?.(payload)
    } catch (e) {
      console.warn('预警总览 websocket onIncomingEvent 回调异常:', e)
    }
  }

  async function start(params?: {
    token?: string
    tenantId?: string
    onIncomingEvent?: (payload: unknown) => void
  }) {
    const tId = (params?.tenantId ?? getTenantId() ?? '').trim()
    if (!tId) return
    if (connectedTenantId.value === tId && vibrationWsClient && soundWsClient) return

    stop()
    alarms.value = []
    treePrefilled = false
    httpInitialized.value = false

    connecting.value = true
    connectedTenantId.value = tId
    try {
      const deviceTreeStore = useDeviceTreeStore()
      const tryPrefill = () => prefillHealthyFromDeviceTree(deviceTreeStore.deviceTreeData)
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
          { immediate: false, deep: false },
        )
      }

      const token = params?.token ?? localStorage.getItem('token') ?? undefined
      const vibrationHolder = {
        get: () => vibrationWsClient,
        set: (c: VibrationWsClient | null) => {
          vibrationWsClient = c
        },
      }
      const soundHolder = {
        get: () => soundWsClient,
        set: (c: SoundWarningWsClient | null) => {
          soundWsClient = c
        },
      }

      const vibrationWsReadyPromise = connectWsClient(
        '振动',
        new VibrationWsClient({ token }),
        vibrationHolder,
        (client) =>
          client.subscribeVibrationTopic(tId, (payload) =>
            handleIncomingEvent(payload, params?.onIncomingEvent),
          ),
      )

      const soundWsReadyPromise = connectWsClient(
        '声音',
        new SoundWarningWsClient({ token }),
        soundHolder,
        (client) =>
          client.subscribeSoundTopic(tId, (payload) =>
            handleIncomingEvent(payload, params?.onIncomingEvent),
          ),
      )

      try {
        await initOverviewOnceByHttp(tId)
      } catch (e) {
        console.warn('预警总览初始化接口获取失败:', e)
      } finally {
        httpInitialized.value = true
      }

      await Promise.all([vibrationWsReadyPromise, soundWsReadyPromise])
    } finally {
      connecting.value = false
    }
  }

  function stop() {
    connecting.value = false
    connectedTenantId.value = ''
    httpInitialized.value = false
    try {
      vibrationWsClient?.disconnect()
    } catch {}
    vibrationWsClient = null
    try {
      soundWsClient?.disconnect()
    } catch {}
    soundWsClient = null
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
    httpInitialized,
    start,
    stop,
    reset,
    upsertAlarmFromEvent,
  }
})
