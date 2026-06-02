import { useRoute, useRouter } from 'vue-router'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { resolveEquipmentIdFromPointReceiver } from '@/utils/deviceTreePoint'

/**
 * 布局内「返回设备」：与 MainHeader / PageLayout 移动端行为一致
 */
export function useLayoutDeviceNavigation() {
  const router = useRouter()
  const route = useRoute()
  const deviceTreeStore = useDeviceTreeStore()

  const goToDevice = () => {
    if (route.name === 'DeviceDetail') {
      const id = route.params.id
      if (typeof id === 'string' && id) return
    }

    let equipmentId = (route.query.equipmentId as string) || ''

    if (!equipmentId && (route.name === 'SoundPoint' || route.name === 'VibrationPoint')) {
      const receiverIdParam = route.params.receiverId
      const receiverId = Array.isArray(receiverIdParam) ? receiverIdParam[0] : receiverIdParam
      if (typeof receiverId === 'string' && receiverId) {
        equipmentId = resolveEquipmentIdFromPointReceiver(deviceTreeStore.deviceTreeData, receiverId)
      }
    }

    if (equipmentId) {
      void router.push({ name: 'DeviceDetail', params: { id: equipmentId } })
    } else {
      void router.push({ name: 'DeviceCockpit' })
    }
  }

  return { goToDevice }
}
