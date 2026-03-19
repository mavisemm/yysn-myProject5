import request from '../request'

const TAICANG_API_BASE_URL = 'http://122.224.196.178:8003'
const DEFAULT_TENANT_ID = '2b410e834b4b4ae49ab8d52f6d49e967'

function getTenantIdPreferred(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('tenantId')
  return (fromUrl && fromUrl.trim()) || localStorage.getItem('tenantId') || DEFAULT_TENANT_ID
}

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
  return request.post<FindResponse>('/taicang/event/find', body, { showLoading: false, customBaseURL: TAICANG_API_BASE_URL })
}

export const apiGetDeviceNameDropdownList = () => {
  const tenantId = getTenantIdPreferred()
  return request.get<DropdownResponse>('/taicang/hardware/device/name/getDropdownList', {
    params: { _t: Date.now(), tenantId, userId: '' },
    showLoading: false,
    customBaseURL: TAICANG_API_BASE_URL
  })
}

export const apiGetEventTypeDropdownList = () => {
  const tenantId = getTenantIdPreferred()
  return request.get<DropdownResponse>('/taicang/hardware/eventType/getDropdownList', {
    params: { _t: Date.now(), tenantId, userId: '' },
    showLoading: false,
    customBaseURL: TAICANG_API_BASE_URL
  })
}

export const apiGetPointListNew = (body: any) => {
  return request.post<any>('/taicang/hardware/device/check-point/find/point/message', body, { showLoading: false })
}

export const apiConfirmYes = (idList: string[]) => {
  return request.post<any>('/taicang/event/confirm/yes', { idList }, { showLoading: true, customBaseURL: TAICANG_API_BASE_URL })
}

export const apiConfirmNot = (idList: string[]) => {
  return request.post<any>('/taicang/event/confirm/not', { idList }, { showLoading: true, customBaseURL: TAICANG_API_BASE_URL })
}

export const apiDeleteEvents = (idList: string[]) => {
  return request.post<any>('/taicang/event/delete', { idList }, { showLoading: true, customBaseURL: TAICANG_API_BASE_URL })
}

export const apiConfirmYesAll = (idList?: string[]) => {
  return request.post<any>('/taicang/event/confirm/yesAll', idList ? { idList } : {}, { showLoading: true, customBaseURL: TAICANG_API_BASE_URL })
}

export const apiConfirmNotAll = () => {
  return request.post<any>('/taicang/event/confirm/notAll', {}, { showLoading: true, customBaseURL: TAICANG_API_BASE_URL })
}

export const apiDeleteAllValid = () => {
  return request.post<any>('/taicang/event/deleteAllValid', {}, { showLoading: true, customBaseURL: TAICANG_API_BASE_URL })
}

