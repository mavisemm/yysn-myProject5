<template>
  <div class="equipment-image-gallery" :class="`equipment-image-gallery--${variant}`">
    <div v-for="(src, idx) in urls" :key="`${src}-${idx}`" class="equipment-image-gallery__item">
      <div class="equipment-image-gallery__frame">
        <el-image
          class="equipment-image-gallery__thumb"
          :src="src"
          :alt="alt"
          :preview-src-list="urls"
          :initial-index="idx"
          fit="cover"
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
$gallery-detail-height: 200px;
$gallery-analysis-height: 160px;
$gallery-analysis-width: $gallery-analysis-height * 2;

.equipment-image-gallery {
  &--detail {
    width: 100%;
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

  &--detail &__item {
    width: 100%;
  }

  &--analysis &__item {
    width: $gallery-analysis-width;
    flex: 0 0 auto;
  }

  &__item {
    cursor: zoom-in;
  }

  &__frame {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    border: none;
    box-shadow: none;
    background: #2a2a2a;
  }

  &--detail &__frame {
    width: 100%;
    height: $gallery-detail-height;
  }

  &--analysis &__frame {
    width: $gallery-analysis-width;
    height: $gallery-analysis-height;
  }

  &__thumb {
    display: block;
    width: 100%;
    height: 100%;

    :deep(.el-image) {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
      box-shadow: none;
    }

    :deep(.el-image__inner) {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    :deep(.el-image__error),
    :deep(.el-image__placeholder) {
      width: 100%;
      height: 100%;
      min-height: 0;
    }
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

  &__caption {
    margin: 8px 0 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: #6c757d;
    text-align: center;
    word-break: break-word;
  }

  &--analysis &__caption {
    max-width: $gallery-analysis-width;
  }
}
</style>
