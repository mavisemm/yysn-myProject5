<template>
  <div class="page-layout" :class="{
    'page-layout--navy': backgroundMode === 'navy',
    'page-layout--solid': backgroundMode === 'solid',
    'page-layout--shell-classic': layoutShell === 'classic',
    'page-layout--shell-modern': layoutShell === 'modern',
  }">
    <MainHeader :current-background="backgroundMode" @change-background="handleChangeBackground" />
    <div class="main-content">
      <div class="layout-panel layout-panel--nav" :style="navPanelStyle">
        <AppNavRail
          class="app-nav-rail--desktop"
          :collapsed="navCollapsed"
          @update:collapsed="setNavCollapsed"
        />
        <div
          v-if="!navCollapsed"
          class="layout-panel__resize-handle"
          title="拖动调整菜单宽度"
          @mousedown="navResize.onMouseDown"
        />
      </div>
      <div
        v-if="showDeviceSidebar && !isMobile"
        class="device-panel-shell"
        :class="{ 'device-panel-shell--collapsed': deviceHidden }"
        :style="deviceShellStyle"
      >
        <div
          class="layout-panel layout-panel--device"
          :class="{ 'layout-panel--device-hidden': deviceHidden }"
          :style="devicePanelStyle"
        >
          <DeviceSidebar
            v-show="!deviceHidden"
            class="device-sidebar--desktop device-sidebar--in-panel"
          />
          <div
            v-if="!deviceHidden"
            class="layout-panel__resize-handle"
            title="拖动调整设备列表宽度"
            @mousedown="deviceResize.onMouseDown"
          />
        </div>
        <button
          type="button"
          class="layout-panel__edge-toggle"
          :title="deviceHidden ? '展开设备列表' : '收起设备列表'"
          @click="toggleDevicePanel"
        >
          <el-icon :size="14">
            <DArrowRight v-if="deviceHidden" />
            <DArrowLeft v-else />
          </el-icon>
        </button>
      </div>
      <div v-if="isMobile" class="mobile-top-actions">
        <div class="device-sidebar-drawer-trigger" @click="mobileDeviceDrawerVisible = true">
          <span class="device-sidebar-drawer-trigger__icon">≡</span>
          <span class="device-sidebar-drawer-trigger__text mobile-font-nav">{{
            showDeviceSidebar ? '设备' : '菜单'
          }}</span>
        </div>
        <div v-if="showHomeButton" class="mobile-nav-btn mobile-font-nav" @click="goHome">首页</div>
        <div v-if="showReturnDeviceButton" class="mobile-nav-btn mobile-font-nav" @click="goToDevice">返回设备</div>
        <SoundVibrationSegment v-if="showPointTypeSwitch" variant="mobile" class="mobile-sound-vib-segment" />
      </div>
      <el-drawer v-if="isMobile" v-model="mobileDeviceDrawerVisible" direction="ltr" size="min(92vw, 520px)" :with-header="false"
        :append-to-body="true" class="device-sidebar-drawer">
        <AppNavRail in-drawer class="app-nav-rail--drawer" />
        <DeviceSidebar v-if="showDeviceSidebar" class="device-sidebar--drawer" />
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
    <IncomingAlarmRemindDialog
      v-model:visible="remindDialogVisible"
      :item="remindDialogItem"
      @view="onRemindDialogView"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import MainHeader from './MainHeader.vue'
import AppNavRail from './AppNavRail.vue'
import SoundVibrationSegment from './SoundVibrationSegment.vue'
import DeviceSidebar from './DeviceSidebar.vue'
import { resolveLayoutShell } from './layoutNavMenu'
import { RouterView } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import { ElDrawer } from 'element-plus'
import { DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import RealtimeBatchDialog from '@/components/alarm/RealtimeBatchDialog.vue'
import HistoryBatchDialog from '@/components/alarm/HistoryBatchDialog.vue'
import RealtimeAlarmBatchDialog from '@/components/alarm/RealtimeAlarmBatchDialog.vue'
import HistoryAlarmBatchDialog from '@/components/alarm/HistoryAlarmBatchDialog.vue'
import AlarmBatchViewModal from '@/components/alarm/AlarmBatchViewModal.vue'
import IncomingAlarmRemindDialog from '@/components/layout/IncomingAlarmRemindDialog.vue'
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
  normalizeIncomingAlarm,
  type IncomingAlarmPreview,
} from '@/components/layout/layoutIncomingAlarm'
import { useAlarmReminderStore } from '@/stores/alarmReminder'
import { useLayoutDeviceNavigation } from '@/composables/useLayoutDeviceNavigation'
import { useLayoutModuleHome } from '@/composables/useLayoutModuleHome'
import { clampWidth, loadStoredPanelWidth, saveStoredPanelWidth, useDragResize } from '@/composables/useDragResize'
import {
  LAYOUT_DEVICE_WIDTH_DEFAULT,
  LAYOUT_DEVICE_WIDTH_MAX,
  LAYOUT_DEVICE_WIDTH_MIN,
  LAYOUT_DEVICE_WIDTH_STORAGE,
  LAYOUT_DEVICE_HIDDEN_STORAGE,
  LAYOUT_DEVICE_TOGGLE_WIDTH,
  LAYOUT_NAV_EXPANDED_STORAGE,
  LAYOUT_NAV_WIDTH_DEFAULT,
  LAYOUT_NAV_WIDTH_MAX,
  LAYOUT_NAV_WIDTH_MIN,
  LAYOUT_NAV_WIDTH_STORAGE,
} from '@/components/layout/layoutPanelSizes'

const route = useRoute()
const router = useRouter()

const storedNavWidth = loadStoredPanelWidth(
  LAYOUT_NAV_WIDTH_STORAGE,
  LAYOUT_NAV_WIDTH_DEFAULT,
  LAYOUT_NAV_WIDTH_MIN,
  LAYOUT_NAV_WIDTH_MAX,
)
const navExpandedWidth = ref(
  loadStoredPanelWidth(
    LAYOUT_NAV_EXPANDED_STORAGE,
    storedNavWidth > LAYOUT_NAV_WIDTH_MIN ? storedNavWidth : LAYOUT_NAV_WIDTH_DEFAULT,
    LAYOUT_NAV_WIDTH_MIN + 1,
    LAYOUT_NAV_WIDTH_MAX,
  ),
)
/** 每次进入页面默认收起主导航；展开宽度仍记住上次拖拽结果 */
const navCollapsed = ref(true)
const navWidth = ref(LAYOUT_NAV_WIDTH_MIN)
const navExpandToMaxOnOpen = ref(false)

const deviceHidden = ref(localStorage.getItem(LAYOUT_DEVICE_HIDDEN_STORAGE) === '1')
const deviceWidth = ref(
  loadStoredPanelWidth(
    LAYOUT_DEVICE_WIDTH_STORAGE,
    LAYOUT_DEVICE_WIDTH_DEFAULT,
    LAYOUT_DEVICE_WIDTH_MIN,
    LAYOUT_DEVICE_WIDTH_MAX,
  ),
)

const navPanelStyle = computed(() => {
  const w = navCollapsed.value ? LAYOUT_NAV_WIDTH_MIN : navWidth.value
  return { width: `${w}px`, minWidth: `${w}px`, flexShrink: '0' }
})

const deviceShellStyle = computed(() => {
  if (deviceHidden.value) {
    return {
      width: `${LAYOUT_DEVICE_TOGGLE_WIDTH}px`,
      minWidth: `${LAYOUT_DEVICE_TOGGLE_WIDTH}px`,
      flexShrink: '0',
    }
  }
  const total = deviceWidth.value + LAYOUT_DEVICE_TOGGLE_WIDTH
  return {
    width: `${total}px`,
    minWidth: `${total}px`,
    flexShrink: '0',
  }
})

const devicePanelStyle = computed(() => {
  if (deviceHidden.value) {
    return {
      width: '0',
      minWidth: '0',
      flexShrink: '0',
      overflow: 'hidden',
    }
  }
  return {
    width: `${deviceWidth.value}px`,
    minWidth: `${deviceWidth.value}px`,
    flexShrink: '0',
  }
})

function hideDevicePanel() {
  if (!deviceHidden.value) {
    saveStoredPanelWidth(LAYOUT_DEVICE_WIDTH_STORAGE, deviceWidth.value)
  }
  deviceHidden.value = true
  try {
    localStorage.setItem(LAYOUT_DEVICE_HIDDEN_STORAGE, '1')
  } catch {
    /* ignore */
  }
}

function showDevicePanel() {
  deviceHidden.value = false
  deviceWidth.value = LAYOUT_DEVICE_WIDTH_DEFAULT
  saveStoredPanelWidth(LAYOUT_DEVICE_WIDTH_STORAGE, LAYOUT_DEVICE_WIDTH_DEFAULT)
  try {
    localStorage.setItem(LAYOUT_DEVICE_HIDDEN_STORAGE, '0')
  } catch {
    /* ignore */
  }
}

function toggleDevicePanel() {
  if (deviceHidden.value) showDevicePanel()
  else hideDevicePanel()
}

function setNavCollapsed(collapsed: boolean) {
  if (collapsed) {
    if (navWidth.value > LAYOUT_NAV_WIDTH_MIN) {
      navExpandedWidth.value = navWidth.value
      saveStoredPanelWidth(LAYOUT_NAV_EXPANDED_STORAGE, navExpandedWidth.value)
      navExpandToMaxOnOpen.value = false
    } else {
      navExpandToMaxOnOpen.value = true
    }
    navCollapsed.value = true
    navWidth.value = LAYOUT_NAV_WIDTH_MIN
    saveStoredPanelWidth(LAYOUT_NAV_WIDTH_STORAGE, LAYOUT_NAV_WIDTH_MIN)
    return
  }
  navCollapsed.value = false
  const target = navExpandToMaxOnOpen.value
    ? LAYOUT_NAV_WIDTH_MAX
    : clampWidth(navExpandedWidth.value, LAYOUT_NAV_WIDTH_MIN + 1, LAYOUT_NAV_WIDTH_MAX)
  navWidth.value = target
  navExpandedWidth.value = target
  navExpandToMaxOnOpen.value = false
  saveStoredPanelWidth(LAYOUT_NAV_WIDTH_STORAGE, navWidth.value)
  saveStoredPanelWidth(LAYOUT_NAV_EXPANDED_STORAGE, target)
}

const navResize = useDragResize({
  getWidth: () => navWidth.value,
  setWidth: (w) => {
    const next = clampWidth(w, LAYOUT_NAV_WIDTH_MIN, LAYOUT_NAV_WIDTH_MAX)
    if (next <= LAYOUT_NAV_WIDTH_MIN) {
      navExpandToMaxOnOpen.value = true
      setNavCollapsed(true)
      return
    }
    navExpandToMaxOnOpen.value = false
    navCollapsed.value = false
    navWidth.value = next
    navExpandedWidth.value = next
    saveStoredPanelWidth(LAYOUT_NAV_EXPANDED_STORAGE, next)
  },
  min: LAYOUT_NAV_WIDTH_MIN,
  max: LAYOUT_NAV_WIDTH_MAX,
  storageKey: LAYOUT_NAV_WIDTH_STORAGE,
})

const deviceResize = useDragResize({
  getWidth: () => deviceWidth.value,
  setWidth: (w) => {
    deviceWidth.value = clampWidth(w, LAYOUT_DEVICE_WIDTH_MIN, LAYOUT_DEVICE_WIDTH_MAX)
  },
  min: LAYOUT_DEVICE_WIDTH_MIN,
  max: LAYOUT_DEVICE_WIDTH_MAX,
  storageKey: LAYOUT_DEVICE_WIDTH_STORAGE,
})

const layoutShell = computed(() => resolveLayoutShell(route.name))
provide('layoutShell', layoutShell)

/** 菜单「首页」等场景不展示设备列表 */
const showDeviceSidebar = computed(() => route.name !== 'Home')

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

const { goModuleHome } = useLayoutModuleHome()
const goHome = () => {
  goModuleHome()
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

const alarmOverviewStore = useAlarmOverviewStore()
const alarmBatchStore = useAlarmBatchStore()
const deviceTreeStore = useDeviceTreeStore()
const alarmReminderStore = useAlarmReminderStore()

const remindDialogVisible = ref(false)
const remindDialogItem = ref<IncomingAlarmPreview | null>(null)

async function goToDashboardWithTarget(item: IncomingAlarmPreview) {
  await alarmBatchStore.ensureDropdowns()
  const realtimeDeviceId = resolveRealtimeDeviceKey({
    alarmId: item.alarmId,
    pointNum: item.pointNum,
    pointName: item.pointName,
    deviceTreeData: deviceTreeStore.deviceTreeData ?? [],
    deviceOptions: (alarmBatchStore.deviceNameList ?? []) as any[],
  })

  await router.push({ name: 'AlarmManagement' })
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
  remindDialogItem.value = item
  remindDialogVisible.value = true
}

async function onRemindDialogView() {
  const item = remindDialogItem.value
  if (!item) return
  await goToDashboardWithTarget(item)
}

function enqueueIncomingAlarm(payload: unknown) {
  if (route.name === 'Login') return
  if (!alarmReminderStore.shouldShowReminder()) return
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
  padding-right: 1vw;
  background-color: #091428;
  background-image: image-set(url('@/assets/images/background/背景图.avif') type('image/avif'),
      url('@/assets/images/background/背景图.webp') type('image/webp'));
  background-repeat: no-repeat;
  background-position: center center;
  background-size: 100vw 100vh;

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
    align-items: stretch;
    overflow: hidden;
    min-height: 0;
    position: relative;
    z-index: 1;

    .device-panel-shell {
      display: flex;
      flex-direction: row;
      align-items: center;
      height: 100%;
      flex-shrink: 0;
      overflow: visible;
      transition: width 0.2s ease, min-width 0.2s ease;

      .layout-panel--device {
        height: 100%;
        align-self: stretch;
      }

      .layout-panel__edge-toggle {
        flex-shrink: 0;
        align-self: center;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 48px;
        margin-left: 0;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 0 6px 6px 0;
        background: rgba(19, 44, 106, 0.92);
        color: rgba(255, 255, 255, 0.92);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: background 0.15s ease;

        &:hover {
          background: rgba(37, 99, 235, 0.85);
        }
      }
    }

    .layout-panel {
      position: relative;
      display: flex;
      align-items: stretch;
      height: 100%;
      flex-shrink: 0;
      transition: width 0.2s ease, min-width 0.2s ease;

      &__resize-handle {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 6px;
        margin-right: -3px;
        z-index: 5;
        cursor: col-resize;
        touch-action: none;

        &:hover,
        &:active {
          background: rgba(147, 197, 253, 0.35);
        }
      }
    }

    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;

      @media (min-width: 801px) {
        padding-left: 15px;
      }

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
    overflow-x: hidden;
    overflow-y: visible;
    min-height: 100vh;
    height: auto;

    .main-content {
      min-width: 0;
      overflow: visible;

      .layout-panel--nav,
      .device-panel-shell,
      .layout-panel--device {
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
      display: flex;
      flex-direction: row;
      align-items: stretch;
      overflow: hidden;
    }

    .app-nav-rail--drawer {
      flex-shrink: 0;
    }

    .device-sidebar--drawer {
      flex: 1;
      min-width: 0;
    }
  }
}
</style>

