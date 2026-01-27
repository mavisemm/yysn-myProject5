<template>
  <DataPanel :stats="[
    { title: '健康设备数', number: 5 },
    { title: '预警设备数', number: 2 },
    { title: '监控总设备数', number: 7 },
    { title: '监测点位数', number: 40 }
  ]" :metrics="[
    { title: '振动烈度Top3', unit: '（单位：mm/s）' },
    { title: '声音响度Top3', unit: '（单位：dB）' },
    { title: '温度Top3', unit: '（单位：℃）' }
  ]" :rankings="[
    [
      { deviceName: '设备a', workshopName: '车间A' },
      { deviceName: '设备b', workshopName: '车间B' },
      { deviceName: '设备c', workshopName: '车间AB' }
    ],
    [
      { deviceName: '设备d', workshopName: '车间A' },
      { deviceName: '设备a', workshopName: '车间B' },
      { deviceName: '设备e', workshopName: '车间AB' }
    ],
    [
      { deviceName: '设备b', workshopName: '车间A' },
      { deviceName: '设备c', workshopName: '车间B' },
      { deviceName: '设备a', workshopName: '车间AB' }
    ]
  ]">
    <template #alarms>
    </template>
  </DataPanel>
</template>

<script setup lang="ts">
import DataPanel from '@/components/business/DataPanel.vue'
</script>