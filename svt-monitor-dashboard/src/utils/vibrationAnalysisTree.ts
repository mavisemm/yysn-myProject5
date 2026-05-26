import type { DeviceNode } from '@/types/device'
import { getSelectCheckPointIn } from '@/api/modules/hardware'
import { resolvePointDeviceIdFromTree } from '@/utils/deviceTreePoint'

export interface EquipmentOption {
  equipmentId: string
  equipmentName: string
}

export interface AnalysisPointItem {
  receiverId: string
  pointName: string
  pointDeviceId: string
}

export function collectEquipmentOptions(tree: DeviceNode[]): EquipmentOption[] {
  const list: EquipmentOption[] = []
  for (const factory of tree) {
    for (const workshop of factory.children ?? []) {
      for (const device of workshop.children ?? []) {
        if (device.type !== 'device') continue
        list.push({
          equipmentId: device.id,
          equipmentName: String(device.name || device.equipmentName || device.id).trim(),
        })
      }
    }
  }
  return list
}

export function findEquipmentNode(tree: DeviceNode[], equipmentId: string): DeviceNode | null {
  const id = String(equipmentId ?? '').trim()
  if (!id) return null
  for (const factory of tree) {
    for (const workshop of factory.children ?? []) {
      for (const device of workshop.children ?? []) {
        if (device.type === 'device' && device.id === id) return device
      }
    }
  }
  return null
}

export function collectPointsFromTree(tree: DeviceNode[], equipmentId: string): AnalysisPointItem[] {
  const device = findEquipmentNode(tree, equipmentId)
  if (!device) return []
  const deviceFallbackId =
    String(device.equipmentId ?? device.id ?? equipmentId).trim() || equipmentId
  return (device.children ?? [])
    .filter((p) => p.type === 'point')
    .map((p) => {
      const receiverId = String(p.id ?? p.receiverId ?? '').trim()
      const fromTree = resolvePointDeviceIdFromTree(tree, receiverId)
      const pointDeviceId =
        fromTree || String(p.deviceId ?? deviceFallbackId).trim() || deviceFallbackId
      return {
        receiverId,
        pointName: String(p.name || p.pointName || p.id || '').trim(),
        pointDeviceId,
      }
    })
    .filter((p) => p.receiverId)
}

export async function loadAnalysisPointsForEquipment(
  tree: DeviceNode[],
  equipmentId: string,
): Promise<AnalysisPointItem[]> {
  const fromTree = collectPointsFromTree(tree, equipmentId)
  if (fromTree.length > 0) return fromTree

  try {
    const res = await getSelectCheckPointIn(equipmentId, 500, 1)
    if (res.rc !== 0 || !res.ret) return []
    const raw = Array.isArray(res.ret)
      ? res.ret
      : (res.ret.items ?? res.ret.records ?? res.ret.list ?? [])
    const device = findEquipmentNode(tree, equipmentId)
    const fallbackDeviceId = String(device?.equipmentId ?? equipmentId).trim()
    return raw
      .map((item) => {
        const receiverId = String(item.receiverId ?? '').trim()
        const fromTree = resolvePointDeviceIdFromTree(tree, receiverId)
        const pointDeviceId =
          fromTree ||
          String(item.deviceId ?? fallbackDeviceId).trim() ||
          fallbackDeviceId
        return {
          receiverId,
          pointName: String(item.receiverName || item.pointName || item.receiverId || '').trim(),
          pointDeviceId,
        }
      })
      .filter((p) => p.receiverId)
  } catch {
    return []
  }
}
