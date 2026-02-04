<!-- 声音点位监控页面：展示声音数据分析和图表 -->
<template>
  <div class="sound-point-container">
    <!-- 曲线图表区域：展示能量曲线和密度曲线 -->
    <SoundPointCharts :deviation-list="deviationList" @chart-init="handleChartInit" ref="chartsComponentRef" />

    <!-- 下方内容区域 -->
    <div class="bottom-section">
      <!-- 左侧表格区域 -->
      <SoundDataTable :deviation-list="deviationList" @select-change="handleSelectChange" @view-details="viewDetails"
        @download-file="downloadFile" @play-audio="playAudio" @row-click="handleRowClick" />

      <!-- 右侧信息区域 -->
      <SoundPointInfo :point-name="pointName" :device-name="deviceName" :current-data-time="currentDataTime"
        :audio-path="audioPath" />
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
import { connectCharts, enableMouseWheelZoomForCharts, enableMouseWheelZoom } from '@/utils/chart';

// 导入新组件
import SoundPointCharts from '@/components/business/sound-point/SoundPointCharts.vue';
import SoundDataTable from '@/components/business/sound-point/SoundDataTable.vue';
import SoundPointInfo from '@/components/business/sound-point/SoundPointInfo.vue';

const route = useRoute();
const chartsComponentRef = ref<any>(null);
const modalChartRef = ref<HTMLDivElement>();

const modalChartInstance = shallowRef<echarts.ECharts | null>(null);


const audioPath = ref('');
const voiceVisible = ref(false);

// 基础信息
const pointName = ref('北侧电机监听点');
const deviceName = ref('1号传送带电机');
const currentDataTime = ref('');

// 颜色池
const colors = [
  '#91cc75', '#fac858', '#ee6666', '#3ba272', '#fc8452',
  '#9a60b4', '#ea7ccc', '#d48265', '#91c7ae', '#749f83',
  '#ca8622', '#bda29a', '#6e7074', '#8ec6ad', '#ff9f7f',
  '#fb7293', '#e7bcf3', '#ffdb5c', '#9fe6b8', '#ff9e7d'
];

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
      densityArr: freqAxis.map(() => (Math.random() * 0.7 + 0.1).toFixed(4)),
      freqs: freqAxis
    });
  }
  return data;
};

const deviationList = ref(generateMockData());

const isAllSelected = computed(() => {
  return deviationList.value.length > 0 && deviationList.value.every(item => item.visible);
});

const isIndeterminate = computed(() => {
  const selectedCount = deviationList.value.filter(item => item.visible).length;
  return selectedCount > 0 && selectedCount < deviationList.value.length;
});

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
  // 调用图表组件的更新方法
  if (chartsComponentRef.value && typeof chartsComponentRef.value.updateCharts === 'function') {
    chartsComponentRef.value.updateCharts();
  }
};

const toggleVisible = () => {
  const selectedCount = deviationList.value.filter(item => item.visible).length;

  if (selectedCount === 0) {
    ElMessage.error('至少选择一条数据，已为您选择最新的一条');
    const firstItem = deviationList.value[0];
    if (firstItem) firstItem.visible = true;
  }
  // 调用图表组件的更新方法
  if (chartsComponentRef.value && typeof chartsComponentRef.value.updateCharts === 'function') {
    chartsComponentRef.value.updateCharts();
  }
};

const handleRowClick = (row: any) => {
  row.visible = !row.visible;
  toggleVisible();
};

// 处理图表初始化事件
const handleChartInit = (charts: any) => {
  // 如果需要访问图表实例，可以在这里处理
};

// 处理选择变更事件
const handleSelectChange = () => {
  // 调用图表组件的更新方法
  if (chartsComponentRef.value && typeof chartsComponentRef.value.updateCharts === 'function') {
    chartsComponentRef.value.updateCharts();
  }
};





// 操作方法
const viewDetails = (row: any) => {
  voiceVisible.value = true;
  nextTick(() => {
    if (modalChartRef.value) {
      modalChartInstance.value = echarts.init(modalChartRef.value);
      modalChartInstance.value.setOption({
        title: { text: `${row.time} 详细频谱`, left: 'center' },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(50,50,50,0.8)',
          borderColor: 'rgba(50,50,50,0.8)',
          textStyle: {
            color: '#fff'
          },
          position: function (pos: any, params: any, el: any, elRect: any, size: any) {
            const [mouseX, mouseY] = pos;
            const [contentWidth, contentHeight] = size.contentSize;
            const [viewWidth, viewHeight] = size.viewSize;
            let x = mouseX + 20;
            if (x + contentWidth > viewWidth) {
              x = mouseX - contentWidth - 20;
            }
            let y = Math.max(0, mouseY - contentHeight / 2);
            return [x, y];
          }
        },
        grid: { left: 30, right: 20, top: 40, bottom: 50 },
        legend: { show: true, top: 30 },
        xAxis: { type: 'category', data: row.freqs, boundaryGap: false },
        yAxis: [
          { type: 'value', name: 'dB' },
          { type: 'value', name: '密度' }
        ],
        dataZoom: [
          { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
          {
            type: 'slider',
            xAxisIndex: [0],
            bottom: 10,
            height: 20,
            fillerColor: 'rgba(126, 203, 161, 0.3)',
            borderColor: 'rgba(126, 203, 161, 0.5)',
            handleStyle: { color: '#7ecba1' },
            filterMode: 'none'
          }
        ],
        series: [
          { name: '能量', type: 'line', data: row.dbArr, symbolSize: 1 },
          { name: '密度', type: 'line', data: row.densityArr, yAxisIndex: 1, symbolSize: 1 }
        ]
      });

      enableMouseWheelZoom(modalChartInstance.value);
    }
  });
};

const downloadFile = (id: string) => {
  ElMessage.success(`正在下载文件: ${id}`);
};

const playAudio = (id: string) => {
  audioPath.value = `http://mock-audio-server/play?id=${id}`;
  // 音频播放功能现在由 SoundPointInfo 组件处理
  ElMessage.success(`正在播放音频: ${id}`);
};

const handleResize = () => {
  // 使用 setTimeout 避免在主渲染过程中调用 resize
  setTimeout(() => {
    try {
      modalChartInstance.value?.resize();
    } catch (error) {
      console.warn('Modal chart resize failed:', error);
    }
  }, 0);
  // 图表调整大小现在由 SoundPointCharts 组件处理
};

onMounted(() => {
  const firstItem = deviationList.value[0];
  if (firstItem) {
    currentDataTime.value = firstItem.time;
  }
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  modalChartInstance.value?.dispose();
});
</script>

<style lang="scss" scoped>
.sound-point-container {
  height: 100%;
  display: flex;
  flex-direction: column;

  .bottom-section {
    display: flex;
    flex: 1;
    gap: 20px;
    height: 50%;
    overflow: hidden;
  }
}
</style>