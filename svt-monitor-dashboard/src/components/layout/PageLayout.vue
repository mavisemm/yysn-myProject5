<template>
  <div class="page-layout" :class="{
    'page-layout--navy': backgroundMode === 'navy',
    'page-layout--solid': backgroundMode === 'solid',
  }">
    <MainHeader :current-background="backgroundMode" @change-background="handleChangeBackground" />
    <div class="main-content">
      <DeviceSidebar />
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
import { onMounted, onUnmounted, provide, ref, watch } from 'vue'
import MainHeader from './MainHeader.vue'
import DeviceSidebar from './DeviceSidebar.vue'
import { RouterView } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
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

const backgroundMode = ref<'image' | 'navy' | 'solid'>('solid')
provide('backgroundMode', backgroundMode)

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

type IncomingAlarmPreview = {
  alarmId: string
  shopName: string
  deviceName: string
  pointName: string
  pointNum: number
  alarmTimeText: string
  status: 'alarm' | 'warning'
}

function escapeHtml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeParseJson(input: unknown): any {
  if (!input) return undefined
  if (typeof input === 'object') return input
  if (typeof input !== 'string') return undefined
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

function formatAlarmTime(input: unknown): string {
  const timestamp = Number(input)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ''
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return ''
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日${hour}:${minute}`
}

function normalizeIncomingAlarm(payload: any): IncomingAlarmPreview | null {
  if (!payload || typeof payload !== 'object') return null
  const hasEventTypeCode = 'eventTypeCode' in payload
  const parsedData = safeParseJson((payload as any).dataJson)
  const parsedRaw = safeParseJson((payload as any).rawDataJson)

  const alarmId = String((payload as any).equipmentId ?? (payload as any).deviceId ?? '').trim()
  if (!alarmId) return null

  const pointNameRaw =
    (payload as any).data?.pointName ??
    parsedData?.pointName ??
    parsedData?.pointname ??
    parsedRaw?.pointName ??
    parsedRaw?.pointname
  const pointName = String(pointNameRaw ?? '').trim() || '未知点位'

  const pointNum = (() => {
    const fromName = pointName.match(/(\d+)/)
    if (fromName) {
      const n = Number(fromName[1])
      if (Number.isFinite(n) && n > 0) return n
    }
    const ch = (payload as any).data?.channelNo ?? parsedData?.channelNo ?? parsedRaw?.channelNo
    const channelNo = Number(ch)
    return Number.isFinite(channelNo) && channelNo > 0 ? channelNo : 0
  })()

  const level = String((payload as any).data?.level ?? parsedData?.level ?? parsedRaw?.level ?? '').toUpperCase()
  const alarmTypeCode = String((payload as any).alarmTypeCode ?? '').toUpperCase()
  const status: 'alarm' | 'warning' =
    hasEventTypeCode || level === 'WARNING' || level === 'WARN'
      ? 'warning'
      : alarmTypeCode === 'MACHINE_VIBRATION' || level === 'ALARM'
        ? 'alarm'
        : 'warning'

  return {
    alarmId,
    shopName: String((payload as any).workshopName ?? parsedData?.shopName ?? parsedRaw?.shopName ?? '').trim() || '未知车间',
    deviceName: String((payload as any).equipmentName ?? (payload as any).deviceName ?? '').trim() || alarmId,
    pointName,
    pointNum,
    alarmTimeText: formatAlarmTime(
      (payload as any).alarmTime ?? parsedData?.alarmTime ?? parsedRaw?.alarmTime,
    ),
    status,
  }
}

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
  alarmOverviewStore.stop()
})
</script>

<style lang="scss" scoped>
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
    background: transparent !important;
    background-image: none !important;
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
      background: transparent !important;
      background-image: none !important;
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
      background: transparent !important;
      background-image: none !important;
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
    overflow-x: auto;
    overflow-y: hidden;

    .main-content {
      min-width: 500px;

      .device-sidebar-container {
        width: 200px;
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

<style lang="scss">
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
