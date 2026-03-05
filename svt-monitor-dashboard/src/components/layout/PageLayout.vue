<template>
  <div
    class="page-layout"
    :class="{
      'page-layout--gray': backgroundMode === 'gray',
      'page-layout--green': backgroundMode === 'green',
      'page-layout--navy': backgroundMode === 'navy'
    }"
  >
    <MainHeader
      :current-background="backgroundMode"
      @change-background="handleChangeBackground"
    />
    <div class="main-content">
      <DeviceSidebar />

      <!-- 主要内容区域 -->
      <div class="content-wrapper">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MainHeader from './MainHeader.vue'
import DeviceSidebar from './DeviceSidebar.vue'
import { RouterView } from 'vue-router'
import { usePointMessageStore } from '@/stores/pointMessage'

const backgroundMode = ref<'image' | 'gray' | 'green' | 'navy'>('image')

const handleChangeBackground = (mode: 'image' | 'gray' | 'green' | 'navy') => {
  backgroundMode.value = mode
}

onMounted(() => {
  usePointMessageStore().loadPointMessage()
})
</script>

<style lang="scss" scoped>
.page-layout {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: url('@/assets/images/background/首页-背景.png') no-repeat center center;
  background-size: 100vw 100vh;
  padding: 0 0.7vw 2.4vh 0.7vw;

  /* 灰色主题：背景 + 字体改为黑色 */
  &.page-layout--gray {
    /* 科技感灰色背景：略带蓝调的多层渐变 */
    background:
      radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.9) 0, rgba(255, 255, 255, 0) 40%),
      radial-gradient(circle at 80% 100%, rgba(255, 255, 255, 0.8) 0, rgba(255, 255, 255, 0) 45%),
      linear-gradient(135deg, #e5e7eb 0%, #d4d7dd 35%, #c5c9d3 70%, #b8becb 100%);
    background-size: 100vw 100vh;

    /* 所有文字统一改为黑色，保持在灰底上清晰可读 */
    color: #000;
    :deep(*) {
      color: #000 !important;
    }

    /* 灰色主题下：用低饱和蓝灰色边框替换原来的背景图卡片 */
    :deep(.stats-area),
    :deep(.alarm-overview),
    :deep(.metrics-area),
    :deep(.device-sidebar),
    :deep(.info-section-right),
    :deep(.stats-card) {
      background: transparent !important;
      background-image: none !important;
      border-radius: 12px;
      /* #8ea3c0：偏冷的蓝灰色，搭配灰底更稳重 */
      border: 1px solid #8ea3c0;
      box-shadow:
        0 0 0 1px rgba(148, 163, 184, 0.4),
        0 0 12px rgba(148, 163, 184, 0.45);
      backdrop-filter: blur(4px);
    }
  }

  /* 绿色科技感主题：偏冷的绿色渐变 + 保留白字 */
  &.page-layout--green {
    background:
      radial-gradient(circle at 20% 0%, rgba(74, 222, 128, 0.25) 0, rgba(74, 222, 128, 0) 45%),
      radial-gradient(circle at 80% 100%, rgba(34, 197, 94, 0.25) 0, rgba(34, 197, 94, 0) 45%),
      linear-gradient(145deg, #022c22 0%, #064e3b 35%, #047857 70%, #0f766e 100%);
    background-size: 100vw 100vh;

    /* 绿色主题下：用翠绿色边框替换原来的背景图卡片 */
    :deep(.stats-area),
    :deep(.alarm-overview),
    :deep(.metrics-area),
    :deep(.device-sidebar),
    :deep(.info-section-right),
    :deep(.stats-card) {
      background: transparent !important;
      background-image: none !important;
      border-radius: 12px;
      border: 1px solid #22c55e; /* 翠绿色描边 */
      box-shadow:
        0 0 0 1px rgba(15, 23, 42, 0.04),
        0 0 16px rgba(34, 197, 94, 0.45);
      backdrop-filter: blur(4px);
    }
  }

  /* 深蓝科技感主题：深蓝 + 些许紫色辉光 */
  &.page-layout--navy {
    background:
      radial-gradient(circle at 15% 0%, rgba(59, 130, 246, 0.3) 0, rgba(15, 23, 42, 0) 45%),
      radial-gradient(circle at 85% 100%, rgba(168, 85, 247, 0.3) 0, rgba(15, 23, 42, 0) 45%),
      linear-gradient(135deg, #020617 0%, #02091b 35%, #0b1120 70%, #020617 100%);
    background-size: 100vw 100vh;

    /* 深蓝主题下：用高亮蓝青色边框替换原来的背景图卡片 */
    :deep(.stats-area),
    :deep(.alarm-overview),
    :deep(.metrics-area),
    :deep(.device-sidebar),
    :deep(.info-section-right),
    :deep(.stats-card) {
      background: transparent !important;
      background-image: none !important;
      border-radius: 12px;
      border: 1px solid #38bdf8; /* 亮蓝青色描边，深蓝底上更显眼 */
      box-shadow:
        0 0 0 1px rgba(15, 23, 42, 0.06),
        0 0 18px rgba(56, 189, 248, 0.55);
      backdrop-filter: blur(4px);
    }
  }

  .main-content {
    height: 92vh;
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
    padding: 10px;

    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      padding-left: 8px;


      &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
    }
  }
}

@media (max-width: 800px) {
  .page-layout {
    overflow-x: auto;
    overflow-y: hidden;

    .main-content {
      min-width: 500px;

      .device-sidebar-container {
        width: 200px;
      }
    }
  }
}

@media (max-width: 500px) {
  .page-layout {
    .main-content {
      min-width: 500px;
    }
  }
}
</style>