<!-- 首页仪表板：包含统计数据和指标排名 -->
<template>
  <div class="dashboard">
    <!-- 顶部区域：统计数据和告警概览 -->
    <div class="top-section">
      <DashboardStats :stats="statsData" />
      <AlarmOverview>
        <template #alarms>
        </template>
      </AlarmOverview>
    </div>
    <!-- 底部区域：三项指标排名 -->
    <div class="bottom-section">
      <ThreeMetrics :metrics="[
        { title: '振动烈度Top3', unit: '（单位：mm/s）' },
        { title: '声音响度Top3', unit: '（单位：dB）' },
        { title: '温度Top3', unit: '（单位：℃）' }
      ]" :rankings="rankings">

      </ThreeMetrics>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import DashboardStats from '@/components/business/dashboard/DashboardStats.vue';
import AlarmOverview from '@/components/business/dashboard/AlarmOverview.vue';
import ThreeMetrics from '@/components/business/dashboard/ThreeMetrics.vue';
import { getTop5Devices } from '@/api/modules/hardware';
import { getAllStats } from '@/api/modules/stats';


/**
 * 排名项目类型定义
 */
interface RankingItem {
  deviceName: string;
  workshopName: string;
  value?: number;
}

const rankings = ref<RankingItem[][]>([
  [],
  [],
  []
]);

// 统计数据
const statsData = ref([
  { title: '健康设备数', number: 0 },
  { title: '故障报警设备', number: 0 },
  { title: '监控总设备数', number: 0 },
  { title: '趋势预警设备', number: 0 }
]);

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

    if (vibrationData.rc === 0 && vibrationData.ret) {
      rankings.value[0] = vibrationData.ret.map(item => ({
        deviceName: item.deviceName,
        workshopName: item.workshopName,
        value: item.value
      }));
    }

    if (soundData.rc === 0 && soundData.ret) {
      rankings.value[1] = soundData.ret.map(item => ({
        deviceName: item.deviceName,
        workshopName: item.workshopName,
        value: item.value
      }));
    }

    if (temperatureData.rc === 0 && temperatureData.ret) {
      rankings.value[2] = temperatureData.ret.map(item => ({
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

    statsData.value = [
      { title: '健康设备数', number: stats.healthyDeviceCount },
      { title: '故障报警设备', number: stats.alertDeviceCount },
      { title: '监控总设备数', number: stats.totalDeviceCount },
      { title: '趋势预警设备', number: stats.totalPointCount }
    ];
  } catch (error) {
    console.error('获取统计数据失败:', error);
    // 使用默认值
    statsData.value = [
      { title: '健康设备数', number: 0 },
      { title: '故障报警设备', number: 0 },
      { title: '监控总设备数', number: 0 },
      { title: '趋势预警设备', number: 0 }
    ];
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
  box-sizing: border-box;

  .top-section {
    height: 60%;
    min-height: 0;
    min-width: 0;
    display: flex;
    gap: clamp(8px, 1.5vw, 15px);
    padding-bottom: clamp(8px, 1.5vw, 15px);
    box-sizing: border-box;
  }

  .bottom-section {
    height: 40%;
  }
}
</style>