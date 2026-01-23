<template>
  <DataPanel :stats="[
    { title: '设备总数' },
    { title: '在线设备' },
    { title: '预警设备' },
    { title: '报警设备11111' }
  ]" alarm-title="预警总览" :metrics="[
    { title: '振动烈度Top5' },
    { title: '声音响度Top5' },
    { title: '温度Top5' }
  ]">
    <template #alarms>
      <!-- 预警内容 -->
    </template>
  </DataPanel>
</template>

<script setup lang="ts">
import DataPanel from '@/components/business/DataPanel.vue'
</script>