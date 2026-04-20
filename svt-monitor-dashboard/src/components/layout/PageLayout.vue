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
import { provide, ref } from 'vue'
import MainHeader from './MainHeader.vue'
import DeviceSidebar from './DeviceSidebar.vue'
import { RouterView } from 'vue-router'
import RealtimeBatchDialog from '@/components/alarm/RealtimeBatchDialog.vue'
import HistoryBatchDialog from '@/components/alarm/HistoryBatchDialog.vue'
import RealtimeAlarmBatchDialog from '@/components/alarm/RealtimeAlarmBatchDialog.vue'
import HistoryAlarmBatchDialog from '@/components/alarm/HistoryAlarmBatchDialog.vue'
import AlarmBatchViewModal from '@/components/alarm/AlarmBatchViewModal.vue'

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
