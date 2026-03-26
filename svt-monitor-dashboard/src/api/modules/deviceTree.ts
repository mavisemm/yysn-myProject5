import request from '../request';

// 定义设备树相关的类型
export interface DeviceTreeNode {
  id: string;
  name: string;
  type: 'factory' | 'workshop' | 'device' | 'point';
  status: 'normal' | 'warning' | 'alarm';
  deviceCount?: number;
  pointCount?: number;
  onlineCount?: number;
  alarmCount?: number;
  // 仅 point 节点使用：点位级 deviceId（振动接口入参）
  deviceId?: string;
  workshopName?: string;
  // 设备树设备节点：equipmentId
  equipmentId?: string;
  equipmentName?: string;
  // 点位节点：receiverId
  receiverId?: string;
  children?: DeviceTreeNode[];
}

export interface DeviceTreeResponse {
  rc: number;
  ret: FactoryData[];
  err: string | null;
}

export interface FactoryData {
  factoryId: string;
  factoryName: string;
  children: WorkshopData[];
}

export interface WorkshopData {
  workshopId: string;
  workshopName: string;
  children: EquipmentData[];
}

export interface EquipmentData {
  equipmentId: string;
  equipmentName: string;
  customerDeviceId?: string;
  children: PointData[];
}

export interface PointData {
  // 后端字段命名：点位展示名通常为 receiverName（如果接口未返回则使用 pointName）
  receiverName?: string;
  pointName: string;
  receiverId?: string;
  deviceId?: string;
  warningTime?: string;
  warningType?: string;
  warningValue?: number | string;
}

/**
 * 获取设备树数据
 */
export const getDeviceTreeData = (): Promise<DeviceTreeResponse> => {
  return request.get<DeviceTreeResponse>('/taicang/hardware/device/vibration/tree')
    .then(response => {
      return response;
    })
    .catch(error => {
      return { rc: 1, ret: [], err: error?.message || '接口请求失败' };
    });
}

/**
 * 将后端返回的设备树数据转换为前端所需的格式
 */
export const transformDeviceTreeData = (responseData: DeviceTreeResponse): DeviceTreeNode[] => {
  if (responseData.rc !== 0 || !responseData.ret) {
    return [];
  }

  return responseData.ret.map(factory => ({
    id: factory.factoryId,
    name: factory.factoryName,
    type: 'factory',
    status: 'normal', 
    children: factory.children.map(workshop => ({
      // workshopId 可能在不同工厂下重复；el-tree 用 node-key=id，必须保证唯一
      id: `${factory.factoryId}-${workshop.workshopId}`,
      name: workshop.workshopName,
      type: 'workshop',
      status: 'normal', 
      children: workshop.children.map(equipment => ({
        id: equipment.equipmentId,
        name: equipment.equipmentName,
        type: 'device',
        status: 'normal', 
        workshopName: workshop.workshopName,
        customerDeviceId: equipment.customerDeviceId,
        equipmentId: equipment.equipmentId,
        equipmentName: equipment.equipmentName,
        children: equipment.children.map((point, pointIndex) => ({
          // el-tree 使用 node-key=id，不能让所有节点都退化成空字符串
          id: point.receiverId ?? `${equipment.equipmentId}-${pointIndex}`,
          // 点位展示：优先 receiverName，没有再回退 pointName
          name: point.receiverName || point.pointName,
          type: 'point',
          status: 'normal',
          warningTime: point.warningTime,
          warningType: point.warningType,
          warningValue: point.warningValue,
          // 点位级 deviceId：用于振动点位页的接口入参（不能等同 equipmentId）
          deviceId: point.deviceId,
          receiverId: point.receiverId
        }))
      }))
    }))
  }));
}