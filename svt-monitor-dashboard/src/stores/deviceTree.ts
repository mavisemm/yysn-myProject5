import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { DeviceNode } from '@/types/device'
import { getDeviceTreeData, transformDeviceTreeData } from '@/api/modules/deviceTree'
import { getTenantId } from '@/api/tenant'

export const useDeviceTreeStore = defineStore('deviceTree', () => {
  
  const deviceTreeData = ref<DeviceNode[]>([])
  
  
  const loading = ref(false)

  const isSameTreeData = (nextData: DeviceNode[], prevData: DeviceNode[]) => {
    if (nextData === prevData) return true
    if (nextData.length !== prevData.length) return false
    try {
      return JSON.stringify(nextData) === JSON.stringify(prevData)
    } catch {
      return false
    }
  }
  
  
  const loadDeviceTreeData = async () => {
    try {
      loading.value = true;
      const response = await getDeviceTreeData();
      const transformedData = transformDeviceTreeData(response);
      if (!isSameTreeData(transformedData, deviceTreeData.value)) {
        deviceTreeData.value = transformedData;
      }
    } catch (error) {
      
    } finally {
      loading.value = false;
    }
  };
  
  
  
  
  const loadWithTenantRetry = () => {
    const tryLoad = async () => {
      const tId = getTenantId()
      if (!tId) return false
      await loadDeviceTreeData()
      return true
    }

    void (async () => {
      
      const ok = await tryLoad()
      if (ok) return

      
      await new Promise((r) => setTimeout(r, 250))
      const ok2 = await tryLoad()
      if (ok2) return

      await new Promise((r) => setTimeout(r, 750))
      void tryLoad()
    })()
  }

  loadWithTenantRetry()

  
  const selectedDeviceId = ref<string | null>(null)

  
  
  const expandedKeys = ref<string[]>([])

  
  const setSelectedDeviceId = (id: string | null) => {
    selectedDeviceId.value = id
  }

  
  const setExpandedKeys = (keys: string[]) => {
    expandedKeys.value = keys
  }

  
  const clearDeviceTreeData = () => {
    deviceTreeData.value = []
    selectedDeviceId.value = null
    expandedKeys.value = []
  }

  
  const resetDeviceTreeState = () => {
    selectedDeviceId.value = null
    const firstFactoryId = deviceTreeData.value?.[0]?.id
    const firstWorkshopId = getDefaultWorkshopId()
    const keys: string[] = []
    if (firstFactoryId) keys.push(firstFactoryId)
    if (firstWorkshopId) keys.push(firstWorkshopId)
    expandedKeys.value = keys
  }

  
  const getDefaultWorkshopId = (): string | null => {
    const factory = deviceTreeData.value[0]
    if (factory && factory.children && factory.children.length > 0) {
      const firstChild = factory.children[0]
      return firstChild ? firstChild.id || null : null
    }
    return null
  }

  const normKey = (v: unknown): string => String(v ?? '').trim()

  /** 与树上展示名对齐（振动树点位 name = receiverName || pointName） */
  const normPointLabel = (v: unknown): string =>
    normKey(v)
      .toLowerCase()
      .replace(/\s+/g, ' ')

  /**
   * 排名/路由里的 receiverId、pointId 可能与树上点位的 node-key（id）不完全一致（类型或字段来源不同）。
   * 声音 Top5 的 receiverId 常与振动设备树 /vibration/tree 不是同一套 id，需在指定设备下用 pointName 兜底匹配。
   * 返回 el-tree 的 node-key，供选中与展开；找不到时返回 null。
   */
  const resolveTreeKeyForPoint = (
    receiverOrPointId: string,
    equipmentId?: string,
    opts?: { pointName?: string }
  ): string | null => {
    const rid = normKey(receiverOrPointId)
    if (!rid) return null
    const eid = normKey(equipmentId)
    const labelHint = opts?.pointName != null && String(opts.pointName).trim() !== ''
      ? normPointLabel(opts.pointName)
      : ''

    const pointMatchesId = (p: DeviceNode): boolean => {
      if (p.type !== 'point') return false
      if (normKey(p.id) === rid) return true
      if (p.receiverId != null && normKey(p.receiverId) === rid) return true
      return false
    }

    const pointMatchesName = (p: DeviceNode): boolean => {
      if (p.type !== 'point' || !labelHint) return false
      return normPointLabel(p.name) === labelHint
    }

    if (eid) {
      const findDevice = (nodes: DeviceNode[]): DeviceNode | null => {
        for (const n of nodes) {
          if (n.type === 'device' && normKey(n.id) === eid) return n
          if (n.children?.length) {
            const d = findDevice(n.children)
            if (d) return d
          }
        }
        return null
      }
      const device = findDevice(deviceTreeData.value)
      if (device?.children?.length) {
        for (const p of device.children) {
          if (pointMatchesId(p)) return p.id
        }
        if (labelHint) {
          for (const p of device.children) {
            if (pointMatchesName(p)) return p.id
          }
        }
      }
    }

    const walk = (nodes: DeviceNode[]): string | null => {
      for (const n of nodes) {
        if (pointMatchesId(n)) return n.id
        if (n.children?.length) {
          const hit = walk(n.children)
          if (hit) return hit
        }
      }
      return null
    }
    const byId = walk(deviceTreeData.value)
    if (byId) return byId
    if (!labelHint) return null
    const walkByName = (nodes: DeviceNode[]): string | null => {
      for (const n of nodes) {
        if (pointMatchesName(n)) return n.id
        if (n.children?.length) {
          const hit = walkByName(n.children)
          if (hit) return hit
        }
      }
      return null
    }
    return walkByName(deviceTreeData.value)
  }

  return {
    deviceTreeData,
    loading,
    selectedDeviceId,
    expandedKeys,
    setSelectedDeviceId,
    setExpandedKeys,
    clearDeviceTreeData,
    resetDeviceTreeState,
    getDefaultWorkshopId,
    loadDeviceTreeData,
    resolveTreeKeyForPoint
  }
})