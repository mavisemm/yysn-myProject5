<template>
  <header class="main-header">
    <!-- 左侧按钮组 -->
    <div class="header-left">
      <!-- 首页按钮 (设备详情页、点位声音页、点位振动页显示) -->
      <div v-if="showHomeButton" class="nav-btn" @click="goHome">
        <el-icon :size="24" color="#fff">
          <House />
        </el-icon>
        <span>首页</span>
      </div>

      <!-- 返回设备按钮 (点位声音页、点位振动页显示) -->
      <div v-if="showReturnDeviceButton" class="nav-btn" @click="goToDevice">
        <el-icon :size="24" color="#fff">
          <Back />
        </el-icon>
        <span>返回设备</span>
      </div>

      <!-- 振动按钮 (点位声音页显示) -->
      <div v-if="showVibrationButton" class="nav-btn" @click="goToVibration">
        <el-icon :size="24" color="#fff">
          <Lightning />
        </el-icon>
        <span>振动</span>
      </div>

      <!-- 声音按钮 (点位振动页显示) -->
      <div v-if="showSoundButton" class="nav-btn" @click="goToSound">
        <el-icon :size="24" color="#fff">
          <Microphone />
        </el-icon>
        <span>声音</span>
      </div>

      <!-- 默认Logo (首页显示) -->
      <div v-if="showDefaultLogo" class="logo">
        <el-icon :size="28" color="#fff">
          <Monitor />
        </el-icon>
      </div>
    </div>

    <!-- 标题居中 -->
    <div class="header-center">
      <h1 class="title">云音声脑声振温在线监测</h1>
    </div>

    <!-- 右侧退出按钮 -->
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

// 检查当前路由是否为首页
const showHomeButton = computed(() => {
  // 只在设备详情页、声音点位页、振动点位页显示首页按钮
  return route.name === 'DeviceDetail' ||
    route.name === 'SoundPoint' ||
    route.name === 'VibrationPoint'
})

// 检查是否显示返回设备按钮
const showReturnDeviceButton = computed(() => {
  // 在点位声音页、点位振动页显示返回设备按钮
  return route.name === 'SoundPoint' ||
    route.name === 'VibrationPoint'
})

// 检查是否显示振动按钮
const showVibrationButton = computed(() => {
  // 在点位声音页显示振动按钮
  return route.name === 'SoundPoint'
})

// 检查是否显示声音按钮
const showSoundButton = computed(() => {
  // 在点位振动页显示声音按钮
  return route.name === 'VibrationPoint'
})

// 检查是否显示默认Logo
const showDefaultLogo = computed(() => {
  // 只在首页显示Logo
  return route.name === 'Dashboard'
})

// 跳转到首页
const goHome = () => {
  router.push('/')
}

// 返回设备详情
const goToDevice = () => {
  // 优先从params中获取设备ID，如果没有则尝试从query或其他来源获取
  let deviceId = route.params.id as string

  // 如果在点位页面，尝试从查询参数获取设备ID
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
    // 如果没有设备ID，返回首页
    router.push('/')
  }
}

// 跳转到振动点位页
const goToVibration = () => {
  router.push({ name: 'VibrationPoint', query: route.query })
}

// 跳转到声音点位页
const goToSound = () => {
  router.push({ name: 'SoundPoint', query: route.query })
}

// 用户信息
const userName = ref('管理员')
const userAvatar = ref('https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png')

// 退出登录
const handleLogout = () => {
  // 1. 清除本地存储的token
  localStorage.removeItem('token')

  // 2. 显示确认提示
  ElMessageBox.confirm(
    '确定要退出登录吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    // 3. 跳转到登录页
    router.push('/login')
    ElMessage.success('已安全退出')
  }).catch(() => {
    // 用户取消
  })
}
</script>

<style lang="scss" scoped>
.main-header {
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg,
      rgba(26, 115, 232, 0.95) 0%,
      rgba(52, 152, 219, 0.95) 100%);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 100;

  // 左侧
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      backdrop-filter: blur(5px);
    }

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.3s;
      color: white;
      font-size: 14px;
      font-weight: 500;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }

  .header-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;

    .title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: white;
      letter-spacing: 1px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      background: linear-gradient(90deg, #fff 0%, #e6f7ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  // 右侧
  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      backdrop-filter: blur(5px);
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .username {
        color: white;
        font-weight: 500;
        font-size: 14px;
      }
    }

    // 退出按钮样式
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
        font-size: 18px;
      }
    }
  }
}

// 响应式适配
@media (max-width: 1200px) {
  .main-header {
    padding: 0 16px;

    .header-center .title {
      font-size: 18px;
    }

    .user-info .username {
      display: none;
    }
  }
}
</style>