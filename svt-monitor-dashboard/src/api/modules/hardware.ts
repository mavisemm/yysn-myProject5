import request from '../request'

// 硬件设备相关 API 接口

// 硬件设备类型定义
export interface HardwareDevice {
  id: string
  deviceId: string
  deviceName: string
  deviceCode: string
  deviceType: string
  deviceModel: string
  manufacturer: string
  serialNumber: string
  firmwareVersion: string
  hardwareVersion: string
  macAddress: string
  ipAddress: string
  status: 'online' | 'offline' | 'maintenance' | 'fault'
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor'
  installDate: string
  warrantyEndDate: string
  location: string
  workshopId: string
  workshopName: string
  factoryId: string
  factoryName: string
  lastOnlineTime: string
  lastOfflineTime: string
  uptime: number
  pointCount: number
  alarmCount: number
  warningCount: number
  tags: string[]
  description?: string
}

export interface DeviceStatus {
  deviceId: string
  status: 'online' | 'offline' | 'maintenance' | 'fault'
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor'
  lastHeartbeatTime: string
  signalStrength: number
  batteryLevel?: number
  cpuUsage?: number
  memoryUsage?: number
  diskUsage?: number
  networkStatus?: string
}

export interface DeviceWarning {
  id: string
  deviceId: string
  warningType: string
  warningLevel: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  createTime: string
  updateTime: string
  status: 'active' | 'acknowledged' | 'resolved'
  resolveTime?: string
}

export interface DeviceStatistics {
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  maintenanceDevices: number
  faultDevices: number
  excellentHealth: number
  goodHealth: number
  fairHealth: number
  poorHealth: number
  todayAlarms: number
  weekAlarms: number
  monthAlarms: number
  healthScore: number
}

export interface HardwareDeviceQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  healthStatus?: string
  deviceType?: string
  workshopId?: string
  factoryId?: string
  orderBy?: string
  orderDir?: 'asc' | 'desc'
}

export interface HardwareDeviceListResponse {
  code: number
  message: string
  data: {
    list: HardwareDevice[]
    total: number
    page: number
    pageSize: number
  }
}

export interface HardwareDeviceDetailResponse {
  code: number
  message: string
  data: HardwareDevice
}

export interface DeviceStatusResponse {
  code: number
  message: string
  data: DeviceStatus
}

export interface DeviceWarningResponse {
  code: number
  message: string
  data: {
    list: DeviceWarning[]
    total: number
    page: number
    pageSize: number
  }
}

export interface DeviceStatisticsResponse {
  code: number
  message: string
  data: DeviceStatistics
}

// 获取硬件设备列表
export const getHardwareDeviceList = (params?: HardwareDeviceQueryParams): Promise<HardwareDeviceListResponse> => {
  return request.get('/hardware/device/list', {
    params,
    showLoading: true
  })
}

// 获取硬件设备详情
export const getHardwareDeviceDetail = (deviceId: string): Promise<HardwareDeviceDetailResponse> => {
  return request.get(`/hardware/device/detail/${deviceId}`, {
    showLoading: true
  })
}

// 创建硬件设备
export const createHardwareDevice = (data: Omit<HardwareDevice, 'id' | 'lastOnlineTime' | 'lastOfflineTime'>): Promise<any> => {
  return request.post('/hardware/device/create', data, {
    showLoading: true
  })
}

// 更新硬件设备
export const updateHardwareDevice = (deviceId: string, data: Partial<HardwareDevice>): Promise<any> => {
  return request.put(`/hardware/device/update/${deviceId}`, data, {
    showLoading: true
  })
}

// 删除硬件设备
export const deleteHardwareDevice = (deviceId: string): Promise<any> => {
  return request.delete(`/hardware/device/delete/${deviceId}`, {
    showLoading: true
  })
}

// 获取设备状态
export const getDeviceStatus = (deviceId: string): Promise<DeviceStatusResponse> => {
  return request.get(`/hardware/device/status/${deviceId}`, {
    showLoading: false
  })
}

// 批量获取设备状态
export const getBatchDeviceStatus = (deviceIds: string[]): Promise<any> => {
  return request.post('/hardware/device/status/batch', {
    deviceIds
  }, {
    showLoading: false
  })
}

// 获取设备预警信息
export const getDeviceWarnings = (params?: {
  deviceId?: string
  warningLevel?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<DeviceWarningResponse> => {
  return request.get('/hardware/device/warnings', {
    params,
    showLoading: true
  })
}

// 获取设备统计数据
export const getDeviceStatistics = (): Promise<DeviceStatisticsResponse> => {
  return request.get('/hardware/device/statistics', {
    showLoading: true
  })
}

// 设备重启命令
export const restartDevice = (deviceId: string): Promise<any> => {
  return request.post(`/hardware/device/command/${deviceId}/restart`, {}, {
    showLoading: true
  })
}

// 设备固件升级
export const upgradeDeviceFirmware = (deviceId: string, firmwareVersion: string): Promise<any> => {
  return request.post(`/hardware/device/command/${deviceId}/upgrade`, {
    firmwareVersion
  }, {
    showLoading: true
  })
}

// 设备参数配置
export const configureDevice = (deviceId: string, config: any): Promise<any> => {
  return request.post(`/hardware/device/command/${deviceId}/configure`, config, {
    showLoading: true
  })
}

// 获取设备健康报告
export const getDeviceHealthReport = (deviceId: string, params?: {
  startTime?: string
  endTime?: string
}): Promise<any> => {
  return request.get(`/hardware/device/health-report/${deviceId}`, {
    params,
    showLoading: true
  })
}

// 获取TOP5设备数据
export interface TopDevice {
  deviceId: string;
  deviceName: string;
  workshopId: string;
  workshopName: string;
  value: number; // 数值，如振动烈度、声音响度或温度
  latestTime: string;
}

export interface TopDeviceResponse {
  rc: number;
  ret: TopDevice[];
  err: string | null;
}

// 获取设备Top5数据，type可为SOUND, VIBRATION, TEMPERATURE
export const getTop5Devices = (type: 'SOUND' | 'VIBRATION' | 'TEMPERATURE'): Promise<TopDeviceResponse> => {
  return request.get('/taicang/hardware/device/vibration/top5', {
    params: { type },
    showLoading: true
  })
}