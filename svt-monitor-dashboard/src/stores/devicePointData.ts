import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getCheckPointsByEquipmentId,
  getSelectCheckPointIn,
  normalizeEquipmentCheckPointList,
  type EquipmentCheckPointDetailDto,
} from '@/api/modules/hardware'
import type { DeviceDetailPointInfo } from '@/components/business/device-detail/deviceDetailTypes'
import {
  buildPointMetricsMap,
  getCheckPointDisplayName,
  getCheckPointReceiverId,
  type PointCardMetrics,
} from '@/components/business/device-detail/devicePointMetrics'
import {
  extractPointListFromResponse,
  mapCheckPointsFromApi,
  sortPointsByPointOrder,
} from '@/components/business/device-detail/deviceDetailPoints'

export interface DevicePointSummary {
  totalPoints: number
  warningPoints: number
  alarmPoints: number
}

interface EquipmentPointDataState {
  pointList: DeviceDetailPointInfo[]
  pointMetricsMap: Record<string, PointCardMetrics>
  summary: DevicePointSummary
}

const EMPTY_SUMMARY: DevicePointSummary = {
  totalPoints: 0,
  warningPoints: 0,
  alarmPoints: 0,
}

const emptyState = (): EquipmentPointDataState => ({
  pointList: [],
  pointMetricsMap: {},
  summary: { ...EMPTY_SUMMARY },
})

const toSummaryFromList = (list: DeviceDetailPointInfo[]): DevicePointSummary => {
  let warningPoints = 0
  let alarmPoints = 0
  for (const item of list) {
    if (item.hasAlarm) {
      alarmPoints += 1
      continue
    }
    if (item.alarmType && item.alarmType !== '无') {
      warningPoints += 1
    }
  }
  return {
    totalPoints: list.length,
    warningPoints,
    alarmPoints,
  }
}

const buildPointListFromCheckPointDetails = (
  details: EquipmentCheckPointDetailDto[],
): DeviceDetailPointInfo[] =>
  sortPointsByPointOrder(
    details
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

export const useDevicePointDataStore = defineStore('devicePointData', () => {
  const dataByEquipmentId = ref<Record<string, EquipmentPointDataState>>({})
  const loadingByEquipmentId = ref<Record<string, boolean>>({})
  const inflightByEquipmentId = new Map<string, Promise<void>>()

  const getEquipmentData = (equipmentId: string | null | undefined): EquipmentPointDataState => {
    const id = String(equipmentId ?? '').trim()
    if (!id) return emptyState()
    return dataByEquipmentId.value[id] ?? emptyState()
  }

  const isLoading = (equipmentId: string | null | undefined): boolean => {
    const id = String(equipmentId ?? '').trim()
    if (!id) return false
    return Boolean(loadingByEquipmentId.value[id])
  }

  const ensureLoaded = async (equipmentId: string | null | undefined) => {
    const id = String(equipmentId ?? '').trim()
    if (!id) return
    if (inflightByEquipmentId.has(id)) {
      return inflightByEquipmentId.get(id)
    }
    if (dataByEquipmentId.value[id]) return

    const task = (async () => {
      loadingByEquipmentId.value = { ...loadingByEquipmentId.value, [id]: true }
      try {
        const [metricsRes, alarmRes] = await Promise.all([
          getCheckPointsByEquipmentId({ equipmentId: id }),
          getSelectCheckPointIn(id, 500, 1),
        ])
        const metricRaw =
          metricsRes?.rc === 0 ? normalizeEquipmentCheckPointList(metricsRes.ret) : []
        const pointMetricsMap = buildPointMetricsMap(metricRaw)
        const fallbackPointList = buildPointListFromCheckPointDetails(metricRaw)

        const alarmRaw = alarmRes?.rc === 0 ? extractPointListFromResponse(alarmRes.ret) : []
        const alarmPointList = sortPointsByPointOrder(mapCheckPointsFromApi(alarmRaw))
        const pointList = alarmPointList.length > 0 ? alarmPointList : fallbackPointList

        dataByEquipmentId.value = {
          ...dataByEquipmentId.value,
          [id]: {
            pointList,
            pointMetricsMap,
            summary: toSummaryFromList(pointList),
          },
        }
      } catch {
        dataByEquipmentId.value = {
          ...dataByEquipmentId.value,
          [id]: emptyState(),
        }
      } finally {
        loadingByEquipmentId.value = { ...loadingByEquipmentId.value, [id]: false }
        inflightByEquipmentId.delete(id)
      }
    })()

    inflightByEquipmentId.set(id, task)
    return task
  }

  const pointListByEquipmentId = (equipmentId: string | null | undefined) =>
    computed(() => getEquipmentData(equipmentId).pointList)
  const pointMetricsMapByEquipmentId = (equipmentId: string | null | undefined) =>
    computed(() => getEquipmentData(equipmentId).pointMetricsMap)
  const summaryByEquipmentId = (equipmentId: string | null | undefined) =>
    computed(() => getEquipmentData(equipmentId).summary)

  return {
    ensureLoaded,
    getEquipmentData,
    isLoading,
    pointListByEquipmentId,
    pointMetricsMapByEquipmentId,
    summaryByEquipmentId,
  }
})
