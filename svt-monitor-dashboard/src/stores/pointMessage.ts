import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getPointMessage,
  type PointMessageCheckPointDto,
  type PointMessageGroupItem
} from '@/api/modules/hardware'

/** 前端使用的点位详情（与接口字段对应，便于声音点位页等展示） */
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
  /** 按 receiverId 索引（设备树点位 id 多为 receiverId） */
  const pointMapByReceiverId = ref<Record<string, PointMessageInfo>>({})
  /** 按数值 id 索引（兼容设备树传 pointId 为数值 id 的情况） */
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

  async function loadPointMessage(tenantId = '2b410e834b4b4ae49ab8d52f6d49e967') {
    if (loading.value) return
    try {
      loading.value = true
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
      loaded.value = true
    } catch (e) {
      console.error('加载点位详情失败:', e)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /** 根据点位 id 查详情（设备树传的 pointId 可能是 receiverId 或数值 id） */
  function getPointByKey(pointId: string): PointMessageInfo | null {
    if (!pointId) return null
    const byReceiver = pointMapByReceiverId.value[pointId]
    if (byReceiver) return byReceiver
    return pointMapById.value[pointId] ?? null
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
