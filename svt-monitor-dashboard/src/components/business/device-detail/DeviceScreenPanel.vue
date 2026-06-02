<template>
  <div class="device-screen-panel">
    <div class="device-screen-panel__points">
      <DevicePointCards
        :points="pointList"
        :selected-point-id="selectedPointId"
        :point-metrics-map="pointMetricsMap"
        :point-summary="pointSummary"
        :points-loading="pointsLoading"
        @select="emit('point-selected', $event)"
      />
    </div>

    <div class="device-screen-panel__bottom">
      <div class="device-screen-panel__info">
        <DeviceInfoModule
          v-if="equipmentId"
          :device-id="equipmentId"
          embedded
          hide-images
          hide-health-gauges
        />
      </div>
      <div class="device-screen-panel__images">
        <DeviceImageCarousel :urls="deviceImageUrls" :loading="imagesLoading" alt="设备图片" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getEquipmentImages } from '@/api/modules/hardware'
import DeviceInfoModule from './DeviceInfoModule.vue'
import DevicePointCards from './DevicePointCards.vue'
import DeviceImageCarousel from './DeviceImageCarousel.vue'
import { extractEquipmentImageUrls } from './deviceImageUtils'
import type { DeviceDetailPointInfo } from './deviceDetailTypes'
import type { PointCardMetrics } from './devicePointMetrics'
import type { DevicePointSummary } from '@/stores/devicePointData'

const props = defineProps<{
  equipmentId: string | null
  pointList: DeviceDetailPointInfo[]
  selectedPointId?: string
  pointMetricsMap?: Record<string, PointCardMetrics>
  pointSummary?: DevicePointSummary
  pointsLoading?: boolean
}>()

const emit = defineEmits<{
  'point-selected': [pointId: string]
}>()

const deviceImageUrls = ref<string[]>([])
const imagesLoading = ref(false)
let imageRequestId = 0

const loadImages = async () => {
  const id = props.equipmentId
  if (!id) {
    deviceImageUrls.value = []
    imagesLoading.value = false
    return
  }
  const requestId = ++imageRequestId
  imagesLoading.value = true
  try {
    const res = await getEquipmentImages({ equipmentId: id })
    if (requestId !== imageRequestId) return
    deviceImageUrls.value = res?.rc === 0 ? extractEquipmentImageUrls(res.ret) : []
  } catch {
    if (requestId !== imageRequestId) return
    deviceImageUrls.value = []
  } finally {
    if (requestId === imageRequestId) imagesLoading.value = false
  }
}

watch(
  () => props.equipmentId,
  () => {
    void loadImages()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.device-screen-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 10px;
  container-type: size;
  container-name: device-screen-panel;

  &__points {
    flex: 5.5;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__bottom {
    flex: 4.5;
    min-height: 0;
    display: flex;
    gap: 10px;
  }

  &__info {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  &__images {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
}

@container device-screen-panel (max-height: 860px) {
  .device-screen-panel {
    gap: 6px;

    &__points {
      flex: 1.15;
    }

    &__bottom {
      flex: 1;
      gap: 8px;
    }
  }
}

@container device-screen-panel (max-height: 720px) {
  .device-screen-panel {
    &__points {
      flex: 1.25;
    }

    &__bottom {
      flex: 1;
    }

    &__info,
    &__images {
      min-height: 160px;
    }
  }
}

@media (max-width: 800px) {
  .device-screen-panel {
    &__bottom {
      flex-direction: column;
    }

    &__info,
    &__images {
      flex: 0 0 auto;
      min-height: 240px;
    }
  }
}
</style>
