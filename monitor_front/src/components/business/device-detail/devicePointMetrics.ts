import type { EquipmentCheckPointDetailDto } from '@/api/modules/hardware'

export interface PointCardMetrics {
  soundDeviation: string
  xVelocityRms: string
  yVelocityRms: string
  zVelocityRms: string
  temperature: string
}

const EMPTY_DISPLAY = '-'

export const EMPTY_POINT_CARD_METRICS: PointCardMetrics = {
  soundDeviation: EMPTY_DISPLAY,
  xVelocityRms: EMPTY_DISPLAY,
  yVelocityRms: EMPTY_DISPLAY,
  zVelocityRms: EMPTY_DISPLAY,
  temperature: EMPTY_DISPLAY,
}

const formatMetric = (value: unknown, fixed = 2): string => {
  if (value == null || value === '') return EMPTY_DISPLAY
  const n = Number(value)
  if (!Number.isFinite(n)) return EMPTY_DISPLAY
  return n.toFixed(fixed)
}

/** 偏差值按后端原样展示，不做小数位格式化 */
const formatDeviationValue = (value: unknown): string => {
  if (value == null || value === '') return EMPTY_DISPLAY
  if (typeof value === 'number' && !Number.isFinite(value)) return EMPTY_DISPLAY
  return String(value)
}

export function getCheckPointReceiverId(item: EquipmentCheckPointDetailDto): string {
  return String(item.receiverId ?? item.soundFrequencyGroupDto?.receiverId ?? '').trim()
}

export function getCheckPointDisplayName(item: EquipmentCheckPointDetailDto): string {
  const rid = getCheckPointReceiverId(item)
  const name = item.pointName ?? item.soundFrequencyGroupDto?.pointName
  return String(name || rid || '未知点位')
}

export function mapCheckPointDetailToMetrics(item: EquipmentCheckPointDetailDto): PointCardMetrics {
  const sound = item.soundFrequencyGroupDto
  const vib = item.vibrationRmsDTO
  const tempRaw = item.temperature ?? sound?.temperature

  return {
    soundDeviation: formatDeviationValue(sound?.deviationValue),
    xVelocityRms: formatMetric(vib?.xvelocityRms),
    yVelocityRms: formatMetric(vib?.yvelocityRms),
    zVelocityRms: formatMetric(vib?.zvelocityRms),
    temperature: formatMetric(tempRaw, 1),
  }
}

export function buildPointMetricsMap(
  list: EquipmentCheckPointDetailDto[],
): Record<string, PointCardMetrics> {
  const map: Record<string, PointCardMetrics> = {}
  for (const item of list) {
    const id = getCheckPointReceiverId(item)
    if (!id) continue
    map[id] = mapCheckPointDetailToMetrics(item)
  }
  return map
}
