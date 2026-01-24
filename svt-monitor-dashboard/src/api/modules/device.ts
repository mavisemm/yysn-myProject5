import request from '../request'

// 设备相关的 API 接口

// 设备类型定义
export interface Device {
  id: string
  name: string
  type: string
  status: 'normal' | 'warning' | 'alarm'
  workshopId: string
  workshopName: string
  pointCount: number
  lastUpdateTime: string
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface DeviceListData {
  list: Device[]
  total: number
  page: number
  pageSize: number
}

// 获取设备列表
export const getDeviceList = (params?: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
}): Promise<ApiResponse<DeviceListData>> => {
  return request.get('/devices', { params })
}

// 获取单个设备详情
export const getDeviceDetail = (id: string): Promise<ApiResponse<Device>> => {
  return request.get(`/devices/${id}`)
}

// 更新设备
export const updateDevice = (id: string, data: Partial<Device>): Promise<ApiResponse<any>> => {
  return request.put(`/devices/${id}`, data)
}

// 删除设备
export const deleteDevice = (id: string): Promise<ApiResponse<any>> => {
  return request.delete(`/devices/${id}`)
}

// 批量操作设备
export const batchOperateDevices = (ids: string[], operation: string): Promise<ApiResponse<any>> => {
  return request.post('/devices/batch', {
    ids,
    operation
  })
}