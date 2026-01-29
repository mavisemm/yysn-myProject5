import request from '../request'

// 仪表盘相关 API 接口

// 仪表盘统计信息类型定义
export interface DashboardStats {
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  alarmDevices: number
  warningDevices: number
  normalDevices: number
  totalPoints: number
  alarmPoints: number
  todayEvents: number
  weekEvents: number
  monthEvents: number
  healthScore: number
}

export interface DashboardStatsResponse {
  code: number
  message: string
  data: DashboardStats
}

export interface AlarmOverview {
  level: string // 'critical' | 'high' | 'medium' | 'low'
  count: number
  percentage: number
}

export interface AlarmOverviewResponse {
  code: number
  message: string
  data: AlarmOverview[]
}

export interface DeviceHealthTrend {
  date: string
  healthScore: number
  alarmCount: number
}

export interface DeviceHealthTrendResponse {
  code: number
  message: string
  data: DeviceHealthTrend[]
}

export interface RecentEvents {
  id: string
  title: string
  level: string
  deviceName: string
  time: string
  status: 'new' | 'processing' | 'resolved'
}

export interface RecentEventsResponse {
  code: number
  message: string
  data: RecentEvents[]
}

// 获取仪表盘统计数据
export const getDashboardStats = (): Promise<DashboardStatsResponse> => {
  return request.get('/dashboard/stats', {
    showLoading: true
  })
}

// 获取告警概览数据
export const getAlarmOverview = (): Promise<AlarmOverviewResponse> => {
  return request.get('/dashboard/alarm-overview', {
    showLoading: true
  })
}

// 获取设备健康趋势数据
export const getDeviceHealthTrend = (params?: {
  startTime?: string
  endTime?: string
  interval?: string
}): Promise<DeviceHealthTrendResponse> => {
  return request.get('/dashboard/health-trend', {
    params,
    showLoading: true
  })
}

// 获取最近事件列表
export const getRecentEvents = (params?: {
  page?: number
  pageSize?: number
  status?: string
}): Promise<RecentEventsResponse> => {
  return request.get('/dashboard/recent-events', {
    params,
    showLoading: true
  })
}

// 获取仪表盘配置
export const getDashboardConfig = (): Promise<any> => {
  return request.get('/dashboard/config', {
    showLoading: false
  })
}

// 更新仪表盘配置
export const updateDashboardConfig = (config: any): Promise<any> => {
  return request.post('/dashboard/config', config, {
    showLoading: false
  })
}

// 获取实时监控数据
export const getRealTimeMonitorData = (): Promise<any> => {
  return request.get('/dashboard/realtime', {
    showLoading: true
  })
}