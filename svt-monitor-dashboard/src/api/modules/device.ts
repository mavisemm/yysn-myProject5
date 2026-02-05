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

export interface ApiResponse<T = unknown> {
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
export const updateDevice = (id: string, data: Partial<Device>): Promise<ApiResponse<Device>> => {
  return request.put(`/devices/${id}`, data)
}

// 删除设备
export const deleteDevice = (id: string): Promise<ApiResponse<boolean>> => {
  return request.delete(`/devices/${id}`)
}

// 批量操作设备
export const batchOperateDevices = (ids: string[], operation: string): Promise<ApiResponse<{success: boolean; affectedCount: number}>> => {
  return request.post('/devices/batch', {
    ids,
    operation
  })
}

// 新的响应格式类型
export interface NewApiResponse<T = unknown> {
  rc: number
  ret: T
  err: string | null
}

// 振动频域图数据接口
export interface VibrationFrequencyData {
  frequency: string
  freqSpeedData: string
}

export const getVibrationFrequencyData = (): Promise<NewApiResponse<VibrationFrequencyData>> => {
  return request.post('/api/device/vibration/data/frequency', {
    tenantId: '2b410e834b4b4ae49ab8d52f6d49e967',
    deviceId: 'ff8081819a4cd984019a4d524e0d0000',
    pointId: 'PNT_A01'
  })
}

// 振动基本指标数据接口
export interface VibrationMetricData {
  velocityRms: number
  velocityMax: number
  accelerationRms: number
  accelerationMax: number
}

export const getVibrationMetricData = (): Promise<NewApiResponse<VibrationMetricData>> => {
  return request.post('/api/device/vibration/data/metric/rms', {
    tenantId: '2b410e834b4b4ae49ab8d52f6d49e967',
    deviceId: 'ff8081819a4cd984019a4d524e0d0000',
    pointId: 'PNT_A01'
  })
}

// 振动时域图数据接口
export interface VibrationTimeDomainData {
  time: number
  timedomaindata: string  // JSON字符串格式的数组
}

export const getVibrationTimeDomainData = (): Promise<NewApiResponse<VibrationTimeDomainData>> => {
  return request.post('/api/device/vibration/data/time', {
    tenantId: '2b410e834b4b4ae49ab8d52f6d49e967',
    deviceId: 'ff8081819a4cd984019a4d524e0d0000',
    pointId: 'PNT_A01'
  })
}