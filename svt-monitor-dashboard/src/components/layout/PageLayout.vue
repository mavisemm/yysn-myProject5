<template>
  <div
    class="page-layout"
    :class="{
      'page-layout--black': backgroundMode === 'black',
      'page-layout--purple': backgroundMode === 'purple'
    }"
  >
    <MainHeader @change-background="handleChangeBackground" />
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

const backgroundMode = ref<'image' | 'black' | 'purple'>('image')

const handleChangeBackground = (mode: 'black' | 'purple') => {
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

  &.page-layout--black {
    background: #000000;
    background-size: 100vw 100vh;
  }

  &.page-layout--purple {
    background: linear-gradient(180deg, #1a0033 0%, #4b0082 50%, #b266ff 100%);
    background-size: 100vw 100vh;
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