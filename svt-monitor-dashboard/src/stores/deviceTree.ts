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
    loadDeviceTreeData
  }
})