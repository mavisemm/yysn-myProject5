<template>
  <el-dialog
    v-model="visible"
    title="趋势分析"
    width="550px"
    destroy-on-close
    append-to-body
    class="sound-trend-analysis-dialog"
  >
    <div class="dialog-body">
      <TrendAnalysisPanel
        :point-list="pointList"
        :selected-point-id="selectedPointId"
        theme="light"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TrendAnalysisPanel from '@/components/business/common/TrendAnalysisPanel.vue'

interface PointInfo {
  id: string
  name: string
  lastAlarmTime: string
  alarmType: string
  alarmValue: string
  hasAlarm: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    pointList: PointInfo[]
    selectedPointId?: string
  }>(),
  {
    selectedPointId: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})
</script>

<style scoped lang="scss">
.dialog-body {
  min-height: 420px;
}
</style>
