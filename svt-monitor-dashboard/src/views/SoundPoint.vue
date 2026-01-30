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
      <!-- 左侧表格区域 -->
      <div class="table-section-left">
        <div class="section-title">声音数据分析</div>
        <el-table :data="deviationList" height="100%" style="width: 100%; background: transparent;"
          :header-cell-style="{ background: 'transparent', textAlign: 'center' }" :cell-style="{ textAlign: 'center' }">
          <!-- 自定义勾选列 -->
          <el-table-column width="60" align="center">
            <template #header>
              <el-checkbox :model-value="isAllSelected" :indeterminate="isIndeterminate" @change="handleSelectAll" />
            </template>
            <template #default="{ row, $index }">
              <el-checkbox v-model="row.visible" @change="toggleVisible(row, $index)" />
            </template>
          </el-table-column>

          <el-table-column label="上传时间" width="180" align="center">
            <template #default="{ row }">
              {{ row.time }}
            </template>
          </el-table-column>

          <el-table-column prop="deviationValue" label="偏差值" width="100" align="center" />

          <el-table-column label="操作栏" width="220" align="center">
            <template #default="{ row }">
              <div class="operate-btns">
                <el-button link type="primary" @click="viewDetails(row)">查看曲线</el-button>
                <el-button link type="primary" @click="downloadFile(row.id)">下载文件</el-button>
                <el-button link type="primary" @click="playAudio(row.id)">播放</el-button>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="色块" width="80" align="center">
            <template #default="{ row }">
              <div v-if="row.color" :style="{ width: '12px', height: '12px', background: row.color, margin: '0 auto' }">
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div class="hint-text">提示：偏差值为与上一次的偏差值作比较</div>
      </div>

      <!-- 右侧信息区域 -->
      <div class="info-section-right">
        <div class="section-title">详细信息</div>
        <div class="info-content">
          <div class="info-item">
            <span class="info-label">点位名称:</span>
            <span class="info-value">{{ pointName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">设备名称:</span>
            <span class="info-value">{{ deviceName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">上传时间:</span>
            <span class="info-value">{{ currentDataTime }}</span>
          </div>
          <div class="audio-player">
            <audio ref="audioRef" :src="audioPath" controls preload="auto"></audio>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 详情弹窗 -->
  <el-dialog v-model="voiceVisible" title="详情" width="90%" destroy-on-close>
    <div ref="modalChartRef" style="width: 100%; height: 500px;"></div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, shallowRef } from 'vue';
import { useRoute } from 'vue-router';
import * as echarts from 'echarts';
import { ElTable, ElTableColumn, ElButton, ElMessage, ElDialog, ElCheckbox } from 'element-plus';
import { useChartResize } from '@/composables/useChart';
import { connectCharts } from '@/utils/chart';

const route = useRoute();
const energyChartRef = ref<HTMLDivElement>();
const densityChartRef = ref<HTMLDivElement>();
const modalChartRef = ref<HTMLDivElement>();

// 使用 shallowRef 存储 ECharts 实例，避免 Vue 响应式代理导致交互失效
const energyChartInstance = shallowRef<echarts.ECharts | null>(null);
const densityChartInstance = shallowRef<echarts.ECharts | null>(null);
const modalChartInstance = shallowRef<echarts.ECharts | null>(null);

const audioRef = ref<HTMLAudioElement | null>(null);
const audioPath = ref('');
const voiceVisible = ref(false);

// 基础信息
const pointName = ref('北侧电机监听点');
const deviceName = ref('1号传送带电机');
const currentDataTime = ref('');

// 颜色池
const colors = [
  '#FF6347', '#4682B4', '#32CD32', '#FFD700', '#800080',
  '#FF1493', '#2E8B57', '#FF8C00', '#00FF7F', '#BA55D3',
  '#20B2AA', '#FF69B4', '#CD5C5C', '#48D1CC', '#B0C4DE',
  '#DAA520', '#FFB6C1', '#FF4500', '#DB7093', '#87CEFA'
];

// 20条固定假数据构造
const generateMockData = () => {
  const data = [];
  const now = new Date();
  const freqAxis = ['31.5', '63', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

  for (let i = 0; i < 20; i++) {
    const time = new Date(now.getTime() - i * 5 * 60000);
    data.push({
      id: `${20 - i}`,
      time: time.toLocaleString(),
      deviationValue: (Math.random() * 2).toFixed(2),
      visible: i === 0, // 默认选中第一条
      color: i === 0 ? colors[0] : undefined,
      dbArr: freqAxis.map(() => (Math.random() * 20 + 40).toFixed(2)),
      densityArr: freqAxis.map(() => (Math.random() * 0.5 + 0.1).toFixed(4)),
      freqs: freqAxis
    });
  }
  return data;
};

const deviationList = ref(generateMockData());

// 计算是否全选
const isAllSelected = computed(() => {
  return deviationList.value.length > 0 && deviationList.value.every(item => item.visible);
});

// 计算是否半选
const isIndeterminate = computed(() => {
  const selectedCount = deviationList.value.filter(item => item.visible).length;
  return selectedCount > 0 && selectedCount < deviationList.value.length;
});

// 全选/保留第一条逻辑
const handleSelectAll = () => {
  const allSelected = isAllSelected.value;
  if (allSelected) {
    deviationList.value.forEach((item, index) => {
      item.visible = index === 0;
    });
    ElMessage.info('已为您保留最新的一条数据');
  } else {
    deviationList.value.forEach(item => {
      item.visible = true;
    });
  }
  updateCharts();
};

// 切换单项勾选
const toggleVisible = (row: any, index: number) => {
  row.visible = !row.visible;
  const selectedCount = deviationList.value.filter(item => item.visible).length;

  if (selectedCount === 0) {
    const firstItem = deviationList.value[0];
    if (firstItem) {
      ElMessage.error('至少选择一条数据，已为您选择最新的一条');
      firstItem.visible = true;
    }
  }
  updateCharts();
};

// 初始化图表
const initCharts = () => {
  if (energyChartRef.value) energyChartInstance.value = echarts.init(energyChartRef.value);
  if (densityChartRef.value) densityChartInstance.value = echarts.init(densityChartRef.value);

  const { bindResize: bindEnergy } = useChartResize(energyChartInstance, energyChartRef);
  const { bindResize: bindDensity } = useChartResize(densityChartInstance, densityChartRef);
  bindEnergy();
  bindDensity();

  connectCharts([energyChartInstance.value, densityChartInstance.value]);
  updateCharts();
};

// 同步更新能量和密度图表
const updateCharts = () => {
  const selectedItems = deviationList.value.filter(item => item.visible);

  selectedItems.forEach((item, index) => {
    item.color = colors[index % colors.length];
  });

  deviationList.value.forEach(item => {
    if (!item.visible) item.color = undefined;
  });

  const freqs = selectedItems[0]?.freqs || [];

  const commonOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }] // 联动所有 X 轴
    },
    grid: { left: '10%', right: '10%', bottom: '15%' },
    legend: { show: false },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0] },
      { type: 'slider', xAxisIndex: [0], bottom: 10 }
    ],
    xAxis: { type: 'category', data: freqs, boundaryGap: false },
  };

  energyChartInstance.value?.setOption({
    ...commonOption,
    title: { text: '能量曲线 (dB)', left: 'center' },
    yAxis: { type: 'value', name: 'dB' },
    series: selectedItems.map(item => ({
      name: item.time,
      type: 'line',
      data: item.dbArr,
      itemStyle: { color: item.color },
      smooth: true
    }))
  }, true);

  densityChartInstance.value?.setOption({
    ...commonOption,
    title: { text: '密度曲线', left: 'center' },
    yAxis: { type: 'value', name: '密度' },
    series: selectedItems.map(item => ({
      name: item.time,
      type: 'line',
      data: item.densityArr,
      itemStyle: { color: item.color },
      smooth: true
    }))
  }, true);
};

// 操作方法
const viewDetails = (row: any) => {
  voiceVisible.value = true;
  nextTick(() => {
    if (modalChartRef.value) {
      modalChartInstance.value = echarts.init(modalChartRef.value);
      modalChartInstance.value.setOption({
        title: { text: `${row.time} 详细频谱`, left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: { show: true, top: 30 },
        xAxis: { type: 'category', data: row.freqs, boundaryGap: false },
        yAxis: [
          { type: 'value', name: 'dB' },
          { type: 'value', name: '密度' }
        ],
        series: [
          { name: '能量', type: 'line', data: row.dbArr },
          { name: '密度', type: 'line', data: row.densityArr, yAxisIndex: 1 }
        ]
      });
    }
  });
};

const downloadFile = (id: string) => {
  ElMessage.success(`正在下载文件: ${id}`);
};

const playAudio = (id: string) => {
  audioPath.value = `http://mock-audio-server/play?id=${id}`;
  setTimeout(() => {
    audioRef.value?.play().catch(() => {
      ElMessage.info('音频播放受阻，请手动点击');
    });
  }, 100);
};

const handleResize = () => {
  energyChartInstance.value?.resize();
  densityChartInstance.value?.resize();
  modalChartInstance.value?.resize();
};

onMounted(() => {
  initCharts();
  const firstItem = deviationList.value[0];
  if (firstItem) {
    currentDataTime.value = firstItem.time;
  }
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  energyChartInstance.value?.dispose();
  densityChartInstance.value?.dispose();
  modalChartInstance.value?.dispose();
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
    overflow: hidden;

    .table-section-left {
      flex: 3;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;

      .section-title {
        color: #111;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 15px;
      }

      .hint-text {
        color: #f56c6c;
        text-align: center;
        margin-top: 10px;
        font-size: 12px;
      }

      .operate-btns {
        display: flex;
        justify-content: center;
        gap: 10px;
      }
    }

    .info-section-right {
      flex: 1;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;

      .section-title {
        color: #111;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 15px;
      }

      .info-content {
        display: flex;
        flex-direction: column;
        gap: 15px;
        overflow-y: auto;

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
            word-break: break-all;
          }
        }

        .audio-player {
          margin-top: 20px;

          audio {
            width: 100%;
            height: 34px;
          }
        }
      }
    }
  }
}

/* 深度选择器确保 Element Table 透明效果 */
:deep(.el-table) {
  background-color: transparent !important;
  --el-table-bg-color: transparent !important;
  --el-table-tr-bg-color: transparent !important;
}

:deep(.el-table__header-wrapper) {
  background-color: transparent !important;
}

:deep(.el-table th.el-table__cell) {
  background-color: transparent !important;
}
</style>