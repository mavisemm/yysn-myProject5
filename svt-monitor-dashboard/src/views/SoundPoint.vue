<template>
  <DataPanel :stats="[
    { title: '健康设备数', number: 5 },
    { title: '预警设备数', number: 2 },
    { title: '监控总设备数', number: 7 },
    { title: '监测点位数', number: 40 }
  ]" alarm-title="点位声音页" :metrics="[
    { title: '振动烈度Top5（单位：mm/s）' },
    { title: '声音响度Top5（单位：dB）' },
    { title: '温度Top5（单位：℃）' }
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

const pointId = computed(() => route.query.pointId)

watch(
  () => route.query.pointId,
  (newPointId, oldPointId) => {
    console.log(`点位ID从 ${oldPointId} 变更为 ${newPointId}`)
  }
)
</script>