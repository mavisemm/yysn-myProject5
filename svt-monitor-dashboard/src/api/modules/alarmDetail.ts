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

export const apiGetEventById = (params: { id: string | number }): Promise<ApiRcRet<AlarmEventDetail>> =>
  request.get('/taicang/event/findById', {
    params: { id: params.id },
    showLoading: true,
  })

export const apiGetDevicePosition = (params: { objectId: string | number }): Promise<ApiRcRet<any>> =>
  request.get('/taicang/hardware/factory/layout/findByObjectId', {
    params: { objectId: params.objectId },
    showLoading: false,
  })

export const apiGetAbnormalHistory = (payload: any): Promise<ApiRcRet<{ items: any[] }>> =>
  request.post('/taicang/hardware/device/sound/scene/find', payload, { showLoading: true })

export const apiConfirmSoundNot = (payload: {
  type: string | number
  name: string
  id: string | number
  tenantId: string
}): Promise<any> =>
  request.post('/taicang/event/confirm/soundNot', payload, { showLoading: true })

export const apiConfirmSoundYes = (payload: {
  name?: string
  id: string | number
  exceptionId?: string | number
  tenantId: string
}): Promise<any> =>
  request.post('/taicang/event/confirm/soundYes', payload, { showLoading: true })
