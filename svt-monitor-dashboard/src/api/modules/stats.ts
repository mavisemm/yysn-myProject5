import request from '../request'
import { withTenantQuery } from '../helpers'
import { getTenantId } from '../tenant'

interface StatsResponse {
  rc: number
  ret: number
  err: string | null
}

const getOverviewNumber = (path: string, extraParams?: Record<string, unknown>) => {
  const tenantId = getTenantId()
  return request.get<StatsResponse>(path, {
    params: { tenantId, ...extraParams },
    showLoading: false,
  })
}

export const getHealthyDeviceCount = () =>
  getOverviewNumber('/taicang/hardware/device/overview/health/number')

export const getAffirmDeviceCount = () =>
  request.get<StatsResponse>('/taicang/hardware/device/overview/affirm/number', {
    params: withTenantQuery(),
    showLoading: false,
  })

export const getTotalDeviceCount = () =>
  getOverviewNumber('/taicang/hardware/device/overview/totalnumber')

export const getWarningDeviceCount = () =>
  getOverviewNumber('/taicang/hardware/device/overview/healthy/number')

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

export const getDeviceWaringDetail = (): Promise<{
  rc: number
  ret: DeviceWaringDetailRet
  err: string | null
}> =>
  request.get('/taicang/hardware/device/overview/device/waring/detail', {
    params: withTenantQuery(),
    showLoading: true,
  })

export const getSoundDeviceWaringDetail = (): Promise<{
  rc: number
  ret: DeviceWaringDetailItem[]
  err: string | null
}> =>
  request.get('/taicang/hardware/device/sound/device/waring/detail/sound', {
    params: withTenantQuery(),
    showLoading: true,
  })

export const getAllStats = async () => {
  const [healthyCount, alertCount, totalCount, warningCount] = await Promise.all([
    getHealthyDeviceCount(),
    getAffirmDeviceCount(),
    getTotalDeviceCount(),
    getWarningDeviceCount(),
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
    totalPointCount: warningCount.ret,
  }
}
