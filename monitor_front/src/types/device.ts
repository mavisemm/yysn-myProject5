export interface DeviceNode {
  id: string
  name: string
  type: 'factory' | 'workshop' | 'device' | 'point' | 'pointMetric'
  status?: 'normal' | 'warning' | 'alarm' | 'offline'
  children?: DeviceNode[]
  deviceCount?: number
  /** 所属工厂设备总数（车间节点展示 y/x 台时使用） */
  factoryDeviceCount?: number
  pointCount?: number
  parentId?: string
  workshopName?: string
  customerDeviceId?: string
  lastAlarmTime?: string
  alarmType?: string
  alarmValue?: string
  hasAlarm?: boolean
  receiverId?: string
  deviceId?: string
  pointName?: string
  warningTime?: string
  warningType?: string
  warningValue?: number | string
  equipmentId?: string
  equipmentName?: string
}

export interface Workshop {
  id: string
  name: string
}

export interface Device {
  id: string
  name: string
  workshopId: string
  workshopName: string
  customerDeviceId?: string
  deviceNode: DeviceNode
}

export interface StatItem {
  title: string
  number?: number | string
  icon?: any
}

export interface MetricItem {
  title: string
  unit?: string
}
