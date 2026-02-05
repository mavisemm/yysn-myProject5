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
  pointId?: string; // 点位ID，优先使用
  receiverId?: string; // 接收器ID，作为后备
  warningTime?: string; // 预警时间
  warningType?: string; // 预警类型
  warningValue?: number | string; // 预警值
}

/**
 * 获取设备树数据
 */
export const getDeviceTreeData = (): Promise<DeviceTreeResponse> => {
  console.log('正在请求设备树数据...');
  // 直接使用完整路径，让Vite代理处理
  return request.get<DeviceTreeResponse>('/taicang/hardware/device/tree')
    .then(response => {
      console.log('设备树API响应成功:', response);
      return response;
    })
    .catch(error => {
      console.error('设备树API请求失败，将使用默认数据:', error);
      console.error('错误详情:', error.message || error);
      // 返回带有预警信息的默认模拟数据
      const defaultResponse: DeviceTreeResponse = {
        rc: 0,
        ret: [
          {
            factoryId: "FAC001",
            factoryName: "Main Factory",
            children: [
              {
                workshopId: "WSH001",
                workshopName: "Workshop A",
                children: [
                  {
                    equipmentId: "ff8081819a4cd984019a4d524e0d0000",
                    equipmentName: "五线三路风机",
                    children: [
                      {
                        pointName: "3",
                        pointId: "lfpznaj5u6RsUgMzQH4",
                        warningTime: "2026-02-02 17:11:59",
                        warningValue: 88,
                        warningType: "temperature"
                      },
                      {
                        pointName: "2",
                        pointId: "ofC6mcZeoOhmtZOcdnL",
                        warningTime: "2026-02-04 17:11:43",
                        warningValue: 1116,
                        warningType: "vibration"
                      },
                      {
                        pointName: "1",
                        pointId: "9sXGsnoV80oz7uB7AMv",
                        warningTime: "2026-02-03 17:11:39",
                        warningValue: 6,
                        warningType: "temperature"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        err: null
      };
      return defaultResponse;
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
    status: 'normal', // 默认状态
    children: factory.children.map(workshop => ({
      id: workshop.workshopId,
      name: workshop.workshopName,
      type: 'workshop',
      status: 'normal', // 默认状态
      children: workshop.children.map(equipment => ({
        id: equipment.equipmentId,
        name: equipment.equipmentName,
        type: 'device',
        status: 'normal', // 默认状态
        children: equipment.children.map(point => ({
          id: point.pointId || point.receiverId || '', // 优先使用pointId，如果没有则使用receiverId
          name: point.pointName,
          type: 'point',
          status: 'normal', // 默认状态
          warningTime: point.warningTime, // 预警时间
          warningType: point.warningType, // 预警类型
          warningValue: point.warningValue  // 预警值
        }))
      }))
    }))
  }));
}