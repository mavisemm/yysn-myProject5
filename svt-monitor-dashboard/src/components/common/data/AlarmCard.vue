<template>
  <div class="alarm-card">
    <div class="card-header">
      <div class="device-info">
        <div class="device-name">{{ deviceName }}锛坽{ workshopName }}锛?</div>
        <div class="alarm-time">{{ alarmTime }}</div>
      </div>
    </div>
    
    <div class="point-grid">
      <div
        v-for="point in points"
        :key="point.id"
        class="point-cell"
        :class="{ alarm: point.status === 'alarm' }"
        :title="point.name"
      >
        {{ point.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  deviceName: string
  workshopName: string
  alarmTime: string
  points: Array<{
    id: string
    name: string
    status: 'normal' | 'alarm'
  }>
}>()
</script>

<style lang="scss" scoped>
.alarm-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e4e7ed;
  
  .device-info {
    margin-bottom: 12px;
    
    .device-name {
      font-weight: bold;
      color: #303133;
    }
    
    .alarm-time {
      font-size: 12px;
      color: #909399;
    }
  }
  
  .point-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 6px;
    
    .point-cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      border-radius: 4px;
      background: #67c23a;
      color: white;
      
      &.alarm {
        background: #f56c6c;
      }
    }
  }
}
</style>
