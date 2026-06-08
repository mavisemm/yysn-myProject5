import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDeviceTreeStore } from '@/stores/deviceTree'

function readRouteString(
  value: unknown,
): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value[0]) return String(value[0])
  return ''
}

/** 测点页（振动/声纹）共用：路由参数与设备树选中同步 */
export function usePointPageRoute() {
  const route = useRoute()
  const deviceTreeStore = useDeviceTreeStore()

  const receiverId = computed(() => readRouteString(route.params.receiverId))
  const equipmentIdFromQuery = computed(() => readRouteString(route.query.equipmentId))
  const pointNameFromQuery = computed(() => readRouteString(route.query.pointName))

  const syncTreeSelectionFromRoute = () => {
    const rid = receiverId.value.trim()
    if (!rid) return
    const eid = equipmentIdFromQuery.value.trim()
    const pname = pointNameFromQuery.value.trim()
    const treeKey =
      deviceTreeStore.resolveTreeKeyForPoint(rid, eid || undefined, {
        pointName: pname || undefined,
      }) ?? rid
    deviceTreeStore.setSelectedDeviceId(treeKey)
  }

  watch(() => route.params.receiverId, syncTreeSelectionFromRoute)
  watch(equipmentIdFromQuery, syncTreeSelectionFromRoute)
  watch(pointNameFromQuery, syncTreeSelectionFromRoute)
  watch(
    () => deviceTreeStore.deviceTreeData.length,
    syncTreeSelectionFromRoute,
  )
  watch(
    () => deviceTreeStore.loading,
    (loading) => {
      if (!loading) syncTreeSelectionFromRoute()
    },
  )

  onMounted(syncTreeSelectionFromRoute)

  return {
    receiverId,
    equipmentIdFromQuery,
    pointNameFromQuery,
    syncTreeSelectionFromRoute,
  }
}
