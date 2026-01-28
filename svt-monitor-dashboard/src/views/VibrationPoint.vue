<template>
  <div v-if="pageType === 'device-detail'">
    <DataPanel :stats="[
      { title: '健康设备数', number: 5 },
      { title: '预警设备数', number: 2 },
      { title: '监控总设备数', number: 7 },
      { title: '监测点位数', number: 40 }
    ]" :alarm-title="'设备详情 - 设备ID: ' + deviceId" :metrics="[
      { title: '振动烈度Top5（单位：mm/s）' },
      { title: '声音响度Top5（单位：dB）' },
      { title: '温度Top5（单位：℃）' }
    ]">
      <template #alarms>
        <div class="device-metrics">
          <p>设备ID: {{ deviceId }}</p>
          <p>设备具体信息正在开发中...</p>
        </div>
      </template>
    </DataPanel>
  </div>

  <div v-else-if="pageType === 'sound-point'">
    <DataPanel :stats="[
      { title: '健康设备数', number: 5 },
      { title: '预警设备数', number: 2 },
      { title: '监控总设备数', number: 7 },
      { title: '监测点位数', number: 40 }
    ]" alarm-title="声音点位监控" :metrics="[
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
  </div>

  <div v-else-if="pageType === 'vibration-point'">
    <DataPanel :stats="[
      { title: '健康设备数', number: 5 },
      { title: '预警设备数', number: 2 },
      { title: '监控总设备数', number: 7 },
      { title: '监测点位数', number: 40 }
    ]" alarm-title="点位振动页" :metrics="[
      { title: '振动烈度Top5（单位：mm/s）' },
      { title: '声音响度Top5（单位：dB）' },
      { title: '温度Top5（单位：℃）' }
    ]">
      <template #alarms>
        <div v-if="pointId">
          <p>点位ID: {{ pointId }}</p>
          <p>振动点位功能正在开发中...</p>
        </div>
        <div v-else>
          <p>振动点位功能正在开发中...</p>
        </div>
      </template>
    </DataPanel>
  </div>

  <div v-else>
    <DataPanel :stats="[
      { title: '健康设备数', number: 5 },
      { title: '预警设备数', number: 2 },
      { title: '监控总设备数', number: 7 },
      { title: '监测点位数', number: 40 }
    ]" alarm-title="页面内容" :metrics="[
      { title: '振动烈度Top5（单位：mm/s）' },
      { title: '声音响度Top5（单位：dB）' },
      { title: '温度Top5（单位：℃）' }
    ]">
      <template #alarms>
        <p>This page is under development.</p>
      </template>
    </DataPanel>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, watch } from 'vue'
import DataPanel from '@/components/business/DataPanel.vue'

const route = useRoute()
const router = useRouter()

const pageType = computed(() => {
  if (route.path.includes('device-detail')) return 'device-detail'
  if (route.path.includes('sound-point')) return 'sound-point'
  if (route.path.includes('vibration-point')) return 'vibration-point'
  return 'default'
})

const deviceId = computed(() => {
  return route.params.id || '未知设备'
})

const pointId = computed(() => {
  return route.query.pointId || null
})

watch(
  () => route.fullPath,
  (newPath, oldPath) => {
    // console.log(`路由从 ${oldPath} 变更为 ${newPath}`)
  }
)

const goBack = () => {
  router.back()
}
</script>