import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { DeviceNode } from '@/types/device'
import { getDeviceTreeData, transformDeviceTreeData, type DeviceTreeResponse } from '@/api/modules/deviceTree'
import { getTenantId } from '@/api/tenant'

export const useDeviceTreeStore = defineStore('deviceTree', () => {
  // 设备树数据
  const deviceTreeData = ref<DeviceNode[]>([])
  
  // 加载状态
  const loading = ref(false)
  
  // 从API加载设备树数据
  const loadDeviceTreeData = async () => {
    try {
      loading.value = true;
      const response = await getDeviceTreeData();
      const transformedData = transformDeviceTreeData(response);
      deviceTreeData.value = transformedData;
    } catch (error) {
      
    } finally {
      loading.value = false;
    }
  };
  
  // 初始化时加载设备树数据：
  // 登录进入 dashboard 的极短时间内若 tenantId 尚未写入 localStorage，
  // 会导致首次请求拿不到正确 tenantId；因此做一个轻量重试。
  const loadWithTenantRetry = () => {
    const tryLoad = async () => {
      const tId = getTenantId()
      if (!tId) return false
      await loadDeviceTreeData()
      return true
    }

    void (async () => {
      // 先尝试一次
      const ok = await tryLoad()
      if (ok) return

      // 再尝试两次（总共约 1s 内），避免“登录后看不到 tree 请求”
      await new Promise((r) => setTimeout(r, 250))
      const ok2 = await tryLoad()
      if (ok2) return

      await new Promise((r) => setTimeout(r, 750))
      void tryLoad()
    })()
  }

  loadWithTenantRetry()

  // 当前选中的设备ID
  const selectedDeviceId = ref<string | null>(null)

  // 展开的节点
  // 注意：不能在此处硬编码固定 key（否则在工厂/车间数据变化时可能展开错误节点）
  const expandedKeys = ref<string[]>([])

  // 设置选中的设备ID
  const setSelectedDeviceId = (id: string | null) => {
    selectedDeviceId.value = id
  }

  // 设置展开的节点
  const setExpandedKeys = (keys: string[]) => {
    expandedKeys.value = keys
  }

  // 清空设备树数据（用于退出登录/重新登录后强制刷新）
  const clearDeviceTreeData = () => {
    deviceTreeData.value = []
    selectedDeviceId.value = null
    expandedKeys.value = []
  }

  // 重置设备树到初始状态
  const resetDeviceTreeState = () => {
    selectedDeviceId.value = null
    const firstFactoryId = deviceTreeData.value?.[0]?.id
    const firstWorkshopId = getDefaultWorkshopId()
    const keys: string[] = []
    if (firstFactoryId) keys.push(firstFactoryId)
    if (firstWorkshopId) keys.push(firstWorkshopId)
    expandedKeys.value = keys
  }

  // 获取默认展开的第一个车间ID
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