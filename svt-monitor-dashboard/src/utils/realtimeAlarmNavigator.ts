import type { DeviceNode } from '@/types/device'

export interface RealtimeDeviceOptionLike {
  key?: string
  deviceId?: string | number
  id?: string | number
  value?: string | number
}

const findMatchedDeviceNode = (deviceTreeData: DeviceNode[], alarmId: string): DeviceNode | null => {
  const normalizedAlarmId = String(alarmId ?? '').trim()
  if (!normalizedAlarmId) return null
  const stack: DeviceNode[] = [...(deviceTreeData ?? [])]
  while (stack.length) {
    const node = stack.pop()
    if (!node) continue
    if (node.type === 'device') {
      const ids = [node.id, node.equipmentId, node.deviceId, node.customerDeviceId]
        .map((v) => String(v ?? '').trim())
        .filter(Boolean)
      if (ids.includes(normalizedAlarmId)) return node
    }
    if (node.children?.length) stack.push(...node.children)
  }
  return null
}

const findPointDeviceId = (deviceNode: DeviceNode | null, pointNum: number, pointName?: string): string => {
  if (!deviceNode?.children?.length) return ''
  const normalizedPointName = String(pointName ?? '').trim()
  const points = deviceNode.children.filter((child) => child.type === 'point')
  if (!points.length) return ''

  const pickDeviceId = (node?: DeviceNode) =>
    String(node?.deviceId ?? node?.equipmentId ?? node?.id ?? '').trim()

  if (normalizedPointName) {
    const byName = points.find((p) => String(p.pointName ?? p.name ?? '').trim() === normalizedPointName)
    const nameDeviceId = pickDeviceId(byName)
    if (nameDeviceId) return nameDeviceId
  }

  if (pointNum >= 1) {
    const byNum = points.find((p) => {
      const text = String(p.pointName ?? p.name ?? '')
      const m = text.match(/(\d+)/)
      return m ? Number(m[1]) === pointNum : false
    })
    const numDeviceId = pickDeviceId(byNum)
    if (numDeviceId) return numDeviceId

    const byIndex = points[pointNum - 1]
    const indexDeviceId = pickDeviceId(byIndex)
    if (indexDeviceId) return indexDeviceId
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
  const alarmId = String(params.alarmId ?? '').trim()
  if (!alarmId) return ''

  const foundNode = findMatchedDeviceNode(params.deviceTreeData ?? [], alarmId)
  const pointDeviceId = findPointDeviceId(foundNode, Number(params.pointNum ?? 0), params.pointName)

  const candidates = new Set<string>()
  if (pointDeviceId) candidates.add(pointDeviceId)
  candidates.add(alarmId)
  if (foundNode) {
    for (const id of [foundNode.deviceId, foundNode.customerDeviceId, foundNode.equipmentId, foundNode.id]) {
      const normalized = String(id ?? '').trim()
      if (normalized) candidates.add(normalized)
    }
  }

  const optionKeys = new Set<string>(
    (params.deviceOptions ?? [])
      .map((item) => String(item?.key ?? item?.deviceId ?? item?.id ?? item?.value ?? '').trim())
      .filter(Boolean),
  )

  for (const id of candidates) {
    if (optionKeys.has(id)) return id
  }
  return alarmId
}
