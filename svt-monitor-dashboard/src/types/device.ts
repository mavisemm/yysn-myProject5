// 设备节点类型定义
export interface DeviceNode {
  id: string
  name: string
  type: 'factory' | 'workshop' | 'device' | 'point'
  status?: 'normal' | 'warning' | 'alarm' | 'offline'
  children?: DeviceNode[]
  deviceCount?: number
  pointCount?: number
  parentId?: string
  workshopName?: string
}

// 车间类型定义
export interface Workshop {
  id: string
  name: string
}

// 设备类型定义
export interface Device {
  id: string
  name: string
  workshopId: string
  workshopName: string
  deviceNode: DeviceNode
}

// 统计项类型定义
export interface StatItem {
  title: string;
  number?: number | string;
  icon?: any;
}

// 指标项类型定义
export interface MetricItem {
  title: string;
}