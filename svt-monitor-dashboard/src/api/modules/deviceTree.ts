import request from '../request'

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
  code: number;
  message: string;
  data: {
    factories: FactoryData[];
    statistics: StatisticsData;
  };
  timestamp: number;
}

export interface FactoryData {
  factoryId: string;
  factoryName: string;
  factoryCode: string;
  totalDeviceCount: number;
  totalPointCount: number;
  onlineDeviceCount: number;
  alarmDeviceCount: number;
  workshops: WorkshopData[];
}

export interface WorkshopData {
  workshopId: string;
  workshopName: string;
  workshopCode: string;
  status: 'normal' | 'warning' | 'alarm';
  deviceCount: number;
  pointCount: number;
  onlineCount: number;
  alarmCount: number;
  devices: DeviceData[];
}

export interface DeviceData {
  deviceId: string;
  deviceName: string;
  deviceCode: string;
  deviceType: string;
  deviceTypeName: string;
  status: 'normal' | 'warning' | 'alarm';
  onlineStatus: 'online' | 'offline';
  model: string;
  manufacturer: string;
  lastDataTime: string;
  points: PointData[];
}

export interface PointData {
  pointId: string;
  pointName: string;
  pointCode: string;
  pointType: string;
  pointTypeName: string;
  sensorModel: string;
  position: string;
  status: 'normal' | 'warning' | 'alarm';
  currentValue: number;
  unit: string;
  thresholdWarning: number;
  thresholdAlarm: number;
  lastUpdateTime: string;
}

export interface StatisticsData {
  totalFactoryCount: number;
  totalWorkshopCount: number;
  totalDeviceCount: number;
  totalPointCount: number;
  onlineDeviceCount: number;
  offlineDeviceCount: number;
  alarmDeviceCount: number;
  warningDeviceCount: number;
  normalDeviceCount: number;
}

/**
 * 获取设备树数据
 */
export const getDeviceTreeData = () => {
  return request.get<DeviceTreeResponse>('/api/device/tree')
}

/**
 * 将后端返回的设备树数据转换为前端所需的格式
 */
export const transformDeviceTreeData = (responseData: DeviceTreeResponse): DeviceTreeNode[] => {
  if (!responseData.data || !responseData.data.factories) {
    return [];
  }

  return responseData.data.factories.map(factory => ({
    id: factory.factoryId,
    name: factory.factoryName,
    type: 'factory',
    status: factory.alarmDeviceCount > 0 ? 'alarm' : (factory.onlineDeviceCount < factory.totalDeviceCount ? 'warning' : 'normal'),
    deviceCount: factory.totalDeviceCount,
    pointCount: factory.totalPointCount,
    children: factory.workshops.map(workshop => ({
      id: workshop.workshopId,
      name: workshop.workshopName,
      type: 'workshop',
      status: workshop.status,
      deviceCount: workshop.deviceCount,
      pointCount: workshop.pointCount,
      children: workshop.devices.map(device => ({
        id: device.deviceId,
        name: device.deviceName,
        type: 'device',
        status: device.status,
        pointCount: device.points.length,
        workshopName: workshop.workshopName,
        children: device.points.map(point => ({
          id: point.pointId,
          name: point.pointName,
          type: 'point',
          status: point.status
        }))
      }))
    }))
  }));
}