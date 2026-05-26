<template>
  <div class="bottom-row">
    <VibrationVelocityFreqChart :receiver-id="receiverIdResolved" :point-device-id="pointDeviceId"
      :alarm-time="props.alarmTime" />
    <VibrationVelocityTimeChart :receiver-id="receiverIdResolved" :point-device-id="pointDeviceId"
      :alarm-time="props.alarmTime" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { resolvePointDeviceIdFromTree } from './vibrationPointUtils'
import VibrationVelocityFreqChart from './VibrationVelocityFreqChart.vue'
import VibrationVelocityTimeChart from './VibrationVelocityTimeChart.vue'

const props = withDefaults(
  defineProps<{
    receiverId?: string
    deviceId?: string
    alarmTime?: number
  }>(),
  {
    receiverId: '',
    deviceId: '',
    alarmTime: 0,
  },
)

const route = useRoute()
const receiverIdResolved = computed(() => {
  if (props.receiverId) return String(props.receiverId)
  const rid = route.params.receiverId
  const resolved = Array.isArray(rid) ? rid[0] : rid
  return (typeof resolved === 'string' ? resolved : '') || ''
})
const deviceTreeStore = useDeviceTreeStore()

const pointDeviceId = computed(() => {
  if (props.deviceId) return String(props.deviceId)
  return resolvePointDeviceIdFromTree(deviceTreeStore.deviceTreeData, receiverIdResolved.value)
})
</script>

<style lang="scss" scoped>
.bottom-row {
  display: flex;
  height: 45%;
  gap: 10px;
  min-height: 0;
}

.bottom-row > :first-child,
.bottom-row > :nth-child(2) {
  width: 50%;
}

@media (max-width: 800px) {
  .bottom-row {
    height: auto;
    min-height: 0;
    flex-direction: column;
  }

  .bottom-row > :first-child,
  .bottom-row > :nth-child(2) {
    width: 100%;
  }
}
</style>
