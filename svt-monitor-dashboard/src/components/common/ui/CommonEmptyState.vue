<template>
  <div class="common-empty-state" :class="[`common-empty-state--${size}`]">
    <div class="common-empty-state__inner">
      <slot name="icon">
        <span class="common-empty-state__icon">∅</span>
      </slot>
      <div class="common-empty-state__text">
        <slot>{{ text }}</slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text?: string
    size?: 'small' | 'medium' | 'large'
  }>(),
  {
    text: '暂无数据',
    size: 'medium',
  },
)
</script>

<style scoped lang="scss">
.common-empty-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: rgba(255, 255, 255, 0.8);

  &__inner {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 4px;
    background: transparent;
  }

  &__icon {
    font-size: 20px;
    opacity: 0.8;
  }

  &__text {
    font-size: 0.9rem;
    white-space: nowrap;
  }

  &--small {
    .common-empty-state__icon {
      font-size: 16px;
    }

    .common-empty-state__text {
      font-size: 0.8rem;
    }
  }

  &--large {
    .common-empty-state__icon {
      font-size: 28px;
    }

    .common-empty-state__text {
      font-size: 1rem;
    }
  }
}
</style>
