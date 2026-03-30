import request from '../request'
import { readTenantIdFromStorageOrAddressBar } from '../tenant'

export type FilterOperate = 'EQ' | 'GE' | 'LE' | 'LIKE'

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

export const apiFindEvents = (body: FindBody) => {
  return request.post<FindResponse>('http://122.224.196.178:8003/taicang/event/find', body, { showLoading: false })
}

export const apiGetDeviceNameDropdownList = () => {
  const tenantId = readTenantIdFromStorageOrAddressBar()
  return request.get<DropdownResponse>('/taicang/hardware/device/name/getDropdownList', {
    params: { _t: Date.now(), tenantId, userId: '' },
    showLoading: false
  })
}

export const apiGetEventTypeDropdownList = () => {
  const tenantId = readTenantIdFromStorageOrAddressBar()
  return request.get<DropdownResponse>('/taicang/hardware/eventType/getDropdownList', {
    params: { _t: Date.now(), tenantId, userId: '' },
    showLoading: false
  })
}

export const apiGetPointListNew = (body: any) => {
  return request.post<any>('/taicang/hardware/device/check-point/find/point/message', body, { showLoading: false })
}

export const apiConfirmYes = (idList: string[]) => {
  // 后端期望请求体根为数组（List），不要再包一层 { idList: [...] }
  return request.post<any>('/taicang/event/confirm/yes', idList, { showLoading: true })
}

export const apiConfirmNot = (idList: string[]) => {
  return request.post<any>('/taicang/event/confirm/not', idList, { showLoading: true })
}

export const apiDeleteEvents = (idList: string[]) => {
  return request.post<any>('/taicang/event/delete', idList, { showLoading: true })
}

export const apiConfirmYesAll = (idList?: string[]) => {
  // 后端期望请求体根为数组（List）；没有 idList 时传空数组
  return request.post<any>('/taicang/event/confirm/yesAll', idList ?? [], { showLoading: true })
}

export const apiConfirmNotAll = () => {
  // 后端期望请求体根为数组（List）
  return request.post<any>('/taicang/event/confirm/notAll', [], { showLoading: true })
}

export const apiDeleteAllValid = () => {
  // 后端期望请求体根为数组（List）
  return request.post<any>('/taicang/event/deleteAllValid', [], { showLoading: true })
}

