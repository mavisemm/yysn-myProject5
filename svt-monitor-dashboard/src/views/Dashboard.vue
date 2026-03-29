<!-- 首页仪表板：三个盒子纵向排列 -->
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
        { title: '声音响度排名', unit: '（单位：%）' },
        { title: '温度排名', unit: '（单位：%）' }
      ]" :rankings="rankings">
      </ThreeMetrics>
    </div>

    <TrendWarningDeviceModal v-model="showTrendWarningModal" title="趋势预警设备详情" mode="trend"
      :count="trendWarningCount" />
    <TrendWarningDeviceModal v-model="showFaultWarningModal" title="故障报警设备详情" mode="fault"
      :count="faultAlertCount" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive, computed } from 'vue';
import DashboardStats from '@/components/business/dashboard/DashboardStats.vue';
import AlarmOverview from '@/components/business/dashboard/AlarmOverview.vue';
import ThreeMetrics from '@/components/business/dashboard/ThreeMetrics.vue';
import TrendWarningDeviceModal from '@/components/business/dashboard/TrendWarningDeviceModal.vue';
import { getTop5Devices } from '@/api/modules/hardware';
import { getAllStats } from '@/api/modules/stats';
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useAlarmOverviewStore } from '@/stores/alarmOverview'
import { useDeviceTreeStore } from '@/stores/deviceTree'


/**
 * 排名项目类型定义
 */
interface RankingItem {
  equipmentId?: string;
  equipmentName: string;
  workshopName: string;
  value?: number;
}

const rankings = ref<RankingItem[][]>([
  [],
  [],
  []
]);

const showTrendWarningModal = ref(false);
const showFaultWarningModal = ref(false);

// 统计数据
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

/**
 * 获取Top5设备数据
 */
const fetchTop5Data = async () => {
  try {
    const [vibrationData, soundData, temperatureData] = await Promise.all([
      getTop5Devices('VIBRATION'),
      getTop5Devices('SOUND'),
      getTop5Devices('TEMPERATURE')
    ]);

    if (vibrationData.rc === 0 && vibrationData.ret?.length) {
      rankings.value[0] = vibrationData.ret.map(item => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName,
        workshopName: item.workshopName,
        value: item.value
      }));
    }

    if (soundData.rc === 0 && soundData.ret?.length) {
      rankings.value[1] = soundData.ret.map(item => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName,
        workshopName: item.workshopName,
        value: item.value
      }));
    }

    if (temperatureData.rc === 0 && temperatureData.ret?.length) {
      rankings.value[2] = temperatureData.ret.map(item => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName,
        workshopName: item.workshopName,
        value: item.value
      }));
    }
  } catch (error) {
    console.error('获取Top5数据失败:', error);
  }
};

/**
 * 获取统计数据显示
 */
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

  // 预警总览：初始化 + websocket 订阅（不再依赖 AlarmOverview.vue 的 onMounted）
  const alarmOverviewStore = useAlarmOverviewStore()
  void alarmOverviewStore.start({
    token: localStorage.getItem('token') ?? undefined,
    tenantId: localStorage.getItem('tenantId') ?? undefined
  })

  // 设备树：进入 dashboard 后强制拉取一次
  // 避免“store 初始化时 tenantId 尚未就绪”的时序问题导致首次看不到 tree 请求
  // tenantId 不变也可能增删设备，因此这里每次进入都刷新
  const deviceTreeStore = useDeviceTreeStore()
  void deviceTreeStore.loadDeviceTreeData()

  // 弹窗列表预热（find），仅默认条件；是否“仅首次”由 alarmBatchStore 内部控制
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
});

onUnmounted(() => {
  // 离开 dashboard 时断开 websocket，避免后台持续占用连接
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