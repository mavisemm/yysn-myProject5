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
import { onMounted, ref, reactive, computed } from 'vue';
import DashboardStats from '@/components/business/dashboard/DashboardStats.vue';
import AlarmOverview from '@/components/business/dashboard/AlarmOverview.vue';
import ThreeMetrics from '@/components/business/dashboard/ThreeMetrics.vue';
import TrendWarningDeviceModal from '@/components/business/dashboard/TrendWarningDeviceModal.vue';
import { getTop5Devices } from '@/api/modules/hardware';
import { getAllStats } from '@/api/modules/stats';


/**
 * 排名项目类型定义
 */
interface RankingItem {
  deviceId?: string;
  deviceName: string;
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
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        workshopName: item.workshopName,
        value: item.value
      }));
    }

    if (soundData.rc === 0 && soundData.ret?.length) {
      rankings.value[1] = soundData.ret.map(item => ({
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        workshopName: item.workshopName,
        value: item.value
      }));
    }

    if (temperatureData.rc === 0 && temperatureData.ret?.length) {
      rankings.value[2] = temperatureData.ret.map(item => ({
        deviceId: item.deviceId,
        deviceName: item.deviceName,
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
  fetchTop5Data();
  fetchStatsData();
});
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

  .dashboard-box-stats {
    height: calc((100% - 20px) * 0.2);
  }

  .dashboard-box-alarm {
    height: calc((100% - 20px) * 0.5);
  }

  .dashboard-box-metrics {
    height: calc((100% - 20px) * 0.3);
  }
}
</style>