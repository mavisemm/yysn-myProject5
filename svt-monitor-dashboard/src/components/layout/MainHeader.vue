<template>
  <header class="main-header">
    <div class="header-left">
      <div v-if="showHomeButton" class="nav-btn" @click="goHome">
        <el-icon :size="24" color="rgba(153, 240, 255, 1)">
          <House />
        </el-icon>
        <span>首页</span>
      </div>

      <div v-if="showReturnDeviceButton" class="nav-btn" @click="goToDevice">
        <el-icon :size="24" color="rgba(153, 240, 255, 1)">
          <Back />
        </el-icon>
        <span>返回设备</span>
      </div>

      <div v-if="showVibrationButton" class="nav-btn" @click="goToVibration">
        <el-icon :size="24" color="rgba(153, 240, 255, 1)">
          <Lightning />
        </el-icon>
        <span>振动</span>
      </div>

      <div v-if="showSoundButton" class="nav-btn" @click="goToSound">
        <el-icon :size="24" color="rgba(153, 240, 255, 1)">
          <Microphone />
        </el-icon>
        <span>声音</span>
      </div>
    </div>

    <div class="header-center">
      <h1 class="title">鲁西化工声振温在线监测平台</h1>
    </div>

    <div class="header-right-clock">
      <HeaderClock />
    </div>

    <div class="header-right-actions">
      <div class="theme-wrapper" @mouseenter="onThemeEnter" @mouseleave="onThemeLeave">
        <div class="theme-trigger" :class="`theme-trigger--${currentBackground}`" title="切换背景" />
        <div v-show="showThemeDropdown" class="theme-dropdown" @mouseenter="onThemeEnter" @mouseleave="onThemeLeave">
          <div v-if="currentBackground !== 'image'" class="theme-square theme-square--image" title="背景1"
            @click="selectBackground('image')" />
          <div v-if="currentBackground !== 'navy'" class="theme-square theme-square--navy" title="背景2"
            @click="selectBackground('navy')" />
          <div v-if="currentBackground !== 'solid'" class="theme-square theme-square--solid" title="默认背景"
            @click="selectBackground('solid')" />
        </div>
      </div>
      <div class="nav-btn logout-btn" @click="handleLogout">
        <el-icon :size="26" color="#99f0ff">
          <SwitchButton />
        </el-icon>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useAlarmOverviewStore } from '@/stores/alarmOverview'
import HeaderClock from './HeaderClock.vue'

import { SwitchButton, House, Back, Lightning, Microphone } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const deviceTreeStore = useDeviceTreeStore()
const alarmBatchStore = useAlarmBatchStore()
const alarmOverviewStore = useAlarmOverviewStore()

interface Props {
  currentBackground?: 'image' | 'navy' | 'solid'
}
withDefaults(defineProps<Props>(), { currentBackground: 'navy' })

const emit = defineEmits<{
  (e: 'change-background', mode: 'image' | 'navy' | 'solid'): void
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

  themeCloseTimer.value = window.setTimeout(() => {
    showThemeDropdown.value = false
    themeCloseTimer.value = null
  }, 150)
}

const showHomeButton = computed(() => {
  return (
    route.name === 'DeviceDetail' || route.name === 'SoundPoint' || route.name === 'VibrationPoint'
  )
})

const showReturnDeviceButton = computed(() => {
  return route.name === 'SoundPoint' || route.name === 'VibrationPoint'
})

const showVibrationButton = computed(() => {
  return route.name === 'SoundPoint'
})

const showSoundButton = computed(() => {
  return route.name === 'VibrationPoint'
})

const selectBackground = (mode: 'image' | 'navy' | 'solid') => {
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
  router.push('/dashboard')
}

const goToDevice = () => {
  if (route.name === 'DeviceDetail') {
    const id = route.params.id
    if (typeof id === 'string' && id) return
  }

  let equipmentId = (route.query.equipmentId as string) || ''

  if (!equipmentId && (route.name === 'SoundPoint' || route.name === 'VibrationPoint')) {
    const receiverIdParam = route.params.receiverId
    const receiverId = Array.isArray(receiverIdParam) ? receiverIdParam[0] : receiverIdParam
    if (typeof receiverId === 'string' && receiverId) {
      const findParentDeviceId = (rid: string): string | null => {
        for (const factory of deviceTreeStore.deviceTreeData) {
          for (const workshop of factory.children ?? []) {
            for (const device of workshop.children ?? []) {
              if (device.type !== 'device') continue
              const hasPoint = (device.children ?? []).some(
                (p) => p.type === 'point' && p.id === rid,
              )
              if (hasPoint) return device.id
            }
          }
        }
        return null
      }
      equipmentId = findParentDeviceId(receiverId) ?? ''
    }
  }

  if (equipmentId) {
    router.push({ name: 'DeviceDetail', params: { id: equipmentId } })
  } else {
    router.push('/dashboard')
  }
}

const goToVibration = () => {
  const receiverIdParam = route.params.receiverId
  const receiverId = Array.isArray(receiverIdParam) ? receiverIdParam[0] : receiverIdParam
  if (typeof receiverId !== 'string' || !receiverId) return
  router.push({ name: 'VibrationPoint', params: { receiverId }, query: route.query })
}

const goToSound = () => {
  const receiverIdParam = route.params.receiverId
  const receiverId = Array.isArray(receiverIdParam) ? receiverIdParam[0] : receiverIdParam
  if (typeof receiverId !== 'string' || !receiverId) return
  router.push({ name: 'SoundPoint', params: { receiverId }, query: route.query })
}

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    customClass: 'logout-confirm-box',
  })
    .then(() => {
      localStorage.clear()

      alarmBatchStore.resetPrefetchState()
      alarmOverviewStore.reset()

      deviceTreeStore.clearDeviceTreeData()
      router.push('/login')
      ElMessage.success('已安全退出')
    })
    .catch(() => { })
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
  background-image: image-set(url('@/assets/images/background/头部背景.avif') type('image/avif'),
      url('@/assets/images/background/头部背景.webp') type('image/webp'));
  background-repeat: no-repeat;
  background-position: center center;
  background-size: 100% 100%;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;

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

  .header-center {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    .title {
      margin: 0;
      font-size: clamp(2.05rem, 2.45vw, 2.5rem);
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #ffffff;
      text-align: center;
      vertical-align: top;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: min(60vw, 720px);
      font-family: 'YouSheBiaoTiHei', 'Microsoft YaHei', sans-serif;
      line-height: 1;
      background: linear-gradient(180deg, #ffffff 0%, #b9dcfd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;

      text-shadow:
        0 1px 0 linear-gradient(180deg, #eff7fd 0%, #b9dcfd 100%),
        0 2px 0 rgba(46, 92, 156, 0.7),
        0 3px 0 rgba(28, 68, 128, 0.62),
        0 0 10px rgba(186, 215, 255, 0.3);
    }
  }

  .header-right-clock {
    position: absolute;
    right: 115px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
  }

  .header-right-actions {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
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
    transition:
      transform 0.2s,
      box-shadow 0.2s;

    &:hover {
      transform: scale(1.1);
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    }

    &--image {
      background: #135ba9;
    }

    &--navy {
      background: #061028;
    }

    &--solid {
      background: #12316b;
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

  .logout-btn {
    color: rgba(153, 240, 255, 1);
    font-weight: 700;

    &:hover {
      color: rgba(153, 240, 255, 1);
    }
  }
}

@media (max-width: 1200px) {
  .main-header {
    padding: 0 16px;

    .header-center .title {
      font-size: 1.8rem;
    }
  }
}

@media (max-width: 768px) {
  .main-header {
    height: 56px;
    background-size: cover;

    .header-left {
      display: none;
    }

    .header-right-clock {
      display: none;
    }

    .header-right-actions {
      right: 8px;
      gap: 8px;

      .theme-wrapper {
        display: none;
      }

      .logout-btn {
        width: 0.8em;
        height: 0.8em;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    }

    .header-center {
      justify-content: flex-start;
      padding-left: 12px;

      .title {
        max-width: calc(100vw - 70px);
        font-size: 1.5rem;
        white-space: nowrap;
      }
    }
  }
}

@media (max-width: 800px) {
  .main-header {
    .header-center {
      .title {
        font-size: 1.6rem;
      }
    }
  }
}
</style>

<style lang="scss">
.el-message-box.logout-confirm-box .el-message-box__btns .el-button--default {
  color: #409eff !important;
}

.el-message-box.logout-confirm-box .el-message-box__btns .el-button--primary,
.el-message-box.logout-confirm-box .el-message-box__btns .el-button--warning {
  color: #fff !important;
}
</style>
