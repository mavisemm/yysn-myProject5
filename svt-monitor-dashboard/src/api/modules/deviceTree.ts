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
  workshopName?: string;
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
  children: PointData[];
}

export interface PointData {
  pointName: string;
  pointId?: string;
  receiverId?: string;
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
      id: workshop.workshopId,
      name: workshop.workshopName,
      type: 'workshop',
      status: 'normal', 
      children: workshop.children.map(equipment => ({
        id: equipment.equipmentId,
        name: equipment.equipmentName,
        type: 'device',
        status: 'normal', 
        workshopName: workshop.workshopName,
        children: equipment.children.map(point => ({
          id: point.pointId || point.receiverId || '',
          name: point.pointName,
          type: 'point',
          status: 'normal',
          warningTime: point.warningTime,
          warningType: point.warningType,
          warningValue: point.warningValue
        }))
      }))
    }))
  }));
}