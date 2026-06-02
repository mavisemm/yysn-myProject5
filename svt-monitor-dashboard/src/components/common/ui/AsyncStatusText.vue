<template>
  <div class="async-status-text" :class="[`async-status-text--${size}`]">
    <slot>{{ text }}</slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
    size?: 'small' | 'medium'
  }>(),
  {
    text: '加载中',
    size: 'medium',
  },
)
</script>

<style scoped lang="scss">
.async-status-text {
  width: 100%;
  height: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;

  &--small {
    min-height: 32px;
    font-size: 0.8rem;
  }
}
</style>
