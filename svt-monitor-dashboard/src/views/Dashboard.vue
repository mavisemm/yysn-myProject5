<template>
  <div class="dashboard">
    <div class="dashboard-box dashboard-box-stats">
      <DashboardStats :stats="statsData" @click-trend-warning="showTrendWarningModal = true"
        @click-fault-warning="showFaultWarningModal = true" />
    </div>
    <div class="dashboard-box dashboard-box-alarm">
      <AlarmOverview>
        <template #alarms> </template>
      </AlarmOverview>
    </div>
    <div class="dashboard-box dashboard-box-metrics">
      <ThreeMetrics :metrics="[
        { title: '振动烈度排名', unit: '（单位：mm/s）' },
        { title: '声音偏差值排名' },
        { title: '温度排名', unit: '（单位：%）' },
      ]" :rankings="rankings">
      </ThreeMetrics>
    </div>

    <TrendWarningDeviceModal v-model="showTrendWarningModal" title="趋势预警设备详情" mode="trend" :count="trendWarningCount" />
    <TrendWarningDeviceModal v-model="showFaultWarningModal" title="故障报警设备详情" mode="fault" :count="faultAlertCount" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import DashboardStats from '@/components/business/dashboard/DashboardStats.vue'
import AlarmOverview from '@/components/business/dashboard/AlarmOverview.vue'
import ThreeMetrics from '@/components/business/dashboard/ThreeMetrics.vue'
import TrendWarningDeviceModal from '@/components/business/dashboard/TrendWarningDeviceModal.vue'
import { getTenantId } from '@/api/tenant'
import { getTop5Devices } from '@/api/modules/hardware'
import { getAllStats } from '@/api/modules/stats'
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useDeviceTreeStore } from '@/stores/deviceTree'

interface RankingItem {
  equipmentId?: string
  equipmentName: string
  pointName: string
  receiverId?: string
  value?: number
}

const rankings = ref<RankingItem[][]>([[], [], []])

const showTrendWarningModal = ref(false)
const showFaultWarningModal = ref(false)

const DEFAULT_STATS = [
  { title: '监控总设备', number: 0 },
  { title: '健康设备', number: 0 },
  { title: '趋势预警设备', number: 0 },
  { title: '故障报警设备', number: 0 },
]

const statsData = ref([...DEFAULT_STATS])

const faultAlertCount = computed(() => {
  const item = statsData.value.find((s) => s.title === '故障报警设备')
  return Number(item?.number ?? 0)
})

const trendWarningCount = computed(() => {
  const item = statsData.value.find((s) => s.title === '趋势预警设备')
  return Number(item?.number ?? 0)
})

let historyPrefetchTimerId: number | null = null
let idlePrefetchTimerId: number | null = null

const runWithConcurrency = async (tasks: Array<() => Promise<void>>, limit = 2) => {
  const running = new Set<Promise<void>>()
  for (const task of tasks) {
    const wrapped = task().finally(() => running.delete(wrapped))
    running.add(wrapped)
    if (running.size >= limit) {
      await Promise.race(running)
    }
  }
  await Promise.allSettled(Array.from(running))
}

const scheduleIdleTask = (task: () => void, timeoutMs = 1200) => {
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void
  }
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(() => task(), { timeout: timeoutMs })
    return
  }
  idlePrefetchTimerId = globalThis.setTimeout(task, timeoutMs)
}

const router = useRouter()
const fetchTop5Data = async () => {
  try {
    const tenantId = getTenantId() || undefined
    const [vibrationData, soundData, temperatureData] = await Promise.all([
      getTop5Devices('VIBRATION', tenantId),
      getTop5Devices('SOUND', tenantId),
      getTop5Devices('TEMPERATURE', tenantId),
    ])

    if (vibrationData.rc === 0 && vibrationData.ret?.length) {
      rankings.value[0] = vibrationData.ret.map((item: any) => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName ?? '',
        pointName: item.pointName ?? '',
        receiverId: item.receiverId ?? undefined,
        value: item.value,
      }))
    }

    if (soundData.rc === 0 && soundData.ret?.length) {
      rankings.value[1] = soundData.ret.map((item: any) => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName ?? '',
        pointName: item.pointName ?? '',
        receiverId: item.receiverId ?? undefined,
        value: item.value,
      }))
    }

    if (temperatureData.rc === 0 && temperatureData.ret?.length) {
      rankings.value[2] = temperatureData.ret.map((item: any) => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName ?? '',
        pointName: item.pointName ?? '',
        receiverId: item.receiverId ?? undefined,
        value: item.value,
      }))
    }
  } catch (error) {
    console.error('获取Top5数据失败:', error)
  }
}

const fetchStatsData = async () => {
  try {
    const stats = await getAllStats()

    if (!stats) {
      statsData.value = [...DEFAULT_STATS]
      return
    }

    statsData.value = [
      { title: '监控总设备', number: Number(stats.totalDeviceCount ?? 0) },
      { title: '健康设备', number: Number(stats.healthyDeviceCount ?? 0) },
      { title: '趋势预警设备', number: Number(stats.totalPointCount ?? 0) },
      { title: '故障报警设备', number: Number(stats.alertDeviceCount ?? 0) },
    ]
  } catch (error) {
    console.error('获取统计数据失败:', error)
    statsData.value = [...DEFAULT_STATS]
  }
}

onMounted(() => {
  const hasToken = () => Boolean(localStorage.getItem('token'))

  void nextTick(async () => {
    await router.isReady()
    if (router.currentRoute.value.name !== 'Dashboard') return

    const deviceTreeStore = useDeviceTreeStore()
    await deviceTreeStore.loadDeviceTreeData()
    if (router.currentRoute.value.name !== 'Dashboard') return
    deviceTreeStore.setSelectedDeviceId(null)

    // 首页核心数据优先：先加载排行与统计，弹窗预热放在最后执行，避免抢占首屏资源
    await Promise.allSettled([fetchTop5Data(), fetchStatsData()])

    const alarmBatchStore = useAlarmBatchStore()
    if (hasToken()) {
      void runWithConcurrency(
        [
          async () => {
            await alarmBatchStore.prefetchRealtimeListForDefault().catch((e) => {
              console.error('预热实时列表失败:', e)
            })
          },
          async () => {
            await alarmBatchStore.prefetchRealtimeAlarmListForDefault().catch((e) => {
              console.error('预热实时报警列表失败:', e)
            })
          },
        ],
        2,
      )
    }

    historyPrefetchTimerId = window.setTimeout(() => {
      if (!hasToken()) return
      scheduleIdleTask(() => {
        void runWithConcurrency(
          [
            async () => {
              await alarmBatchStore.prefetchHistoryListForDefault().catch((e) => {
                console.error('预热历史列表失败:', e)
              })
            },
            async () => {
              await alarmBatchStore.prefetchHistoryAlarmListForDefault().catch((e) => {
                console.error('预热历史报警列表失败:', e)
              })
            },
          ],
          2,
        )
      })
    }, 3500)
  })
})

onUnmounted(() => {
  if (historyPrefetchTimerId) {
    clearTimeout(historyPrefetchTimerId)
    historyPrefetchTimerId = null
  }
  if (idlePrefetchTimerId) {
    clearTimeout(idlePrefetchTimerId)
    idlePrefetchTimerId = null
  }
})
</script>

<style lang="scss" scoped>
.dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;

  .dashboard-box {
    flex: 0 0 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .dashboard-box-alarm {
    min-height: 290px !important;
  }

  .dashboard-box-stats {
    height: calc((100% - 20px) * 0.25);
  }

  .dashboard-box-metrics {
    flex: 1;
  }
}

@media (max-width: 800px) {
  .dashboard {
    min-height: auto;
    height: auto;
    padding-bottom: 12px;

    .dashboard-box {
      overflow: visible;
    }

    .dashboard-box-stats {
      height: 260px;
      min-height: 260px;
    }

    .dashboard-box-alarm {
      min-height: auto !important;
    }

    .dashboard-box-metrics {
      flex: 0 0 auto;
      min-height: auto;
      background: rgba(19, 38, 104, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }

    :deep(.alarm-overview),
    :deep(.metrics-area) {
      background: transparent !important;
    }

    :deep(.dashboard-box-stats > .stats-area) {
      flex: 1;
      min-height: 0;
    }
  }
}
</style>
