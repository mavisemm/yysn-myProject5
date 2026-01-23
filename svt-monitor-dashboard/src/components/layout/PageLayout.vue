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
  background: #f5f7fa;

  .main-content {
    height: calc(100vh - 60px);
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;

    /* 设备列表侧边栏容器：永远25%宽度 */
    .device-sidebar-container {
      flex: 0 0 25%;
      /* 固定25%宽度 */
      min-width: 200px;
      /* 绝对最小宽度 */
      max-width: 400px;
      height: 100%;
      background: white;
      border-right: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;

      /* 确保DeviceSidebar组件填满容器 */
      >* {
        flex: 1;
        width: 100%;
        height: 100%;
        overflow: hidden;
        /* 隐藏外层滚动条 */
      }
    }

    /* 内容区域容器：永远75%宽度 */
    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      /* 关键：允许内容区域收缩 */
      overflow: auto;

      .content-area {
        flex: 1;
        padding: 0 20px;
        overflow: auto;
        background: #f5f7fa;
        min-width: 300px;
        /* 内容区域最小宽度 */

        /* 自定义滚动条 */
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

/* 极端窄屏处理：添加水平滚动 */
@media (max-width: 800px) {
  .page-layout {
    /* 整个布局可以水平滚动 */
    overflow-x: auto;
    overflow-y: hidden;

    .main-content {
      /* 强制保持最小总宽度：设备列表200px + 内容区域300px = 500px */
      min-width: 500px;

      .device-sidebar-container {
        flex: 0 0 200px;
        /* 窄屏时固定为最小宽度 */
      }

      .content-wrapper {
        .content-area {
          padding: 16px;
        }
      }
    }
  }
}

/* 超窄屏处理 */
@media (max-width: 500px) {
  .page-layout {
    .main-content {
      min-width: 500px;
      /* 保持最小总宽度 */
    }
  }
}
</style>