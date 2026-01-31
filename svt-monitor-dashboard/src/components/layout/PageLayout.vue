<template>
  <div class="page-layout">
    <MainHeader />
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
import MainHeader from './MainHeader.vue'
import DeviceSidebar from './DeviceSidebar.vue'
import { RouterView } from 'vue-router'
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

  .main-content {
    height: 92vh;
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
    padding: 15px;

    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      height: 100%;
      padding-left: 15px;


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

      .content-wrapper {
        .content-area {
          padding: 16px;
        }
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