import type { DeviceNode } from '@/types/device'

export interface RealtimeDeviceOptionLike {
  key?: string
  deviceId?: string | number
  id?: string | number
  value?: string | number
}

const norm = (v: unknown) => String(v ?? '').trim()

const pickDeviceId = (node?: DeviceNode) => norm(node?.deviceId ?? node?.equipmentId ?? node?.id)

const findMatchedDeviceNode = (deviceTreeData: DeviceNode[], alarmId: string): DeviceNode | null => {
  const normalizedAlarmId = norm(alarmId)
  if (!normalizedAlarmId) return null

  const stack = [...(deviceTreeData ?? [])]
  while (stack.length) {
    const node = stack.pop()!
    if (node.type === 'device') {
      const ids = [node.id, node.equipmentId, node.deviceId, node.customerDeviceId].map(norm).filter(Boolean)
      if (ids.includes(normalizedAlarmId)) return node
    }
    if (node.children?.length) stack.push(...node.children)
  }
  return null
}

const findPointDeviceId = (deviceNode: DeviceNode | null, pointNum: number, pointName?: string): string => {
  const points = deviceNode?.children?.filter((child) => child.type === 'point') ?? []
  if (!points.length) return ''

  const normalizedPointName = norm(pointName)
  if (normalizedPointName) {
    const byName = points.find((p) => norm(p.pointName ?? p.name) === normalizedPointName)
    const id = pickDeviceId(byName)
    if (id) return id
  }

  if (pointNum >= 1) {
    const byNum = points.find((p) => {
      const m = String(p.pointName ?? p.name ?? '').match(/(\d+)/)
      return m ? Number(m[1]) === pointNum : false
    })
    const numId = pickDeviceId(byNum)
    if (numId) return numId
    return pickDeviceId(points[pointNum - 1])
  }

  return ''
}

export function resolveRealtimeDeviceKey(params: {
  alarmId: string
  pointNum: number
  pointName?: string
  deviceTreeData: DeviceNode[]
  deviceOptions: RealtimeDeviceOptionLike[]
}): string {
  const alarmId = norm(params.alarmId)
  if (!alarmId) return ''

  const foundNode = findMatchedDeviceNode(params.deviceTreeData ?? [], alarmId)
  const pointDeviceId = findPointDeviceId(foundNode, Number(params.pointNum ?? 0), params.pointName)

  const candidates = new Set<string>()
  if (pointDeviceId) candidates.add(pointDeviceId)
  candidates.add(alarmId)
  if (foundNode) {
    for (const id of [foundNode.deviceId, foundNode.customerDeviceId, foundNode.equipmentId, foundNode.id]) {
      const normalized = norm(id)
      if (normalized) candidates.add(normalized)
    }
  }

  const optionKeys = new Set(
    (params.deviceOptions ?? [])
      .map((item) => norm(item?.key ?? item?.deviceId ?? item?.id ?? item?.value))
      .filter(Boolean),
  )

  for (const id of candidates) {
    if (optionKeys.has(id)) return id
  }
  return alarmId
}
