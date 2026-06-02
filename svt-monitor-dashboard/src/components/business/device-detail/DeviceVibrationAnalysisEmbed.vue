<template>
  <div class="device-vibration-analysis-embed">
    <DeviceVibrationAnalysis embedded :equipment-id="equipmentId" />
  </div>
</template>

<script setup lang="ts">
import DeviceVibrationAnalysis from '@/views/DeviceVibrationAnalysis.vue'

defineProps<{
  equipmentId: string
}>()
</script>

<style lang="scss" scoped>
.device-vibration-analysis-embed {
  height: 100%;
  min-height: 0;
  overflow: auto;

  :deep(.vibration-analysis-page) {
    min-height: 100%;
  }

  :deep(.va-back-to-top) {
    display: none;
  }

  /* 嵌入深色布局时，避免继承白字导致下拉不可读 */
  :deep(.va-point-select .el-select__wrapper),
  :deep(.va-point-select .el-select__selected-item),
  :deep(.va-point-select .el-select__placeholder),
  :deep(.va-point-select .el-select__input),
  :deep(.va-point-select .el-tag),
  :deep(.va-point-select .el-tag .el-tag__content) {
    color: #303133 !important;
  }
}
</style>
