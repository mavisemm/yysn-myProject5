<template>
  <div class="bottom-row" :class="{ 'bottom-row--stack': stackLayout }">
    <VibrationVelocityFreqChart
      :receiver-id="receiverIdResolved"
      :point-device-id="pointDeviceId"
      :alarm-time="props.alarmTime"
      :date-range="props.dateRange"
      :spectrum-align="spectrumAlign"
      :y-axis-tick-decimals="yAxisTickDecimals"
    />
    <VibrationVelocityTimeChart
      :receiver-id="receiverIdResolved"
      :point-device-id="pointDeviceId"
      :alarm-time="props.alarmTime"
      :date-range="props.dateRange"
      :spectrum-align="spectrumAlign"
      :y-axis-tick-decimals="yAxisTickDecimals"
    />
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
    dateRange?: [string, string] | null
    /** 频域/时域上下排列（设备分析页左右栏） */
    stackLayout?: boolean
    /** 与能量/密度图统一 grid 边距 */
    spectrumAlign?: boolean
    /** Y 轴刻度小数位 */
    yAxisTickDecimals?: 2 | 5
  }>(),
  {
    receiverId: '',
    deviceId: '',
    alarmTime: 0,
    stackLayout: false,
    spectrumAlign: false,
    yAxisTickDecimals: 2,
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

  &--stack {
    flex-direction: column;
    height: 100%;

    > :first-child,
    > :nth-child(2) {
      flex: 1;
      width: 100%;
      min-height: 0;
    }
  }
}

.bottom-row > :first-child,
.bottom-row > :nth-child(2) {
  width: 50%;
}

.bottom-row--stack > :first-child,
.bottom-row--stack > :nth-child(2) {
  width: 100%;
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
