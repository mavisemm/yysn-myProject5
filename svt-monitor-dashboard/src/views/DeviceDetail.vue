<template>
  <div class="device-detail">
    <el-tabs v-model="activeTab" class="device-detail-tabs">
      <el-tab-pane label="设备详情" name="screen">
        <DeviceScreenPanel
          v-if="equipmentId"
          :equipment-id="equipmentId"
          :point-list="pointList"
          :selected-point-id="selectedPointId"
          :point-metrics-map="pointMetricsMap"
          :points-loading="pointMetricsLoading"
          @point-selected="onScreenPointSelected"
        />
      </el-tab-pane>
      <el-tab-pane label="设备分析" name="trend">
        <keep-alive>
          <ChartsAnalysisModule
            v-if="equipmentId"
            :key="equipmentId"
            ref="chartsAnalysisRef"
            :point-list="pointList"
            :selected-point-id="selectedPointId"
            :equipment-id="equipmentId"
            @update:selected-point-id="onChartsSelectedPointChange"
            @session-change="onChartsSessionChange"
          />
        </keep-alive>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { watch, ref, computed, onMounted, nextTick } from 'vue'
import { ElTabs, ElTabPane } from 'element-plus'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import {
  getCheckPointsByEquipmentId,
  normalizeEquipmentCheckPointList,
} from '@/api/modules/hardware'
import {
  buildPointMetricsMap,
  getCheckPointDisplayName,
  getCheckPointReceiverId,
  type PointCardMetrics,
} from '@/components/business/device-detail/devicePointMetrics'
import DeviceScreenPanel from '@/components/business/device-detail/DeviceScreenPanel.vue'
import ChartsAnalysisModule from '@/components/business/device-detail/ChartsAnalysisModule.vue'
import type {
  ChartsAnalysisViewKey,
  ChartsAnalysisSessionPayload,
} from '@/components/business/device-detail/chartsAnalysisTypes'
import type { DeviceDetailPointInfo } from '@/components/business/device-detail/deviceDetailTypes'
import { sortPointsByPointOrder } from '@/components/business/device-detail/deviceDetailPoints'

const route = useRoute()
const router = useRouter()
const deviceTreeStore = useDeviceTreeStore()

let syncingTabFromRoute = false

const activeTab = ref('screen')
const pointList = ref<DeviceDetailPointInfo[]>([])
const pointMetricsMap = ref<Record<string, PointCardMetrics>>({})
const pointMetricsLoading = ref(false)
const selectedPointId = ref('')
const chartsAnalysisRef = ref<InstanceType<typeof ChartsAnalysisModule> | null>(null)
const lastTrendSession = ref<ChartsAnalysisSessionPayload | null>(null)

const equipmentId = computed<string | null>(() => {
  const q = route.query.equipmentId
  const qId = Array.isArray(q) ? q[0] : q
  if (typeof qId === 'string' && qId) return qId

  const p = route.params.id
  const pId = Array.isArray(p) ? p[0] : p
  if (typeof pId === 'string' && pId) return pId

  return null
})

const readQueryString = (key: string): string => {
  const raw = route.query[key]
  if (typeof raw === 'string') return raw.trim()
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim()
  return ''
}

const syncSelectedPoint = () => {
  if (pointList.value.length === 0) {
    selectedPointId.value = ''
    return
  }
  const fromQuery = readQueryString('receiverId')
  if (fromQuery && pointList.value.some((p) => p.id === fromQuery)) {
    selectedPointId.value = fromQuery
    return
  }
  if (!selectedPointId.value || !pointList.value.some((p) => p.id === selectedPointId.value)) {
    selectedPointId.value = pointList.value[0]?.id ?? ''
  }
}

const syncTreeDeviceSelection = () => {
  if (!equipmentId.value) return
  deviceTreeStore.setSelectedDeviceId(equipmentId.value)
}

const syncTreePointSelection = (receiverId: string) => {
  if (!receiverId || !equipmentId.value) return
  const point = pointList.value.find((p) => p.id === receiverId)
  const treeKey = deviceTreeStore.resolveTreeKeyForPoint(receiverId, equipmentId.value, {
    pointName: point?.name,
  })
  if (treeKey) {
    deviceTreeStore.setSelectedDeviceId(treeKey)
  }
}

const onChartsSelectedPointChange = (pointId: string) => {
  if (!pointId) return
  selectedPointId.value = pointId
  syncTreePointSelection(pointId)
}

const onChartsSessionChange = (payload: ChartsAnalysisSessionPayload) => {
  lastTrendSession.value = payload
  if (activeTab.value !== 'trend') return
  selectedPointId.value = payload.receiverId
  syncTreePointSelection(payload.receiverId)
}

const pickTrendSession = (): ChartsAnalysisSessionPayload | null => {
  const live = chartsAnalysisRef.value?.getActiveSession()
  if (live?.receiverId && live.viewKey) {
    return { receiverId: live.receiverId, viewKey: live.viewKey }
  }
  return lastTrendSession.value
}

/** 切回设备分析 Tab：恢复最后子标签，并同步设备树选中对应点位 */
const restoreTrendTabAndTree = () => {
  const session = pickTrendSession()
  if (!session?.receiverId || !session.viewKey) {
    applyRouteTrendNavigation()
    return
  }

  selectedPointId.value = session.receiverId
  syncTreePointSelection(session.receiverId)

  const live = chartsAnalysisRef.value?.getActiveSession()
  if (!live?.hasTabs) {
    chartsAnalysisRef.value?.openView(session.viewKey, session.receiverId)
  }

  const routeSub = readQueryString('subView')
  const routeRid = readQueryString('receiverId')
  if (
    routeSub === session.viewKey &&
    routeRid === session.receiverId &&
    readQueryString('tab') === 'trend'
  ) {
    return
  }

  if (!equipmentId.value || syncingTabFromRoute) return
  syncingTabFromRoute = true
  void router
    .replace({
      name: 'DeviceDetail',
      params: { id: equipmentId.value },
      query: {
        tab: 'trend',
        subView: session.viewKey,
        receiverId: session.receiverId,
      },
    })
    .finally(() => {
      nextTick(() => {
        syncingTabFromRoute = false
      })
    })
}

const navigateToTrendView = (viewKey: ChartsAnalysisViewKey, pointId: string) => {
  if (!equipmentId.value) return
  lastTrendSession.value = { receiverId: pointId, viewKey }
  selectedPointId.value = pointId
  syncTreePointSelection(pointId)
  syncingTabFromRoute = true
  activeTab.value = 'trend'
  void router
    .replace({
      name: 'DeviceDetail',
      params: { id: equipmentId.value },
      query: { tab: 'trend', subView: viewKey, receiverId: pointId },
    })
    .finally(() => {
      nextTick(() => {
        syncingTabFromRoute = false
        chartsAnalysisRef.value?.openView(viewKey, pointId)
      })
    })
}

const onScreenPointSelected = (pointId: string) => {
  navigateToTrendView('svt-trend', pointId)
}

const syncActiveTabFromRoute = () => {
  syncingTabFromRoute = true
  activeTab.value = readQueryString('tab') === 'trend' ? 'trend' : 'screen'
  nextTick(() => {
    syncingTabFromRoute = false
  })
}

const applyRouteTrendNavigation = () => {
  syncActiveTabFromRoute()

  if (activeTab.value !== 'trend') {
    syncTreeDeviceSelection()
    return
  }

  const subView = readQueryString('subView') as ChartsAnalysisViewKey | ''
  const receiverId = readQueryString('receiverId')
  if (!subView || !receiverId) return
  if (!pointList.value.some((p) => p.id === receiverId)) return

  const allowed: ChartsAnalysisViewKey[] = [
    'svt-trend',
    'spectrum',
    'sound-trend',
    'vibration-analysis',
    'waterfall',
  ]
  if (!allowed.includes(subView)) return

  lastTrendSession.value = { receiverId, viewKey: subView }
  selectedPointId.value = receiverId
  syncTreePointSelection(receiverId)
  nextTick(() => {
    chartsAnalysisRef.value?.openView(subView, receiverId)
  })
}

const loadPointList = async () => {
  if (!equipmentId.value) {
    pointList.value = []
    pointMetricsMap.value = {}
    selectedPointId.value = ''
    pointMetricsLoading.value = false
    return
  }

  pointMetricsLoading.value = true
  try {
    const res = await getCheckPointsByEquipmentId({ equipmentId: equipmentId.value })
    const raw =
      res?.rc === 0 ? normalizeEquipmentCheckPointList(res.ret) : []
    pointMetricsMap.value = buildPointMetricsMap(raw)
    pointList.value = sortPointsByPointOrder(
      raw
        .map((item) => {
          const id = getCheckPointReceiverId(item)
          if (!id) return null
          return {
            id,
            name: getCheckPointDisplayName(item),
            lastAlarmTime: '无',
            alarmType: '无',
            alarmValue: '无',
            hasAlarm: false,
          }
        })
        .filter((p): p is DeviceDetailPointInfo => Boolean(p)),
    )
  } catch {
    pointList.value = []
    pointMetricsMap.value = {}
  } finally {
    pointMetricsLoading.value = false
  }

  syncSelectedPoint()
  applyRouteTrendNavigation()
}

const syncRouteTabFromActiveTab = () => {
  if (!equipmentId.value || syncingTabFromRoute) return
  if (route.name !== 'DeviceDetail') return
  const routeTab = readQueryString('tab') || 'screen'
  const nextTab = activeTab.value === 'trend' ? 'trend' : 'screen'
  if (routeTab === nextTab) return

  const query: Record<string, string> = { tab: nextTab }
  if (nextTab === 'trend') {
    const session = pickTrendSession()
    if (session) {
      query.receiverId = session.receiverId
      query.subView = session.viewKey
    } else {
      const rid = selectedPointId.value || readQueryString('receiverId')
      if (rid) query.receiverId = rid
      const subView = readQueryString('subView')
      if (subView) query.subView = subView
    }
  }

  void router.replace({
    name: 'DeviceDetail',
    params: { id: equipmentId.value },
    query,
  })
}

watch(
  () => equipmentId.value,
  (id) => {
    if (id && typeof id === 'string') {
      lastTrendSession.value = null
      deviceTreeStore.setSelectedDeviceId(id)
      syncActiveTabFromRoute()
      pointList.value = []
      pointMetricsMap.value = {}
      pointMetricsLoading.value = true
      void loadPointList()
      return
    }
  },
  { immediate: true },
)

watch(selectedPointId, (rid) => {
  if (activeTab.value === 'trend' && rid) {
    syncTreePointSelection(rid)
  }
})

watch(activeTab, (tab) => {
  if (tab === 'screen') {
    const session = chartsAnalysisRef.value?.getActiveSession()
    if (session?.receiverId && session.viewKey) {
      lastTrendSession.value = { receiverId: session.receiverId, viewKey: session.viewKey }
    }
    syncTreeDeviceSelection()
  }
  syncRouteTabFromActiveTab()
  if (tab === 'trend') {
    nextTick(() => {
      restoreTrendTabAndTree()
    })
  }
})

watch(
  () => [route.query.tab, route.query.subView, route.query.receiverId] as const,
  () => {
    if (pointList.value.length) {
      applyRouteTrendNavigation()
      return
    }
    syncActiveTabFromRoute()
  },
)

onMounted(() => {
  deviceTreeStore.setSelectedDeviceId(equipmentId.value)
})
</script>

<style lang="scss" scoped>
.device-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  color: white;

  .device-detail-tabs {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;

    :deep(.el-tabs__header) {
      margin: 0 0 8px;
      flex: 0 0 auto;
    }

    :deep(.el-tabs__item) {
      color: #fff !important;

      &.is-active {
        color: var(--special-font-color, #99f0ff) !important;
      }
    }

    :deep(.el-tabs__nav-wrap::after) {
      background-color: rgba(255, 255, 255, 0.15);
    }

    :deep(.el-tabs__content) {
      flex: 1;
      min-height: 0;
    }

    :deep(.el-tab-pane) {
      height: 100%;
    }
  }
}

@media (max-width: 800px) {
  .device-detail {
    height: auto;
    min-height: 60vh;
    padding-bottom: 10px;

    .device-detail-tabs {
      :deep(.el-tabs__content) {
        min-height: 480px;
      }
    }
  }
}
</style>
