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

// 设备详情信息接口返回类型
export interface DeviceInfoResponse {
  rc: number;
  ret: {
    id: number;
    deviceId: string;
    deviceName: string;
    deviceModel: string;
    deviceFactory: string;
    locationDetail: string;
    pressure: number;
    rotationSpeed: number;
    designFlow: number;
    onlineStatus: number;
    createdTime: string | null;
    updatedTime: string | null;
  };
  err: string | null;
}

// 根据设备ID获取设备详情信息
export const getDeviceInfoByDeviceId = (deviceId: string): Promise<DeviceInfoResponse> => {
  return request.get(`/taicang/hardware/device/info/vibration/findByDeviceId`, {
    params: { deviceId },
    showLoading: true
  })
}

// 点位列表项（selectCheckPointIn 接口返回）
export interface CheckPointItem {
  pointId: string
  pointName: string
  warningTime: string | null
  warningType: string
  warningValue: number
  isAlarm: number  // 0=有预警(未处理)，1=没预警(已处理)
}
export interface SelectCheckPointInResponse {
  rc: number
  ret: CheckPointItem[]
  err: string | null
}

// 根据设备ID获取点位列表（设备详情页点位列表）
export const getSelectCheckPointIn = (deviceId: string): Promise<SelectCheckPointInResponse> => {
  return request.get('/taicang/hardware/device/vibration/selectCheckPointIn', {
    params: { deviceId },
    showLoading: false
  })
}

// 趋势分析接口
export interface TrendAnalysisRequest {
  tenantId: string
  time: number
  startTime: number
  pointIdList: number[]
  type: number
  days: number
}

export interface TrendAnalysisItem {
  id: number
  time: string
  deviceId: string | null
  deviceName: string | null
  fileFlag: boolean | null
  filePath: string | null
  productId: string | null
  productName: string | null
  subProductId: string | null
  subProductName: string | null
  pointId: number
  pointGroupId: number | null
  pointName: string | null
  status: number | null
  standardValue: number | null
  avgFrequencyDtoList: {
    id: number | null
    freq1: number
    freq2: number
    db: number
    density: number
    groupId: number | null
    pointId: number | null
    filePath: string | null
    groupCount: number
  }[]
}

export interface TrendAnalysisResult {
  pointName: string
  pointId: number
  value: number
  list: TrendAnalysisItem[]
}

export interface TrendAnalysisResponse {
  rc: number
  ret: TrendAnalysisResult[]
  err: string | null
}

// 趋势分析接口
export const getTrendAnalysis = (params: TrendAnalysisRequest): Promise<TrendAnalysisResponse> => {
  return request.post('http://122.224.196.178:8003/taicang/hardware/device/sound/monitor/point-rank', params, {
    showLoading: true
  })
}

// 设备编辑信息类型定义
export interface DeviceInfoDto {
  id: number;
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  deviceFactory: string;
  locationDetail: string;
  pressure: number;
  rotationSpeed: number;
  designFlow: number;
  onlineStatus: number;
}

// 设备编辑响应类型
export interface DeviceEditResponse {
  rc: number;
  ret: boolean;
  err: string | null;
}

// 编辑设备信息
export const editDeviceInfo = (deviceId: string, deviceInfo: DeviceInfoDto): Promise<DeviceEditResponse> => {
  return request.post(`/taicang/hardware/device/info/vibration/edit`, {
    deviceId,
    deviceInfo
  }, {
    showLoading: true
  })
}

// 温度趋势数据响应类型（接口返回 dateTime + temperature）
export interface TemperatureTrendItem {
  dateTime: string; // 如 "2026-02-04 00:55:52"
  temperature: number;
}
export interface TemperatureTrendResponse {
  rc: number;
  ret: TemperatureTrendItem[];
  err: string | null;
}

// 获取温度趋势数据（请求参数：point_id, start_time, end_time）
export const getTemperatureTrend = (params: {
  point_id: string;
  start_time: string;
  end_time: string;
}): Promise<TemperatureTrendResponse> => {
  return request.get('/taicang/hardware/device/info/vibration/temperature/trend', {
    params,
    showLoading: false
  })
}

// 振动趋势数据响应类型（接口返回 time + sumRms）
export interface VibrationTrendItem {
  time: string;   // 如 "2026-01-28 20:30:00"
  sumRms: number;  // 烈度 mm/s
}
export interface VibrationTrendResponse {
  rc?: number;
  ret?: VibrationTrendItem[];
  err?: string | null;
}

// 获取振动趋势数据（请求参数：point_id, start_time, end_time）
// 后端可能直接返回数组，或 { rc, ret: 数组 }
export const getVibrationTrend = (params: {
  point_id: string;
  start_time: string;
  end_time: string;
}): Promise<VibrationTrendResponse | VibrationTrendItem[]> => {
  return request.get('/taicang/hardware/device/info/vibration/trend', {
    params,
    showLoading: false
  })
}

// 响度趋势数据响应类型（接口返回 time/dateTime + value，与振动/温度类似）
export interface SoundTrendItem {
  time?: string;
  dateTime?: string;
  value?: number;
  soundLevel?: number; // dB
}
export interface SoundTrendResponse {
  rc?: number;
  ret?: SoundTrendItem[];
  err?: string | null;
}

// 获取响度趋势数据（请求参数：point_id, start_time, end_time）
export const getSoundTrend = (params: {
  point_id: string;
  start_time: string;
  end_time: string;
}): Promise<SoundTrendResponse | SoundTrendItem[]> => {
  return request.get('/taicang/hardware/device/info/vibration/sound/trend', {
    params,
    showLoading: false
  })
}

// 设备健康度数据响应类型
export interface DeviceHealthResponse {
  rc: number;
  ret: {
    deviceId: string;
    deviceName: string;
    // 声音健康度分數，振动場景可能為 null
    healthScore: number | null;
    type: 'sound' | 'vibration';
    // 按后端约定增加健康等级（A/B/C/D），用于仪表盘区间与颜色映射
    healthGrade?: 'A' | 'B' | 'C' | 'D' | string;
  };
  err: string | null;
}

// 获取设备健康度
export const getDeviceHealth = (params: {
  deviceId: string;
  type: 'sound' | 'vibration';
}): Promise<DeviceHealthResponse> => {
  return request.post('/taicang/hardware/device/info/vibration/health', params, {
    showLoading: false
  })
}