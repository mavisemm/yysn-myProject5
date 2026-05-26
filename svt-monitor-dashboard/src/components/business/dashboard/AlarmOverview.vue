<template>
  <div class="alarm-overview">
    <div class="header-section home-title home-title--device-monitor">
      <div class="header-section__left home-title__left">
        <img class="header-section__icon home-title__icon" src="@/assets/images/background/小图标.webp" alt=""
          loading="lazy" decoding="async" />
        <div class="title-with-legend">
          <h3 class="app-section-title">预警总览</h3>
        </div>
        <div class="batch-actions header-controls-desktop">
          <el-button size="small" class="batch-btn mobile-font-title" @click="openRealtimeBatch">
            声音实时预警
          </el-button>
          <el-button size="small" class="batch-btn mobile-font-title" @click="openHistoryBatch">
            声音历史预警
          </el-button>
          <el-button size="small" class="batch-btn mobile-font-title" @click="openRealtimeAlarmBatch">
            振动实时报警
          </el-button>
          <el-button size="small" class="batch-btn mobile-font-title" @click="openHistoryAlarmBatch">
            振动历史报警
          </el-button>
        </div>
      </div>
      <div class="search-section header-controls-desktop">
        <div class="time-section">
          <CommonDateTimePicker v-model="dateRange" :width="pickerWidth" />
          <el-button @click="toggleSortOrder" class="sort-btn" :icon="sortIcon"> </el-button>
        </div>
      </div>
    </div>
    <div class="header-controls-mobile">
      <div class="batch-actions">
        <el-button size="small" class="batch-btn" @click="openRealtimeBatch">
          声音实时预警
        </el-button>
        <el-button size="small" class="batch-btn" @click="openHistoryBatch">
          声音历史预警
        </el-button>
        <el-button size="small" class="batch-btn" @click="openRealtimeAlarmBatch">
          振动实时报警
        </el-button>
        <el-button size="small" class="batch-btn" @click="openHistoryAlarmBatch">
          振动历史报警
        </el-button>
      </div>
      <div class="search-section">
        <div class="time-section">
          <CommonDateTimePicker v-model="dateRange" :width="pickerWidth" />
          <el-button @click="toggleSortOrder" class="sort-btn" :icon="sortIcon"> </el-button>
        </div>
      </div>
    </div>

    <div class="status-legend">
      <div class="status-legend__item">
        <img class="status-legend__icon" src="@/assets/images/background/首页-报警图例.webp" alt="报警图例" loading="lazy"
          decoding="async" />
        <span class="status-legend__text">报警</span>
      </div>
      <div class="status-legend__item">
        <img class="status-legend__icon" src="@/assets/images/background/首页-预警图例.webp" alt="预警图例" loading="lazy"
          decoding="async" />
        <span class="status-legend__text">预警</span>
      </div>
      <div class="status-legend__item">
        <img class="status-legend__icon" src="@/assets/images/background/首页-健康图例.webp" alt="健康图例" loading="lazy"
          decoding="async" />
        <span class="status-legend__text">健康</span>
      </div>
      <div class="status-legend__item">
        <img class="status-legend__icon" src="@/assets/images/background/首页-离线图例.webp" alt="离线图例" loading="lazy"
          decoding="async" />
        <span class="status-legend__text">离线</span>
      </div>
    </div>

    <div v-if="filteredAlarms.length === 0" class="alarm-empty">
      <CommonEmptyState />
    </div>
    <div v-else class="alarm-grid" :style="{
      'grid-template-columns': `repeat(${responsivePageSize.columns}, 1fr)`,
      'grid-template-rows': `repeat(${responsivePageSize.rows}, 1fr)`,
    }">
      <div v-for="alarm in displayedAlarms" :key="alarm.cardId" class="alarm-card"
        :class="`alarm-card--${getDeviceDisplayStatus(alarm)}`" @click="goToDeviceDetail(alarm)">
        <div class="card-header">
          <span class="device-name" :title="alarm.deviceName">{{
            formatAlarmCardDeviceName(alarm.deviceName)
          }}</span>
          <span :class="['status-dot', getDeviceDisplayStatus(alarm)]"></span>
        </div>

        <div class="alarm-time">
          <template v-if="
            getDeviceDisplayStatus(alarm) !== 'healthy' &&
            getDeviceDisplayStatus(alarm) !== 'offline'
          ">
            {{ alarm.shopName ? alarm.shopName + ' ' : '' }}&nbsp;&nbsp;{{
              formatAlarmTime(alarm.time)
            }}
          </template>
          <template v-else>
            {{ alarm.shopName ? alarm.shopName : '' }}
          </template>
        </div>

        <div class="measurement-grid">
          <div v-for="item in getDisplayPoints(
            alarm.measurementPoints,
            alarm.latestPointNum,
            alarm.cardType,
            getDeviceDisplayStatus(alarm),
            alarm.devicePointCount,
            alarm.id,
          )" :key="item.pointNum" :class="[
            'point-item',
            getPointStyleClass(item.point.status, getDeviceDisplayStatus(alarm)),
          ]" @click.stop="handlePointItemClick(alarm, item)">
            {{ formatAlarmCardPointLabel(item.point, item.pointNum) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="filteredAlarms.length > 0" class="pagination-wrapper">
      <span class="pagination-page-meta mobile-font-body">共 {{ alarmTotalPages }} 页，第 {{ currentPage }} 页</span>
      <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="filteredAlarms.length"
        class="mobile-font-body" layout="prev, pager, next" @current-change="handleCurrentChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Sort } from '@element-plus/icons-vue'
import { ElButton, ElPagination } from 'element-plus'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue'
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useAlarmOverviewStore } from '@/stores/alarmOverview'
import type { AlarmItem } from '@/stores/alarmOverviewLogic'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import {
  buildFilteredOverviewAlarms,
  clearDisplayPointsCache,
  formatAlarmCardDeviceName,
  formatAlarmCardPointLabel,
  formatAlarmTime,
  getDeviceDisplayStatus,
  getDisplayPoints,
  getPointStyleClass,
} from './alarmOverviewView'
import { openRealtimeBatchForPoint } from './dashboardViewUtils'

const alarmBatchStore = useAlarmBatchStore()
const openRealtimeBatch = () => {
  void alarmBatchStore.openRealtime()
}
const openHistoryBatch = () => {
  void alarmBatchStore.openHistory()
}
const openRealtimeAlarmBatch = () => {
  void alarmBatchStore.openRealtimeAlarm()
}
const openHistoryAlarmBatch = () => {
  void alarmBatchStore.openHistoryAlarm()
}

const router = useRouter()
const deviceTreeStore = useDeviceTreeStore()

const dateRange = ref<[string, string]>(['', ''])
const currentPage = ref(1)
const containerWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

const responsivePageSize = computed(() => {
  const w = containerWidth.value
  if (w <= 800) return { pageSize: 2, columns: 2, rows: 1 }
  return { pageSize: 4, columns: 4, rows: 1 }
})
const pickerWidth = computed(() => (containerWidth.value <= 800 ? '100vw' : '320px'))
const pageSize = ref(responsivePageSize.value.pageSize)
const sortOrder = ref<'asc' | 'desc'>('desc')
const sortIcon = Sort

const alarmOverviewStore = useAlarmOverviewStore()
const { alarms, httpInitialized } = storeToRefs(alarmOverviewStore)

watch(
  () => dateRange.value,
  () => {
    currentPage.value = 1
  },
  { deep: true },
)

const filteredAlarms = computed(() =>
  buildFilteredOverviewAlarms(alarms.value ?? [], {
    httpInitialized: httpInitialized.value,
    keyword: '',
    dateRange: dateRange.value,
    sortOrder: sortOrder.value,
  }),
)

const alarmTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAlarms.value.length / pageSize.value)),
)

const displayedAlarms = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  return filteredAlarms.value.slice(startIndex, startIndex + pageSize.value)
})

watch(
  () => displayedAlarms.value.map((item) => `${item.cardId}:${item.latestOrderKey ?? 0}`).join('|'),
  () => {
    clearDisplayPointsCache()
  },
)

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  currentPage.value = 1
}
const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

const updateContainerSize = () => {
  containerWidth.value = window.innerWidth
  pageSize.value = responsivePageSize.value.pageSize
  if (currentPage.value > Math.ceil(filteredAlarms.value.length / pageSize.value)) {
    currentPage.value = 1
  }
}

onMounted(() => {
  window.addEventListener('resize', updateContainerSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize)
  clearDisplayPointsCache()
})

const handlePointItemClick = async (
  alarm: AlarmItem,
  clicked: { point: { status: string; name: string }; pointNum: number },
) => {
  const point = clicked?.point
  if (!point || (point.status !== 'alarm' && point.status !== 'warning')) return
  await openRealtimeBatchForPoint({
    alarmBatchStore,
    deviceTreeData: deviceTreeStore.deviceTreeData ?? [],
    deviceId: String(alarm.id ?? ''),
    pointNum: Number(clicked?.pointNum ?? 0),
    pointName: point.name,
    mode: point.status === 'warning' ? 'sound-warning' : 'vibration-alarm',
  })
}

const goToDeviceDetail = (alarm: AlarmItem) => {
  const equipmentId = alarm.id
  if (!equipmentId) {
    console.warn('缺少设备ID，无法跳转:', alarm)
    return
  }
  deviceTreeStore.setSelectedDeviceId(equipmentId)
  router
    .push({
      name: 'DeviceDetail',
      params: { id: equipmentId },
    })
    .catch((err) => {
      console.error('路由跳转失败:', err)
    })
}
</script>

<style lang="scss" scoped>
.alarm-overview {
  height: 100%;
  min-height: 0;
  padding: 10px 10px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .header-controls-mobile {
    display: none;
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: nowrap;
    min-width: 0;

    .header-section__left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1 1 auto;
      min-width: 0;
    }

    .title-with-legend {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 0 0 auto;
      min-width: 0;
    }

    h3 {
      margin: 0;
      font-weight: 500;
      white-space: nowrap;
    }

    .status-legend {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      margin-left: auto;
      align-self: flex-end;
    }

    .batch-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;

      .batch-btn {
        flex: 1 1 0;
        width: 100%;
        min-width: 0;
        max-width: 9.5em;
        font-size: 0.8rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: rgba(255, 255, 255) !important;

        :deep(.el-button__text) {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      :deep(.el-button + .el-button) {
        margin-left: 0;
      }
    }

    .search-section {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: flex-end;
      gap: 10px;
      flex: 0 0 auto;

      .device-search-wrapper {
        position: relative;
        right: 1vw;
      }

      .time-section {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-right: 1vw;

        .time-search-input {
          :deep(.el-input__wrapper) {
            background-size: 100% 100%;
            border-radius: 4px;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
            border: none;

            .el-input__inner {
              color: white;
              background: transparent;
            }

            .el-input__prefix {
              color: white;
            }
          }
        }

        .sort-btn {
          width: 14px;
          height: 14px;
          background: transparent;
          border: none;
          padding: 0;
          color: #fff;

          :deep(.el-icon) {
            color: #fff;
          }
        }
      }
    }
  }

  .batch-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;

    .batch-btn {
      flex: 1 1 0;
      width: 100%;
      min-width: 0;
      max-width: 9.5em;
      font-size: 0.8rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: rgba(255, 255, 255) !important;

      :deep(.el-button__text) {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }

  .search-section {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;
    gap: 10px;
    flex: 0 0 auto;

    .device-search-wrapper {
      position: relative;
      right: 1vw;
    }

    .time-section {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-right: 1vw;

      .time-search-input {
        :deep(.el-input__wrapper) {
          background-size: 100% 100%;
          border-radius: 4px;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
          border: none;

          .el-input__inner {
            color: white;
            background: transparent;
          }

          .el-input__prefix {
            color: white;
          }
        }
      }

      .sort-btn {
        width: 14px;
        height: 14px;
        background: transparent;
        border: none;
        padding: 0;
        color: #fff;

        :deep(.el-icon) {
          color: #fff;
        }
      }
    }
  }

  .status-legend {
    padding: 10px 0 0;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    align-self: flex-end;
  }

  .status-legend__item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 14px;
  }

  .status-legend__icon {
    display: block;
    height: 0.8rem;
    width: auto;
    object-fit: contain;
  }

  .status-legend__text {
    font-size: 0.78rem;
    line-height: 1;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
  }

  .alarm-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }

  .alarm-grid {
    display: grid;
    gap: 10px;
    flex: 1;
    overflow-y: auto;
    padding-top: 10px;
    width: 100%;
    box-sizing: border-box;
    -ms-overflow-style: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    .alarm-card {
      width: 16vw;
      height: 20vh;
      padding: 12px;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      max-height: 170px;
      min-height: 0;
      overflow: hidden;
      cursor: pointer;
      background-repeat: no-repeat;
      background-position: center center;
      background-size: 100% 100%;

      &.alarm-card--healthy {
        background-image: url('@/assets/images/background/首页-预警总览-健康设备背景.webp');
      }

      &.alarm-card--offline {
        background-image: url('@/assets/images/background/首页-预警总览-离线设备背景.webp');
      }

      &.alarm-card--alarm {
        background-image: url('@/assets/images/background/首页-预警总览-报警设备背景.webp');
      }

      &.alarm-card--warning {
        background-image: url('@/assets/images/background/首页-预警总览-预警设备背景.webp');
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding: 2px 0;
        background-repeat: no-repeat;
        background-position: center center;
        background-size: 100% 100%;

        .device-name {
          font-weight: 600;
          letter-spacing: 1px;
          color: rgba(255, 255, 255, 1);
          font-size: 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        .status-dot {
          width: 2.2vw;
          height: 0.6vh;
          display: inline-block;
          vertical-align: middle;
          margin-left: 8px;
          background-repeat: no-repeat;
          background-position: center center;
          background-size: contain;

          &.alarm {
            background-image: url('@/assets/images/background/首页-预警总览-报警.webp');
          }

          &.warning {
            background-image: url('@/assets/images/background/首页-预警总览-预警.webp');
          }

          &.healthy {
            background-image: url('@/assets/images/background/首页-预警总览-健康.webp');
          }

          &.offline {
            background-image: url('@/assets/images/background/首页-预警总览-离线.webp');
          }
        }
      }

      &.alarm-card--healthy .card-header {
        background-image: url('@/assets/images/background/首页-预警总览-健康标题.webp');
      }

      &.alarm-card--offline .card-header {
        background-image: url('@/assets/images/background/首页-预警总览-离线标题.webp');
      }

      &.alarm-card--alarm .card-header {
        background-image: url('@/assets/images/background/首页-预警总览-报警标题.webp');
      }

      &.alarm-card--warning .card-header {
        background-image: url('@/assets/images/background/首页-预警总览-预警标题.webp');
      }

      .alarm-time {
        font-size: 0.9rem;
        font-weight: 400;
        letter-spacing: 0.78px;
        color: rgba(255, 255, 255, 1);
        white-space: nowrap;
        margin-bottom: 8px;
        text-align: left;
      }

      .measurement-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
        flex: 1;
        min-height: 0;

        .point-item {
          width: 3.3vw;
          height: 3.5vh;
          display: flex;
          align-items: center;
          justify-content: center;
          max-height: 35px;
          font-size: 0.75rem;
          white-space: nowrap;
          text-align: center;
          border-radius: 4px;
          padding: 1px;
          word-break: break-word;
          overflow: hidden;
          color: white;

          &.healthy {
            background: url('@/assets/images/background/首页-预警总览-健康点位.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.offline {
            background: url('@/assets/images/background/首页-预警总览-离线点位.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.warning {
            background: url('@/assets/images/background/首页-预警总览-预警点位.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.alarm {
            background: url('@/assets/images/background/首页-预警总览-报警点位.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.alarm-device {
            background: url('@/assets/images/background/首页-预警总览-报警设备.webp') no-repeat center center;
            background-size: 100% 100%;
          }

          &.warning-device {
            background: url('@/assets/images/background/首页-预警总览-预警设备.webp') no-repeat center center;
            background-size: 100% 100%;
          }
        }
      }
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    width: 100%;
    overflow: hidden;
    padding-top: 10px;
  }

  .pagination-page-meta {
    color: #fff;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  @keyframes status-dot-blink {

    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.35;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .status-dot.alarm {
      animation: none;
    }
  }

  @media (max-width: 800px) {
    height: auto;
    min-height: auto;
    overflow: visible;
    padding: 10px 10px 0 10px !important;

    .header-section {
      gap: 8px;
      flex-direction: row;
      align-items: center;
    }

    .header-section .header-controls-desktop {
      display: none;
    }

    .header-controls-mobile {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }

    .header-controls-mobile .batch-actions {
      width: 100%;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      white-space: normal;

      .batch-btn {
        max-width: none;
        font-size: 0.9rem;

        :deep(.el-button__text) {
          white-space: normal;
          word-break: break-all;
          line-height: 1.15;
        }
      }
    }

    .header-section .title-with-legend {
      width: 100%;
      align-items: center;
      gap: 8px;
    }

    .header-controls-mobile .search-section {
      width: 100%;
      align-items: flex-start;
    }

    .header-controls-mobile .search-section .time-section {
      width: 100%;
      padding-right: 0;
    }

    .status-legend {
      align-self: flex-start;
    }

    .alarm-grid .alarm-card {
      width: auto;
      max-height: none;
      height: 168px;
      min-height: 168px;

      .measurement-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));

        .point-item {
          width: auto;
          height: 28px;
          max-height: none;
        }
      }
    }

    .alarm-grid {
      flex: 0 0 auto;
      max-height: 180px;
      overflow: hidden;
    }

    .alarm-grid .alarm-card .card-header .status-dot {
      width: 6vw;
    }
  }

  :deep(.el-pagination) {
    font-size: var(--mobile-font-size-body);

    .el-pager li {
      background-color: transparent;
      color: white;
      border: 1px solid transparent;

      &.is-active {
        font-size: 1rem;
        color: rgba(153, 240, 255, 0.7);
        background-color: transparent;
        border: 1px solid transparent;
      }

      &:hover {
        background-color: transparent;
      }
    }

    .btn-prev,
    .btn-next {
      background-color: transparent !important;
      color: white !important;

      &:hover {
        color: rgba(153, 240, 255, 0.7) !important;
      }

      &.is-disabled {
        color: #a8abb4 !important;
      }
    }

    .el-pagination__sizes .el-input__inner {
      height: 18px;
      background-color: transparent;
      color: #111 !important;
      font-size: var(--mobile-font-size-caption);
    }
  }
}
</style>
