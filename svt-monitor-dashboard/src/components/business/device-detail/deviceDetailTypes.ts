export interface DeviceDetailPointInfo {
  id: string
  name: string
  lastAlarmTime: string
  alarmType: string
  alarmValue: string
  matchMesureValue?: string | number
  thresholdValue?: string | number
  deviceId?: string
  hasAlarm: boolean
}

export interface DeviceTrendChartData {
  timeLabels: string[]
  values: number[]
  yMin?: number
  yMax?: number
}
