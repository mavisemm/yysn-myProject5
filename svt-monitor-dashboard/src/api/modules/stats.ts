import request from '../request'

// 统计相关 API 接口

// 统计数据类型定义
export interface DeviceCountStats {
  total: number
  online: number
  offline: number
  maintenance: number
  fault: number
}

export interface HealthStats {
  excellent: number
  good: number
  fair: number
  poor: number
  healthScore: number
}

export interface AlarmStats {
  critical: number
  high: number
  medium: number
  low: number
  total: number
}

export interface EventStats {
  new: number
  acknowledged: number
  processing: number
  resolved: number
  closed: number
  total: number
}

export interface TimeSeriesData {
  time: string
  value: number
}

export interface DeviceCountStatsResponse {
  code: number
  message: string
  data: DeviceCountStats
}

export interface HealthStatsResponse {
  code: number
  message: string
  data: HealthStats
}

export interface AlarmStatsResponse {
  code: number
  message: string
  data: AlarmStats
}

export interface EventStatsResponse {
  code: number
  message: string
  data: EventStats
}

export interface TimeSeriesStatsResponse {
  code: number
  message: string
  data: TimeSeriesData[]
}

export interface ComprehensiveStats {
  deviceCounts: DeviceCountStats
  healthStatus: HealthStats
  alarms: AlarmStats
  events: EventStats
  dailyTrends: TimeSeriesData[]
  monthlyTrends: TimeSeriesData[]
}

export interface ComprehensiveStatsResponse {
  code: number
  message: string
  data: ComprehensiveStats
}

// 获取设备数量统计
export const getDeviceCountStats = (): Promise<DeviceCountStatsResponse> => {
  return request.get('/stats/device-counts', {
    showLoading: true
  })
}

// 获取设备健康度统计
export const getHealthStats = (): Promise<HealthStatsResponse> => {
  return request.get('/stats/health-status', {
    showLoading: true
  })
}

// 获取告警统计
export const getAlarmStats = (): Promise<AlarmStatsResponse> => {
  return request.get('/stats/alarms', {
    showLoading: true
  })
}

// 获取事件统计
export const getEventStats = (): Promise<EventStatsResponse> => {
  return request.get('/stats/events', {
    showLoading: true
  })
}

// 获取设备数量趋势统计
export const getDeviceTrendStats = (params?: {
  startTime?: string
  endTime?: string
  interval?: string
}): Promise<TimeSeriesStatsResponse> => {
  return request.get('/stats/device-trends', {
    params,
    showLoading: true
  })
}

// 获取告警趋势统计
export const getAlarmTrendStats = (params?: {
  startTime?: string
  endTime?: string
  interval?: string
}): Promise<TimeSeriesStatsResponse> => {
  return request.get('/stats/alarm-trends', {
    params,
    showLoading: true
  })
}

// 获取综合统计信息
export const getComprehensiveStats = (params?: {
  startTime?: string
  endTime?: string
}): Promise<ComprehensiveStatsResponse> => {
  return request.get('/stats/comprehensive', {
    params,
    showLoading: true
  })
}

// 获取工厂维度统计
export const getFactoryStats = (params?: {
  factoryId?: string
}): Promise<any> => {
  return request.get('/stats/factory', {
    params,
    showLoading: true
  })
}

// 获取车间维度统计
export const getWorkshopStats = (params?: {
  workshopId?: string
}): Promise<any> => {
  return request.get('/stats/workshop', {
    params,
    showLoading: true
  })
}

// 获取设备类型统计
export const getDeviceTypeStats = (): Promise<any> => {
  return request.get('/stats/device-type', {
    showLoading: true
  })
}

// 获取设备故障率统计
export const getDeviceFailureRate = (params?: {
  startTime?: string
  endTime?: string
}): Promise<any> => {
  return request.get('/stats/failure-rate', {
    params,
    showLoading: true
  })
}

// 导出统计报表
export const exportStatsReport = (params?: {
  reportType?: string
  startTime?: string
  endTime?: string
  format?: 'xlsx' | 'pdf' | 'csv'
}): Promise<any> => {
  return request.get('/stats/export', {
    params,
    showLoading: true,
    responseType: 'blob'
  })
}