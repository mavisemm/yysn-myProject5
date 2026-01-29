import request from '../request'

// 事件管理相关 API 接口

// 事件类型定义
export interface Event {
  id: string
  eventId: string
  title: string
  description: string
  level: 'critical' | 'high' | 'medium' | 'low'
  type: string
  deviceId: string
  deviceName: string
  workshopId: string
  workshopName: string
  factoryId: string
  factoryName: string
  status: 'new' | 'acknowledged' | 'processing' | 'resolved' | 'closed'
  priority: number
  assignee?: string
  reporter: string
  createTime: string
  updateTime: string
  resolveTime?: string
  duration?: number
  tags: string[]
}

export interface EventQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  level?: string
  type?: string
  deviceId?: string
  startTime?: string
  endTime?: string
  orderBy?: string
  orderDir?: 'asc' | 'desc'
}

export interface EventListResponse {
  code: number
  message: string
  data: {
    list: Event[]
    total: number
    page: number
    pageSize: number
  }
}

export interface EventDetailResponse {
  code: number
  message: string
  data: Event
}

export interface EventOperationResponse {
  code: number
  message: string
  data: boolean
}

export interface EventStatistics {
  total: number
  new: number
  processing: number
  resolved: number
  critical: number
  high: number
  medium: number
  low: number
}

export interface EventStatisticsResponse {
  code: number
  message: string
  data: EventStatistics
}

// 查询事件列表
export const queryEvents = (params?: EventQueryParams): Promise<EventListResponse> => {
  return request.get('/event/list', {
    params,
    showLoading: true
  })
}

// 获取事件详情
export const getEventDetail = (eventId: string): Promise<EventDetailResponse> => {
  return request.get(`/event/detail/${eventId}`, {
    showLoading: true
  })
}

// 创建事件
export const createEvent = (data: Omit<Event, 'id' | 'createTime' | 'updateTime'>): Promise<EventOperationResponse> => {
  return request.post('/event/create', data, {
    showLoading: true
  })
}

// 更新事件
export const updateEvent = (eventId: string, data: Partial<Event>): Promise<EventOperationResponse> => {
  return request.put(`/event/update/${eventId}`, data, {
    showLoading: true
  })
}

// 删除事件
export const deleteEvent = (eventId: string): Promise<EventOperationResponse> => {
  return request.delete(`/event/delete/${eventId}`, {
    showLoading: true
  })
}

// 批量操作事件
export const batchOperateEvents = (eventIds: string[], operation: string, data?: any): Promise<EventOperationResponse> => {
  return request.post('/event/batch-operate', {
    eventIds,
    operation,
    data
  }, {
    showLoading: true
  })
}

// 事件预警处理
export const handleEventAlert = (eventId: string, action: string, remark?: string): Promise<EventOperationResponse> => {
  return request.post(`/event/alert/${eventId}`, {
    action,
    remark
  }, {
    showLoading: true
  })
}

// 分配事件给处理人
export const assignEvent = (eventId: string, assignee: string): Promise<EventOperationResponse> => {
  return request.post(`/event/assign/${eventId}`, {
    assignee
  }, {
    showLoading: true
  })
}

// 获取事件统计数据
export const getEventStatistics = (params?: {
  startTime?: string
  endTime?: string
}): Promise<EventStatisticsResponse> => {
  return request.get('/event/statistics', {
    params,
    showLoading: true
  })
}

// 获取事件趋势数据
export const getEventTrend = (params?: {
  startTime?: string
  endTime?: string
  interval?: string
}): Promise<any> => {
  return request.get('/event/trend', {
    params,
    showLoading: true
  })
}