import request from '../request'

// 设备实时数据相关 API 接口

// 设备实时数据类型定义
export interface DeviceRealTimeData {
  deviceId: string
  deviceName: string
  deviceType: string
  status: 'normal' | 'warning' | 'alarm' | 'offline'
  onlineStatus: 'online' | 'offline'
  lastUpdateTime: string
  dataPoints: DataPoint[]
}

export interface DataPoint {
  pointId: string
  pointName: string
  pointType: string
  value: number
  unit: string
  thresholdMin?: number
  thresholdMax?: number
  thresholdWarning?: number
  thresholdAlarm?: number
  status: 'normal' | 'warning' | 'alarm'
  updateTime: string
}

export interface CarData {
  carId: string
  carNumber: string
  currentLocation: string
  speed: number
  direction: number
  temperature: number
  humidity: number
  batteryLevel: number
  status: 'running' | 'stopped' | 'charging' | 'maintenance'
  lastReportTime: string
}

export interface ThermalImagingData {
  deviceId: string
  deviceName: string
  maxTemperature: number
  minTemperature: number
  averageTemperature: number
  highestPoint: {
    x: number
    y: number
    temperature: number
  }
  thermalImage: string // 热成像图片URL或base64
  capturedTime: string
  status: 'normal' | 'warning' | 'alarm'
}

export interface VibrationData {
  deviceId: string
  deviceName: string
  frequency: number
  amplitude: number
  velocity: number
  acceleration: number
  displacement: number
  spectrumData: SpectrumPoint[]
  capturedTime: string
  status: 'normal' | 'warning' | 'alarm'
}

export interface SpectrumPoint {
  frequency: number
  amplitude: number
}

export interface DeviceRealTimeResponse {
  code: number
  message: string
  data: DeviceRealTimeData
}

export interface CarDataResponse {
  code: number
  message: string
  data: CarData
}

export interface ThermalImagingResponse {
  code: number
  message: string
  data: ThermalImagingData
}

export interface VibrationResponse {
  code: number
  message: string
  data: VibrationData
}

// 获取设备实时数据
export const getDeviceRealTimeData = (deviceId: string): Promise<DeviceRealTimeResponse> => {
  return request.get(`/device/realtime/${deviceId}`, {
    showLoading: false
  })
}

// 批量获取设备实时数据
export const getBatchDeviceRealTimeData = (deviceIds: string[]): Promise<any> => {
  return request.post('/device/realtime/batch', {
    deviceIds
  }, {
    showLoading: false
  })
}

// 获取小车实时数据
export const getCarRealTimeData = (carId: string): Promise<CarDataResponse> => {
  return request.get(`/device/car/realtime/${carId}`, {
    showLoading: false
  })
}

// 获取热成像数据
export const getThermalImagingData = (deviceId: string): Promise<ThermalImagingResponse> => {
  return request.get(`/device/thermal/${deviceId}`, {
    showLoading: false
  })
}

// 获取振动数据
export const getVibrationData = (deviceId: string): Promise<VibrationResponse> => {
  return request.get(`/device/vibration/${deviceId}`, {
    showLoading: false
  })
}

// 获取实时数据历史趋势
export const getRealTimeDataTrend = (
  deviceId: string,
  pointId: string,
  params?: {
    startTime?: string
    endTime?: string
    interval?: string
  }
): Promise<any> => {
  return request.get(`/device/realtime/${deviceId}/trend/${pointId}`, {
    params,
    showLoading: false
  })
}

// 获取设备最新告警
export const getLatestAlarms = (deviceId: string, params?: {
  limit?: number
}): Promise<any> => {
  return request.get(`/device/${deviceId}/alarms/latest`, {
    params,
    showLoading: false
  })
}