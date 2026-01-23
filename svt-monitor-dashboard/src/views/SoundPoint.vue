<template>
  <DataPanel :stats="[
    { title: '点位声音页' },
    { title: '在线设备' },
    { title: '预警设备' },
    { title: '报警设备22222' }
  ]" alarm-title="点位声音页" :metrics="[
    { title: '振动烈度Top5' },
    { title: '声音响度Top5' },
    { title: '温度Top5' }
  ]">
    <template #alarms>
      <div v-if="pointId">
        <p>点位ID: {{ pointId }}</p>
        <p>声音点位功能正在开发中...</p>
      </div>
      <div v-else>
        <p>声音点位功能正在开发中...</p>
      </div>
    </template>
  </DataPanel>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { watch, computed } from 'vue'
import DataPanel from '@/components/business/DataPanel.vue'

const route = useRoute()

// 使用computed确保响应式更新
const pointId = computed(() => route.query.pointId)

// 监听路由查询参数变化，确保在点位ID变化时更新内容
watch(
  () => route.query.pointId,
  (newPointId, oldPointId) => {
    console.log(`点位ID从 ${oldPointId} 变更为 ${newPointId}`)
    // 这里可以添加当点位ID变化时需要执行的逻辑
  }
)
</script>