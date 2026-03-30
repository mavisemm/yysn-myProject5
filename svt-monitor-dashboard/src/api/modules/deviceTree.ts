import request from '../request';
import { getTenantId } from '../tenant'


export interface DeviceTreeNode {
  id: string;
  name: string;
  type: 'factory' | 'workshop' | 'device' | 'point';
  status: 'normal' | 'warning' | 'alarm';
  deviceCount?: number;
  pointCount?: number;
  onlineCount?: number;
  alarmCount?: number;
  
  deviceId?: string;
  workshopName?: string;
  
  equipmentId?: string;
  equipmentName?: string;
  
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
  
  receiverName?: string;
  pointName: string;
  receiverId?: string;
  deviceId?: string;
  warningTime?: string;
  warningType?: string;
  warningValue?: number | string;
}

export const getDeviceTreeData = (): Promise<DeviceTreeResponse> => {
  return request.get<DeviceTreeResponse>('/taicang/hardware/device/vibration/tree', {
    params: {
      tenantId: getTenantId()
    }
  })
    .then(response => {
      return response;
    })
    .catch(error => {
      return { rc: 1, ret: [], err: error?.message || '接口请求失败' };
    });
}

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
          
          id: point.receiverId ?? `${equipment.equipmentId}-${pointIndex}`,
          
          name: point.receiverName || point.pointName,
          type: 'point',
          status: 'normal',
          warningTime: point.warningTime,
          warningType: point.warningType,
          warningValue: point.warningValue,
          
          deviceId: point.deviceId,
          receiverId: point.receiverId
        }))
      }))
    }))
  }));
}