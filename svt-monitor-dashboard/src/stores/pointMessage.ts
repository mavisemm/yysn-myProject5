import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getPointMessage,
  type PointMessageCheckPointDto,
  type PointMessageGroupItem
} from '@/api/modules/hardware'
import { getTenantId } from '@/api/tenant'

export interface PointMessageInfo {
  groupName: string
  productName: string
  subProductName: string
  detectorName: string
  receiverName: string
  pointName: string
  id: number
  receiverId: string
  productId: string
}

export const usePointMessageStore = defineStore('pointMessage', () => {
  const loaded = ref(false)
  const loading = ref(false)
  const loadedTenantId = ref('')
  const pointMapByReceiverId = ref<Record<string, PointMessageInfo>>({})
  const pointMapById = ref<Record<string, PointMessageInfo>>({})

  function flattenItems(items: PointMessageGroupItem[]): PointMessageInfo[] {
    const list: PointMessageInfo[] = []
    for (const group of items) {
      const groupName = group.groupName ?? ''
      for (const dto of group.checkPointDtos ?? []) {
        list.push({
          groupName,
          productName: dto.productName ?? '',
          subProductName: dto.subProductName ?? '',
          detectorName: dto.detectorName ?? '',
          receiverName: dto.receiverName ?? '',
          pointName: dto.pointName ?? '',
          id: dto.id,
          receiverId: dto.receiverId ?? '',
          productId: dto.productId ?? ''
        })
      }
    }
    return list
  }

  async function loadPointMessage(tenantId: string = getTenantId()) {
    if (!tenantId) return
    if (loaded.value && loadedTenantId.value === tenantId) return
    if (loading.value) return
    try {
      loading.value = true
      if (loadedTenantId.value !== tenantId) {
        pointMapByReceiverId.value = {}
        pointMapById.value = {}
        loaded.value = false
      }
      const res = await getPointMessage({
        filterPropertyMap: [
          { code: 'tenantId', operate: 'EQ', value: tenantId }
        ],
        pageIndex: 0,
        pageSize: 1000
      })
      if (res.rc !== 0 || !res.ret?.items) {
        loaded.value = true
        return
      }
      const list = flattenItems(res.ret.items)
      const byReceiverId: Record<string, PointMessageInfo> = {}
      const byId: Record<string, PointMessageInfo> = {}
      for (const p of list) {
        if (p.receiverId) byReceiverId[p.receiverId] = p
        byId[String(p.id)] = p
      }
      pointMapByReceiverId.value = byReceiverId
      pointMapById.value = byId
      loadedTenantId.value = tenantId
      loaded.value = true
    } catch (e) {
      console.error('加载点位详情失败:', e)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  function getPointByKey(receiverId: string): PointMessageInfo | null {
    if (!receiverId) return null
    const byReceiver = pointMapByReceiverId.value[receiverId]
    if (byReceiver) return byReceiver
    return pointMapById.value[receiverId] ?? null
  }

  return {
    loaded,
    loading,
    pointMapByReceiverId,
    pointMapById,
    loadPointMessage,
    getPointByKey
  }
})
