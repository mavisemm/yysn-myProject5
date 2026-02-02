import request from '../request'

// 获取预警设备数量
export const getAlertDeviceCount = () => {
  // TODO: 替换为真实接口调用
  // return request.get('/taicang/hardware/device/overview/healthy/number')
  
  // 使用假数据
  return Promise.resolve({
    rc: 0,
    ret: 2,
    err: null
  })
}

// 获取总设备数量
export const getTotalDeviceCount = () => {
  // TODO: 替换为真实接口调用
  // return request.get('/taicang/hardware/device/overview/totalnumber')
  
  // 使用假数据
  return Promise.resolve({
    rc: 0,
    ret: 7,
    err: null
  })
}

// 获取总点位数量
export const getTotalPointCount = () => {
  // TODO: 替换为真实接口调用
  // return request.get('/taicang/hardware/device/overview/monit/point')
  
  // 使用假数据
  return Promise.resolve({
    rc: 0,
    ret: 40,
    err: null
  })
}

// 获取健康设备数量
export const getHealthyDeviceCount = () => {
  // TODO: 替换为真实接口调用
  // return request.get('/taicang/hardware/device/overview/health/number')
  
  // 使用假数据
  return Promise.resolve({
    rc: 0,
    ret: 5,
    err: null
  })
}

// 统一获取所有统计信息
export const getAllStats = async () => {
  try {
    const [alertCount, totalCount, pointCount, healthyCount] = await Promise.all([
      getAlertDeviceCount(),
      getTotalDeviceCount(),
      getTotalPointCount(),
      getHealthyDeviceCount()
    ])
    
    if (
      alertCount.rc !== 0 || 
      totalCount.rc !== 0 || 
      pointCount.rc !== 0 || 
      healthyCount.rc !== 0
    ) {
      throw new Error('获取统计数据失败')
    }
    
    return {
      alertDeviceCount: alertCount.ret,
      totalDeviceCount: totalCount.ret,
      totalPointCount: pointCount.ret,
      healthyDeviceCount: healthyCount.ret
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    throw error
  }
}