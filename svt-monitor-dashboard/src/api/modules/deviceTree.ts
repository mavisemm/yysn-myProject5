import request from '../request'
import { getTenantId } from '../tenant'

export interface DeviceTreeNode {
  id: string
  name: string
  type: 'factory' | 'workshop' | 'device' | 'point'
  status: 'normal' | 'warning' | 'alarm'
  deviceCount?: number
  pointCount?: number
  onlineCount?: number
  alarmCount?: number
  deviceId?: string
  workshopName?: string
  equipmentId?: string
  equipmentName?: string
  receiverId?: string
  warningTime?: string
  warningType?: string
  warningValue?: number | string
  children?: DeviceTreeNode[]
}

export interface DeviceTreeResponse {
  rc: number
  ret: FactoryData[]
  err: string | null
}

export interface FactoryData {
  factoryId: string
  factoryName: string
  children: WorkshopData[]
}

export interface WorkshopData {
  workshopId: string
  workshopName: string
  children: EquipmentData[]
}

export interface EquipmentData {
  equipmentId: string
  equipmentName: string
  customerDeviceId?: string
  children: PointData[]
}

export interface PointData {
  receiverName?: string
  pointName: string
  receiverId?: string
  deviceId?: string
  warningTime?: string
  warningType?: string
  warningValue?: number | string
}

export const getDeviceTreeData = async (): Promise<DeviceTreeResponse> => {
  try {
    return await request.get<DeviceTreeResponse>('/taicang/hardware/device/vibration/tree', {
      params: { tenantId: getTenantId() },
    })
  } catch (error: any) {
    return { rc: 1, ret: [], err: error?.message || '接口请求失败' }
  }
}

/** 从点位展示名解析序号（如「1号」「听筒2」→ 1、2），用于设备树排序 */
const parsePointOrderNum = (point: PointData): number | null => {
  const label = point.receiverName || point.pointName || ''
  if (!label) return null
  const m = label.match(/(\d+)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

const sortPointsByOrderNum = (points: PointData[]): PointData[] =>
  points
    .map((point, index) => ({ point, index }))
    .sort((a, b) => {
      const orderA = parsePointOrderNum(a.point)
      const orderB = parsePointOrderNum(b.point)
      if (orderA != null && orderB != null) return orderA - orderB
      if (orderA != null) return -1
      if (orderB != null) return 1
      return a.index - b.index
    })
    .map(({ point }) => point)

const toPointId = (point: PointData, equipmentId: string, pointIndex: number) =>
  point.receiverId != null && point.receiverId !== ''
    ? String(point.receiverId)
    : `${equipmentId}-${pointIndex}`

const mapPoint = (point: PointData, equipmentId: string, pointIndex: number): DeviceTreeNode => ({
  id: toPointId(point, equipmentId, pointIndex),
  name: point.receiverName || point.pointName,
  type: 'point',
  status: 'normal',
  warningTime: point.warningTime,
  warningType: point.warningType,
  warningValue: point.warningValue,
  deviceId: point.deviceId != null ? String(point.deviceId) : undefined,
  receiverId:
    point.receiverId != null && point.receiverId !== '' ? String(point.receiverId) : undefined,
})

export const transformDeviceTreeData = (responseData: DeviceTreeResponse): DeviceTreeNode[] => {
  if (responseData.rc !== 0 || !responseData.ret) return []

  return responseData.ret.map((factory) => ({
    id: String(factory.factoryId),
    name: factory.factoryName,
    type: 'factory',
    status: 'normal',
    children: factory.children.map((workshop) => ({
      id: `${factory.factoryId}-${workshop.workshopId}`,
      name: workshop.workshopName,
      type: 'workshop',
      status: 'normal',
      children: workshop.children.map((equipment) => ({
        id: String(equipment.equipmentId),
        name: equipment.equipmentName,
        type: 'device',
        status: 'normal',
        workshopName: workshop.workshopName,
        customerDeviceId: equipment.customerDeviceId,
        equipmentId: String(equipment.equipmentId),
        equipmentName: equipment.equipmentName,
        children: sortPointsByOrderNum(equipment.children).map((point, pointIndex) =>
          mapPoint(point, String(equipment.equipmentId), pointIndex),
        ),
      })),
    })),
  }))
}
