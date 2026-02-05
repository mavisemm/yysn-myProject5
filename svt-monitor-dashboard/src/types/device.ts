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
  lastAlarmTime?: string
  alarmType?: string
  alarmValue?: string
  hasAlarm?: boolean
  
  // 设备树中实际使用的字段
  pointId?: string        // 点位ID
  pointName?: string      // 点位名称
  warningTime?: string    // 预警时间
  warningType?: string    // 预警类型
  warningValue?: number | string  // 预警值
  equipmentId?: string    // 设备ID
  equipmentName?: string  // 设备名称
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
  unit?: string;
}