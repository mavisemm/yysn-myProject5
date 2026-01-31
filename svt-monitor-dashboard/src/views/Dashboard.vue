<!-- 首页仪表板：包含统计数据和指标排名 -->
<template>
  <div class="dashboard">
    <!-- 顶部区域：统计数据和告警概览 -->
    <div class="top-section">
      <DashboardStats :stats="[
        { title: '健康设备数', number: 5 },
        { title: '预警设备数', number: 2 },
        { title: '监控总设备数', number: 7 },
        { title: '监测点位数', number: 40 }
      ]" />
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
import { onMounted, ref } from 'vue';
import DashboardStats from '@/components/business/dashboard/DashboardStats.vue';
import AlarmOverview from '@/components/business/dashboard/AlarmOverview.vue';
import ThreeMetrics from '@/components/business/dashboard/ThreeMetrics.vue';
import { getTop5Devices } from '@/api/modules/hardware';


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
      })).slice(0, 3);
    }

    if (soundData.rc === 0 && soundData.ret) {
      rankings.value[1] = soundData.ret.map(item => ({
        deviceName: item.deviceName,
        workshopName: item.workshopName,
        value: item.value
      })).slice(0, 3);
    }

    if (temperatureData.rc === 0 && temperatureData.ret) {
      rankings.value[2] = temperatureData.ret.map(item => ({
        deviceName: item.deviceName,
        workshopName: item.workshopName,
        value: item.value
      })).slice(0, 3);
    }
  } catch (error) {
    console.error('获取Top5数据失败:', error);
  }
};

onMounted(() => {
  fetchTop5Data();
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
    display: flex;
    gap: 15px;
    padding-bottom: 15px;
    box-sizing: border-box;
  }

  .bottom-section {
    height: 40%;
  }
}
</style>