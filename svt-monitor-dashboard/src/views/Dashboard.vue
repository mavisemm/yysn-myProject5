<template>
  <div class="dashboard">
    <div class="dashboard-box dashboard-box-stats">
      <DashboardStats :stats="statsData" @click-trend-warning="showTrendWarningModal = true"
        @click-fault-warning="showFaultWarningModal = true" />
    </div>
    <div class="dashboard-box dashboard-box-alarm">
      <AlarmOverview>
        <template #alarms>
        </template>
      </AlarmOverview>
    </div>
    <div class="dashboard-box dashboard-box-metrics">
      <ThreeMetrics :metrics="[
        { title: '振动烈度排名', unit: '（单位：mm/s）' },
        { title: '声音偏差值排名' },
        { title: '温度排名', unit: '（单位：%）' }
      ]" :rankings="rankings">
      </ThreeMetrics>
    </div>

    <TrendWarningDeviceModal v-model="showTrendWarningModal" title="趋势预警设备详情" mode="trend" :count="trendWarningCount" />
    <TrendWarningDeviceModal v-model="showFaultWarningModal" title="故障报警设备详情" mode="fault" :count="faultAlertCount" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router'
import DashboardStats from '@/components/business/dashboard/DashboardStats.vue';
import AlarmOverview from '@/components/business/dashboard/AlarmOverview.vue';
import ThreeMetrics from '@/components/business/dashboard/ThreeMetrics.vue';
import TrendWarningDeviceModal from '@/components/business/dashboard/TrendWarningDeviceModal.vue';
import { getTenantId } from '@/api/tenant'
import { getTop5Devices } from '@/api/modules/hardware';
import { getAllStats } from '@/api/modules/stats';
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useAlarmOverviewStore } from '@/stores/alarmOverview'
import { useDeviceTreeStore } from '@/stores/deviceTree'


interface RankingItem {
  equipmentId?: string;
  equipmentName: string;
  pointName: string;
  receiverId?: string;
  value?: number;
}

const rankings = ref<RankingItem[][]>([
  [],
  [],
  []
]);

const showTrendWarningModal = ref(false);
const showFaultWarningModal = ref(false);

const DEFAULT_STATS = [
  { title: '监控总设备', number: 0 },
  { title: '健康设备', number: 0 },
  { title: '趋势预警设备', number: 0 },
  { title: '故障报警设备', number: 0 }
];

const statsData = ref([...DEFAULT_STATS]);

const faultAlertCount = computed(() => {
  const item = statsData.value.find(s => s.title === '故障报警设备');
  return Number(item?.number ?? 0);
});

const trendWarningCount = computed(() => {
  const item = statsData.value.find(s => s.title === '趋势预警设备');
  return Number(item?.number ?? 0);
});

let historyPrefetchTimerId: number | null = null;

const router = useRouter()
const fetchTop5Data = async () => {
  try {
    const tenantId = getTenantId() || undefined
    const [vibrationData, soundData, temperatureData] = await Promise.all([
      getTop5Devices('VIBRATION', tenantId),
      getTop5Devices('SOUND', tenantId),
      getTop5Devices('TEMPERATURE', tenantId)
    ]);

    if (vibrationData.rc === 0 && vibrationData.ret?.length) {
      rankings.value[0] = vibrationData.ret.map((item: any) => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName ?? '',
        pointName: item.pointName ?? item.receiverName ?? item.equipmentName ?? '',
        receiverId: item.receiverId ?? item.pointId ?? undefined,
        value: item.value
      }));
    }

    if (soundData.rc === 0 && soundData.ret?.length) {
      rankings.value[1] = soundData.ret.map((item: any) => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName ?? '',
        pointName: item.pointName ?? item.receiverName ?? item.equipmentName ?? '',
        receiverId: item.receiverId ?? item.pointId ?? undefined,
        value: item.value
      }));
    }

    if (temperatureData.rc === 0 && temperatureData.ret?.length) {
      rankings.value[2] = temperatureData.ret.map((item: any) => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName ?? '',
        pointName: item.pointName ?? item.receiverName ?? item.equipmentName ?? '',
        receiverId: item.receiverId ?? item.pointId ?? undefined,
        value: item.value
      }));
    }
  } catch (error) {
    console.error('获取Top5数据失败:', error);
  }
};

const fetchStatsData = async () => {
  try {
    const stats = await getAllStats();

    if (!stats) {
      statsData.value = [...DEFAULT_STATS];
      return;
    }

    statsData.value = [
      { title: '监控总设备', number: Number(stats.totalDeviceCount ?? 0) },
      { title: '健康设备', number: Number(stats.healthyDeviceCount ?? 0) },
      { title: '趋势预警设备', number: Number(stats.totalPointCount ?? 0) },
      { title: '故障报警设备', number: Number(stats.alertDeviceCount ?? 0) }
    ];
  } catch (error) {
    console.error('获取统计数据失败:', error);
    statsData.value = [...DEFAULT_STATS];
  }
};

onMounted(() => {
  const hasToken = () => Boolean(localStorage.getItem('token'))

  void nextTick(async () => {
    await router.isReady()
    if (router.currentRoute.value.name !== 'Dashboard') return

    const alarmOverviewStore = useAlarmOverviewStore()
    void alarmOverviewStore.start({
      token: localStorage.getItem('token') ?? undefined,
      tenantId: getTenantId() || undefined
    })

    const deviceTreeStore = useDeviceTreeStore()
    await deviceTreeStore.loadDeviceTreeData()
    if (router.currentRoute.value.name !== 'Dashboard') return
    deviceTreeStore.setSelectedDeviceId(null)

    const alarmBatchStore = useAlarmBatchStore()
    if (hasToken()) {
      void alarmBatchStore.prefetchRealtimeListForDefault().catch((e) => {
        console.error('预热实时列表失败:', e)
      })
    }

    historyPrefetchTimerId = window.setTimeout(() => {
      if (!hasToken()) return
      void alarmBatchStore.prefetchHistoryListForDefault().catch((e) => {
        console.error('预热历史列表失败:', e)
      })
    }, 3500)

    fetchTop5Data();
    fetchStatsData();
  })
});

onUnmounted(() => {
  useAlarmOverviewStore().stop()
  if (historyPrefetchTimerId) {
    clearTimeout(historyPrefetchTimerId)
    historyPrefetchTimerId = null
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
</style>