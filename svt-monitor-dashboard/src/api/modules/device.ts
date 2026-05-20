import request from '../request'
import { buildVibrationPayload } from '../helpers'
import { getTenantId } from '../tenant'

export interface NewApiResponse<T = unknown> {
  rc: number
  ret: T
  err: string | null
}

/** 振动频域 / 时域数据轴向（与后端约定为大写） */
export type VibrationAxis = 'X' | 'Y' | 'Z'

export interface VibrationFrequencyData {
  frequency: number[]
  freqSpeedData: number[]
}

export interface VibrationFrequencyWaterfallData {
  collectTime: string[]
  frequency: number[]
  freqSpeedData: number[][]
}

export const getVibrationFrequencyData = (
  deviceId: string,
  receiverId: string,
  axis: VibrationAxis = 'X',
  alarmTime?: number,
  dataSize: number = 0,
): Promise<NewApiResponse<VibrationFrequencyData>> =>
  request.post('/device/vibration/data/frequency', {
    ...buildVibrationPayload(deviceId, receiverId, axis, alarmTime),
    dataSize: Number.isFinite(Number(dataSize)) ? Number(dataSize) : 0,
  })

export const getVibrationFrequencyWaterfallData = (
  deviceId: string,
  receiverId: string,
  axis: VibrationAxis,
  time: string,
  startTime: string,
  endTime: string,
): Promise<NewApiResponse<VibrationFrequencyWaterfallData>> =>
  request.post('/device/vibration/data/frequency/waterfall', {
    tenantId: getTenantId(),
    deviceId,
    receiverId,
    axis,
    time,
    startTime,
    endTime,
  })

export interface VibrationMetricData {
  collectTime?: string
  velocityRms?: number
  velocityMax?: number
  accelerationRms?: number
  accelerationMax?: number
  xvelocityRms?: number
  yvelocityRms?: number
  zvelocityRms?: number
  xvelocityMax?: number
  yvelocityMax?: number
  zvelocityMax?: number
  xaccelerationRms?: number
  yaccelerationRms?: number
  zaccelerationRms?: number
  xaccelerationMax?: number
  yaccelerationMax?: number
  zaccelerationMax?: number
}

export const getVibrationMetricData = (
  deviceId: string,
  receiverId: string,
): Promise<NewApiResponse<VibrationMetricData>> =>
  request.post('/device/vibration/data/metric/rms', {
    tenantId: getTenantId(),
    deviceId,
    receiverId,
  })

export interface VibrationTimeDomainData {
  time: number
  timedomaindata: string | number[] | string[]
}

export const getVibrationTimeDomainData = (
  deviceId: string,
  receiverId: string,
  axis: VibrationAxis = 'X',
  alarmTime?: number,
): Promise<NewApiResponse<VibrationTimeDomainData>> =>
  request.post('/device/vibration/data/time', buildVibrationPayload(deviceId, receiverId, axis, alarmTime))
