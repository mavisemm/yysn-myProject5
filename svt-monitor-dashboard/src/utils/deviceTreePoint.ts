import type { DeviceNode } from '@/types/device'

/**
 * 测点节点上的 `deviceId`（与振动/声纹 API 入参一致）
 */
export function resolvePointDeviceIdFromTree(treeData: DeviceNode[], receiverId: string): string {
  const rid = String(receiverId ?? '').trim()
  if (!rid) return ''
  for (const factory of treeData) {
    for (const workshop of factory.children ?? []) {
      for (const device of workshop.children ?? []) {
        if (device.type !== 'device') continue
        const hit = (device.children ?? []).find(
          (p) =>
            p.type === 'point' &&
            (String(p.id ?? '') === rid ||
              (p.receiverId != null && String(p.receiverId) === rid)),
        )
        if (hit?.deviceId) return hit.deviceId
      }
    }
  }
  return ''
}

/**
 * 设备树中承载该测点的「设备节点 id」（布局里跳转设备详情 `params.id`）
 */
export function resolveEquipmentIdFromPointReceiver(treeData: DeviceNode[], receiverId: string): string {
  const rid = String(receiverId ?? '').trim()
  if (!rid) return ''
  for (const factory of treeData) {
    for (const workshop of factory.children ?? []) {
      for (const device of workshop.children ?? []) {
        if (device.type !== 'device') continue
        const hasPoint = (device.children ?? []).some(
          (p) =>
            p.type === 'point' &&
            (String(p.id ?? '') === rid ||
              (p.receiverId != null && String(p.receiverId) === rid)),
        )
        if (hasPoint) return device.id
      }
    }
  }
  return ''
}

/** 设备树节点名称（设备详情 route.params.id 与树 device.id 对齐） */
export function resolveEquipmentNameFromTree(treeData: DeviceNode[], equipmentId: string): string {
  const id = String(equipmentId ?? '').trim()
  if (!id) return ''
  for (const factory of treeData) {
    for (const workshop of factory.children ?? []) {
      for (const device of workshop.children ?? []) {
        if (device.type === 'device' && String(device.id) === id) {
          return String(device.name || device.equipmentName || '').trim()
        }
      }
    }
  }
  return ''
}

/** 测点展示名（优先树节点 name / pointName） */
export function resolvePointDisplayNameFromTree(treeData: DeviceNode[], receiverId: string): string {
  const rid = String(receiverId ?? '').trim()
  if (!rid) return ''
  for (const factory of treeData) {
    for (const workshop of factory.children ?? []) {
      for (const device of workshop.children ?? []) {
        if (device.type !== 'device') continue
        const hit = (device.children ?? []).find(
          (p) =>
            p.type === 'point' &&
            (String(p.id ?? '') === rid ||
              (p.receiverId != null && String(p.receiverId) === rid)),
        )
        if (hit) {
          return String(hit.name || hit.pointName || hit.id || '').trim()
        }
      }
    }
  }
  return ''
}
