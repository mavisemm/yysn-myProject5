import request from '../request'

const TENANT_ID = '2b410e834b4b4ae49ab8d52f6d49e967'

const overviewParams = { tenantId: TENANT_ID }

// 统计数据接口响应格式
interface StatsResponse {
  rc: number
  ret: number
  err: string | null
}

// 获取健康设备数量
export const getHealthyDeviceCount = (): Promise<StatsResponse> => {
  return request.get('/taicang/hardware/device/overview/health/number', {
    params: overviewParams,
    showLoading: false
  })
}

// 获取报警设备数量
export const getAlertDeviceCount = (): Promise<StatsResponse> => {
  return request.get('/taicang/hardware/device/overview/healthy/number', {
    params: overviewParams,
    showLoading: false
  })
}

// 获取监控设备数量
export const getTotalDeviceCount = (): Promise<StatsResponse> => {
  return request.get('/taicang/hardware/device/overview/totalnumber', {
    params: overviewParams,
    showLoading: false
  })
}

// 获取预警设备数量
export const getWarningDeviceCount = (): Promise<StatsResponse> => {
  return request.get('/taicang/hardware/device/overview/healthy/number', {
    params: overviewParams,
    showLoading: false
  })
}

// 统一获取所有统计信息
export const getAllStats = async () => {
  try {
    const [healthyCount, alertCount, totalCount, warningCount] = await Promise.all([
      getHealthyDeviceCount(),
      getAlertDeviceCount(),
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
      totalPointCount: warningCount.ret  // 预警设备数
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    throw error
  }
}