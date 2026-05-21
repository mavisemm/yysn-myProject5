export interface DeviceDetailPointInfo {
  id: string
  name: string
  lastAlarmTime: string
  alarmType: string
  alarmValue: string
  matchMesureValue?: string | number
  warningX?: string | number
  warningY?: string | number
  warningZ?: string | number
  deviceId?: string
  hasAlarm: boolean
}

export interface DeviceTrendChartData {
  timeLabels: string[]
  values: number[]
  yMin?: number
  yMax?: number
}
