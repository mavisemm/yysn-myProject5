import request from '../request'
import type { VibrationEventPayload } from '@/services/vibrationWs'

/** 事件查询接口返回的单条记录（按项目已有的 /taicang/event/find 约定） */
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
  ret?: {
    items?: EventFindItem[]
  }
  err: string | null
}

/** 机器振动故障报警查询（/taicang/event/findVibrationAlarm） */
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

/**
 * 预警总览初始化：查询近一段时间的振动事件列表
 * - 不调用 saveVibration（该接口为写入，会导致后端插入并触发 device_id not null）
 */
export const fetchVibrationEventsForOverview = async (params?: {
  tenantId?: string
  startTime?: number
  endTime?: number
  pageSize?: number
}): Promise<VibrationEventPayload[]> => {
  const tenantId = params?.tenantId ?? localStorage.getItem('tenantId') ?? ''
  if (!tenantId) return []

  const pageSize = params?.pageSize ?? 30
  const res = await request.post<EventFindResponse>(
    // 兜底：必须直连 8003，避免落到 8006 的路由导致 405
    'http://122.224.196.178:8003/taicang/event/find',
    {
      filterPropertyMap: [
        { code: 'statusCode', operate: 'EQ', value: 'VALID' },
        { code: 'tenantId', operate: 'EQ', value: tenantId },
        { code: 'eventTypeCode', operate: 'EQ', value: 'MACHINE_VIBRATION' },
        ...(params?.startTime != null ? [{ code: 'time', operate: 'GE', value: String(params.startTime) }] : []),
        ...(params?.endTime != null ? [{ code: 'time', operate: 'LE', value: String(params.endTime) }] : [])
      ],
      pageIndex: 0,
      pageSize,
      sortValueMap: [{ code: 'time', sort: 'desc' }]
    },
    { showLoading: false }
  )

  const items = res?.ret?.items ?? []
  return items
    .map((it) => ({
      deviceId: String(it.deviceId ?? ''),
      time: Number(it.time ?? 0),
      tenantId: String(it.tenantId ?? tenantId),
      eventTypeCode: String(it.eventTypeCode ?? 'MACHINE_VIBRATION'),
      statusCode: String(it.statusCode ?? 'VALID'),
      probability: Number(it.probability ?? 0),
      dataJson: typeof it.dataJson === 'string' ? it.dataJson : JSON.stringify(it.dataJson ?? {})
    }))
    .filter((x) => x.deviceId && x.time)
 }

/**
 * 预警总览初始化：机器振动“故障报警”列表（你提供的接口）
 * - 该接口仅返回故障报警，不包含趋势预警
 * - AlarmOverview.vue 内已支持该结构（alarmTime/alarmTypeCode/data/rawDataJson）
 */
export const fetchVibrationAlarmsForOverview = async (params?: {
  tenantId?: string
  pageIndex?: number
  pageSize?: number
}): Promise<VibrationAlarmFindItem[]> => {
  const tenantId = params?.tenantId ?? localStorage.getItem('tenantId') ?? ''
  if (!tenantId) return []

  const pageIndex = params?.pageIndex ?? 0
  const pageSize = params?.pageSize ?? 50

  const res = await request.post<VibrationAlarmFindResponse>(
    '/taicang/event/findVibrationAlarm',
    {
      tenantId,
      statusCode: 'VALID',
      alarmLevel: 'ALARM',
      alarmType: 'MACHINE_VIBRATION',
      pageIndex,
      pageSize
    },
    { showLoading: false }
  )

  return res?.ret?.items ?? []
}

