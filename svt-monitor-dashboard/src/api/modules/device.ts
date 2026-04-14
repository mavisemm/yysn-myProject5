import request from '../request'
import { getTenantId } from '../tenant'




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


export const getDeviceList = (params?: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
}): Promise<ApiResponse<DeviceListData>> => {
  return request.get('/devices', { params })
}


export const getDeviceDetail = (id: string): Promise<ApiResponse<Device>> => {
  return request.get(`/devices/${id}`)
}


export const updateDevice = (id: string, data: Partial<Device>): Promise<ApiResponse<Device>> => {
  return request.put(`/devices/${id}`, data)
}


export const deleteDevice = (id: string): Promise<ApiResponse<boolean>> => {
  return request.delete(`/devices/${id}`)
}


export const batchOperateDevices = (ids: string[], operation: string): Promise<ApiResponse<{success: boolean; affectedCount: number}>> => {
  return request.post('/devices/batch', {
    ids,
    operation
  })
}


export interface NewApiResponse<T = unknown> {
  rc: number
  ret: T
  err: string | null
}


/** 振动频域 / 时域数据轴向（与后端约定为大写） */
export type VibrationAxis = 'X' | 'Y' | 'Z'

export interface VibrationFrequencyData {
  frequency: number[]
  freqSpeedData: number[]
}

export interface VibrationFrequencyWaterfallData {
  collectTime: string[]
  frequency: number[]
  freqSpeedData: number[][]
}

export const getVibrationFrequencyData = (
  deviceId: string,
  receiverId: string,
  axis: VibrationAxis = 'X'
): Promise<NewApiResponse<VibrationFrequencyData>> => {
  return request.post('/api/device/vibration/data/frequency', {
    tenantId: getTenantId(),
    deviceId: deviceId,
    receiverId: receiverId,
    axis
  })
}

export const getVibrationFrequencyWaterfallData = (
  deviceId: string,
  receiverId: string,
  axis: VibrationAxis,
  time: string,
  startTime: string,
  endTime: string
): Promise<NewApiResponse<VibrationFrequencyWaterfallData>> => {
  return request.post('/api/device/vibration/data/frequency/waterfall', {
    tenantId: getTenantId(),
    deviceId,
    receiverId,
    axis,
    time,
    startTime,
    endTime
  })
}


export interface VibrationMetricData {
  collectTime?: string
  velocityRms?: number
  velocityMax?: number
  accelerationRms?: number
  accelerationMax?: number
  xvelocityRms?: number
  yvelocityRms?: number
  zvelocityRms?: number
  xvelocityMax?: number
  yvelocityMax?: number
  zvelocityMax?: number
  xaccelerationRms?: number
  yaccelerationRms?: number
  zaccelerationRms?: number
  xaccelerationMax?: number
  yaccelerationMax?: number
  zaccelerationMax?: number
}

export const getVibrationMetricData = (deviceId: string, receiverId: string): Promise<NewApiResponse<VibrationMetricData>> => {
  return request.post('/api/device/vibration/data/metric/rms', {
    tenantId: getTenantId(),
    deviceId: deviceId,
    receiverId: receiverId
  })
}


export interface VibrationTimeDomainData {
  time: number
  
  timedomaindata: string | number[] | string[]
}

export const getVibrationTimeDomainData = (
  deviceId: string,
  receiverId: string,
  axis: VibrationAxis = 'X'
): Promise<NewApiResponse<VibrationTimeDomainData>> => {
  return request.post('/api/device/vibration/data/time', {
    tenantId: getTenantId(),
    deviceId: deviceId,
    receiverId: receiverId,
    axis
  })
}