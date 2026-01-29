import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { DeviceNode } from '@/types/device'
import { getDeviceTreeData, transformDeviceTreeData, type DeviceTreeResponse } from '@/api/modules/deviceTree'

export const useDeviceTreeStore = defineStore('deviceTree', () => {
  // 设备树数据
  const deviceTreeData = ref<DeviceNode[]>([])
  
  // 加载状态
  const loading = ref(false)
  
  // 从API加载设备树数据
  const loadDeviceTreeData = async () => {
    try {
      console.log('开始加载设备树数据...');
      loading.value = true;
      const response = await getDeviceTreeData();
      console.log('收到API响应，开始转换数据...', response);
      const transformedData = transformDeviceTreeData(response);
      console.log('数据转换完成，更新设备树...', transformedData);
      deviceTreeData.value = transformedData;
      console.log('设备树数据更新完成，共有', transformedData.length, '个顶层节点');
    } catch (error) {
      console.error('加载设备树数据失败:', error);
      // 可以选择显示错误信息给用户
      // 或者保持现有数据不变
    } finally {
      loading.value = false;
    }
  };
  
  // 初始化时加载设备树数据
  void loadDeviceTreeData();

  // 当前选中的设备ID
  const selectedDeviceId = ref<string | null>(null)

  // 展开的节点
  const expandedKeys = ref<string[]>(['factory-1'])

  // 设置选中的设备ID
  const setSelectedDeviceId = (id: string | null) => {
    selectedDeviceId.value = id
  }

  // 设置展开的节点
  const setExpandedKeys = (keys: string[]) => {
    expandedKeys.value = keys
  }

  // 重置设备树到初始状态
  const resetDeviceTreeState = () => {
    selectedDeviceId.value = null
    expandedKeys.value = ['factory-1']  // 默认展开第一个工厂节点
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
    selectedDeviceId,
    expandedKeys,
    setSelectedDeviceId,
    setExpandedKeys,
    resetDeviceTreeState,
    getDefaultWorkshopId,
    loadDeviceTreeData
  }
})