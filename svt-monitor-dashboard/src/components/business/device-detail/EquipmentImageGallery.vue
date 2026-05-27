<template>
  <div class="equipment-image-gallery" :class="`equipment-image-gallery--${variant}`">
    <div
      v-for="(src, idx) in urls"
      :key="`${src}-${idx}`"
      class="equipment-image-gallery__item"
    >
      <div class="equipment-image-gallery__frame">
        <el-image
          class="equipment-image-gallery__thumb"
          :src="src"
          :alt="alt"
          :preview-src-list="urls"
          :initial-index="idx"
          fit="contain"
          preview-teleported
          hide-on-click-modal
        />
        <div class="equipment-image-gallery__overlay" aria-hidden="true">
          <span class="equipment-image-gallery__overlay-text">点击查看</span>
        </div>
      </div>
      <p v-if="caption" class="equipment-image-gallery__caption">{{ caption }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElImage } from 'element-plus'

withDefaults(
  defineProps<{
    urls: string[]
    alt?: string
    caption?: string
    variant?: 'detail' | 'analysis'
  }>(),
  {
    alt: '设备图片',
    caption: '',
    variant: 'detail',
  },
)
</script>

<style scoped lang="scss">
.equipment-image-gallery {
  &--detail {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &--analysis {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }

  &__item {
    cursor: zoom-in;
  }

  &__frame {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
  }

  &__overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 13px;
    line-height: 1.3;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
    user-select: none;
  }

  &__item:hover &__overlay {
    opacity: 1;
  }

  @media (hover: none) {
    &__overlay {
      opacity: 1;
    }
  }

  &__overlay-text {
    white-space: nowrap;
  }

  &--analysis &__item {
    flex: 0 1 320px;
    max-width: 100%;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 12px;
    background: #f8fafc;
  }

  &__thumb {
    display: block;
    width: 100%;

    :deep(.el-image__inner) {
      display: block;
      width: 100%;
      max-height: 280px;
      margin: 0 auto;
      object-fit: contain;
    }

    :deep(.el-image__error),
    :deep(.el-image__placeholder) {
      min-height: 120px;
    }
  }

  &--detail &__thumb :deep(.el-image__inner) {
    max-height: none;
  }

  &__caption {
    margin: 8px 0 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: #6c757d;
    text-align: center;
  }
}
</style>
