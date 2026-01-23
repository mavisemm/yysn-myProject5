<template>
  <div class="page-content">
    <!-- 修改：直接使用 div，移除 PageLayout 包装 -->
    <h2>设备详情页</h2>
    <p>设备ID: {{ deviceId }}</p>
    <p>页面具体内容</p>
    <!-- 添加具体的业务内容 -->
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { watch, ref, computed } from 'vue'

// 重要：移除 PageLayout 的导入
// import PageLayout from '@/components/layout/PageLayout.vue'

const route = useRoute()

// 使用computed确保响应式更新
const deviceId = computed(() => route.params.id)

// 可以在这里添加页面特定的业务逻辑

// 监听路由变化，确保组件内容更新
watch(
  () => route.params.id,
  (newId, oldId) => {
    console.log(`设备ID从 ${oldId} 变更为 ${newId}`)
    // 这里可以添加当设备ID变化时需要执行的逻辑
  }
)
</script>

<style lang="scss" scoped>
.page-content {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 100%;
  overflow-y: auto;
}
</style>