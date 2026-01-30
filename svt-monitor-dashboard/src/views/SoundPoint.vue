<template>
  <div class="sound-point-container">
    <!-- 曲线图表区域 -->
    <div class="charts-section">
      <div class="chart-item">
        <div class="chart-title">能量曲线</div>
        <div ref="energyChartRef" class="chart-container"></div>
      </div>
      <div class="chart-item">
        <div class="chart-title">密度曲线</div>
        <div ref="densityChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 下方内容区域 -->
    <div class="bottom-section">
      <!-- 左侧表格区域（占四分之三） -->
      <div class="table-section-left">
        <div class="section-title">声音数据分析</div>
        <el-table :data="deviationList" :fit="true" height="100%" table-layout="auto" highlight-current-row
          @row-click="handleRowClick">
          <el-table-column prop="id" label="ID" width="100" />
          <el-table-column prop="capturedTime" label="捕获时间" width="200" />
          <el-table-column prop="soundLevel" label="声音等级" width="100" />
          <el-table-column prop="frequency" label="频率" width="100" />
          <el-table-column prop="status" label="状态" width="100" />
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="viewDetails(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 右侧信息区域（占四分之一） -->
      <div class="info-section-right">
        <div class="section-title">详细信息</div>
        <div class="info-content">
          <div class="info-item">
            <span class="info-label">当前时间:</span>
            <span class="info-value">{{ currentTime }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">偏差值:</span>
            <span class="info-value">{{ deviationValue }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">设备ID:</span>
            <span class="info-value">{{ deviceId }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">点位ID:</span>
            <span class="info-value">{{ pointId }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import * as echarts from 'echarts';
import { ElTable, ElTableColumn, ElButton } from 'element-plus';
import { Right } from '@element-plus/icons-vue';
import { connectCharts } from '@/utils/chart';
import { useChartResize } from '@/composables/useChart';

// 引入API
// 不使用API，使用静态数据

// 响应式数据
const route = useRoute();
const energyChartRef = ref<HTMLDivElement>();
const densityChartRef = ref<HTMLDivElement>();
const energyChartInstance = ref<echarts.ECharts | null>(null);
const densityChartInstance = ref<echarts.ECharts | null>(null);

// 页面数据
const deviationList = ref<any[]>([]);
const currentTime = ref('');
const deviationValue = ref('');
const deviceId = ref('');
const pointId = ref('');
const selectedRow = ref<any>(null);

// 注册响应式监听
const { bindResize: bindEnergyResize } = useChartResize(energyChartInstance, energyChartRef);
const { bindResize: bindDensityResize } = useChartResize(densityChartInstance, densityChartRef);

// 定时器
let timer: number | null = null;

// 获取点位ID
const pointIdParam = route.params.id as string;

// 初始化图表
const initCharts = async () => {
  // 初始化能量曲线图
  if (energyChartRef.value) {
    energyChartInstance.value = echarts.init(energyChartRef.value);
    const energyOption = {
      title: {
        text: '能量曲线',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 20,
        data: ['当前能量', '平均能量', '标准能量']
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0]
        },
        {
          type: 'slider',
          xAxisIndex: [0]
        }
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['100Hz', '200Hz', '400Hz', '800Hz', '1KHz', '2KHz', '4KHz', '8KHz']
      },
      yAxis: {
        type: 'value',
        name: 'dB'
      },
      series: [
        {
          name: '当前能量',
          type: 'line',
          data: [20, 35, 30, 45, 50, 40, 35, 30],
          smooth: true
        },
        {
          name: '平均能量',
          type: 'line',
          data: [18, 32, 28, 42, 48, 38, 32, 28],
          smooth: true
        },
        {
          name: '标准能量',
          type: 'line',
          data: [22, 38, 32, 48, 52, 42, 38, 32],
          smooth: true,
          lineStyle: {
            type: 'dashed'
          }
        }
      ]
    };
    energyChartInstance.value.setOption(energyOption);
  }

  // 初始化密度曲线图
  if (densityChartRef.value) {
    densityChartInstance.value = echarts.init(densityChartRef.value);
    const densityOption = {
      title: {
        text: '密度曲线',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 20,
        data: ['当前密度', '平均密度', '标准密度']
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0]
        },
        {
          type: 'slider',
          xAxisIndex: [0]
        }
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['100Hz', '200Hz', '400Hz', '800Hz', '1KHz', '2KHz', '4KHz', '8KHz']
      },
      yAxis: {
        type: 'value',
        name: '密度'
      },
      series: [
        {
          name: '当前密度',
          type: 'line',
          data: [0.1, 0.2, 0.15, 0.3, 0.35, 0.25, 0.2, 0.18],
          smooth: true
        },
        {
          name: '平均密度',
          type: 'line',
          data: [0.09, 0.18, 0.14, 0.28, 0.32, 0.24, 0.18, 0.16],
          smooth: true
        },
        {
          name: '标准密度',
          type: 'line',
          data: [0.11, 0.22, 0.16, 0.32, 0.38, 0.28, 0.22, 0.2],
          smooth: true,
          lineStyle: {
            type: 'dashed'
          }
        }
      ]
    };
    densityChartInstance.value.setOption(densityOption);
  }

  // 绑定响应式
  bindEnergyResize();
  bindDensityResize();

  // 联动两个图表
  connectCharts([energyChartInstance.value, densityChartInstance.value]);
};

// 更新图表数据
const updateChartData = () => {
  if (energyChartInstance.value) {
    // 这里可以根据实际数据更新图表
    energyChartInstance.value.setOption({
      series: [
        {
          name: '当前能量',
          data: Array.from({ length: 8 }, () => Math.floor(Math.random() * 30) + 20)
        }
      ]
    });
  }

  if (densityChartInstance.value) {
    // 这里可以根据实际数据更新图表
    densityChartInstance.value.setOption({
      series: [
        {
          name: '当前密度',
          data: Array.from({ length: 8 }, () => (Math.random() * 0.2 + 0.1).toFixed(2))
        }
      ]
    });
  }
};

// 获取声音数据
const getSoundData = () => {
  // 使用静态数据
  deviationList.value = [
    { id: '1', capturedTime: '2026-01-29 10:30:00', soundLevel: 65.2, frequency: 1000, status: 'normal' },
    { id: '2', capturedTime: '2026-01-29 10:25:00', soundLevel: 72.5, frequency: 1200, status: 'warning' },
    { id: '3', capturedTime: '2026-01-29 10:20:00', soundLevel: 58.7, frequency: 800, status: 'normal' },
    { id: '4', capturedTime: '2026-01-29 10:15:00', soundLevel: 81.3, frequency: 1500, status: 'alarm' },
    { id: '5', capturedTime: '2026-01-29 10:10:00', soundLevel: 69.8, frequency: 1100, status: 'warning' },
    { id: '6', capturedTime: '2026-01-29 10:05:00', soundLevel: 55.4, frequency: 750, status: 'normal' },
    { id: '7', capturedTime: '2026-01-29 10:00:00', soundLevel: 76.9, frequency: 1300, status: 'warning' },
    { id: '8', capturedTime: '2026-01-29 09:55:00', soundLevel: 62.1, frequency: 900, status: 'normal' },
  ];

  // 设置静态的详细信息
  currentTime.value = new Date().toLocaleString();
  deviationValue.value = '68.5';
  deviceId.value = 'device_001';
  pointId.value = pointIdParam || 'point_001';

  // 更新图表
  updateChartData();
};

// 表格行点击事件
const handleRowClick = (row: any) => {
  selectedRow.value = row;
  // 这里可以更新图表显示选定行的数据
};

// 查看详情
const viewDetails = (row: any) => {
  console.log('查看详情:', row);
  // 这里可以打开详情弹窗或跳转到详情页面
};

// 页面加载
onMounted(() => {
  initCharts();
  getSoundData();

  // 设置定时器定期更新数据
  timer = setInterval(() => {
    getSoundData();
  }, 60000); // 每分钟更新一次
});

// 页面卸载
onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
  if (energyChartInstance.value) {
    energyChartInstance.value.dispose();
  }
  if (densityChartInstance.value) {
    densityChartInstance.value.dispose();
  }
});

// 监听窗口大小变化
const handleResize = () => {
  if (energyChartInstance.value) {
    energyChartInstance.value.resize();
  }
  if (densityChartInstance.value) {
    densityChartInstance.value.resize();
  }
};

onMounted(() => {
  initCharts();
  getSoundData();

  // 设置定时器定期更新图表数据
  timer = setInterval(() => {
    updateChartData();
  }, 5000); // 每5秒更新一次图表

  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize);

  if (timer) {
    clearInterval(timer);
  }
  if (energyChartInstance.value) {
    energyChartInstance.value.dispose();
  }
  if (densityChartInstance.value) {
    densityChartInstance.value.dispose();
  }
});
</script>

<style lang="scss" scoped>
.sound-point-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;

  .charts-section {
    display: flex;
    flex-direction: row;
    gap: 20px;
    height: 60%;
    margin-bottom: 20px;

    .chart-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

      .chart-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 10px;
        text-align: center;
      }

      .chart-container {
        flex: 1;
        min-height: 200px;
      }
    }
  }

  .bottom-section {
    display: flex;
    flex: 1;
    gap: 20px;
    height: 40%;

    .table-section-left {
      flex: 3;
      /* 占四分之三 */
      background: white;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;

      .section-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 15px;
      }
    }

    .info-section-right {
      flex: 1;
      /* 占四分之一 */
      background: white;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

      .section-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 15px;
      }

      .info-content {
        display: grid;
        grid-template-columns: 1fr;
        gap: 15px;

        .info-item {
          display: flex;
          flex-direction: column;

          .info-label {
            font-weight: bold;
            margin-bottom: 5px;
            color: #606266;
          }

          .info-value {
            color: #303133;
          }
        }
      }
    }
  }
}
</style>