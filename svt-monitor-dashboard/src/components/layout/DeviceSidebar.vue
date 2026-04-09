<template>
  <aside class="device-sidebar">
    <div class="sidebar-header home-title home-title--device-list">
      <div class="sidebar-header__left home-title__left">
        <img class="sidebar-header__icon home-title__icon" src="@/assets/images/background/小图标.png" alt="" />
        <div class="title-with-legend">
          <h3 class="app-section-title">设备列表</h3>
        </div>
      </div>
    </div>

    <div class="search-area">
      <div class="search-row">
        <div class="search-item">
          <el-input v-model="workshopSearchText" placeholder="搜索车间" size="small" clearable @focus="handleWorkshopFocus"
            @blur="handleWorkshopBlur" @clear="clearWorkshopSearch" class="custom-search-input">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>

          <div v-if="showWorkshopDropdown" class="dropdown-menu workshop-dropdown">
            <div v-for="workshop in filteredWorkshops" :key="workshop.id" class="dropdown-item"
              @click="selectWorkshop(workshop)">
              {{ workshop.name }}
            </div>
            <div v-if="filteredWorkshops.length === 0" class="dropdown-empty">
              无匹配车间
            </div>
          </div>
        </div>

        <div class="search-item">
          <el-input v-model="deviceSearchText" placeholder="搜索设备" size="small" clearable
            :disabled="!deviceTreeData.length" @focus="handleDeviceFocus" @blur="handleDeviceBlur"
            @clear="clearDeviceSearch" class="custom-search-input">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>

          <div v-if="showDeviceDropdown" class="dropdown-menu device-dropdown">
            <div v-for="device in filteredDevices" :key="device.id" class="dropdown-item device-dropdown-item"
              @click="selectDevice(device)">
              <span class="device-name">
                {{ device.name }}
                <span v-if="device.customerDeviceId">({{ device.customerDeviceId }})</span>
              </span>
              <span class="workshop-name">({{ device.workshopName }})</span>
            </div>

            <div v-if="filteredDevices.length === 0" class="dropdown-empty">
              无匹配设备
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="device-tree-container">
      <el-scrollbar class="tree-scrollbar">
        <div v-if="!deviceTreeStore.loading && displayTreeData.length === 0" class="no-data">
          <CommonEmptyState size="small" />
        </div>
        <el-tree v-else ref="deviceTreeRef" :data="displayTreeData" :props="treeProps" :expand-on-click-node="false"
          :highlight-current="false" :default-expanded-keys="expandedKeys" node-key="id" @node-click="handleNodeClick">
          <template #default="{ node, data }">
            <div class="tree-node" :data-type="data.type" :class="{ 'is-selected': isNodeSelected(data) }">
              <el-icon v-if="node.childNodes && node.childNodes.length > 0" class="expand-icon no-select"
                @mousedown.prevent @click.stop="handleExpandIconClick(node)">
                <arrow-down v-if="node.expanded" />
                <arrow-right v-else />
              </el-icon>

              <div class="node-icon">
                <el-icon v-if="data.type === 'factory'">
                  <OfficeBuilding />
                </el-icon>
                <el-icon v-else-if="data.type === 'workshop'">
                  <HomeFilled />
                </el-icon>
                <el-icon v-else-if="data.type === 'device'">
                  <Cpu />
                </el-icon>
                <el-icon v-else>
                  <Location />
                </el-icon>
              </div>

              <span class="node-label"
                :title="data.type === 'device' && data.customerDeviceId ? `${data.name} (${data.customerDeviceId})` : node.label">
                {{ data.type === 'device' && data.customerDeviceId ? `${data.name} (${data.customerDeviceId})` :
                  node.label }}
              </span>

              <!-- <span v-if="(data.type === 'factory' || data.type === 'workshop') && data.deviceCount" class="node-count">
                <el-tag size="small" type="info">
                  {{ data.deviceCount }}台
                </el-tag>
              </span>

              <span v-if="data.type === 'device' && data.pointCount" class="node-count">
                <el-tag size="small" type="info">
                  {{ data.pointCount }}点
                </el-tag>
              </span> -->
            </div>
          </template>
        </el-tree>
      </el-scrollbar>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type Node from 'element-plus/es/components/tree/src/model/node'
import {
  List,
  OfficeBuilding,
  HomeFilled,
  Cpu,
  Location,
  Search,
  Loading,
  ArrowRight,
  ArrowDown,
  Refresh
} from '@element-plus/icons-vue'

import { useDebounce } from '@/composables/useDebounce'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue'

const router = useRouter()


const selectDeviceNode = (deviceId: string) => {
  if (deviceTreeRef.value && deviceTreeRef.value.getNode && deviceTreeRef.value.setCurrentKey) {

    const expandParentNodes = (nodeId: string) => {
      try {
        const node = deviceTreeRef.value.getNode(nodeId)
        if (node && node.parent && node.parent.key !== undefined) {
          deviceTreeRef.value.expandNode && deviceTreeRef.value.expandNode(node.parent.key)
          expandParentNodes(node.parent.key)
        }
      } catch (e) {
        console.warn('展开父节点时出错:', e)
      }
    }


    const findAndSelectNode = (nodes: DeviceNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === deviceId) {

          expandParentNodes(node.id)

          try {
            deviceTreeRef.value.setCurrentKey(deviceId)
          } catch (e) {
            console.warn('设置当前节点时出错:', e)
          }
          return true
        }

        if (node.children) {
          if (findAndSelectNode(node.children)) {
            return true
          }
        }
      }
      return false
    }

    try {
      findAndSelectNode(deviceTreeData.value)
    } catch (e) {
      console.warn('查找和选中节点时出错:', e)
    }
  }
}




import type { DeviceNode, Workshop, Device } from '@/types/device'

const deviceTreeStore = useDeviceTreeStore()
const deviceTreeData = computed(() => deviceTreeStore.deviceTreeData)
const selectedDeviceId = computed(() => deviceTreeStore.selectedDeviceId)
const scrollSelectedNodeIntoView = () => {
  const tree = deviceTreeRef.value
  const treeEl = tree?.$el as HTMLElement | undefined
  if (!treeEl) return

  const selectedNode = treeEl.querySelector('.tree-node.is-selected')
  const contentEl = (selectedNode?.closest('.el-tree-node__content') ?? selectedNode) as HTMLElement | null
  if (!contentEl) return

  contentEl.scrollIntoView({
    block: 'nearest',
    inline: 'nearest'
  })
}

const updateSelection = async (newId: string | null) => {
  await nextTick()
  const tree = deviceTreeRef.value
  if (!tree || typeof tree.setCurrentKey !== 'function') return
  try {
    tree.setCurrentKey(newId || null)
    requestAnimationFrame(() => {
      scrollSelectedNodeIntoView()
    })
  } catch (e) {
    console.warn('更新设备树选中状态失败:', e)
  }
}


const updateExpansion = async (newKeys: string[]) => {
  await nextTick()
  const tree = deviceTreeRef.value
  if (!newKeys || !tree || typeof tree.setExpandedKeys !== 'function') return
  try {
    tree.setExpandedKeys(newKeys)
    requestAnimationFrame(() => {
      scrollSelectedNodeIntoView()
    })
  } catch (e) {
    console.warn('更新设备树展开状态失败:', e)
  }
}

let timeoutId: number | null = null;

onMounted(async () => {
  await nextTick();

  const expandDefaultNodes = () => {
    timeoutId = window.setTimeout(() => {
      if ((deviceTreeStore.expandedKeys ?? []).length > 0) return
      const firstFactoryId = displayTreeData.value?.[0]?.id
      const firstWorkshopId = getFirstWorkshopId()
      const keys: string[] = []
      if (firstFactoryId) keys.push(firstFactoryId)
      if (firstWorkshopId) keys.push(firstWorkshopId)
      deviceTreeStore.setExpandedKeys(keys)
    }, 100)
  }

  if (deviceTreeStore.deviceTreeData && deviceTreeStore.deviceTreeData.length > 0) {
    expandDefaultNodes()
  } else {
    const stopWatch = watch(
      () => deviceTreeStore.deviceTreeData,
      (newData) => {
        if (newData && newData.length > 0) {
          stopWatch()
          expandDefaultNodes()
        }
      },
      { immediate: false }
    )
  }

  watch(selectedDeviceId, updateSelection, { immediate: true })

  watch(deviceTreeStore.expandedKeys, updateExpansion, { immediate: true })
})

const workshopSearchText = ref<string>('')
const deviceSearchText = ref<string>('')
const showWorkshopDropdown = ref<boolean>(false)
const showDeviceDropdown = ref<boolean>(false)
const selectedWorkshop = ref<Workshop | null>(null)
const selectedDevice = ref<Device | null>(null)

const debouncedWorkshopSearch = useDebounce(workshopSearchText, 400)
const debouncedDeviceSearch = useDebounce(deviceSearchText, 400)

const deviceTreeRef = ref<any>(null)
const expandedKeys = computed(() => deviceTreeStore.expandedKeys)

const treeProps = {
  label: 'name',
  children: 'children'
}


const allWorkshops = computed<Workshop[]>(() => {
  const workshops: Workshop[] = []
  deviceTreeData.value.forEach(factory => {
    factory.children?.forEach(workshop => {
      workshops.push({
        id: workshop.id,
        name: workshop.name
      })
    })
  })
  return workshops
})

const filteredWorkshops = computed<Workshop[]>(() => {
  const searchText = debouncedWorkshopSearch.value
  if (!searchText) {
    return allWorkshops.value
  }
  return allWorkshops.value.filter(workshop =>
    workshop.name.toLowerCase().includes(searchText.toLowerCase())
  )
})

const allDevices = computed<Device[]>(() => {
  const devices: Device[] = []
  deviceTreeData.value.forEach(factory => {
    factory.children?.forEach(workshop => {
      workshop.children?.forEach(device => {
        devices.push({
          id: device.id,
          name: device.name,
          workshopId: workshop.id,
          workshopName: workshop.name,
          customerDeviceId: device.customerDeviceId,
          deviceNode: device
        })
      })
    })
  })
  return devices
})

const filteredDevices = computed<Device[]>(() => {
  let devices = allDevices.value

  if (selectedWorkshop.value) {
    devices = devices.filter(device => device.workshopId === selectedWorkshop.value!.id)
  }

  const searchText = debouncedDeviceSearch.value
  if (searchText) {
    const lower = searchText.toLowerCase()
    devices = devices.filter(device =>
      device.name.toLowerCase().includes(lower) ||
      (device.customerDeviceId && device.customerDeviceId.toLowerCase().includes(lower))
    )
  }

  return devices
})

const displayTreeData = computed<DeviceNode[]>(() => {
  const workshopSearch = debouncedWorkshopSearch.value
  const deviceSearch = debouncedDeviceSearch.value

  const fullData = JSON.parse(JSON.stringify(deviceTreeStore.deviceTreeData))

  const calculateCounts = (nodes: DeviceNode[]) => {
    nodes.forEach(node => {
      if (node.children) {
        if (node.type === 'factory') {
          let totalDeviceCount = 0
          let totalPointCount = 0
          node.children.forEach(workshop => {
            if (workshop.children) {
              const workshopDeviceCount = workshop.children.filter(child => child.type === 'device').length
              totalDeviceCount += workshopDeviceCount

              workshop.children.forEach(device => {
                if (device.children) {
                  totalPointCount += device.children.length
                  if (device.pointCount !== device.children.length) {
                    device.pointCount = device.children.length
                  }
                }
              })
            }
          })
          if (node.deviceCount !== totalDeviceCount || node.pointCount !== totalPointCount) {
            node.deviceCount = totalDeviceCount
            node.pointCount = totalPointCount
          }
        } else if (node.type === 'workshop') {
          const devices = node.children.filter(child => child.type === 'device')
          const deviceCount = devices.length

          let totalPointCount = 0
          node.children.forEach(device => {
            if (device.children) {
              totalPointCount += device.children.length
              if (device.pointCount !== device.children.length) {
                device.pointCount = device.children.length
              }
            }
          })

          if (node.deviceCount !== deviceCount || node.pointCount !== totalPointCount) {
            node.deviceCount = deviceCount
            node.pointCount = totalPointCount
          }
        } else if (node.type === 'device') {
          if (node.children) {
            const pointCount = node.children.length
            if (node.pointCount !== pointCount) {
              node.pointCount = pointCount
            }
          }
        }

        calculateCounts(node.children)
      }
    })
  }

  calculateCounts(fullData)

  if (!workshopSearch && !deviceSearch && !selectedWorkshop.value && !selectedDevice.value) {
    return fullData
  }

  const resultData = JSON.parse(JSON.stringify(deviceTreeData.value));

  calculateCounts(resultData);

  resultData.forEach((factory: DeviceNode) => {
    if (!factory.children) return

    factory.children = factory.children.filter((workshop: DeviceNode) => {
      if (selectedWorkshop.value && workshop.id !== selectedWorkshop.value.id) {
        return false
      }

      if (workshopSearch &&
        !workshop.name.toLowerCase().includes(workshopSearch.toLowerCase())) {
        return false
      }

      if (workshop.children) {
        workshop.children = workshop.children.filter((device: DeviceNode) => {
          if (selectedDevice.value && device.id !== selectedDevice.value.id) {
            return false
          }

          if (deviceSearch &&
            !device.name.toLowerCase().includes(deviceSearch.toLowerCase()) &&
            !(device.customerDeviceId && device.customerDeviceId.toLowerCase().includes(deviceSearch.toLowerCase()))) {
            return false
          }

          return true
        })
      }

      if (deviceSearch && (!workshop.children || workshop.children.length === 0)) {
        return false
      }

      return true
    })
  })


  return resultData.filter((factory: DeviceNode) => factory.children && factory.children.length > 0)
})

const getFirstWorkshopId = (): string | null => {
  if (!displayTreeData.value ||
    !displayTreeData.value.length ||
    !displayTreeData.value[0] ||
    !displayTreeData.value[0].children ||
    !displayTreeData.value[0].children.length) {
    return null
  }

  const firstWorkshop = displayTreeData.value[0].children!.find(child => child.type === 'workshop');
  return firstWorkshop?.id || null
}

const getSelectedDeviceWorkshopId = (): string | null => {
  if (selectedDevice.value) {
    return selectedDevice.value.workshopId
  }
  return null

}

const getFactoryIdByWorkshopId = (workshopId: string): string | null => {
  for (const factory of deviceTreeData.value) {
    const workshop = factory.children?.find(child => child.type === 'workshop' && child.id === workshopId)
    if (workshop) return factory.id
  }
  return null
}

const collectAllFactoryAndWorkshopKeys = (data: DeviceNode[]): string[] => {
  const keys: string[] = []
  for (const factory of data) {
    keys.push(factory.id)
    factory.children?.forEach(child => {
      if (child.type === 'workshop') {
        keys.push(child.id)
      }
    })
  }
  return keys
}

const collectAllNodeKeys = (data: DeviceNode[]): Set<string> => {
  const keys = new Set<string>()
  const walk = (nodes: DeviceNode[]) => {
    for (const node of nodes) {
      keys.add(node.id)
      if (node.children?.length) {
        walk(node.children)
      }
    }
  }
  walk(data)
  return keys
}



const handleWorkshopFocus = () => {
  showWorkshopDropdown.value = true
  showDeviceDropdown.value = false
}

let workshopBlurTimerId: number | null = null;

const handleWorkshopBlur = () => {
  if (workshopBlurTimerId) {
    clearTimeout(workshopBlurTimerId);
  }
  workshopBlurTimerId = window.setTimeout(() => {
    showWorkshopDropdown.value = false
  }, 200)
}

const clearWorkshopSearch = () => {
  selectedWorkshop.value = null
  if (deviceSearchText.value) {
    selectedDevice.value = null
    deviceSearchText.value = ''
  }
  updateExpandedKeys()
}

const selectWorkshop = (workshop: Workshop) => {
  selectedWorkshop.value = workshop
  workshopSearchText.value = workshop.name
  selectedDevice.value = null
  deviceSearchText.value = ''
  showWorkshopDropdown.value = false

  updateExpandedKeys()
}

const handleDeviceFocus = () => {
  showDeviceDropdown.value = true
  showWorkshopDropdown.value = false
}

let deviceBlurTimerId: number | null = null;

const handleDeviceBlur = () => {
  if (deviceBlurTimerId) {
    clearTimeout(deviceBlurTimerId);
  }
  deviceBlurTimerId = window.setTimeout(() => {
    showDeviceDropdown.value = false
  }, 200)
}

const clearDeviceSearch = () => {
  selectedDevice.value = null
  updateExpandedKeys()
}

const selectDevice = (device: Device) => {
  selectedDevice.value = device
  deviceSearchText.value = device.name

  showDeviceDropdown.value = false

  updateExpandedKeys()
}

const updateExpandedKeys = () => {
  const keys: string[] = []

  const workshopSearch = debouncedWorkshopSearch.value
  const deviceSearch = debouncedDeviceSearch.value

  if (!workshopSearch && !deviceSearch && !selectedWorkshop.value && !selectedDevice.value) {
    const validNodeKeys = collectAllNodeKeys(displayTreeData.value)
    const currentExpandedKeys = deviceTreeStore.expandedKeys ?? []
    const persistedKeys = currentExpandedKeys.filter((k) => validNodeKeys.has(k))

    if (persistedKeys.length > 0) {
      deviceTreeStore.setExpandedKeys(persistedKeys)
      return
    }

    const firstFactoryId = displayTreeData.value?.[0]?.id
    if (firstFactoryId) keys.push(firstFactoryId)
    const firstWorkshopId = getFirstWorkshopId()
    if (firstWorkshopId) {
      keys.push(firstWorkshopId)
    }
  }

  else if (deviceSearch && !selectedDevice.value) {

    collectAllFactoryAndWorkshopKeys(displayTreeData.value).forEach(k => {
      if (!keys.includes(k)) keys.push(k)
    })
  }

  else if (selectedDevice.value) {
    const selectedDeviceWorkshopId = getSelectedDeviceWorkshopId()
    if (selectedDeviceWorkshopId && !keys.includes(selectedDeviceWorkshopId)) {
      keys.push(selectedDeviceWorkshopId)
    }
    const factoryId = selectedDeviceWorkshopId ? getFactoryIdByWorkshopId(selectedDeviceWorkshopId) : null
    if (factoryId && !keys.includes(factoryId)) {
      keys.push(factoryId)
    }
  }

  else if (workshopSearch || selectedWorkshop.value) {

    collectAllFactoryAndWorkshopKeys(displayTreeData.value).forEach(k => {
      if (!keys.includes(k)) keys.push(k)
    })
  }

  deviceTreeStore.setExpandedKeys(keys)
}


const toggleNode = (node: Node) => {
  if (node.expanded) {
    node.collapse()
  } else {
    node.expand()
  }

  syncExpandedKeys()
}


const syncExpandedKeys = () => {
  nextTick(() => {
    if (deviceTreeRef.value && deviceTreeRef.value.getExpandedKeys) {
      const currentExpandedKeys = deviceTreeRef.value.getExpandedKeys()
      deviceTreeStore.setExpandedKeys(currentExpandedKeys)
    }
  })
}

const handleExpandIconClick = (node: Node) => {

  toggleNode(node)
}

const handleNodeClick = (data: DeviceNode, node: Node) => {

  if (data.type === 'factory' || data.type === 'workshop') {
    toggleNode(node)
    return
  }


  if (data.type === 'device') {
    deviceTreeStore.setSelectedDeviceId(data.id)
    router.push({
      name: 'DeviceDetail',
      params: { id: data.id }
    })
  }


  if (data.type === 'point') {
    deviceTreeStore.setSelectedDeviceId(data.id)
    const receiverId = data.receiverId ?? ''
    if (!receiverId) {
      ElMessage.warning('该点位缺少 receiverId，无法进入点位页')
      return
    }


    const equipmentId = node.parent?.data?.id || ''
    router.push({
      name: 'SoundPoint',

      params: { receiverId },
      query: { equipmentId }
    })
  }
}


const isNodeSelected = (data: DeviceNode): boolean => {
  if (data.type !== 'device' && data.type !== 'point') {
    return false
  }
  return deviceTreeStore.selectedDeviceId === data.id
}



watch(
  () => debouncedWorkshopSearch.value,
  () => {
    nextTick(() => {
      updateExpandedKeys()
    })
  }
)

watch(
  () => debouncedDeviceSearch.value,
  (newVal) => {


    const keyword = (newVal ?? '').trim()
    if (!keyword) {
      selectedDevice.value = null
    } else if (selectedDevice.value) {
      const lower = keyword.toLowerCase()
      const nameLower = (selectedDevice.value.name ?? '').toLowerCase()
      const customerIdLower = (selectedDevice.value.customerDeviceId ?? '').toLowerCase()
      if (lower !== nameLower && (!customerIdLower || lower !== customerIdLower)) {
        selectedDevice.value = null
      }
    }

    nextTick(() => {
      updateExpandedKeys()
    })
  }
)

watch(displayTreeData, () => {
  updateExpandedKeys()
  if (selectedDeviceId.value) {
    // 刷新后设备树异步回填时，补一次选中与滚动，确保目标节点进入可视区
    void updateSelection(selectedDeviceId.value)
  }
}, { deep: true })

onUnmounted(() => {

  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  if (workshopBlurTimerId) {
    clearTimeout(workshopBlurTimerId);
    workshopBlurTimerId = null;
  }

  if (deviceBlurTimerId) {
    clearTimeout(deviceBlurTimerId);
    deviceBlurTimerId = null;
  }
})
</script>

<style lang="scss" scoped>
.device-sidebar {
  width: 25%;
  min-width: 200px;
  max-width: 400px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 10px 0 0;

  .sidebar-header {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: flex-start;
    height: auto;

  }

  .search-area {
    padding: 10px 10px 0;
    flex-shrink: 0;

    .search-row {
      display: flex;
      gap: 10px;
      align-items: flex-start;

      .search-item {
        flex: 1;
        position: relative;

        .custom-search-input {
          :deep(.el-input__wrapper) {
            height: 24px;
            border-radius: 4px;

            .el-input__inner {
              background: transparent;
              font-size: 12px;
              line-height: 22px;
            }
          }

          :deep(.el-input__prefix) {
            font-size: 12px;
          }
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background-color: #fff;
          border-top: none;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
          z-index: 2000;
          margin-top: 4px;
          max-height: 300px;
          overflow-y: auto;

          .dropdown-item {
            padding: 8px 12px;
            cursor: pointer;
            transition: background-color 0.2s;

            font-size: 12px;
            line-height: 1.25;
            display: flex;
            align-items: center;
            color: #606266;

            &:hover {
              background-color: #ccc;
            }

            .workshop-name {

              margin-left: 4px;
              flex-shrink: 0;
            }
          }

          &.device-dropdown .device-dropdown-item {
            flex-direction: column;
            align-items: flex-start;
            line-height: 1.2;
            text-align: left;

            .device-name {
              display: block;
            }

            .workshop-name {
              margin-left: 0;
              display: block;
            }
          }

          .dropdown-empty {
            padding: 12px;
            text-align: center;

            font-size: 12px;
            line-height: 1.25;
            color: white;
          }
        }
      }
    }
  }

  .device-tree-container {
    padding: 10px 10px 20px;
    background: url('@/assets/images/background/首页-设备列表背景.png') no-repeat center center;
    background-size: 100% 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;

    .node-label {
      font-size: 0.9rem;
    }

    .no-data {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.7);
    }

    .tree-scrollbar {
      flex: 1;
      height: 100%;
      min-height: 0;

      :deep(.el-scrollbar__view) {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      :deep(.el-tree) {
        background: transparent;

        .el-tree-node__expand-icon {
          display: none;
        }

        .el-tree-node {
          margin: 4px 0;
        }

        .el-tree-node__content {
          height: 40px;
          border-radius: 6px;
          background: url('@/assets/images/background/设备树行背景.png') no-repeat center center;
          background-size: 100% 100%;
          background-color: transparent;
          transition: all 0.2s;
          cursor: pointer;

          &:hover {
            background-color: rgba(150, 150, 150, 0.1);
          }
        }

        .el-tree-node.is-current>.el-tree-node__content,
        .el-tree-node:focus>.el-tree-node__content {
          background-color: transparent !important;
        }

        .el-tree-node__content:has(.tree-node.is-selected) {
          background-image: url('@/assets/images/background/设备树选中行背景.png') !important;
          background-repeat: no-repeat !important;
          background-size: 100% 100% !important;
          background-color: transparent !important;
        }
      }
    }
  }

  .tree-node {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 2px 0;

    color: rgba(255, 255, 255, 1);

    .expand-icon {
      cursor: pointer;
      transition: transform 0.2s;


      color: rgba(255, 255, 255, 1) !important;
    }

    .no-select {
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }

    :deep(.el-tree-node__content) {
      .expand-icon {
        pointer-events: auto;
      }
    }

    .node-icon {
      display: flex;
      align-items: center;

      color: rgba(255, 255, 255, 1) !important;
      flex-shrink: 0;

      .el-icon {
        color: inherit !important;
      }
    }

    .node-label {
      flex: 1;

      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      color: rgba(255, 255, 255, 1);
    }

    .node-count {
      margin-left: 8px;
      flex-shrink: 0;

      color: rgba(255, 255, 255, 1);
    }
  }
}
</style>
@keyframes rotate {
from {
transform: rotate(0deg);
}

to {
transform: rotate(360deg);
}
}

@media (max-width: 1400px) {
.device-sidebar {

.sidebar-header,
.search-area {
padding-left: 16px;
padding-right: 16px;
}

.tree-scrollbar {
padding: 10px 16px;
}
}
}