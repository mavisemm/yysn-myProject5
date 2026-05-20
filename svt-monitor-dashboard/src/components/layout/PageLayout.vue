<template>
  <div class="page-layout" :class="{
    'page-layout--navy': backgroundMode === 'navy',
    'page-layout--solid': backgroundMode === 'solid',
  }">
    <MainHeader :current-background="backgroundMode" @change-background="handleChangeBackground" />
    <div class="main-content">
      <DeviceSidebar class="device-sidebar--desktop" />
      <div v-if="isMobile" class="mobile-top-actions">
        <div class="device-sidebar-drawer-trigger" @click="mobileDeviceDrawerVisible = true">
          <span class="device-sidebar-drawer-trigger__icon">≡</span>
          <span class="device-sidebar-drawer-trigger__text mobile-font-nav">设备</span>
        </div>
        <div v-if="showHomeButton" class="mobile-nav-btn mobile-font-nav" @click="goHome">首页</div>
        <div v-if="showReturnDeviceButton" class="mobile-nav-btn mobile-font-nav" @click="goToDevice">返回设备</div>
        <SoundVibrationSegment v-if="showPointTypeSwitch" variant="mobile" class="mobile-sound-vib-segment" />
      </div>
      <el-drawer v-if="isMobile" v-model="mobileDeviceDrawerVisible" direction="ltr" size="82vw" :with-header="false"
        :append-to-body="true" class="device-sidebar-drawer">
        <DeviceSidebar class="device-sidebar--drawer" />
      </el-drawer>
      <div class="content-wrapper">
        <RouterView />
      </div>
    </div>

    <div class="page-footer" />

    <RealtimeBatchDialog @view="handleRealtimeView" />
    <HistoryBatchDialog @view="handleHistoryView" />
    <RealtimeAlarmBatchDialog @view="handleRealtimeAlarmView" />
    <HistoryAlarmBatchDialog @view="handleHistoryAlarmView" />
    <AlarmBatchViewModal v-model="alarmViewVisible" :row="alarmViewRow" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import MainHeader from './MainHeader.vue'
import SoundVibrationSegment from './SoundVibrationSegment.vue'
import DeviceSidebar from './DeviceSidebar.vue'
import { RouterView } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElDrawer } from 'element-plus'
import RealtimeBatchDialog from '@/components/alarm/RealtimeBatchDialog.vue'
import HistoryBatchDialog from '@/components/alarm/HistoryBatchDialog.vue'
import RealtimeAlarmBatchDialog from '@/components/alarm/RealtimeAlarmBatchDialog.vue'
import HistoryAlarmBatchDialog from '@/components/alarm/HistoryAlarmBatchDialog.vue'
import AlarmBatchViewModal from '@/components/alarm/AlarmBatchViewModal.vue'
import { getTenantId } from '@/api/tenant'
import { useAlarmOverviewStore } from '@/stores/alarmOverview'
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { resolveRealtimeDeviceKey } from '@/utils/realtimeAlarmNavigator'
import {
  layoutShowHomeButton,
  layoutShowPointTypeSwitch,
  layoutShowReturnDevice,
} from '@/components/layout/layoutNavUtils'
import {
  escapeHtml,
  normalizeIncomingAlarm,
  type IncomingAlarmPreview,
} from '@/components/layout/layoutIncomingAlarm'
import { useLayoutDeviceNavigation } from '@/composables/useLayoutDeviceNavigation'

const backgroundMode = ref<'image' | 'navy' | 'solid'>('solid')
provide('backgroundMode', backgroundMode)

const mobileDeviceDrawerVisible = ref(false)
const isMobile = ref(false)

const updateMobileState = () => {
  isMobile.value = window.innerWidth <= 800
  if (!isMobile.value) {
    mobileDeviceDrawerVisible.value = false
  }
}

const showHomeButton = computed(() => layoutShowHomeButton(route.name))
const showReturnDeviceButton = computed(() => layoutShowReturnDevice(route.name))
const showPointTypeSwitch = computed(() => layoutShowPointTypeSwitch(route.name))

const goHome = () => {
  router.push('/dashboard')
}

const { goToDevice } = useLayoutDeviceNavigation()

const handleChangeBackground = (mode: 'image' | 'navy' | 'solid') => {
  backgroundMode.value = mode
}

const alarmViewVisible = ref(false)
const alarmViewRow = ref<any>(null)

const openAlarmView = (row: any) => {
  alarmViewRow.value = row
  alarmViewVisible.value = true
}

const handleRealtimeView = (row: any) => openAlarmView(row)
const handleHistoryView = (row: any) => openAlarmView(row)
const handleRealtimeAlarmView = (row: any) => openAlarmView(row)
const handleHistoryAlarmView = (row: any) => openAlarmView(row)

const route = useRoute()
const router = useRouter()
const alarmOverviewStore = useAlarmOverviewStore()
const alarmBatchStore = useAlarmBatchStore()
const deviceTreeStore = useDeviceTreeStore()

async function goToDashboardWithTarget(item: IncomingAlarmPreview) {
  await alarmBatchStore.ensureDropdowns()
  const realtimeDeviceId = resolveRealtimeDeviceKey({
    alarmId: item.alarmId,
    pointNum: item.pointNum,
    pointName: item.pointName,
    deviceTreeData: deviceTreeStore.deviceTreeData ?? [],
    deviceOptions: (alarmBatchStore.deviceNameList ?? []) as any[],
  })

  await router.push({ name: 'Dashboard' })
  alarmBatchStore.closeRealtime()
  alarmBatchStore.closeHistory()
  alarmBatchStore.closeRealtimeAlarm()
  alarmBatchStore.closeHistoryAlarm()

  if (item.status === 'warning') {
    alarmBatchStore.resetRealtime()
    if (realtimeDeviceId) {
      alarmBatchStore.realtimeQuery.deviceId = realtimeDeviceId
    }
    await alarmBatchStore.openRealtime()
    await alarmBatchStore.fetchRealtimeList(0, true)
    return
  }

  alarmBatchStore.resetRealtimeAlarm()
  if (realtimeDeviceId) {
    alarmBatchStore.realtimeAlarmQuery.deviceId = realtimeDeviceId
  }
  await alarmBatchStore.openRealtimeAlarm()
  await alarmBatchStore.fetchRealtimeAlarmList(0, true)
}

function showIncomingAlarmDialog(item: IncomingAlarmPreview) {
  ElMessageBox.close()
  const title = item.status === 'alarm' ? '新报警' : '新预警'
  const actionText = item.status === 'alarm' ? '报警' : '预警'
  const emphasisClass =
    item.status === 'alarm' ? 'alarm-remind-dialog__emphasis--alarm' : 'alarm-remind-dialog__emphasis--warning'
  const message = [
    item.alarmTimeText
      ? `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(item.alarmTimeText)}</span>`
      : '',
    item.alarmTimeText ? '，' : '',
    `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(item.shopName)}</span>`,
    ' 的 ',
    `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(item.deviceName)}</span>`,
    ' 的 ',
    `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(item.pointName)}</span>`,
    ' 发生 ',
    `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(actionText)}</span>`,
  ].join('')

  const messagePromise = ElMessageBox.confirm(message, title, {
    confirmButtonText: '查看',
    cancelButtonText: '确定',
    distinguishCancelAndClose: true,
    type: 'warning',
    modal: true,
    customClass:
      item.status === 'alarm'
        ? 'alarm-remind-dialog alarm-remind-dialog--alarm'
        : 'alarm-remind-dialog alarm-remind-dialog--warning',
    dangerouslyUseHTMLString: true,
  })

  void messagePromise
    .then(async () => {
      await goToDashboardWithTarget(item)
    })
    .catch(() => {
      // 用户点击“确定”或关闭弹窗，仅关闭当前提醒
    })
}

function enqueueIncomingAlarm(payload: unknown) {
  if (route.name === 'Login') return
  const normalized = normalizeIncomingAlarm(payload as any)
  if (!normalized) return
  showIncomingAlarmDialog(normalized)
}

async function startGlobalAlarmStream() {
  if (route.name === 'Login') return
  if (!localStorage.getItem('token')) return
  await alarmOverviewStore.start({
    token: localStorage.getItem('token') ?? undefined,
    tenantId: getTenantId() || undefined,
    onIncomingEvent: enqueueIncomingAlarm,
  })
}

onMounted(() => {
  updateMobileState()
  window.addEventListener('resize', updateMobileState)
  void startGlobalAlarmStream()
})

watch(
  () => route.name,
  (name) => {
    if (name === 'Login') {
      alarmOverviewStore.stop()
      return
    }
    if (!localStorage.getItem('token')) return
    void startGlobalAlarmStream()
  },
)

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileState)
  alarmOverviewStore.stop()
})
</script>

<style lang="scss" scoped>
/** 首页背景上“透底”的业务卡片（navy/solid 主题额外包含声纹 charts-section） */
@mixin layout-transparent-panel-bg {
  background: transparent !important;
  background-image: none !important;
}

.page-layout {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background-color: #091428;
  background-image: image-set(url('@/assets/images/background/背景图.avif') type('image/avif'),
      url('@/assets/images/background/背景图.webp') type('image/webp'));
  background-repeat: no-repeat;
  background-position: center center;
  background-size: 100vw 100vh;
  padding: 0 1.5vw;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
  }

  &::before {
    left: -0.3vw;
    width: 5vw;
    background: url('@/assets/images/background/left背景.webp') no-repeat center center;
    background-size: 100% 100%;
  }

  &::after {
    right: -0.2vw;
    width: 5vw;
    background: url('@/assets/images/background/right背景.webp') no-repeat center center;
    background-size: 100% 100%;
  }

  :deep(.alarm-overview),
  :deep(.metrics-area),
  :deep(.device-sidebar),
  :deep(.info-section-right),
  :deep(.stats-card),
  :deep(.device-info-module),
  :deep(.point-list-module),
  :deep(.chart-item),
  :deep(.analysis-item),
  :deep(.table-section-left),
  :deep(.waterfall-card),
  :deep(.freq-card),
  :deep(.time-card) {
    @include layout-transparent-panel-bg;
  }

  &.page-layout--navy {
    background:
      radial-gradient(circle at 15% 0%, rgba(59, 130, 246, 0.3) 0, rgba(15, 23, 42, 0) 45%),
      radial-gradient(circle at 85% 100%, rgba(168, 85, 247, 0.3) 0, rgba(15, 23, 42, 0) 45%),
      linear-gradient(135deg, #020617 0%, #02091b 35%, #0b1120 70%, #020617 100%);
    background-size: 100vw 100vh;

    :deep(.charts-section),
    :deep(.alarm-overview),
    :deep(.metrics-area),
    :deep(.device-sidebar),
    :deep(.info-section-right),
    :deep(.stats-card),
    :deep(.device-info-module),
    :deep(.point-list-module),
    :deep(.chart-item),
    :deep(.analysis-item),
    :deep(.table-section-left),
    :deep(.waterfall-card),
    :deep(.freq-card),
    :deep(.time-card) {
      @include layout-transparent-panel-bg;
    }
  }

  &.page-layout--solid {
    background: linear-gradient(to bottom, #104076 0%, #160e53 100%);
    background-size: 100vw 100vh;

    :deep(.charts-section),
    :deep(.alarm-overview),
    :deep(.metrics-area),
    :deep(.device-sidebar),
    :deep(.info-section-right),
    :deep(.stats-card),
    :deep(.device-info-module),
    :deep(.point-list-module),
    :deep(.chart-item),
    :deep(.analysis-item),
    :deep(.table-section-left),
    :deep(.waterfall-card),
    :deep(.freq-card),
    :deep(.time-card) {
      @include layout-transparent-panel-bg;
    }
  }

  .main-content {
    flex: 1;
    height: auto;
    display: flex;
    overflow: hidden;
    min-height: 0;
    position: relative;
    z-index: 1;

    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;

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

.page-footer {
  height: 4vh;
  flex-shrink: 0;
  width: 100%;
  background: url('@/assets/images/background/footer背景.webp') no-repeat center center;
  background-size: 100% 100%;
  position: relative;
  z-index: 1;
}

@media (max-width: 800px) {
  .page-layout {
    padding: 0 10px;
    overflow-x: hidden;
    overflow-y: visible;
    min-height: 100vh;
    height: auto;

    .main-content {
      min-width: 0;
      overflow: visible;

      .device-sidebar--desktop {
        display: none;
      }

      .device-sidebar-drawer-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 10px;
        min-height: 36px;
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.18);
        backdrop-filter: blur(8px);
        user-select: none;
        cursor: pointer;

        &__icon {
          font-size: 18px;
          line-height: 1;
        }

        &__text {
          line-height: 1;
        }
      }

      .mobile-top-actions {
        position: fixed;
        left: 8px;
        top: 66px;
        z-index: 1200;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        max-width: calc(100vw - 12px);
      }

      .mobile-nav-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8px 10px;
        min-height: 36px;
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.18);
        backdrop-filter: blur(8px);
        user-select: none;
        cursor: pointer;
        line-height: 1;
      }

      .mobile-sound-vib-segment {
        backdrop-filter: blur(8px);
        align-self: center;
      }

      .content-wrapper {
        overflow-y: visible;
        overflow-x: hidden;
        padding-top: 44px;
      }
    }
  }

  .page-layout.page-layout--solid {
    background-size: auto;
  }
}

@media (max-width: 500px) {
  .page-layout {
    padding: 0 8px;
  }
}
</style>

<style lang="scss">
@media (max-width: 800px) {
  .device-sidebar-drawer {
    .el-drawer {
      background: #132668 !important;
    }

    .el-drawer__body {
      background: #132668 !important;
      padding: 0;
    }
  }
}

.alarm-remind-dialog {
  .el-message-box__status.el-icon {
    display: none;
  }

  .el-message-box__title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
}

.alarm-remind-dialog--alarm {
  .el-message-box__title::before {
    content: '!';
    display: inline-flex;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: #f56c6c;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
  }
}

.alarm-remind-dialog--warning {
  .el-message-box__title::before {
    content: '!';
    display: inline-flex;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: #e6a23c;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
  }
}

.alarm-remind-dialog__emphasis {
  font-size: 1.1em;
  font-weight: 700;
}

.alarm-remind-dialog__emphasis--alarm {
  color: #f56c6c;
}

.alarm-remind-dialog__emphasis--warning {
  color: #e6a23c;
}
</style>
