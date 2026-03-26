import request from '../request'

export interface AlarmEventDetail {
  id: string
  eventId?: string
  eventTypeCode?: string
  statusCode?: string
  time?: number | string
  equipmentId?: string
  equipmentName?: string
  pointName?: string
  receiverName?: string
  receiverId?: string
  dataJson?: any
  eventType?: { name?: string }
  statusText?: string
  [k: string]: any
}

export interface ApiRcRet<T> {
  rc: number
  ret?: T
  err?: string | null
}

/**
 * 获取预警详情（对应 src0: eventService.getEventById -> /taicang/event/findById）
 */
export const apiGetEventById = async (params: { id: string | number }): Promise<ApiRcRet<AlarmEventDetail>> => {
  return request.get('/taicang/event/findById', {
    params: {
      id: params.id
    },
    showLoading: true
  })
}

/**
 * 获取设备/点位在大屏中的布局位置（对应 src0: hardwareService.getDevicePosition -> /taicang/hardware/factory/layout/findByObjectId）
 */
export const apiGetDevicePosition = async (params: { objectId: string | number }): Promise<ApiRcRet<any>> => {
  return request.get('/taicang/hardware/factory/layout/findByObjectId', {
    params: {
      objectId: params.objectId
    },
    showLoading: false
  })
}

/**
 * 历史异常库（对应 src0: hardwareService.getAbnormalHistory -> /taicang/hardware/device/sound/scene/find）
 */
export const apiGetAbnormalHistory = async (payload: any): Promise<ApiRcRet<{ items: any[] }>> => {
  return request.post('/taicang/hardware/device/sound/scene/find', payload, {
    showLoading: true
  })
}

/**
 * 声音：确认误报（对应 src0: eventService.soundNot -> /taicang/event/confirm/soundNot）
 */
export const apiConfirmSoundNot = async (payload: {
  type: string | number
  name: string
  id: string | number
  tenantId: string
}): Promise<any> => {
  return request.post('/taicang/event/confirm/soundNot', payload, {
    showLoading: true
  })
}

/**
 * 声音：确认预警（异常预警：对应 src0: eventService.soundYes -> /taicang/event/confirm/soundYes）
 */
export const apiConfirmSoundYes = async (payload: {
  name?: string
  id: string | number
  exceptionId?: string | number
  tenantId: string
}): Promise<any> => {
  return request.post('/taicang/event/confirm/soundYes', payload, {
    showLoading: true
  })
}

