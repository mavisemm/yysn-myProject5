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
import { onMounted, provide, ref } from 'vue'
import MainHeader from './MainHeader.vue'
import DeviceSidebar from './DeviceSidebar.vue'
import { RouterView } from 'vue-router'
import { usePointMessageStore } from '@/stores/pointMessage'

const backgroundMode = ref<'image' | 'gray' | 'green' | 'navy'>('image')
provide('backgroundMode', backgroundMode)

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
    background:
      radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.9) 0, rgba(255, 255, 255, 0) 40%),
      radial-gradient(circle at 80% 100%, rgba(255, 255, 255, 0.8) 0, rgba(255, 255, 255, 0) 45%),
      linear-gradient(135deg, #e5e7eb 0%, #d4d7dd 35%, #c5c9d3 70%, #b8becb 100%);
    background-size: 100vw 100vh;

    color: #000;
    :deep(*) {
      color: #000 !important;
    }

    :deep(.echarts-tooltip),
    :deep(.echarts-tooltip *) {
      color: #fff !important;
    }

    :deep(.stats-area),
    :deep(.alarm-overview),
    :deep(.metrics-area),
    :deep(.device-sidebar),
    :deep(.info-section-right),
    :deep(.stats-card),
    :deep(.device-info-module),
    :deep(.point-list-module),
    :deep(.chart-item),
    :deep(.analysis-item),
    :deep(.table-section-left),
    :deep(.waterfall-card),
    :deep(.freq-card),
    :deep(.time-card) {
      background: transparent !important;
      background-image: none !important;
      border-radius: 12px;
      border: 1px solid #8ea3c0;
      backdrop-filter: blur(4px);
    }
  }

  &.page-layout--green {
    background:
      radial-gradient(circle at 20% 0%, rgba(74, 222, 128, 0.25) 0, rgba(74, 222, 128, 0) 45%),
      radial-gradient(circle at 80% 100%, rgba(34, 197, 94, 0.25) 0, rgba(34, 197, 94, 0) 45%),
      linear-gradient(145deg, #022c22 0%, #064e3b 35%, #047857 70%, #0f766e 100%);
    background-size: 100vw 100vh;

    :deep(.stats-area),
    :deep(.alarm-overview),
    :deep(.metrics-area),
    :deep(.device-sidebar),
    :deep(.info-section-right),
    :deep(.stats-card),
    :deep(.device-info-module),
    :deep(.point-list-module),
    :deep(.chart-item),
    :deep(.analysis-item),
    :deep(.table-section-left),
    :deep(.waterfall-card),
    :deep(.freq-card),
    :deep(.time-card) {
      background: transparent !important;
      background-image: none !important;
      border-radius: 12px;
      border: 1px solid #22c55e;
      backdrop-filter: blur(4px);
    }
  }

  &.page-layout--navy {
    background:
      radial-gradient(circle at 15% 0%, rgba(59, 130, 246, 0.3) 0, rgba(15, 23, 42, 0) 45%),
      radial-gradient(circle at 85% 100%, rgba(168, 85, 247, 0.3) 0, rgba(15, 23, 42, 0) 45%),
      linear-gradient(135deg, #020617 0%, #02091b 35%, #0b1120 70%, #020617 100%);
    background-size: 100vw 100vh;

    :deep(.stats-area),
    :deep(.alarm-overview),
    :deep(.metrics-area),
    :deep(.device-sidebar),
    :deep(.info-section-right),
    :deep(.stats-card),
    :deep(.device-info-module),
    :deep(.point-list-module),
    :deep(.chart-item),
    :deep(.analysis-item),
    :deep(.table-section-left),
    :deep(.waterfall-card),
    :deep(.freq-card),
    :deep(.time-card) {
      background: transparent !important;
      background-image: none !important;
      border-radius: 12px;
      border: 1px solid #38bdf8;
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