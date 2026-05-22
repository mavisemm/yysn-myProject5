import request from '../request'
import { getTenantId } from '../tenant'
import { DEFAULT_CATEGORY_NAME } from '@/components/business/device-detail/deviceInfoMeta'

export interface VibrationApiResponse<T = unknown> {
  rc: number
  ret: T
  err: string | null
}

/** 后端类别 DTO（接口字段 id 即 typeId） */
interface VibrationDeviceTypeDto {
  id: number
  tenantId: string
  typeName: string
}

/** 后端扩展信息 DTO（接口字段 id 即 typeInfoId） */
interface VibrationDeviceExtendInfoDto {
  id: number
  equipmentId: string
  itemKey: string
  itemValue: string
  typeId: number
}

export interface DeviceInfoCategory {
  typeId: number
  tenantId: string
  typeName: string
  isDefault: boolean
}

export interface DeviceExtendInfoItem {
  typeInfoId: number
  equipmentId: string
  itemKey: string
  itemValue: string
  typeId: number
}

const mapCategoryFromDto = (dto: VibrationDeviceTypeDto): DeviceInfoCategory => ({
  typeId: dto.id,
  tenantId: dto.tenantId,
  typeName: dto.typeName,
  isDefault: false,
})

const mapExtendInfoFromDto = (dto: VibrationDeviceExtendInfoDto): DeviceExtendInfoItem => ({
  typeInfoId: dto.id,
  equipmentId: dto.equipmentId,
  itemKey: dto.itemKey,
  itemValue: dto.itemValue,
  typeId: dto.typeId,
})

export const listVibrationDeviceTypes = (): Promise<VibrationApiResponse<DeviceInfoCategory[]>> =>
  request
    .get<VibrationApiResponse<VibrationDeviceTypeDto[]>>('/device/vibrationDeviceType/list', {
      params: { tenantId: getTenantId() },
      showLoading: false,
    })
    .then((res) => ({
      ...res,
      ret: Array.isArray(res.ret)
        ? res.ret
            .filter((dto) => dto.typeName !== DEFAULT_CATEGORY_NAME)
            .map(mapCategoryFromDto)
        : [],
    }))

export const createVibrationDeviceType = (typeName: string): Promise<VibrationApiResponse<number>> =>
  request.post('/device/vibrationDeviceType/create', {
    tenantId: getTenantId(),
    typeName,
  })

/** 仅路径参数 id，不传请求体 */
export const deleteVibrationDeviceType = (typeId: number): Promise<VibrationApiResponse<boolean>> => {
  const id = Number(typeId)
  if (!Number.isFinite(id)) {
    return Promise.reject(new Error('invalid typeId'))
  }
  return request.delete(`/device/vibrationDeviceType/del/${id}`, { showLoading: false })
}

export const updateVibrationDeviceType = (
  typeId: number,
  typeName: string,
): Promise<VibrationApiResponse<boolean>> =>
  request.post('/device/vibrationDeviceType/update', {
    id: typeId,
    typeName,
  })

export const listVibrationDeviceExtendInfo = (
  equipmentId: string,
): Promise<VibrationApiResponse<DeviceExtendInfoItem[]>> =>
  request
    .get<VibrationApiResponse<VibrationDeviceExtendInfoDto[]>>(
      '/device/vibrationDeviceExtendInfo/list',
      { params: { equipmentId }, showLoading: false },
    )
    .then((res) => ({
      ...res,
      ret: Array.isArray(res.ret) ? res.ret.map(mapExtendInfoFromDto) : [],
    }))

export const createVibrationDeviceExtendInfo = (payload: {
  equipmentId: string
  itemKey: string
  itemValue: string
  typeId: number
}): Promise<VibrationApiResponse<boolean | number>> =>
  request.post('/device/vibrationDeviceExtendInfo/create', payload)

export const deleteVibrationDeviceExtendInfoBatch = (
  typeInfoIds: number[],
): Promise<VibrationApiResponse<boolean>> =>
  request.delete('/device/vibrationDeviceExtendInfo/delBatch', {
    data: { ids: typeInfoIds },
  })

export type DeviceExtendInfoUpdatePayload = {
  typeInfoId: number
  itemKey: string
  itemValue: string
  typeId: number
}

export const updateVibrationDeviceExtendInfoBatch = (
  items: DeviceExtendInfoUpdatePayload[],
): Promise<VibrationApiResponse<boolean>> =>
  request.post(
    '/device/vibrationDeviceExtendInfo/updateBatch',
    items.map((item) => ({
      id: item.typeInfoId,
      itemKey: item.itemKey,
      itemValue: item.itemValue,
      typeId: item.typeId,
    })),
  )
