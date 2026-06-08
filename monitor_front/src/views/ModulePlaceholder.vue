<template>
  <div class="module-placeholder">
    <header class="module-placeholder__header">
      <h2 class="module-placeholder__title">{{ pageTitle }}</h2>
      <p class="module-placeholder__hint">功能开发中，敬请期待。</p>
    </header>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const pageTitle = computed(() => {
  const title = route.meta.title
  return typeof title === 'string' && title ? title : '模块'
})
</script>

<style scoped lang="scss">
.module-placeholder {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 12px 8px 16px;
  box-sizing: border-box;

  &__header {
    padding: 16px 20px;
    border-radius: 10px;
    background: rgba(15, 40, 90, 0.45);
    border: 1px solid rgba(96, 165, 250, 0.25);
  }

  &__title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
  }

  &__hint {
    margin: 0;
    font-size: 14px;
    color: rgba(226, 232, 240, 0.65);
  }
}
</style>
