import request from '../request'

import { getTenantId } from '../tenant'

interface StatsResponse {
  rc: number
  ret: number
  err: string | null
}

export const getHealthyDeviceCount = (): Promise<StatsResponse> => {
  const tenantId = getTenantId()
  return request.get('/taicang/hardware/device/overview/health/number', {
    params: { tenantId },
    showLoading: false
  })
}

export const getAffirmDeviceCount = (): Promise<StatsResponse> => {
  return request.get('/taicang/hardware/device/overview/affirm/number', {
    params: { userId: '', tenantId: getTenantId(), _t: Date.now() },
    showLoading: false
  })
}

export const getTotalDeviceCount = (): Promise<StatsResponse> => {
  const tenantId = getTenantId()
  return request.get('/taicang/hardware/device/overview/totalnumber', {
    params: { tenantId },
    showLoading: false
  })
}

export const getWarningDeviceCount = (): Promise<StatsResponse> => {
  const tenantId = getTenantId()
  return request.get('/taicang/hardware/device/overview/healthy/number', {
    params: { tenantId },
    showLoading: false
  })
}

export interface TrendWarningDeviceItem {
  id: string
  deviceName: string
  workshopName: string
}

export interface DeviceWaringDetailItem {
  equipmentId: string
  equipmentName: string
  receiverId: string
  pointName: string
  warningSource?: string
  eventTypeCode?: string
  eventTypeName?: string
  metricLabel?: string
  metricValue?: number
  triggerValue?: number
  alarmTime?: number
}

export interface DeviceWaringDetailRet {
  sound: DeviceWaringDetailItem[]
  vibration: DeviceWaringDetailItem[]
}

export const getDeviceWaringDetail = (): Promise<{ rc: number; ret: DeviceWaringDetailRet; err: string | null }> => {
  const tenantId = getTenantId()
  return request.get('/taicang/hardware/device/overview/device/waring/detail', {
    params: { userId: '', tenantId, _t: Date.now() },
    showLoading: true
  })
}

export const getCheckPointPointMessage = (): Promise<any> => {
  const tenantId = getTenantId()
  return request.post('/taicang/hardware/device/check-point/find/point/message', {
    filterPropertyMap: [
      { code: 'tenantId', operate: 'EQ', value: tenantId }
    ],
    pageIndex: 0,
    pageSize: 1000
  }, { showLoading: false })
}

export const getDeviceNameDropdownList = (): Promise<any> => {
  const tenantId = getTenantId()
  return request.get('/taicang/hardware/device/name/getDropdownList', {
    params: { userId: '', tenantId, _t: Date.now() },
    showLoading: false
  })
}

export const getEventTypeDropdownList = (): Promise<any> => {
  const tenantId = getTenantId()
  return request.get('/taicang/hardware/eventType/getDropdownList', {
    params: { userId: '', tenantId, _t: Date.now() },
    showLoading: false
  })
}

export const getEventFind = (): Promise<any> => {
  const tenantId = getTenantId()
  return request.post('http://122.224.196.178:8003/taicang/event/find', {
    filterPropertyMap: [
      { code: 'statusCode', operate: 'EQ', value: 'VALID' },
      { code: 'tenantId', operate: 'EQ', value: tenantId }
    ],
    pageIndex: 0,
    pageSize: 30,
    sortValueMap: [{ code: 'time', sort: 'desc' }]
  }, {
    showLoading: false
  })
}

export const getAllStats = async () => {
  try {
    const [healthyCount, alertCount, totalCount, warningCount] = await Promise.all([
      getHealthyDeviceCount(),
      getAffirmDeviceCount(),
      getTotalDeviceCount(),
      getWarningDeviceCount()
    ])
    
    if (
      healthyCount.rc !== 0 ||
      alertCount.rc !== 0 ||
      totalCount.rc !== 0 ||
      warningCount.rc !== 0
    ) {
      throw new Error('获取统计数据失败')
    }
    
    return {
      healthyDeviceCount: healthyCount.ret,
      alertDeviceCount: alertCount.ret,
      totalDeviceCount: totalCount.ret,
      totalPointCount: warningCount.ret
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    throw error
  }
}