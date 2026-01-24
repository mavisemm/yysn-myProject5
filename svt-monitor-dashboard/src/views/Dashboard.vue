<template>
  <DataPanel :stats="[
    { title: '健康设备数', number: 5 },
    { title: '预警设备数', number: 2 },
    { title: '监控总设备数', number: 7 },
    { title: '监测点位数', number: 40 }
  ]" alarm-title="预警总览" :metrics="[
    { title: '振动烈度Top5（单位：mm/s）' },
    { title: '声音响度Top5（单位：dB）' },
    { title: '温度Top5（单位：℃）' }
  ]">
    <template #alarms>
    </template>
  </DataPanel>
</template>

<script setup lang="ts">
import DataPanel from '@/components/business/DataPanel.vue'
</script>