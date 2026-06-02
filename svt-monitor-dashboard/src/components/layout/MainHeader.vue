<template>
  <header class="main-header">
    <div class="header-left">
      <HeaderClock />

      <div v-if="showReturnDeviceButton" class="nav-btn" @click="goToDevice">
        <el-icon :size="24" class="nav-icon">
          <Back />
        </el-icon>
        <span>返回设备</span>
      </div>

      <SoundVibrationSegment v-if="showPointTypeSwitch" variant="header" />
    </div>

    <div class="header-center">
      <h1 class="title">{{ platformTitle }}</h1>
    </div>

    <div class="header-right-actions">
      <el-tooltip content="退出登录" placement="bottom">
        <div class="nav-btn logout-btn" @click="handleLogout">
          <el-icon :size="26" class="nav-icon">
            <SwitchButton />
          </el-icon>
        </div>
      </el-tooltip>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage, ElTooltip } from 'element-plus'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useAlarmOverviewStore } from '@/stores/alarmOverview'
import HeaderClock from './HeaderClock.vue'
import SoundVibrationSegment from './SoundVibrationSegment.vue'

import { SwitchButton, Back } from '@element-plus/icons-vue'
import {
  layoutShowPointTypeSwitch,
  layoutShowReturnDevice,
} from '@/components/layout/layoutNavUtils'
import { useLayoutDeviceNavigation } from '@/composables/useLayoutDeviceNavigation'

const router = useRouter()
const route = useRoute()

const deviceTreeStore = useDeviceTreeStore()
const alarmBatchStore = useAlarmBatchStore()
const alarmOverviewStore = useAlarmOverviewStore()

interface Props {
  currentBackground?: 'image' | 'navy' | 'solid'
}
withDefaults(defineProps<Props>(), { currentBackground: 'navy' })

defineEmits<{
  (e: 'change-background', mode: 'image' | 'navy' | 'solid'): void
}>()

const showReturnDeviceButton = computed(() => layoutShowReturnDevice(route.name))
const showPointTypeSwitch = computed(() => layoutShowPointTypeSwitch(route.name))

const platformTitle = computed(() => {
  const tenantId = (localStorage.getItem('tenantId') || '').trim()
  if (tenantId === '9eda8d5a0d4e41c38950c1c8b95d92ca') {
    return '中铁装备声振温在线监测平台'
  }
  return '云音声脑在线监测预警平台'
})

onBeforeUnmount(() => {
  //
})

const { goToDevice } = useLayoutDeviceNavigation()

function clearAuthState() {
  ElMessageBox.close()
  alarmOverviewStore.stop()
  localStorage.clear()
  sessionStorage.clear()
  alarmBatchStore.resetPrefetchState()
  alarmOverviewStore.reset()
  deviceTreeStore.clearDeviceTreeData()
}

const handleLogout = () => {
  ElMessageBox.close()
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    customClass: 'logout-confirm-box',
    appendTo: document.body,
  })
    .then(async () => {
      clearAuthState()
      const loginHref = router.resolve({ name: 'Login' }).href
      try {
        await router.replace({ name: 'Login' })
      } catch {
        window.location.replace(loginHref)
        return
      }
      if (router.currentRoute.value.name !== 'Login') {
        window.location.replace(loginHref)
        return
      }
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
    gap: 12px;
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
      color: #ffffff;

      font-size: 1rem;
      font-weight: 500;
      border-radius: 8px;

      &:hover {
        background: rgba(150, 150, 150, 0.2);
        color: #ffffff;
      }

      .nav-icon {
        color: #cfe4ff;
      }

      span {
        background: linear-gradient(177.37deg, #ffffff 2.19%, #7ea8ff 160.82%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }
  }

  .header-center {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

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

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.3s;
    color: #ffffff;
    font-size: 1rem;
    font-weight: 500;
    border-radius: 8px;

    &:hover {
      background: rgba(150, 150, 150, 0.2);
      color: #ffffff;
    }

    .nav-icon {
      color: #cfe4ff;
    }
  }

  .logout-btn {
    color: #ffffff;
    font-weight: 700;

    &:hover {
      color: #ffffff;
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

@media (max-width: 800px) {
  .main-header {
    height: 56px;
    background-size: cover;

    .header-left {
      left: 8px;
      gap: 8px;
      max-width: calc(100vw - 80px);
    }

    .header-right-actions {
      right: 8px;

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
