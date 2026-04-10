import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getDeviceWaringDetail, type DeviceWaringDetailItem } from '@/api/modules/stats'

const CACHE_TTL_MS = 60_000

export const useDeviceWaringDetailStore = defineStore('deviceWaringDetail', () => {
  const sound = ref<DeviceWaringDetailItem[]>([])
  const vibration = ref<DeviceWaringDetailItem[]>([])
  const lastFetchedAt = ref<number>(0)
  const loading = ref(false)

  let inFlight: Promise<void> | null = null

  const isStale = computed(() => {
    const t = lastFetchedAt.value
    if (!t) return true
    return Date.now() - t > CACHE_TTL_MS
  })

  const fetch = async (force = false) => {
    if (!force && !isStale.value && (sound.value.length || vibration.value.length)) return
    if (inFlight) return inFlight

    loading.value = true
    inFlight = (async () => {
      try {
        const res = await getDeviceWaringDetail()
        sound.value = Array.isArray(res?.ret?.sound) ? res.ret.sound : []
        vibration.value = Array.isArray(res?.ret?.vibration) ? res.ret.vibration : []
        lastFetchedAt.value = Date.now()
      } finally {
        loading.value = false
        inFlight = null
      }
    })()

    return inFlight
  }

  const reset = () => {
    sound.value = []
    vibration.value = []
    lastFetchedAt.value = 0
    loading.value = false
    inFlight = null
  }

  return {
    sound,
    vibration, 
    lastFetchedAt,
    loading,
    isStale,
    fetch,
    reset
  }
})

