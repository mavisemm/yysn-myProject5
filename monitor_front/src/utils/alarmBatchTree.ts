import type {
  EventRow,
  EventTreeEquipment,
  EventTreePoint,
} from '@/api/modules/alarmBatch'

export type AlarmBatchTreeRowType = 'equipment' | 'event'

export interface AlarmBatchTreeRow extends Record<string, unknown> {
  id: string
  rowType: AlarmBatchTreeRowType
  children?: AlarmBatchTreeRow[]
  equipmentId?: string
  equipmentName?: string
  pointId?: number | string
  pointName?: string
  deviceName?: string
}

/** 叶子行不得带 children，否则 el-table 会多出一级可展开空行 */
function toEventLeafRow(normalized: EventRow): AlarmBatchTreeRow {
  const raw = { ...(normalized as Record<string, unknown>) }
  delete raw.children
  delete raw.pointList
  delete raw.eventList
  return {
    ...raw,
    rowType: 'event',
    id: String(normalized.id ?? ''),
  } as AlarmBatchTreeRow
}

function appendEventsUnderPoint(
  point: EventTreePoint,
  equipment: EventTreeEquipment,
  out: AlarmBatchTreeRow[],
  normalizeEvent: (
    event: EventRow,
    equipment: EventTreeEquipment,
    point: EventTreePoint,
  ) => EventRow,
) {
  const events =
    point.eventList ??
    point.alarmList ??
    ((point as Record<string, unknown>).children as EventRow[] | undefined) ??
    []

  for (const event of events) {
    const normalized = normalizeEvent(event, equipment, point)
    const nested = (event as Record<string, unknown>).children
    if (Array.isArray(nested) && nested.length > 0) {
      for (const sub of nested) {
        if (!sub || typeof sub !== 'object') continue
        out.push(toEventLeafRow(normalizeEvent(sub as EventRow, equipment, point)))
      }
      continue
    }
    out.push(toEventLeafRow(normalized))
  }
}

export function buildSoundAlarmTreeRows(
  items: EventTreeEquipment[],
  normalizeEvent: (
    event: EventRow,
    equipment: EventTreeEquipment,
    point: EventTreePoint,
  ) => EventRow,
): AlarmBatchTreeRow[] {
  return (items ?? []).map((equipment) => {
    const equipmentId = String(equipment.equipmentId ?? '')
    const eventChildren: AlarmBatchTreeRow[] = []

    const points =
      equipment.pointList ??
      ((equipment as Record<string, unknown>).children as EventTreePoint[] | undefined) ??
      []

    for (const point of points) {
      if (!point || typeof point !== 'object') continue
      appendEventsUnderPoint(point, equipment, eventChildren, normalizeEvent)
    }

    return {
      id: `equipment::${equipmentId}`,
      rowType: 'equipment',
      equipmentId,
      equipmentName: equipment.equipmentName,
      deviceName: equipment.equipmentName,
      children: eventChildren.length ? eventChildren : undefined,
    }
  })
}

/** 将 findVibrationAlarmByCondition 返回的 items（可能含一层数组包裹）展平为设备列表 */
export function unwrapVibrationAlarmEquipments(
  items: (EventTreeEquipment | EventTreeEquipment[])[] | EventTreeEquipment[] | undefined,
): EventTreeEquipment[] {
  if (!items?.length) return []
  const out: EventTreeEquipment[] = []
  for (const entry of items) {
    if (Array.isArray(entry)) {
      for (const eq of entry) {
        if (eq && typeof eq === 'object') out.push(eq)
      }
    } else if (entry && typeof entry === 'object') {
      out.push(entry)
    }
  }
  return out
}

export function collectEventIdsFromTreeRows(rows: AlarmBatchTreeRow[]): string[] {
  const ids: string[] = []
  const walk = (list: AlarmBatchTreeRow[]) => {
    for (const row of list) {
      if (row.rowType === 'event' && row.id) ids.push(String(row.id))
      if (row.children?.length) walk(row.children)
    }
  }
  walk(rows)
  return ids
}
