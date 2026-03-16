<template>
  <header class="main-header">
    <!-- 左侧按钮组 -->
    <div class="header-left">
      <!-- 首页按钮 -->
      <div v-if="showHomeButton" class="nav-btn " @click="goHome">
        <el-icon :size="24" color="rgba(153, 240, 255, 1)">
          <House />
        </el-icon>
        <span>首页</span>
      </div>

      <!-- 返回设备按钮 -->
      <div v-if="showReturnDeviceButton" class="nav-btn " @click="goToDevice">
        <el-icon :size="24" color="rgba(153, 240, 255, 1)">
          <Back />
        </el-icon>
        <span>返回设备</span>
      </div>

      <!-- 振动按钮 -->
      <div v-if="showVibrationButton" class="nav-btn " @click="goToVibration">
        <el-icon :size="24" color="rgba(153, 240, 255, 1)">
          <Lightning />
        </el-icon>
        <span>振动</span>
      </div>

      <!-- 声音按钮 -->
      <div v-if="showSoundButton" class="nav-btn " @click="goToSound">
        <el-icon :size="24" color="rgba(153, 240, 255, 1)">
          <Microphone />
        </el-icon>
        <span>声音</span>
      </div>
    </div>

    <div class="header-center">
      <h1 class="title">鲁西化工声振温综合在线监测平台</h1>
    </div>

    <!-- 右侧：时间组件盒子 -->
    <div class="header-right-clock">
      <HeaderClock />
    </div>

    <!-- 右侧：主题色块（多主题）+ 退出按钮盒子 -->
    <div class="header-right-actions">
      <div
        class="theme-wrapper"
        @mouseenter="onThemeEnter"
        @mouseleave="onThemeLeave"
      >
        <div
          class="theme-trigger"
          :class="`theme-trigger--${currentBackground}`"
          title="切换背景"
        />
        <div
          v-show="showThemeDropdown"
          class="theme-dropdown"
          @mouseenter="onThemeEnter"
          @mouseleave="onThemeLeave"
        >
          <!-- 下拉中只展示“非当前”的其他主题 -->
          <div
            v-if="currentBackground !== 'image'"
            class="theme-square theme-square--image"
            title="默认蓝色背景"
            @click="selectBackground('image')"
          />
          <div
            v-if="currentBackground !== 'gray'"
            class="theme-square theme-square--gray"
            title="灰色背景"
            @click="selectBackground('gray')"
          />
          <div
            v-if="currentBackground !== 'green'"
            class="theme-square theme-square--green"
            title="绿色背景"
            @click="selectBackground('green')"
          />
          <div
            v-if="currentBackground !== 'navy'"
            class="theme-square theme-square--navy"
            title="深蓝色背景"
            @click="selectBackground('navy')"
          />
          <div
            v-if="currentBackground !== 'solid'"
            class="theme-square theme-square--solid"
            title="纯色背景"
            @click="selectBackground('solid')"
          />
        </div>
      </div>
      <div class="nav-btn" @click="handleLogout">
        <el-icon :size="24" color="rgba(153, 240, 255, 1)">
          <SwitchButton />
        </el-icon>
        <span>退出</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import HeaderClock from './HeaderClock.vue'

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

interface Props {
  currentBackground?: 'image' | 'gray' | 'green' | 'navy' | 'solid'
}
withDefaults(defineProps<Props>(), { currentBackground: 'image' })

const emit = defineEmits<{
  (e: 'change-background', mode: 'image' | 'gray' | 'green' | 'navy' | 'solid'): void
}>()

const showThemeDropdown = ref(false)
const themeCloseTimer = ref<number | null>(null)

const onThemeEnter = () => {
  if (themeCloseTimer.value !== null) {
    window.clearTimeout(themeCloseTimer.value)
    themeCloseTimer.value = null
  }
  showThemeDropdown.value = true
}

const onThemeLeave = () => {
  if (themeCloseTimer.value !== null) {
    window.clearTimeout(themeCloseTimer.value)
  }
  // 给鼠标跨过 trigger 与 dropdown 的间隙留缓冲
  themeCloseTimer.value = window.setTimeout(() => {
    showThemeDropdown.value = false
    themeCloseTimer.value = null
  }, 150)
}

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

const selectBackground = (mode: 'image' | 'gray' | 'green' | 'navy' | 'solid') => {
  emit('change-background', mode)
  showThemeDropdown.value = false
}

onBeforeUnmount(() => {
  if (themeCloseTimer.value !== null) {
    window.clearTimeout(themeCloseTimer.value)
    themeCloseTimer.value = null
  }
})

const goHome = () => {
  // 重置设备树状态到初始状态
  deviceTreeStore.resetDeviceTreeState()
  router.push('/')
}

const goToDevice = () => {
  let deviceId = route.params.id as string

  if (!deviceId && (route.name === 'SoundPoint' || route.name === 'VibrationPoint')) {
    // 优先从query中获取deviceId
    const queryDeviceId = route.query.deviceId
    if (queryDeviceId) {
      const resolvedId = Array.isArray(queryDeviceId) ? queryDeviceId[0] : queryDeviceId
      if (resolvedId) {
        deviceId = resolvedId
      }
    }

    // 如果query中没有deviceId，则尝试从pointId推断设备ID
    if (!deviceId) {
      const pointId = route.query.pointId
      if (pointId) {
        const resolvedPointId = Array.isArray(pointId) ? pointId[0] : pointId
        if (resolvedPointId) {
          // 从点位ID中提取设备ID（假设点位ID格式为 设备ID-其他信息）
          const devicePart = resolvedPointId.split('-')[0]
          if (devicePart) {
            deviceId = devicePart
          }
        }
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
  padding: 10px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    position: absolute;
    left: 10px;
    top: calc(8vh - 30px);
    z-index: 1;

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.3s;
      color: rgba(153, 240, 255, 1);
      /* 使用 rem，相对根字号自适应 */
      font-size: 1rem;
      font-weight: 500;
      border-radius: 8px;

      &:hover {
        background: rgba(150, 150, 150, 0.2);
        color: rgba(153, 240, 255, 1);
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
      font-size: clamp(1.75rem, 2.2vw, 2rem);
      font-weight: 400;
      letter-spacing: 0px;
      color: rgba(0, 255, 255, 1);
      text-align: center;
      vertical-align: top;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: min(60vw, 720px);
    }
  }

  /* 右侧：时间盒子（单独一个容器） */
  .header-right-clock {
    position: absolute;
    right: 150px;
    top: 80%;
    transform: translateY(-50%);
    z-index: 1;
  }

  /* 右侧：主题 + 退出盒子（单独一个容器） */
  .header-right-actions {
    position: absolute;
    right: 10px;
    top: calc(8vh - 30px);
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .theme-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .theme-trigger {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.5);
    transition: box-shadow 0.2s;

    &:hover {
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.35);
    }

    &--image {
      background: #135ba9;
    }

    &--gray {
      background: linear-gradient(135deg, #4a4a4a 0%, #6b7280 50%, #9ca3af 100%);
    }
    
    &--green {
      background: linear-gradient(135deg, #064e3b 0%, #10b981 45%, #6ee7b7 100%);
    }

    &--navy {
      background: #061028;
    }

    &--solid {
      background: #151155;
    }
  }

  .theme-dropdown {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 6px;
    padding: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.18);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    z-index: 1000;
    pointer-events: auto;
  }

  .theme-square {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: scale(1.1);
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    }

    &--image {
      background: #135ba9;
    }

    &--gray {
      background: linear-gradient(135deg, #4a4a4a 0%, #6b7280 50%, #9ca3af 100%);
    }

    &--green {
      background: linear-gradient(135deg, #064e3b 0%, #10b981 45%, #6ee7b7 100%);
    }

    &--navy {
      background: #061028;
    }

    &--solid {
      background: #151155;
    }
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.3s;
    color: rgba(153, 240, 255, 1);
    font-size: 1rem;
    font-weight: 500;
    border-radius: 8px;

    &:hover {
      background: rgba(150, 150, 150, 0.2);
      color: rgba(153, 240, 255, 1);
    }
  }
}

@media (max-width: 1200px) {
  .main-header {
    padding: 0 16px;

    .header-center .title {
      /* 小屏标题略小一点 */
      font-size: 1.8rem;
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