import { getTenantId } from './tenant'

/** 太仓事件查询（与 alarmBatch / stats / vibrationEvent 共用） */
export const TAICANG_EVENT_FIND_URL = 'http://122.224.196.178:8003/taicang/event/find'

export const withTenantQuery = (extra: Record<string, unknown> = {}) => ({
  userId: '',
  tenantId: getTenantId(),
  _t: Date.now(),
  ...extra,
})

export const eqFilter = (code: string, value: unknown) => ({
  code,
  operate: 'EQ' as const,
  value,
})

export const buildVibrationPayload = (
  deviceId: string,
  receiverId: string,
  axis: string,
  alarmTime?: number,
  timeRange?: { startTime?: string; endTime?: string },
) => {
  const payload: Record<string, unknown> = {
    tenantId: getTenantId(),
    deviceId,
    receiverId,
    axis,
  }
  const at = alarmTime == null ? NaN : Number(alarmTime)
  if (Number.isFinite(at) && at > 0) payload.alarmTime = at
  if (timeRange?.startTime) payload.startTime = timeRange.startTime
  if (timeRange?.endTime) payload.endTime = timeRange.endTime
  return payload
}
