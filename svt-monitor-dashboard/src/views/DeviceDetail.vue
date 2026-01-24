<template>
  <div class="page-content">
    <h2>设备详情页</h2>
    <p>设备ID: {{ deviceId }}</p>
    <p>页面具体内容</p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { watch, ref, computed } from 'vue'

const route = useRoute()

const deviceId = computed(() => route.params.id)
watch(
  () => route.params.id,
  (newId, oldId) => {
    console.log(`设备ID从 ${oldId} 变更为 ${newId}`)
  }
)
</script>

<style lang="scss" scoped>
.page-content {
  padding: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 100%;
  overflow-y: auto;
}
</style>