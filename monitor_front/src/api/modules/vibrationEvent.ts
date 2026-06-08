import request from '../request'
import { TAICANG_EVENT_FIND_URL, eqFilter } from '../helpers'
import { getTenantId } from '../tenant'
import type { VibrationEventPayload } from '@/services/vibrationWs'

export interface EventFindItem {
  deviceId?: string
  time?: number
  tenantId?: string
  eventTypeCode?: string
  statusCode?: string
  probability?: number
  dataJson?: string
  [k: string]: unknown
}

export interface EventFindResponse {
  rc: number
  ret?: { items?: EventFindItem[] }
  err: string | null
}

export interface VibrationAlarmFindItem {
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
  judgeFlag?: boolean | null
  data?: {
    channelNo?: string | number
    value?: number
    threshold?: number
    level?: string
    unit?: string
    pointName?: string
    amplitude?: number
    [k: string]: unknown
  }
  rawDataJson?: string
  [k: string]: unknown
}

export interface VibrationAlarmFindResponse {
  rc: number
  ret?: {
    rowCount?: number
    items?: VibrationAlarmFindItem[]
  }
  err: string | null
}

export const fetchVibrationEventsForOverview = async (params?: {
  tenantId?: string
  startTime?: number
  endTime?: number
  pageSize?: number
}): Promise<VibrationEventPayload[]> => {
  const tenantId = params?.tenantId ?? getTenantId()
  if (!tenantId) return []

  const pageSize = params?.pageSize ?? 30
  const res = await request.post<EventFindResponse>(
    TAICANG_EVENT_FIND_URL,
    {
      filterPropertyMap: [
        eqFilter('statusCode', 'VALID'),
        eqFilter('tenantId', tenantId),
        eqFilter('eventTypeCode', 'MACHINE_VIBRATION'),
        ...(params?.startTime != null ? [{ code: 'time', operate: 'GE', value: String(params.startTime) }] : []),
        ...(params?.endTime != null ? [{ code: 'time', operate: 'LE', value: String(params.endTime) }] : []),
      ],
      pageIndex: 0,
      pageSize,
      sortValueMap: [{ code: 'time', sort: 'desc' }],
    },
    { showLoading: false },
  )

  return (res?.ret?.items ?? [])
    .map((it) => ({
      deviceId: String(it.deviceId ?? ''),
      time: Number(it.time ?? 0),
      tenantId: String(it.tenantId ?? ''),
      eventTypeCode: String(it.eventTypeCode ?? ''),
      statusCode: String(it.statusCode ?? ''),
      probability: Number(it.probability ?? 0),
      dataJson: typeof it.dataJson === 'string' ? it.dataJson : JSON.stringify(it.dataJson ?? {}),
    }))
    .filter((x) => x.deviceId && x.time)
}

export const fetchVibrationAlarmsForOverview = async (params?: {
  tenantId?: string
  pageIndex?: number
  pageSize?: number
}): Promise<VibrationAlarmFindItem[]> => {
  const tenantId = params?.tenantId ?? getTenantId()
  if (!tenantId) return []

  const res = await request.post<VibrationAlarmFindResponse>(
    '/taicang/event/findVibrationAlarm',
    {
      tenantId,
      statusCode: 'VALID',
      alarmLevel: 'ALARM',
      alarmType: 'MACHINE_VIBRATION',
      pageIndex: params?.pageIndex ?? 0,
      pageSize: params?.pageSize ?? 5000,
    },
    { showLoading: false },
  )

  return res?.ret?.items ?? []
}
