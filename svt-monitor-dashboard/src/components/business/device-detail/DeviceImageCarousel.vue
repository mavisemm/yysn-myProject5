<template>
  <div class="device-image-carousel">
    <div v-if="loading" class="device-image-carousel__status">加载中</div>
    <div v-else-if="!urls.length" class="device-image-carousel__empty">暂无数据</div>
    <template v-else-if="urls.length === 1">
      <el-image
        class="device-image-carousel__single"
        :src="urls[0]"
        :alt="alt"
        :preview-src-list="urls"
        fit="contain"
        preview-teleported
        hide-on-click-modal
      />
    </template>
    <template v-else>
      <button
        type="button"
        class="device-image-carousel__nav device-image-carousel__nav--prev"
        aria-label="上一张"
        @click="prev"
      >
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <el-image
        class="device-image-carousel__slide"
        :src="urls[currentIndex]"
        :alt="alt"
        :preview-src-list="urls"
        :initial-index="currentIndex"
        fit="contain"
        preview-teleported
        hide-on-click-modal
      />
      <button
        type="button"
        class="device-image-carousel__nav device-image-carousel__nav--next"
        aria-label="下一张"
        @click="next"
      >
        <el-icon><ArrowRight /></el-icon>
      </button>
      <div class="device-image-carousel__indicator">
        {{ currentIndex + 1 }} / {{ urls.length }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElImage, ElIcon } from 'element-plus'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    urls: string[]
    loading?: boolean
    alt?: string
  }>(),
  {
    loading: false,
    alt: '设备图片',
  },
)

const currentIndex = ref(0)

watch(
  () => props.urls,
  () => {
    currentIndex.value = 0
  },
)

const prev = () => {
  const len = props.urls.length
  if (len <= 1) return
  currentIndex.value = (currentIndex.value - 1 + len) % len
}

const next = () => {
  const len = props.urls.length
  if (len <= 1) return
  currentIndex.value = (currentIndex.value + 1) % len
}
</script>

<style lang="scss" scoped>
.device-image-carousel {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  border-radius: 8px;
  background: #2a2a2a;
  overflow: hidden;

  &__empty,
  &__status {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
    color: rgba(255, 255, 255, 0.75);
    font-size: 0.9rem;
  }

  &__empty {
    color: rgba(255, 255, 255, 0.55);
  }

  &__single,
  &__slide {
    width: 100%;
    height: 100%;

    :deep(.el-image) {
      width: 100%;
      height: 100%;
    }

    :deep(.el-image__inner) {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  &__nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: rgba(0, 0, 0, 0.65);
    }

    &--prev {
      left: 8px;
    }

    &--next {
      right: 8px;
    }
  }

  &__indicator {
    position: absolute;
    right: 10px;
    bottom: 8px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: 12px;
    z-index: 2;
  }
}
</style>
