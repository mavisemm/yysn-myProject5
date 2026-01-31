<template>
  <header class="main-header">
    <!-- 左侧按钮组 -->
    <div class="header-left">
      <!-- 首页按钮 -->
      <div v-if="showHomeButton" class="nav-btn" @click="goHome">
        <el-icon :size="24" color="#fff">
          <House />
        </el-icon>
        <span>首页</span>
      </div>

      <!-- 返回设备按钮 -->
      <div v-if="showReturnDeviceButton" class="nav-btn" @click="goToDevice">
        <el-icon :size="24" color="#fff">
          <Back />
        </el-icon>
        <span>返回设备</span>
      </div>

      <!-- 振动按钮 -->
      <div v-if="showVibrationButton" class="nav-btn" @click="goToVibration">
        <el-icon :size="24" color="#fff">
          <Lightning />
        </el-icon>
        <span>振动</span>
      </div>

      <!-- 声音按钮 -->
      <div v-if="showSoundButton" class="nav-btn" @click="goToSound">
        <el-icon :size="24" color="#fff">
          <Microphone />
        </el-icon>
        <span>声音</span>
      </div>
    </div>

    <div class="header-center">
      <h1 class="title">云音声脑声振温在线监测</h1>
    </div>

    <!-- 退出按钮 -->
    <div class="header-right">
      <div class="user-info">
        <el-avatar :size="32" :src="userAvatar" />
        <span class="username">{{ userName }}</span>
      </div>
      <el-tooltip content="退出登录" placement="bottom">
        <el-button type="danger" :icon="SwitchButton" circle @click="handleLogout" />
      </el-tooltip>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useDeviceTreeStore } from '@/stores/deviceTree'

import {
  Monitor,
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

const userName = ref('管理员')
const userAvatar = ref('https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png')

const handleLogout = () => {
  localStorage.removeItem('token')

  ElMessageBox.confirm(
    '确定要退出登录吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    router.push('/login')
    ElMessage.success('已安全退出')
  }).catch(() => {
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
    left: 24px;
    z-index: 1;

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.3s;
      color: white;
      font-size: clamp(14px, 2vw, 18px);
      /* 响应式字体大小，以36px为基准 */
      font-weight: 500;

      &:hover {
        background: rgba(255, 255, 255, 0.2)
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
      font-weight: 700;
      color: white;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 15px;
    position: absolute;
    right: 24px;
    z-index: 1;

    .user-info {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 6px 12px;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .username {
        color: white;
        font-weight: 500;
        font-size: clamp(14px, 2vw, 18px);
        /* 响应式字体大小，以36px为基准 */
      }
    }

    :deep(.el-button) {
      width: 40px;
      height: 40px;
      background: rgba(245, 108, 108, 0.9);
      border: none;
      transition: all 0.3s;

      &:hover {
        background: #f56c6c;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(245, 108, 108, 0.4);
      }

      .el-icon {
        font-size: clamp(16px, 2.5vw, 18px);
        /* 响应式字体大小 */
      }
    }
  }
}

@media (max-width: 1200px) {
  .main-header {
    padding: 0 16px;

    .header-center .title {
      font-size: clamp(24px, 3.5vw, 30px);
      /* 响应式字体大小，以36px为基准 */
    }

    .user-info .username {
      display: none;
    }
  }
}
</style>