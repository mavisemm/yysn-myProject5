import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getDeviceWaringDetail, getSoundDeviceWaringDetail, type DeviceWaringDetailItem } from '@/api/modules/stats'

const CACHE_TTL_MS = 60_000

export const useDeviceWaringDetailStore = defineStore('deviceWaringDetail', () => {
  const sound = ref<DeviceWaringDetailItem[]>([])
  const vibration = ref<DeviceWaringDetailItem[]>([])
  const lastFetchedAtByMode = ref<{ trend: number; fault: number }>({ trend: 0, fault: 0 })
  const loading = ref(false)

  let inFlightTrend: Promise<void> | null = null
  let inFlightFault: Promise<void> | null = null

  const isStale = computed(() => (mode: 'trend' | 'fault') => {
    const t = lastFetchedAtByMode.value?.[mode] ?? 0
    if (!t) return true
    return Date.now() - t > CACHE_TTL_MS
  })

  const fetch = async (mode: 'trend' | 'fault' = 'trend', force = false) => {
    const hasData = mode === 'trend' ? sound.value.length > 0 : vibration.value.length > 0
    if (!force && !isStale.value(mode) && hasData) return

    if (mode === 'trend' && inFlightTrend) return inFlightTrend
    if (mode === 'fault' && inFlightFault) return inFlightFault

    loading.value = true
    const task = (async () => {
      try {
        if (mode === 'trend') {
          const soundRes = await getSoundDeviceWaringDetail()
          sound.value = Array.isArray(soundRes?.ret) ? soundRes.ret : []
          lastFetchedAtByMode.value = { ...lastFetchedAtByMode.value, trend: Date.now() }
          return
        }

        const allRes = await getDeviceWaringDetail()
        vibration.value = Array.isArray(allRes?.ret?.vibration) ? allRes.ret.vibration : []
        lastFetchedAtByMode.value = { ...lastFetchedAtByMode.value, fault: Date.now() }
      } finally {
        loading.value = false
        if (mode === 'trend') inFlightTrend = null
        else inFlightFault = null
      }
    })()

    if (mode === 'trend') inFlightTrend = task
    else inFlightFault = task

    return task
  }

  const reset = () => {
    sound.value = []
    vibration.value = []
    lastFetchedAtByMode.value = { trend: 0, fault: 0 }
    loading.value = false
    inFlightTrend = null
    inFlightFault = null
  }

  return {
    sound,
    vibration, 
    lastFetchedAtByMode,
    loading,
    isStale,
    fetch,
    reset
  }
})

