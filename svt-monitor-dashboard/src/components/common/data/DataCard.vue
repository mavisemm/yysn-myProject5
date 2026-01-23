<template>
  <div class="data-card" :class="color">
    <div class="card-header">
      <span class="title">{{ title }}</span>
      <el-icon v-if="icon" :size="20">
        <component :is="icon" />
      </el-icon>
    </div>
    <div class="card-value">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  color: 'blue' | 'red' | 'green' | 'yellow'
  icon?: string
}>()
</script>

<style lang="scss" scoped>
.data-card {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  
  &.blue {
    background: linear-gradient(135deg, #409eff, #66b1ff);
    color: white;
  }
  
  &.red {
    background: linear-gradient(135deg, #f56c6c, #f78989);
    color: white;
  }
  
  &.green {
    background: linear-gradient(135deg, #67c23a, #85ce61);
    color: white;
  }
  
  &.yellow {
    background: linear-gradient(135deg, #e6a23c, #ebb563);
    color: white;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    .title {
      font-size: 14px;
    }
  }
  
  .card-value {
    font-size: 24px;
    font-weight: bold;
  }
}
</style>
