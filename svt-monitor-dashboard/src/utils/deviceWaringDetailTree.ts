import type { DeviceWaringDetailItem } from '@/api/modules/stats'
import type { AlarmBatchTreeRow } from '@/utils/alarmBatchTree'

type RawRecord = Record<string, unknown>

/** 兼容接口 ret 为数组、{ sound }、{ items } 等形态 */
export function parseDeviceWaringDetailList(ret: unknown): DeviceWaringDetailItem[] {
  if (Array.isArray(ret)) return ret as DeviceWaringDetailItem[]
  if (!ret || typeof ret !== 'object') return []
  const r = ret as RawRecord
  if (Array.isArray(r.sound)) return r.sound as DeviceWaringDetailItem[]
  if (Array.isArray(r.vibration)) return r.vibration as DeviceWaringDetailItem[]
  if (Array.isArray(r.items)) return r.items as DeviceWaringDetailItem[]
  return []
}

const equipmentGroupKey = (equipmentId: string, equipmentName: string) => {
  const id = String(equipmentId ?? '').trim().toLowerCase()
  const name = String(equipmentName ?? '').trim().toLowerCase()
  if (id) return `${id}__${name || '__empty_name__'}`
  return `__empty_equipment_id__${name || '__empty_name__'}`
}

const toNum = (v: unknown): number | undefined => {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** 单条点位/预警记录字段归一（兼容 alarmObject、deviceName 等后端命名） */
export function normalizeDeviceWaringDetailItem(
  raw: unknown,
  parent?: { equipmentId?: string; equipmentName?: string },
): DeviceWaringDetailItem {
  const r = (raw && typeof raw === 'object' ? raw : {}) as RawRecord
  const equipmentId = String(
    r.equipmentId ?? r.deviceId ?? parent?.equipmentId ?? '',
  )
  const equipmentName = String(
    r.equipmentName ?? r.deviceName ?? parent?.equipmentName ?? '',
  )
  return {
    equipmentId,
    equipmentName,
    receiverId: String(r.receiverId ?? r.pointId ?? r.receiverNo ?? ''),
    pointName: String(r.pointName ?? r.alarmObject ?? r.receiverName ?? ''),
    warningSource: r.warningSource as string | undefined,
    eventTypeCode: (r.eventTypeCode ?? r.alarmTypeCode) as string | undefined,
    eventTypeName: (r.eventTypeName ?? r.alarmType ?? r.eventType) as string | undefined,
    metricLabel: r.metricLabel as string | undefined,
    metricValue: toNum(r.metricValue ?? r.value ?? r.warningValue),
    triggerValue: toNum(r.triggerValue ?? r.alarmValue),
    alarmTime: toNum(r.alarmTime ?? r.time ?? r.createTime),
  }
}

const hasPointList = (item: unknown): boolean => {
  if (!item || typeof item !== 'object') return false
  const r = item as RawRecord
  const points = r.pointList ?? r.children
  return Array.isArray(points) && points.length > 0
}

const toEventTreeRow = (
  raw: unknown,
  equipment: { equipmentId: string; equipmentName: string },
  groupKey: string,
  index: number,
): AlarmBatchTreeRow => {
  const item = normalizeDeviceWaringDetailItem(raw, equipment)
  const receiverId = String(item.receiverId ?? '')
  const alarmTime = item.alarmTime ?? index
  return {
    rowType: 'event',
    id: `event::${groupKey}::${receiverId}::${alarmTime}::${index}`,
    equipmentId: equipment.equipmentId,
    equipmentName: equipment.equipmentName,
    deviceName: equipment.equipmentName,
    pointId: receiverId,
    pointName: item.pointName,
    receiverId,
    receiverName: item.pointName,
    metricValue: item.metricValue,
    triggerValue: item.triggerValue,
    alarmTime: item.alarmTime,
    eventTypeCode: item.eventTypeCode,
    eventType: item.eventTypeName ? { name: item.eventTypeName } : undefined,
    warningAxis: (raw as { warningAxis?: string })?.warningAxis,
  } as AlarmBatchTreeRow
}

/** 设备 → 点位（树形接口：equipment 下挂 pointList / children） */
function buildTreeFromEquipmentNodes(items: DeviceWaringDetailItem[]): AlarmBatchTreeRow[] {
  return items.map((eqRaw, eqIndex) => {
    const eq = eqRaw as unknown as RawRecord
    const equipmentId = String(eq.equipmentId ?? eq.deviceId ?? '')
    const equipmentName = String(eq.equipmentName ?? eq.deviceName ?? '')
    const groupKey = equipmentGroupKey(equipmentId, equipmentName)
    const equipment = { equipmentId, equipmentName }

    const points = (eq.pointList ?? eq.children ?? []) as unknown[]
    const eventChildren: AlarmBatchTreeRow[] = []
    let index = 0

    for (const point of points) {
      if (!point || typeof point !== 'object') continue
      const p = point as RawRecord
      const nested = p.eventList ?? p.alarmList ?? (Array.isArray(p.children) ? p.children : null)
      if (Array.isArray(nested) && nested.length > 0) {
        for (const ev of nested) {
          eventChildren.push(
            toEventTreeRow({ ...p, ...(ev as RawRecord) }, equipment, groupKey, index++),
          )
        }
      } else {
        eventChildren.push(toEventTreeRow(p, equipment, groupKey, index++))
      }
    }

    return {
      rowType: 'equipment',
      id: `equipment::${groupKey}::${eqIndex}`,
      equipmentId,
      equipmentName,
      deviceName: equipmentName,
      children: eventChildren.length ? eventChildren : undefined,
    } as AlarmBatchTreeRow
  })
}

/** 扁平列表按设备分组 → 设备 → 点位 */
function buildTreeFromFlatList(items: DeviceWaringDetailItem[]): AlarmBatchTreeRow[] {
  const groups = new Map<string, { head: DeviceWaringDetailItem; events: DeviceWaringDetailItem[] }>()

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const item = normalizeDeviceWaringDetailItem(raw)
    const key = equipmentGroupKey(item.equipmentId, item.equipmentName)
    const existing = groups.get(key)
    if (existing) {
      existing.events.push(item)
      continue
    }
    groups.set(key, { head: item, events: [item] })
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const equipmentId = String(group.head.equipmentId ?? '')
    const equipmentName = String(group.head.equipmentName ?? '')
    const equipment = { equipmentId, equipmentName }
    const eventChildren = group.events.map((item, index) =>
      toEventTreeRow(item, equipment, key, index),
    )

    return {
      rowType: 'equipment',
      id: `equipment::${key}`,
      equipmentId,
      equipmentName,
      deviceName: equipmentName,
      children: eventChildren.length ? eventChildren : undefined,
    } as AlarmBatchTreeRow
  })
}

/**
 * 将设备监测预警/报警列表转为设备 → 点位树。
 * 支持扁平列表与 equipment.pointList 树形两种返回。
 */
export function buildDeviceWaringDetailTreeRows(
  items: DeviceWaringDetailItem[] | undefined,
): AlarmBatchTreeRow[] {
  const list = items ?? []
  if (!list.length) return []

  if (list.some(hasPointList)) {
    return buildTreeFromEquipmentNodes(list)
  }
  return buildTreeFromFlatList(list)
}
