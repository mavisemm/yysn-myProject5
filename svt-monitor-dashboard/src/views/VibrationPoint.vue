<template>
  <div v-if="pageType === 'device-detail'">
    <DataPanel :stats="[
      { title: '设备总数' },
      { title: '在线设备' },
      { title: '预警设备' },
      { title: '报警设备' }
    ]" :alarm-title="'设备详情 - 设备ID: ' + deviceId" :metrics="[
      { title: '振动烈度Top5' },
      { title: '声音响度Top5' },
      { title: '温度Top5' }
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
      { title: '设备总数' },
      { title: '在线设备' },
      { title: '预警设备' },
      { title: '报警设备' }
    ]" alarm-title="声音点位监控" :metrics="[
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
  </div>

  <div v-else-if="pageType === 'vibration-point'">
    <DataPanel :stats="[
      { title: '点位振动页' },
      { title: '在线设备' },
      { title: '预警设备' },
      { title: '报警设备' }
    ]" alarm-title="点位振动页" :metrics="[
      { title: '振动烈度Top5' },
      { title: '声音响度Top5' },
      { title: '温度Top5' }
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
      { title: '设备总数' },
      { title: '在线设备' },
      { title: '预警设备' },
      { title: '报警设备' }
    ]" alarm-title="页面内容" :metrics="[
      { title: '振动烈度Top5' },
      { title: '声音响度Top5' },
      { title: '温度Top5' }
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

// 重要：不要导入 PageLayout
// import PageLayout from '@/components/layout/PageLayout.vue'

const route = useRoute()
const router = useRouter()

// 根据路由确定页面类型
const pageType = computed(() => {
  if (route.path.includes('device-detail')) return 'device-detail'
  if (route.path.includes('sound-point')) return 'sound-point'
  if (route.path.includes('vibration-point')) return 'vibration-point'
  return 'default'
})

// 设备ID（如果是设备详情页）
const deviceId = computed(() => {
  return route.params.id || '未知设备'
})

// 点位ID（如果是点位页面）
const pointId = computed(() => {
  return route.query.pointId || null
})

// 监听路由变化，确保组件正确更新
watch(
  () => route.fullPath,
  (newPath, oldPath) => {
    console.log(`路由从 ${oldPath} 变更为 ${newPath}`)
    // 这里可以添加当路由变化时需要执行的逻辑
  }
)

// 返回功能
const goBack = () => {
  router.back()
}
</script>