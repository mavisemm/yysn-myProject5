<template>
  <div class="page-layout">
    <MainHeader />
    <div class="main-content">
      <!-- 设备列表侧边栏 -->
      <div class="device-sidebar-container">
        <DeviceSidebar />
      </div>

      <!-- 主要内容区域 -->
      <div class="content-wrapper">
        <div class="content-area">
          <RouterView />
        </div>
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
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: url('@/assets/images/background/背景.png') no-repeat center center;
  background-size: 100vw 100vh;
  padding: 0 0.7vw 2.4vh 0.7vw;

  .main-content {
    height: 92vh;
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;

    .device-sidebar-container {
      flex: 0 0 25%;
      min-width: 200px;
      max-width: 400px;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 15px 0 15px 15px;

      >* {
        flex: 1;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
    }

    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: auto;

      .content-area {
        flex: 1;
        padding: 15px;
        overflow: auto;
        min-width: 300px;

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
}

@media (max-width: 800px) {
  .page-layout {
    overflow-x: auto;
    overflow-y: hidden;

    .main-content {
      min-width: 500px;

      .device-sidebar-container {
        flex: 0 0 200px;
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