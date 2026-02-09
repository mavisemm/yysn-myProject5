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

// 获取趋势预警设备量
export const getWarningDeviceCount = (): Promise<StatsResponse> => {
  return request.get('/taicang/hardware/device/overview/healthy/number', {
    params: overviewParams,
    showLoading: false
  })
}

// 趋势预警设备列表项
export interface TrendWarningDeviceItem {
  id: string
  deviceName: string
  workshopName: string
}

const modalParams = { userId: '', tenantId: TENANT_ID }

// 获取趋势预警设备列表（点击「趋势预警设备」弹窗用）
export const getTrendWarningDeviceList = (): Promise<{ rc: number; ret: TrendWarningDeviceItem[]; err: string | null }> => {
  return request.get('/taicang/hardware/device/overview/device/waring/detail', {
    params: { ...modalParams, _t: Date.now() },
    showLoading: true
  })
}

// 打开弹窗时触发的接口：测点信息（POST，body 传参）
export const getCheckPointPointMessage = (): Promise<any> => {
  return request.post('/taicang/hardware/device/check-point/find/point/message', {
    filterPropertyMap: [
      { code: 'tenantId', operate: 'EQ', value: TENANT_ID }
    ],
    pageIndex: 0,
    pageSize: 1000
  }, {
    showLoading: false
  })
}

// 打开弹窗时触发的接口：设备名称下拉
export const getDeviceNameDropdownList = (): Promise<any> => {
  return request.get('/taicang/hardware/device/name/getDropdownList', {
    params: { ...modalParams, _t: Date.now() },
    showLoading: false
  })
}

// 打开弹窗时触发的接口：事件类型下拉
export const getEventTypeDropdownList = (): Promise<any> => {
  return request.get('/taicang/hardware/eventType/getDropdownList', {
    params: { ...modalParams, _t: Date.now() },
    showLoading: false
  })
}

// 打开弹窗时触发的接口：事件查询（POST，body 传参）
export const getEventFind = (): Promise<any> => {
  return request.post('/taicang/event/find', {
    filterPropertyMap: [
      { code: 'statusCode', operate: 'EQ', value: 'VALID' },
      { code: 'tenantId', operate: 'EQ', value: TENANT_ID }
    ],
    pageIndex: 0,
    pageSize: 30,
    sortValueMap: [{ code: 'time', sort: 'desc' }]
  }, {
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
      totalPointCount: warningCount.ret  // 趋势预警设备
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    throw error
  }
}