import request from '../request'
import { getTenantId } from '../tenant'

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

export const getHardwareDeviceList = (params?: HardwareDeviceQueryParams): Promise<HardwareDeviceListResponse> => {
  return request.get('/hardware/device/list', {
    params,
    showLoading: true
  })
}

export const getHardwareDeviceDetail = (deviceId: string): Promise<HardwareDeviceDetailResponse> => {
  return request.get(`/hardware/device/detail/${deviceId}`, {
    showLoading: true
  })
}

export const createHardwareDevice = (data: Omit<HardwareDevice, 'id' | 'lastOnlineTime' | 'lastOfflineTime'>): Promise<any> => {
  return request.post('/hardware/device/create', data, {
    showLoading: true
  })
}

export const updateHardwareDevice = (deviceId: string, data: Partial<HardwareDevice>): Promise<any> => {
  return request.put(`/hardware/device/update/${deviceId}`, data, {
    showLoading: true
  })
}

export const deleteHardwareDevice = (deviceId: string): Promise<any> => {
  return request.delete(`/hardware/device/delete/${deviceId}`, {
    showLoading: true
  })
}

export const getDeviceStatus = (deviceId: string): Promise<DeviceStatusResponse> => {
  return request.get(`/hardware/device/status/${deviceId}`, {
    showLoading: false
  })
}

export const getBatchDeviceStatus = (deviceIds: string[]): Promise<any> => {
  return request.post('/hardware/device/status/batch', {
    deviceIds
  }, {
    showLoading: false
  })
}

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

export const getDeviceStatistics = (): Promise<DeviceStatisticsResponse> => {
  return request.get('/hardware/device/statistics', {
    showLoading: true
  })
}

export const restartDevice = (deviceId: string): Promise<any> => {
  return request.post(`/hardware/device/command/${deviceId}/restart`, {}, {
    showLoading: true
  })
}

export const upgradeDeviceFirmware = (deviceId: string, firmwareVersion: string): Promise<any> => {
  return request.post(`/hardware/device/command/${deviceId}/upgrade`, {
    firmwareVersion
  }, {
    showLoading: true
  })
}

export const configureDevice = (deviceId: string, config: any): Promise<any> => {
  return request.post(`/hardware/device/command/${deviceId}/configure`, config, {
    showLoading: true
  })
}

export const getDeviceHealthReport = (deviceId: string, params?: {
  startTime?: string
  endTime?: string
}): Promise<any> => {
  return request.get(`/hardware/device/health-report/${deviceId}`, {
    params,
    showLoading: true
  })
}

/** Top5 接口；声音与振动共用 URL，但声音场景的 receiverId 可能与振动设备树 /vibration/tree 中点位 id 不一致，前端用 pointName 与树对齐 */
export interface TopDevice {
  equipmentId: string;
  equipmentName: string;
  workshopId: string;
  workshopName: string;
  value: number;
  latestTime: string;
  receiverId?: string;
  pointName?: string;
  receiverName?: string;
  pointId?: string;
}

export interface TopDeviceResponse {
  rc: number;
  ret: TopDevice[];
  err: string | null;
}

export const getTop5Devices = (
  type: 'SOUND' | 'VIBRATION' | 'TEMPERATURE',
  tenantId?: string
): Promise<TopDeviceResponse> => {
  const currentTenantId = tenantId ?? getTenantId()
  return request.get('/taicang/hardware/device/vibration/top5', {
    params: { type, tenantId: currentTenantId },
    showLoading: true
  })
}

export interface DeviceInfoResponse {
  rc: number;
  ret: {
    id: number;
    equipmentId: string;
    equipmentName: string;
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

export const getDeviceInfoByEquipmentId = (equipmentId: string): Promise<DeviceInfoResponse> => {
  return request.get(`/taicang/hardware/device/info/vibration/findByDeviceId`, {
    params: { equipmentId },
    showLoading: true
  })
}

export interface CheckPointItem {
  receiverId: string
  receiverName?: string
  deviceId?: string
  pointName: string
  warningTime: string | null
  warningType: string
  warningValue: number
  isAlarm: number
}
export interface SelectCheckPointInResponse {
  rc: number
  ret: CheckPointItem[] | {
    items?: CheckPointItem[]
    records?: CheckPointItem[]
    list?: CheckPointItem[]
    total?: number
    rowCount?: number
  }
  err: string | null
}

export const getSelectCheckPointIn = (
  equipmentId: string,
  pageSize: 10 = 10,
  pageNum: number = 1
): Promise<SelectCheckPointInResponse> => {
  return request.get('/taicang/hardware/device/vibration/selectCheckPointIn', {
    params: { equipmentId, pageSize, pageNum },
    showLoading: false
  }).then((res: SelectCheckPointInResponse) => {
    if (!res) return res

    const rawList = Array.isArray(res.ret)
      ? res.ret
      : (res.ret?.items ?? res.ret?.records ?? res.ret?.list ?? [])
    if (!Array.isArray(rawList)) return res

    const normalizedList = rawList.map((raw: any) => {
      const receiverId = String(raw?.receiverId ?? '')
      const receiverName = String(raw?.receiverName ?? '')

      return {
        ...raw,
        receiverId,
        receiverName,
        pointName: raw?.pointName,
      } as CheckPointItem
    })

    if (Array.isArray(res.ret)) {
      res.ret = normalizedList
    } else {
      res.ret = {
        ...res.ret,
        items: normalizedList
      }
    }
    return res
  })
}

export interface DeviceInfoDto {
  id: number;
  equipmentId: string;
  equipmentName: string;
  deviceModel: string;
  deviceFactory: string;
  locationDetail: string;
  pressure: number;
  rotationSpeed: number;
  designFlow: number;
  onlineStatus: number;
}

export interface DeviceEditResponse {
  rc: number;
  ret: boolean;
  err: string | null;
}

export const editEquipmentInfo = (equipmentId: string, deviceInfo: DeviceInfoDto): Promise<DeviceEditResponse> => {
  return request.post(`/taicang/hardware/device/info/vibration/edit`, {
    equipmentId,
    deviceInfo
  }, {
    showLoading: true
  })
}

export interface TemperatureTrendItem {
  dateTime: string;
  temperature: number;
}
export interface TemperatureTrendResponse {
  rc: number;
  ret: TemperatureTrendItem[];
  err: string | null;
}

export const getTemperatureTrend = (params: {
  receiverId: string;
}): Promise<TemperatureTrendResponse> => {
  return request.get('/taicang/hardware/device/info/vibration/temperature/trend', {
    params,
    showLoading: false
  })
}

export interface TemperatureRealTimeResponse {
  rc: number;
  ret: number | { temperature?: number } | null;
  err: string | null;
}

export const getTemperatureRealTime = (params: {
  receiverId: string;
}): Promise<TemperatureRealTimeResponse> => {
  return request.get('/taicang/hardware/device/info/vibration/temperature/realtime', {
    params,
    showLoading: false
  })
}

export interface VibrationTrendItem {
  time: string;
  sumRms: number;
}
export interface VibrationTrendResponse {
  rc?: number;
  ret?: VibrationTrendItem[];
  err?: string | null;
}

export const getVibrationTrend = (params: {
  receiverId: string;
}): Promise<VibrationTrendResponse | VibrationTrendItem[]> => {
  return request.get('/taicang/hardware/device/info/vibration/trend', {
    params,
    showLoading: false
  })
}

export interface SoundTrendItem {
  time?: string;
  dateTime?: string;
  value?: number;
  soundLevel?: number;
}
export interface SoundTrendResponse {
  rc?: number;
  ret?: SoundTrendItem[];
  err?: string | null;
}

export const getSoundTrend = (params: {
  receiverId: string;
}): Promise<SoundTrendResponse | SoundTrendItem[]> => {
  return request.get('/taicang/hardware/device/info/vibration/sound/trend', {
    params,
    showLoading: false
  })
}

export interface DeviceHealthResponse {
  rc: number;
  ret: {
    equipmentId: string;
    equipmentName: string;
    healthScore: number | null;
    type: 'sound' | 'vibration';
    healthGrade?: 'A' | 'B' | 'C' | 'D' | string;
  };
  err: string | null;
}

export const getEquipmentHealth = (params: {
  equipmentId: string;
  type: 'sound' | 'vibration';
}): Promise<DeviceHealthResponse> => {
  return request.post('/taicang/hardware/device/info/vibration/health', params, {
    showLoading: false
  })
}

export interface PointMessageFilterItem {
  code: string;
  operate: string;
  value: string;
}

export interface PointMessageCheckPointDto {
  id: number;
  pointName: string;
  detectorId: string;
  detectorName: string;
  receiverId: string;
  receiverName: string;
  productId: string;
  productName: string;
  subProductId: string;
  subProductName: string;
  groupId: number;
  tenantId: string;
  [key: string]: unknown;
}

export interface PointMessageGroupItem {
  groupName: string;
  checkPointDtos: PointMessageCheckPointDto[];
}

export interface PointMessageResponse {
  rc: number;
  ret: {
    rowCount: number;
    items: PointMessageGroupItem[];
  };
  err: string | null;
}

export const getPointMessage = (params: {
  filterPropertyMap: PointMessageFilterItem[];
  pageIndex: number;
  pageSize: number;
}): Promise<PointMessageResponse> => {
  return request.post('/taicang/hardware/device/check-point/find/point/message', params, { showLoading: false })
}