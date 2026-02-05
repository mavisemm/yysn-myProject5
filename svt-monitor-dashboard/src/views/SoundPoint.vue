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
        :audio-path="audioPath" :cluster-name="clusterName" :production-equipment="productionEquipment"
        :sub-component="subComponent" :detection-equipment="detectionEquipment" :microphone="microphone"
        :deviation-value="currentDeviationValue" :upload-time="currentDataTime" />
    </div>
  </div>

  <!-- 详情弹窗 -->
  <el-dialog v-model="voiceVisible" title="详情" width="90%" destroy-on-close>
    <div ref="modalChartRef" style="width: 100%; height: 500px;"></div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, shallowRef } from 'vue';
import * as echarts from 'echarts';
import { ElMessage, ElDialog } from 'element-plus';
import { enableMouseWheelZoom } from '@/utils/chart';
import { getLatestDeviationByReceiver, getStandardFrequencyList, type SoundDeviationItem } from '@/api/modules/voiceSound';

// 导入新组件
import SoundPointCharts from '@/components/business/sound-point/SoundPointCharts.vue';
import SoundDataTable from '@/components/business/sound-point/SoundDataTable.vue';
import SoundPointInfo from '@/components/business/sound-point/SoundPointInfo.vue';
const chartsComponentRef = ref<any>(null);
const modalChartRef = ref<HTMLDivElement>();

const modalChartInstance = shallowRef<echarts.ECharts | null>(null);


const audioPath = ref('');
const voiceVisible = ref(false);

// 基础信息
const pointName = ref('北侧电机监听点');
const deviceName = ref('1号传送带电机');
const currentDataTime = ref('');

// 详细信息字段
const clusterName = ref('生产设备：五线三路风机');
const productionEquipment = ref('五线三路风机');
const subComponent = ref('1.进风口位置');
const detectionEquipment = ref('五线3路');
const microphone = ref('1');
const currentDeviationValue = ref('0.00');

// 颜色池
const colors = [
  '#91cc75', '#fac858', '#ee6666', '#3ba272', '#fc8452',
  '#9a60b4', '#ea7ccc', '#d48265', '#91c7ae', '#749f83',
  '#ca8622', '#bda29a', '#6e7074', '#8ec6ad', '#ff9f7f',
  '#fb7293', '#e7bcf3', '#ffdb5c', '#9fe6b8', '#ff9e7d'
];

interface DeviationListItem {
  id: string;
  time: string;
  deviationValue: number;
  visible: boolean;
  color?: string;
  dbArr: (number | string)[];
  densityArr: (number | string)[];
  freqs: string[];
  filePath?: string;
  receiverId?: string;
  sampleSec?: number;
}

const deviationList = ref<DeviationListItem[]>([]);

const handleRowClick = (row: any) => {
  row.visible = !row.visible;
  currentDataTime.value = row.time;
  currentDeviationValue.value = row.deviationValue.toFixed(2);
  handleSelectChange();
};

// 处理图表初始化事件
const handleChartInit = (charts: any) => {
  // 如果需要访问图表实例，可以在这里处理
};

// 处理选择变更事件
const handleSelectChange = () => {
  loadFrequencyData();
};





const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const normalizeDeviationList = (list: SoundDeviationItem[]): DeviationListItem[] => {
  return list.map((item, index) => {
    const freqLength = (item.dbArray && item.dbArray.length) ? item.dbArray.length : (item.densityArray?.length || 0);
    const freqs = freqLength ? Array.from({ length: freqLength }, (_, i) => String(i + 1)) : [];
    return {
      id: String(item.id ?? index),
      time: formatDateTime(item.time),
      deviationValue: Number(item.deviationValue || 0),
      visible: index === 0,
      color: index === 0 ? colors[0] : undefined,
      dbArr: item.dbArray ?? [],
      densityArr: item.densityArray ?? [],
      freqs,
      filePath: item.filePath,
      receiverId: item.receiverId,
      sampleSec: item.sampleSec
    };
  });
};

const loadDeviationList = async () => {
  try {
    const res = await getLatestDeviationByReceiver();
    const rawList = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray((res as any)?.ret)
          ? (res as any).ret
          : [];
    const mapped = normalizeDeviationList(rawList);
    deviationList.value = mapped;

    const firstItem = mapped[0];
    if (firstItem) {
      currentDataTime.value = firstItem.time;
    }

    await loadFrequencyData();
  } catch (error) {
    console.error('加载声音偏差数据失败:', error);
    ElMessage.error('声音偏差数据加载失败，请稍后重试');
  }
};

const applyFrequencyResponse = (freqs: number[], responseList: any[], mode: 'energy' | 'density') => {
  if (!Array.isArray(responseList) || responseList.length === 0) return;
  responseList.forEach((res) => {
    const target = deviationList.value.find(item => Number(item.id) === Number(res.recordId));
    if (!target) return;
    const dbArr = Array.isArray(res.dbArray) ? res.dbArray : [];
    const densityArr = Array.isArray(res.densityArray) ? res.densityArray : [];
    const sourceArr = mode === 'energy' ? dbArr : densityArr;
    const xFreqs = freqs.length > 0
      ? freqs
      : (sourceArr.length > 0 ? Array.from({ length: sourceArr.length }, (_, i) => i + 1) : target.freqs.map(f => Number(f)));

    if (xFreqs && xFreqs.length > 0) {
      target.freqs = xFreqs.map(f => String(f));
    }

    if (mode === 'energy') {
      target.dbArr = dbArr;
    } else {
      target.densityArr = densityArr;
    }
  });

  const first = responseList[0];
  if (first?.time) {
    currentDataTime.value = formatDateTime(String(first.time));
  }

  if (chartsComponentRef.value && typeof chartsComponentRef.value.updateCharts === 'function') {
    chartsComponentRef.value.updateCharts();
  }
};

const loadFrequencyData = async () => {
  const selectedIds = deviationList.value.filter(item => item.visible).map(item => Number(item.id));
  if (selectedIds.length === 0) {
    if (chartsComponentRef.value && typeof chartsComponentRef.value.updateCharts === 'function') {
      chartsComponentRef.value.updateCharts();
    }
    return;
  }

  const loadOnce = async (type: number, mode: 'energy' | 'density') => {
    const res = await getStandardFrequencyList({
      recordIdList: selectedIds,
      type
    });
    const body = (res as any)?.data ?? (res as any)?.ret ?? res;
    const freqs = Array.isArray(body?.freqs) ? body.freqs : [];
    const responseList = Array.isArray(body?.responseList) ? body.responseList : [];
    applyFrequencyResponse(freqs, responseList, mode);
  };

  try {
    await loadOnce(0, 'energy');
    await loadOnce(1, 'density');
  } catch (error) {
    console.error('加载频率曲线失败:', error);
    ElMessage.error('频率曲线加载失败');
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
  loadDeviationList();
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