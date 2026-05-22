import request from '../request'
import { TAICANG_EVENT_FIND_URL, withTenantQuery } from '../helpers'

export type FilterOperate = 'EQ' | 'GE' | 'LE' | 'GTE' | 'LTE' | 'LIKE'

export interface FilterProperty {
  code: string
  operate?: FilterOperate
  value: any
}

export interface SortValue {
  code: string
  sort: 'asc' | 'desc'
}

export interface FindBody {
  filterPropertyMap: FilterProperty[]
  pageIndex: number
  pageSize: number
  sortValueMap?: SortValue[]
}

export interface FindSoundAlarmBody {
  filterPropertyMap: FilterProperty[]
  sortValueMap?: SortValue[]
  pageIndex?: number
  pageSize?: number
}

export interface EventRow {
  id: string
  deviceName?: string
  pointName?: string
  receiverName?: string
  eventTypeCode?: string
  eventType?: { name?: string }
  statusText?: string
  statusCode?: string
  time?: number | string
  dataJson?: any
  /** 振动报警测量轴向（如 X / Y / Z） */
  warningAxis?: string
  /** 振动报警触发值 */
  triggerValue?: number | string
  [k: string]: any
}

export interface FindResponse {
  rc: number
  ret?: {
    items?: EventRow[]
    rowCount?: number
    total?: number
  }
  err: string | null
}

export interface FindVibrationAlarmByConditionBody {
  alarmLevel: 'ALARM' | string
  alarmType: 'MACHINE_VIBRATION' | string
  pageIndex: number
  pageSize: number
  statusCode: string
  tenantId: string
  startTime?: number
  endTime?: number
  deviceId?: string
  eventTypeCode?: string
}

/** 振动报警全部删除（与 findVibrationAlarmByCondition 筛选字段一致，不含分页） */
export interface VibrationAlarmDeleteAllBody {
  alarmLevel: 'ALARM' | string
  alarmType: 'MACHINE_VIBRATION' | string
  statusCode: string
  tenantId: string
  startTime?: number
  endTime?: number
  deviceId?: string
  eventTypeCode?: string
}

export interface DropdownItem {
  id?: string | number
  code?: string
  name?: string
  label?: string
  value?: string | number
  [k: string]: any
}

export interface DropdownResponse {
  rc: number
  ret?: DropdownItem[]
  err: string | null
}

const postEvent = <T>(url: string, body: unknown, showLoading: boolean) =>
  request.post<T>(url, body, { showLoading })

export const apiFindEvents = (body: FindBody) =>
  request.post<FindResponse>(TAICANG_EVENT_FIND_URL, body, { showLoading: false })

export const apiFindVibrationAlarmByCondition = (body: FindVibrationAlarmByConditionBody) =>
  request.post<FindResponse>('/taicang/event/findVibrationAlarmByCondition', body, { showLoading: false })

export const apiSoundAlarmFind = (body: FindSoundAlarmBody) =>
  request.post<FindResponse>('/taicang/event/soundAlarmFind', body, { showLoading: false })

export const apiGetDeviceNameDropdownList = () =>
  request.get<DropdownResponse>('/taicang/hardware/device/name/getDropdownList', {
    params: withTenantQuery(),
    showLoading: false,
  })

export const apiGetEventTypeDropdownList = () =>
  request.get<DropdownResponse>('/taicang/hardware/eventType/getDropdownList', {
    params: withTenantQuery(),
    showLoading: false,
  })

export const apiGetPointListNew = (body: any) =>
  request.post<any>('/taicang/hardware/device/check-point/find/point/message', body, {
    showLoading: false,
  })

export const apiConfirmYes = (idList: string[]) =>
  postEvent('/taicang/event/confirm/yes', idList, true)

export const apiConfirmNot = (idList: string[]) =>
  postEvent('/taicang/event/confirm/not', idList, true)

export const apiConfirmVibrationYes = (idList: string[]) =>
  postEvent('/device/vibration/data/yes', idList, true)

export const apiConfirmVibrationNot = (idList: string[]) =>
  postEvent('/device/vibration/data/not', idList, true)

export const apiDeleteVibrationAlarm = (idList: string[]) =>
  postEvent('/taicang/event/vibration/alarm/delete', idList, true)

export const apiDeleteAllVibrationAlarm = (body: VibrationAlarmDeleteAllBody) =>
  postEvent('/taicang/event/vibration/all/delete', body, true)

export const apiDeleteEvents = (idList: string[]) =>
  postEvent('/taicang/event/delete', idList, true)

export const apiConfirmYesAll = (idList?: string[]) =>
  postEvent('/taicang/event/confirm/yesAll', idList ?? [], true)

export const apiConfirmNotAll = () =>
  postEvent('/taicang/event/confirm/notAll', [], true)

export const apiDeleteAllValid = () =>
  postEvent('/taicang/event/deleteAllValid', [], true)
