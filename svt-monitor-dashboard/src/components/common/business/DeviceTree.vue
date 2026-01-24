<template>
  <aside class="device-sidebar">
    <!-- 标题 -->
    <div class="sidebar-header">
      <el-icon :size="20">
        <List />
      </el-icon>
      <h3 class="sidebar-title">设备列表</h3>
    </div>

    <!-- 搜索区域 -->
    <div class="search-area">
      <div class="search-row">
        <!-- 车间搜索 -->
        <div class="search-item">
          <el-input v-model="workshopSearchText" placeholder="搜索车间" size="small" clearable @focus="handleWorkshopFocus"
            @blur="handleWorkshopBlur" @clear="clearWorkshopSearch">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>

          <!-- 车间下拉框 -->
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

        <!-- 设备搜索 -->
        <div class="search-item">
          <el-input v-model="deviceSearchText" placeholder="搜索设备" size="small" clearable
            :disabled="!deviceTreeData.length" @focus="handleDeviceFocus" @blur="handleDeviceBlur"
            @clear="clearDeviceSearch">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>

          <!-- 设备下拉框 -->
          <div v-if="showDeviceDropdown" class="dropdown-menu device-dropdown">
            <div v-for="device in filteredDevices" :key="device.id" class="dropdown-item" @click="selectDevice(device)">
              <span class="device-name">{{ device.name }}</span>
              <span class="workshop-name">（{{ device.workshopName }}）</span>
            </div>

            <div v-if="filteredDevices.length === 0" class="dropdown-empty">
              无匹配设备
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 设备树 -->
    <div class="device-tree-container">
      <el-scrollbar class="tree-scrollbar">
        <el-tree ref="deviceTreeRef" :data="displayTreeData" :props="treeProps" :expand-on-click-node="false"
          :default-expanded-keys="expandedKeys" node-key="id" highlight-current @node-click="handleNodeClick">
          <template #default="{ node, data }">
            <div class="tree-node" :data-type="data.type">
              <!-- 图标 -->
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

              <!-- 名称 -->
              <span class="node-label">{{ node.label }}</span>

              <span v-if="(data.type === 'factory' || data.type === 'workshop') && data.deviceCount" class="node-count">
                <el-tag size="small" type="info">
                  {{ data.deviceCount }}台
                </el-tag>
              </span>

              <span v-if="data.type === 'device' && data.pointCount" class="node-count">
                <el-tag size="small" type="info">
                  {{ data.pointCount }}点
                </el-tag>
              </span>
            </div>
          </template>
        </el-tree>
      </el-scrollbar>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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
  Loading
} from '@element-plus/icons-vue'

import { useDebounce } from '@/composables/useDebounce'

const router = useRouter()

// ==================== 类型定义 ====================
import type { DeviceNode, Workshop, Device } from '@/types/device'

// ==================== 状态管理 ====================
const deviceTreeData = ref<DeviceNode[]>([
  {
    id: 'factory-1',
    name: '主厂区',
    type: 'factory',
    status: 'normal',
    deviceCount: 164,
    pointCount: 532,
    children: [
      {
        id: 'workshop-1',
        name: '车间A',
        type: 'workshop',
        status: 'normal',
        deviceCount: 45,
        pointCount: 180,
        children: [
          {
            id: 'device-101',
            name: '设备1',
            type: 'device',
            status: 'normal',
            pointCount: 12,
            workshopName: '车间A',
            children: [
              { id: 'point-10101', name: '点位1', type: 'point', status: 'normal' },
              { id: 'point-10102', name: '点位2', type: 'point', status: 'normal' }
            ]
          },
          {
            id: 'device-102',
            name: '设备2',
            type: 'device',
            status: 'warning',
            pointCount: 10,
            workshopName: '车间A',
            children: [
              { id: 'point-10201', name: '点位1', type: 'point', status: 'alarm' }
            ]
          },
          {
            id: 'device-103',
            name: '设备11',
            type: 'device',
            status: 'normal',
            pointCount: 8,
            workshopName: '车间A',
            children: [
              { id: 'point-10301', name: '点位1', type: 'point', status: 'normal' }
            ]
          }
        ]
      },
      {
        id: 'workshop-2',
        name: '车间B',
        type: 'workshop',
        status: 'warning',
        deviceCount: 38,
        pointCount: 152,
        children: [
          {
            id: 'device-104',
            name: '设备1',
            type: 'device',
            status: 'normal',
            pointCount: 8,
            workshopName: '车间B',
            children: [
              { id: 'point-10401', name: '点位1', type: 'point', status: 'normal' }
            ]
          },
          {
            id: 'device-105',
            name: '设备3',
            type: 'device',
            status: 'normal',
            pointCount: 15,
            workshopName: '车间B',
            children: [
              { id: 'point-10501', name: '点位1', type: 'point', status: 'normal' }
            ]
          }
        ]
      },
      {
        id: 'workshop-3',
        name: '车间AB',
        type: 'workshop',
        status: 'normal',
        deviceCount: 52,
        pointCount: 208,
        children: [
          {
            id: 'device-106',
            name: '设备5',
            type: 'device',
            status: 'normal',
            pointCount: 9,
            workshopName: '车间AB',
            children: []
          }
        ]
      }
    ]
  }
])

const workshopSearchText = ref<string>('')
const deviceSearchText = ref<string>('')
const showWorkshopDropdown = ref<boolean>(false)
const showDeviceDropdown = ref<boolean>(false)
const selectedWorkshop = ref<Workshop | null>(null)
const selectedDevice = ref<Device | null>(null)

const debouncedWorkshopSearch = useDebounce(workshopSearchText, 400)
const debouncedDeviceSearch = useDebounce(deviceSearchText, 400)

const deviceTreeRef = ref<any>(null)
const expandedKeys = ref<string[]>(['factory-1'])

const treeProps = {
  label: 'name',
  children: 'children'
}

// ==================== 计算属性 ====================
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
    devices = devices.filter(device =>
      device.name.toLowerCase().includes(searchText.toLowerCase())
    )
  }

  return devices
})

const displayTreeData = computed<DeviceNode[]>(() => {
  const workshopSearch = debouncedWorkshopSearch.value
  const deviceSearch = debouncedDeviceSearch.value

  const fullData = JSON.parse(JSON.stringify(deviceTreeData.value))

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
            !device.name.toLowerCase().includes(deviceSearch.toLowerCase())) {
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

    if (factory.children.length === 0) {
      return false
    }
  })

  return resultData
})

const getFirstWorkshopId = (): string | null => {
  if (!displayTreeData.value ||
    !displayTreeData.value.length ||
    !displayTreeData.value[0] ||
    !displayTreeData.value[0].children ||
    !displayTreeData.value[0].children.length) {
    return null
  }
  return displayTreeData.value[0].children![0]?.id || null
}

const getSelectedDeviceWorkshopId = (): string | null => {
  if (selectedDevice.value) {
    return selectedDevice.value.workshopId
  }
  return null
}

// ==================== 搜索相关方法 ====================
const handleWorkshopFocus = () => {
  showWorkshopDropdown.value = true
  showDeviceDropdown.value = false
}

const handleWorkshopBlur = () => {
  setTimeout(() => {
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

const handleDeviceBlur = () => {
  setTimeout(() => {
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
  const keys: string[] = ['factory-1']

  const workshopSearch = debouncedWorkshopSearch.value
  const deviceSearch = debouncedDeviceSearch.value

  if (!workshopSearch && !deviceSearch && !selectedWorkshop.value && !selectedDevice.value) {
    const firstWorkshopId = getFirstWorkshopId()
    if (firstWorkshopId) {
      keys.push(firstWorkshopId)
    }
  }

  else if (deviceSearch && !selectedDevice.value) {
    if (displayTreeData.value[0]?.children) {
      displayTreeData.value[0].children.forEach((workshop: DeviceNode) => {
        if (!keys.includes(workshop.id)) {
          keys.push(workshop.id)
        }
      })
    }
  }

  else if (selectedDevice.value) {
    const selectedDeviceWorkshopId = getSelectedDeviceWorkshopId()
    if (selectedDeviceWorkshopId && !keys.includes(selectedDeviceWorkshopId)) {
      keys.push(selectedDeviceWorkshopId)
    }
  }

  else if (workshopSearch || selectedWorkshop.value) {
    if (displayTreeData.value[0]?.children) {
      displayTreeData.value[0].children.forEach((workshop: DeviceNode) => {
        if (!keys.includes(workshop.id)) {
          keys.push(workshop.id)
        }
      })
    }
  }

  expandedKeys.value = keys
}

// ==================== 树操作函数 ====================
const toggleNode = (node: Node) => {
  if (node.expanded) {
    node.collapse()
  } else {
    node.expand()
  }
}

const handleNodeClick = (data: DeviceNode, node: Node) => {
  if (data.type === 'factory' || data.type === 'workshop') {
    if (node.expanded) {
      node.collapse()
    } else {
      node.expand()
    }
    return
  }

  if (data.type === 'device') {
    node.expand()

    router.push({
      name: 'DeviceDetail',
      params: { id: data.id }
    })
  }

  if (data.type === 'point') {
    const deviceId = node.parent?.data?.id || ''
    router.push({
      name: 'SoundPoint',
      query: { pointId: data.id, deviceId: deviceId }
    })
  }
}

// ==================== 生命周期和监听 ====================
onMounted(() => {
  console.log('设备列表组件已加载')

  const firstWorkshopId = getFirstWorkshopId()
  if (firstWorkshopId) {
    expandedKeys.value = ['factory-1', firstWorkshopId]
  } else {
    expandedKeys.value = ['factory-1']
  }
})

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
  () => {
    nextTick(() => {
      updateExpandedKeys()
    })
  }
)

watch(displayTreeData, () => {
  updateExpandedKeys()
}, { deep: true })
</script>

<style lang="scss" scoped>
.device-sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: olive;

  .sidebar-header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;

    .sidebar-title {
      margin: 0;
      font-size: clamp(16px, 2.5vw, 18px);
      /* 响应式字体大小 */
      font-weight: 600;
    }
  }

  .search-area {
    padding: 16px 20px;
    flex-shrink: 0;

    .search-row {
      display: flex;
      gap: 10px;
      align-items: flex-start;

      .search-item {
        flex: 1;
        position: relative;

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          border: 1px solid #e4e7ed;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
          z-index: 2000;
          margin-top: 4px;
          max-height: 300px;
          overflow-y: auto;

          .dropdown-item {
            padding: 8px 12px;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: clamp(12px, 2vw, 14px);
            /* 响应式字体大小 */
            display: flex;
            align-items: center;

            &:hover {
              background-color: #f5f7fa;
            }

            .device-name {
              font-weight: 500;
            }

            .workshop-name {
              font-size: clamp(10px, 1.5vw, 12px);
              /* 响应式字体大小 */
              margin-left: 4px;
              flex-shrink: 0;
            }
          }

          .dropdown-empty {
            padding: 12px;
            text-align: center;
            font-size: clamp(12px, 2vw, 14px);
            /* 响应式字体大小 */
          }
        }
      }
    }
  }

  .device-tree-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .tree-scrollbar {
      flex: 1;
      padding: 10px 20px;

      :deep(.el-tree) {
        background: transparent;

        .el-tree-node {
          margin: 4px 0;
        }

        .el-tree-node__content {
          height: 40px;
          transition: all 0.2s;
          cursor: pointer;

          &:hover {
            background: #f5f7fa;
          }
        }

        .el-tree-node.is-current>.el-tree-node__content {

          &[data-type="device"],
          &[data-type="point"] {
            background: #ecf5ff;
            border: 1px solid #b3d8ff;
          }

          &[data-type="factory"],
          &[data-type="workshop"] {
            background: transparent;
            border: none;
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
      color: #fff;

      .expand-icon {
        cursor: pointer;
        transition: transform 0.2s;
        font-size: clamp(12px, 2vw, 14px);
        /* 响应式字体大小 */
        color: #409eff;

        &:hover {
          color: #1a5fb4;
        }
      }

      .node-icon {
        display: flex;
        align-items: center;
        color: #409eff;
        flex-shrink: 0;

        .el-icon {
          font-size: clamp(14px, 2.5vw, 16px);
          /* 响应式字体大小 */
        }
      }

      .node-label {
        flex: 1;
        font-size: clamp(12px, 2vw, 14px);
        /* 响应式字体大小 */
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .node-count {
        margin-left: 8px;
        flex-shrink: 0;
        color: black;
      }
    }
  }
}

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
</style>
