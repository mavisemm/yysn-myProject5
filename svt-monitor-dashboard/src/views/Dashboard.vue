<template>
  <div class="dashboard">
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

// 定义类型
interface RankingItem {
  deviceName: string;
  workshopName: string;
  value?: number;
}

// 初始化排名数据
const rankings = ref<RankingItem[][]>([
  [], // 振动烈度Top3
  [], // 声音响度Top3
  []  // 温度Top3
]);

// 获取Top5数据
const fetchTop5Data = async () => {
  try {
    // 并行获取三种类型的Top5数据
    const [vibrationData, soundData, temperatureData] = await Promise.all([
      getTop5Devices('VIBRATION'),
      getTop5Devices('SOUND'),
      getTop5Devices('TEMPERATURE')
    ]);

    // 处理振动烈度数据
    if (vibrationData.rc === 0 && vibrationData.ret) {
      rankings.value[0] = vibrationData.ret.map(item => ({
        deviceName: item.deviceName,
        workshopName: item.workshopName,
        value: item.value
      })).slice(0, 3); // 只取Top3
    }

    // 处理声音响度数据
    if (soundData.rc === 0 && soundData.ret) {
      rankings.value[1] = soundData.ret.map(item => ({
        deviceName: item.deviceName,
        workshopName: item.workshopName,
        value: item.value
      })).slice(0, 3); // 只取Top3
    }

    // 处理温度数据
    if (temperatureData.rc === 0 && temperatureData.ret) {
      rankings.value[2] = temperatureData.ret.map(item => ({
        deviceName: item.deviceName,
        workshopName: item.workshopName,
        value: item.value
      })).slice(0, 3); // 只取Top3
    }
  } catch (error) {
    console.error('获取Top5数据失败:', error);
    // 如果获取失败，保持空数组，这样ThreeMetrics组件会显示加载状态
    // 不需要额外处理，因为请求拦截器会显示错误信息
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