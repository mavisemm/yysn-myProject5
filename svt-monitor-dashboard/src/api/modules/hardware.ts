import request from '../request'
import { getTenantId } from '../tenant'

/** Top5 接口；声音与振动共用 URL，但声音场景的 receiverId 可能与振动设备树 /vibration/tree 中点位 id 不一致，前端用 pointName 与树对齐 */
export interface TopDevice {
  equipmentId: string
  equipmentName: string
  workshopId: string
  workshopName: string
  value: number
  latestTime: string
  receiverId?: string
  pointName?: string
  receiverName?: string
  pointId?: string
}

export interface TopDeviceResponse {
  rc: number
  ret: TopDevice[]
  err: string | null
}

export const getTop5Devices = (
  type: 'SOUND' | 'VIBRATION' | 'TEMPERATURE',
  tenantId?: string,
): Promise<TopDeviceResponse> =>
  request.get('/taicang/hardware/device/vibration/top5', {
    params: { type, tenantId: tenantId ?? getTenantId() },
    showLoading: true,
  })

export interface DeviceInfoResponse {
  rc: number
  ret: {
    id: number
    equipmentId: string
    equipmentName: string
    deviceModel: string
    deviceFactory: string
    locationDetail: string
    pressure: number
    rotationSpeed: number
    designFlow: number
    onlineStatus: number
    createdTime: string | null
    updatedTime: string | null
  }
  err: string | null
}

export const getDeviceInfoByEquipmentId = (equipmentId: string): Promise<DeviceInfoResponse> =>
  request.get('/taicang/hardware/device/info/vibration/findByDeviceId', {
    params: { equipmentId },
    showLoading: true,
  })

export interface CheckPointItem {
  receiverId: string
  receiverName?: string
  deviceId?: string
  pointName: string
  warningTime: string | null
  warningType: string
  warningValue: number
  isAlarm: number
}

export interface SelectCheckPointInResponse {
  rc: number
  ret:
    | CheckPointItem[]
    | {
        items?: CheckPointItem[]
        records?: CheckPointItem[]
        list?: CheckPointItem[]
        total?: number
        rowCount?: number
      }
  err: string | null
}

const normalizeCheckPointList = (ret: SelectCheckPointInResponse['ret']): CheckPointItem[] => {
  const rawList = Array.isArray(ret) ? ret : (ret?.items ?? ret?.records ?? ret?.list ?? [])
  if (!Array.isArray(rawList)) return []
  return rawList.map((raw: any) => ({
    ...raw,
    receiverId: String(raw?.receiverId ?? ''),
    receiverName: String(raw?.receiverName ?? ''),
    pointName: raw?.pointName,
  }))
}

export const getSelectCheckPointIn = (
  equipmentId: string,
  pageSize = 10,
  pageNum = 1,
): Promise<SelectCheckPointInResponse> =>
  request
    .get<SelectCheckPointInResponse>('/taicang/hardware/device/vibration/selectCheckPointIn', {
      params: { equipmentId, pageSize, pageNum },
      showLoading: false,
    })
    .then((res) => {
      if (!res?.ret) return res
      const normalizedList = normalizeCheckPointList(res.ret)
      res.ret = Array.isArray(res.ret) ? normalizedList : { ...res.ret, items: normalizedList }
      return res
    })

export interface DeviceInfoDto {
  id: number
  equipmentId: string
  equipmentName: string
  deviceModel: string
  deviceFactory: string
  locationDetail: string
  pressure: number
  rotationSpeed: number
  designFlow: number
  onlineStatus: number
}

export interface DeviceEditResponse {
  rc: number
  ret: boolean
  err: string | null
}

export const editEquipmentInfo = (
  equipmentId: string,
  deviceInfo: DeviceInfoDto,
): Promise<DeviceEditResponse> =>
  request.post(
    '/taicang/hardware/device/info/vibration/edit',
    { equipmentId, deviceInfo },
    { showLoading: true },
  )

export interface TemperatureTrendItem {
  dateTime: string
  temperature: number
}

export interface TemperatureTrendResponse {
  rc: number
  ret: TemperatureTrendItem[]
  err: string | null
}

export const getTemperatureTrend = (params: { receiverId: string }): Promise<TemperatureTrendResponse> =>
  request.get('/taicang/hardware/device/info/vibration/temperature/trend', {
    params,
    showLoading: false,
  })

export interface TemperatureRealTimeResponse {
  rc: number
  ret: number | { temperature?: number } | null
  err: string | null
}

export const getTemperatureRealTime = (params: {
  receiverId: string
}): Promise<TemperatureRealTimeResponse> =>
  request.get('/taicang/hardware/device/info/vibration/temperature/realtime', {
    params,
    showLoading: false,
  })

export interface VibrationTrendItem {
  time: string
  sumRms: number
}

export interface VibrationTrendResponse {
  rc?: number
  ret?: VibrationTrendItem[]
  err?: string | null
}

export const getVibrationTrend = (params: {
  receiverId: string
}): Promise<VibrationTrendResponse | VibrationTrendItem[]> =>
  request.get('/taicang/hardware/device/info/vibration/trend', {
    params,
    showLoading: false,
  })

export interface SoundTrendItem {
  time?: string
  dateTime?: string
  value?: number
  soundLevel?: number
}

export interface SoundTrendResponse {
  rc?: number
  ret?: SoundTrendItem[]
  err?: string | null
}

export const getSoundTrend = (params: {
  receiverId: string
}): Promise<SoundTrendResponse | SoundTrendItem[]> =>
  request.get('/taicang/hardware/device/info/vibration/sound/trend', {
    params,
    showLoading: false,
  })

export interface DeviceHealthResponse {
  rc: number
  ret: {
    equipmentId: string
    equipmentName: string
    healthScore: number | null
    type: 'sound' | 'vibration'
    healthGrade?: 'A' | 'B' | 'C' | 'D' | string
  }
  err: string | null
}

export const getEquipmentHealth = (params: {
  equipmentId: string
  type: 'sound' | 'vibration'
}): Promise<DeviceHealthResponse> =>
  request.post('/taicang/hardware/device/info/vibration/health', params, {
    showLoading: false,
  })

export interface PointMessageFilterItem {
  code: string
  operate: string
  value: string
}

export interface PointMessageCheckPointDto {
  id: number
  pointName: string
  detectorId: string
  detectorName: string
  receiverId: string
  receiverName: string
  productId: string
  productName: string
  subProductId: string
  subProductName: string
  groupId: number
  groupName?: string
  tenantId: string
  [key: string]: unknown
}

export interface PointMessageGroupItem {
  groupName: string
  checkPointDtos: PointMessageCheckPointDto[]
}

export interface PointMessageResponse {
  rc: number
  ret: {
    rowCount: number
    items: PointMessageGroupItem[]
  }
  err: string | null
}

const POINT_MESSAGE_URL = '/taicang/hardware/device/check-point/find/point/message'
const POINT_DETAIL_URL = '/taicang/hardware/device/check-point/find/point/detail'

const isPointMessageIdNullError = (err: unknown) => {
  const msg = String((err as Error)?.message ?? err ?? '')
  return msg.includes('id must not be null') || msg.includes('given id must not be null')
}

/** message 返回分组；detail 返回扁平列表，统一成分组结构供 store 消费 */
const normalizePointMessageResponse = (res: PointMessageResponse): PointMessageResponse => {
  const ret = res.ret
  if (!ret?.items?.length) return res

  const first = ret.items[0] as PointMessageGroupItem | PointMessageCheckPointDto
  if (Array.isArray((first as PointMessageGroupItem).checkPointDtos)) return res

  const flat = ret.items as unknown as PointMessageCheckPointDto[]
  return {
    ...res,
    ret: {
      rowCount: ret.rowCount ?? flat.length,
      items: [{ groupName: '', checkPointDtos: flat }],
    },
  }
}

export const getPointMessage = async (params: {
  filterPropertyMap: PointMessageFilterItem[]
  pageIndex: number
  pageSize: number
}): Promise<PointMessageResponse> => {
  const reqConfig = { showLoading: false as const }

  try {
    const res = await request.post<PointMessageResponse>(POINT_MESSAGE_URL, params, reqConfig)
    return normalizePointMessageResponse(res)
  } catch (err) {
    if (!isPointMessageIdNullError(err)) throw err
  }

  const detailRes = await request.post<PointMessageResponse>(POINT_DETAIL_URL, params, reqConfig)
  return normalizePointMessageResponse(detailRes)
}
