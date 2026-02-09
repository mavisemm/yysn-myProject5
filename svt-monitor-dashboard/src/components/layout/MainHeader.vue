<template>
  <header class="main-header">
    <!-- 左侧按钮组 -->
    <div class="header-left">
      <!-- 首页按钮 -->
      <div v-if="showHomeButton" class="nav-btn special-font-color" @click="goHome">
        <el-icon :size="24" color="var(--special-font-color)">
          <House />
        </el-icon>
        <span>首页</span>
      </div>

      <!-- 返回设备按钮 -->
      <div v-if="showReturnDeviceButton" class="nav-btn special-font-color" @click="goToDevice">
        <el-icon :size="24" color="var(--special-font-color)">
          <Back />
        </el-icon>
        <span>返回设备</span>
      </div>

      <!-- 振动按钮 -->
      <div v-if="showVibrationButton" class="nav-btn special-font-color" @click="goToVibration">
        <el-icon :size="24" color="var(--special-font-color)">
          <Lightning />
        </el-icon>
        <span>振动</span>
      </div>

      <!-- 声音按钮 -->
      <div v-if="showSoundButton" class="nav-btn special-font-color" @click="goToSound">
        <el-icon :size="24" color="var(--special-font-color)">
          <Microphone />
        </el-icon>
        <span>声音</span>
      </div>
    </div>

    <div class="header-center">
      <h1 class="title">云音声脑声振温在线监测</h1>
    </div>

    <!-- 右侧：退出 -->
    <div class="header-right">
      <div class="nav-btn special-font-color" @click="handleLogout">
        <el-icon :size="24" color="var(--special-font-color)">
          <SwitchButton />
        </el-icon>
        <span>退出</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useDeviceTreeStore } from '@/stores/deviceTree'

import {
  SwitchButton,
  House,
  Back,
  Lightning,
  Microphone
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const deviceTreeStore = useDeviceTreeStore()

const showHomeButton = computed(() => {
  return route.name === 'DeviceDetail' ||
    route.name === 'SoundPoint' ||
    route.name === 'VibrationPoint'
})

const showReturnDeviceButton = computed(() => {
  return route.name === 'SoundPoint' ||
    route.name === 'VibrationPoint'
})

const showVibrationButton = computed(() => {
  return route.name === 'SoundPoint'
})

const showSoundButton = computed(() => {
  return route.name === 'VibrationPoint'
})

const goHome = () => {
  // 重置设备树状态到初始状态
  deviceTreeStore.resetDeviceTreeState()
  router.push('/')
}

const goToDevice = () => {
  let deviceId = route.params.id as string

  if (!deviceId && (route.name === 'SoundPoint' || route.name === 'VibrationPoint')) {
    const queryDeviceId = route.query.deviceId
    if (queryDeviceId) {
      const resolvedId = Array.isArray(queryDeviceId) ? queryDeviceId[0] : queryDeviceId
      if (resolvedId) {
        deviceId = resolvedId
      }
    }
  }

  if (deviceId) {
    router.push({ name: 'DeviceDetail', params: { id: deviceId } })
  } else {
    router.push('/')
  }
}

const goToVibration = () => {
  router.push({ name: 'VibrationPoint', query: route.query })
}

const goToSound = () => {
  router.push({ name: 'SoundPoint', query: route.query })
}

const handleLogout = () => {
  ElMessageBox.confirm(
    '确定要退出登录吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      customClass: 'logout-confirm-box',
    }
  ).then(() => {
    localStorage.removeItem('token')
    router.push('/login')
    ElMessage.success('已安全退出')
  }).catch(() => {
    // 用户点击取消或关闭弹窗，不做任何操作
  })
}
</script>

<style lang="scss" scoped>
.main-header {
  width: 100%;
  height: 8vh;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 100;
  padding: 15px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    position: absolute;
    left: 15px;
    top: calc(8vh - 30px);
    z-index: 1;

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.3s;
      color: var(--special-font-color);
      font-size: clamp(14px, 2vw, 18px);
      font-weight: 500;
      border-radius: 8px;

      &:hover {
        background: rgba(150, 150, 150, 0.2);
        color: var(--special-font-color);
      }
    }
  }

  .header-center {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    .title {
      margin: 0;
      font-size: clamp(30px, 4.5vw, 36px);
      /* 响应式字体大小，以36px为基准 */
      font-weight: 500;
      color: #00ffff;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    position: absolute;
    right: 15px;
    top: calc(8vh - 30px);
    z-index: 1;

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.3s;
      color: var(--special-font-color);
      font-size: clamp(14px, 2vw, 18px);
      font-weight: 500;
      border-radius: 8px;

      &:hover {
        background: rgba(150, 150, 150, 0.2);
        color: var(--special-font-color);
      }
    }
  }
}

@media (max-width: 1200px) {
  .main-header {
    padding: 0 16px;

    .header-center .title {
      font-size: clamp(24px, 3.5vw, 30px);
    }
  }
}
</style>

<style lang="scss">
/* 退出登录确认框：取消按钮 #409eff，确定按钮白色（非 scoped，弹窗挂载在 body 下） */
.el-message-box.logout-confirm-box .el-message-box__btns .el-button--default {
  color: #409eff !important;
}

.el-message-box.logout-confirm-box .el-message-box__btns .el-button--primary,
.el-message-box.logout-confirm-box .el-message-box__btns .el-button--warning {
  color: #fff !important;
}
</style>