import type { DeviceNode } from '@/types/device'
import type { useAlarmBatchStore } from '@/stores/alarmBatch'
import { resolveRealtimeDeviceKey } from '@/utils/realtimeAlarmNavigator'

export function findDeviceIdInTree(nodes: DeviceNode[], deviceId: string): boolean {
  for (const node of nodes) {
    if (node.id === deviceId && node.type === 'device') return true
    if (node.children?.length && findDeviceIdInTree(node.children, deviceId)) return true
  }
  return false
}

export type RealtimeBatchMode = 'sound-warning' | 'vibration-alarm'

export async function openRealtimeBatchForPoint(options: {
  alarmBatchStore: ReturnType<typeof useAlarmBatchStore>
  deviceTreeData: DeviceNode[]
  deviceId: string
  pointNum: number
  pointName: string
  mode: RealtimeBatchMode
}) {
  const { alarmBatchStore, deviceTreeData, deviceId, pointNum, pointName, mode } = options
  await alarmBatchStore.ensureDropdowns()

  const resolvedDeviceId = resolveRealtimeDeviceKey({
    alarmId: deviceId,
    pointNum,
    pointName,
    deviceTreeData,
    deviceOptions: (alarmBatchStore.deviceNameList ?? []) as never[],
  })

  if (mode === 'sound-warning') {
    alarmBatchStore.resetRealtime()
    if (resolvedDeviceId) alarmBatchStore.realtimeQuery.deviceId = resolvedDeviceId
    void alarmBatchStore.openRealtime()
    return
  }

  alarmBatchStore.resetRealtimeAlarm()
  if (resolvedDeviceId) alarmBatchStore.realtimeAlarmQuery.deviceId = resolvedDeviceId
  void alarmBatchStore.openRealtimeAlarm()
}
