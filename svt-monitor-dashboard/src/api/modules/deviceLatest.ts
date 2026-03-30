import request from '../request'




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
  receiverId: string
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
  thermalImage: string
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


export const getDeviceRealTimeData = (deviceId: string): Promise<DeviceRealTimeResponse> => {
  return request.get(`/device/realtime/${deviceId}`, {
    showLoading: false
  })
}


export const getBatchDeviceRealTimeData = (deviceIds: string[]): Promise<any> => {
  return request.post('/device/realtime/batch', {
    deviceIds
  }, {
    showLoading: false
  })
}


export const getCarRealTimeData = (carId: string): Promise<CarDataResponse> => {
  return request.get(`/device/car/realtime/${carId}`, {
    showLoading: false
  })
}


export const getThermalImagingData = (deviceId: string): Promise<ThermalImagingResponse> => {
  return request.get(`/device/thermal/${deviceId}`, {
    showLoading: false
  })
}


export const getVibrationData = (deviceId: string): Promise<VibrationResponse> => {
  return request.get(`/device/vibration/${deviceId}`, {
    showLoading: false
  })
}


export const getRealTimeDataTrend = (
  deviceId: string,
  receiverId: string,
  params?: {
    startTime?: string
    endTime?: string
    interval?: string
  }
): Promise<any> => {
  return request.get(`/device/realtime/${deviceId}/trend/${receiverId}`, {
    params,
    showLoading: false
  })
}


export const getLatestAlarms = (deviceId: string, params?: {
  limit?: number
}): Promise<any> => {
  return request.get(`/device/${deviceId}/alarms/latest`, {
    params,
    showLoading: false
  })
}