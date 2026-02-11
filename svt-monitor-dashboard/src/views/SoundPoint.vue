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
        :deviation-value="currentDeviationValue" />
    </div>
  </div>

  <!-- 详情弹窗（查看曲线）：能量一个 echarts，密度一个 echarts -->
  <el-dialog v-model="voiceVisible" title="详情" width="70vw" align-center class="voice-detail-dialog" destroy-on-close
    @opened="handleModalOpened" @closed="handleModalClosed">
    <div class="modal-charts">
      <div class="modal-chart-item">
        <div ref="modalEnergyChartRef" class="modal-chart-dom"></div>
      </div>
      <div class="modal-chart-item">
        <div ref="modalDensityChartRef" class="modal-chart-dom"></div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, shallowRef, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import * as echarts from 'echarts';
import { ElMessage, ElDialog } from 'element-plus';
import { enableMouseWheelZoom } from '@/utils/chart';
import { useDeviceTreeStore } from '@/stores/deviceTree';
import { usePointMessageStore } from '@/stores/pointMessage';

const deviceTreeStore = useDeviceTreeStore();
const pointMessageStore = usePointMessageStore();
import {
  getLatestDeviationByReceiver,
  getStandardFrequencyList,
  findLatestFrequencyById,
  getWavByFreqGroupIdUrl,
  type SoundDeviationItem
} from '@/api/modules/voiceSound';

const route = useRoute();
const pointIdFromQuery = computed(() => (route.query.pointId as string) || '');
const deviceIdFromQuery = computed(() => (route.query.deviceId as string) || '');

// 导入新组件
import SoundPointCharts from '@/components/business/sound-point/SoundPointCharts.vue';
import SoundDataTable from '@/components/business/sound-point/SoundDataTable.vue';
import SoundPointInfo from '@/components/business/sound-point/SoundPointInfo.vue';
const chartsComponentRef = ref<any>(null);
const modalEnergyChartRef = ref<HTMLDivElement>();
const modalDensityChartRef = ref<HTMLDivElement>();

const modalEnergyChartInstance = shallowRef<echarts.ECharts | null>(null);
const modalDensityChartInstance = shallowRef<echarts.ECharts | null>(null);
/** 联动时避免 dataZoom 事件回环 */
let dataZoomSyncing = false;
/** 联动时避免 tooltip 事件回环 */
let tooltipSyncing = false;
/** 弹窗内图表容器 resize 监听 */
let modalChartsResizeObserver: ResizeObserver | null = null;


const audioPath = ref('');
const voiceVisible = ref(false);

// 基础信息（由接口返回或路由对应的真实点位填充，不写死）
const pointName = ref('');
const deviceName = ref('');
const currentDataTime = ref('');

// 详细信息字段（由接口首条填充，切换点位会随 loadDeviationList 更新）
const clusterName = ref('');
const productionEquipment = ref('');
const subComponent = ref('');
const detectionEquipment = ref('');
const microphone = ref('');
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
  /** 用于点击播放时更新右侧详情 */
  deviceName?: string;
  pointName?: string;
  clusterName?: string;
  productionEquipment?: string;
  subComponent?: string;
  detectionEquipment?: string;
  microphone?: string;
}

const deviationList = ref<DeviationListItem[]>([]);

/** 从点位详情 store 填充右侧详情（生产设备=productName，子部件=subProductName，检测设备=detectorName，听筒=receiverName，点位名称=pointName） */
function applyStorePointInfo() {
  const pointId = pointIdFromQuery.value;
  if (!pointId) return;
  const point = pointMessageStore.getPointByKey(pointId);
  if (!point) return;
  clusterName.value = point.groupName ?? '';
  productionEquipment.value = point.productName ?? '';
  subComponent.value = point.subProductName ?? '';
  detectionEquipment.value = point.detectorName ?? '';
  microphone.value = point.receiverName ?? '';
  pointName.value = point.pointName ?? '';
  deviceName.value = point.productName ?? '';
}

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
    const raw = item as any;
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
      sampleSec: item.sampleSec,
      deviceName: raw.deviceName ?? '',
      pointName: raw.pointName ?? '',
      clusterName: raw.sceneName ?? raw.titleGroupName ?? '',
      productionEquipment: raw.deviceName ?? raw.productName ?? raw.productionFactory ?? '',
      subComponent: raw.subProductName ?? '',
      detectionEquipment: raw.detectorName ?? raw.deviceName ?? '',
      microphone: raw.receiverName ?? raw.pointName ?? (raw.pointId != null ? String(raw.pointId) : '')
    };
  });
};

const loadDeviationList = async () => {
  try {
    const res = await getLatestDeviationByReceiver({
      pointId: pointIdFromQuery.value || undefined,
      receiverId: pointIdFromQuery.value || undefined
    });
    const rawList = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray((res as any)?.ret)
          ? (res as any).ret
          : [];
    const mapped = normalizeDeviationList(rawList);
    deviationList.value = mapped;

    const firstRaw = rawList[0] as any;
    const firstItem = mapped[0];
    if (firstItem) {
      currentDataTime.value = firstItem.time;
      currentDeviationValue.value = firstItem.deviationValue.toFixed(2);
    }
    if (firstRaw && typeof firstRaw === 'object') {
      // 与另一项目对应；生产设备 = 点位的设备（deviceName）
      pointName.value = firstRaw.pointName ?? '';
      deviceName.value = firstRaw.deviceName ?? '';
      clusterName.value = firstRaw.sceneName ?? firstRaw.titleGroupName ?? '';
      productionEquipment.value = firstRaw.deviceName ?? firstRaw.productName ?? firstRaw.productionFactory ?? '';
      subComponent.value = firstRaw.subProductName ?? '';
      detectionEquipment.value = firstRaw.detectorName ?? firstRaw.deviceName ?? '';
      // 本项用 pointId，另一项用 receiverId；听筒显示优先 receiverName，无则 pointName 或 pointId
      microphone.value = firstRaw.receiverName ?? firstRaw.pointName ?? (firstRaw.pointId != null ? String(firstRaw.pointId) : '');
      if (firstItem?.id) {
        audioPath.value = getWavByFreqGroupIdUrl(firstItem.id);
      }
    } else {
      pointName.value = '';
      deviceName.value = '';
      clusterName.value = '';
      productionEquipment.value = '';
      subComponent.value = '';
      detectionEquipment.value = '';
      microphone.value = '';
      audioPath.value = '';
    }
    // 优先使用 check-point/find/point/message 接口缓存的点位详情
    applyStorePointInfo();

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
      target.freqs = xFreqs.map(f => Number(f).toFixed(1));
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

// 查看曲线：请求 findLatestFrequencyById 并渲染弹窗图表（与另一项目一致）
const viewDetails = async (row: any) => {
  try {
    const res = await findLatestFrequencyById({ id: row.id, type: 2 });
    const ret = (res as any)?.ret ?? res;
    const soundFrequencyDtoList = ret?.soundFrequencyDtoList ?? [];
    const soundAvgFrequencyDtoList = ret?.soundAvgFrequencyDtoList ?? [];

    const XARR: string[] = [];
    const nowdbArr: (number | undefined)[] = [];
    const nowdensityArr: number[] = [];
    const avgdbArr: (number | undefined)[] = [];
    const avgdensityArr: number[] = [];

    for (let i = 0; i < soundFrequencyDtoList.length; i++) {
      const item = soundFrequencyDtoList[i];
      const f1 = Number(item?.freq1 ?? 0);
      const f2 = Number(item?.freq2 ?? 0);
      XARR.push(Number(Math.sqrt(f1 * f2)).toFixed(1));
      nowdbArr.push(item?.db != null ? Number(Number(item.db).toFixed(2)) : undefined);
      nowdensityArr.push(Number(Number(item?.density ?? 0).toFixed(4)));
    }
    if (Array.isArray(soundAvgFrequencyDtoList)) {
      for (let i = 0; i < soundAvgFrequencyDtoList.length; i++) {
        const item = soundAvgFrequencyDtoList[i];
        avgdbArr.push(item?.db != null ? Number(Number(item.db).toFixed(2)) : undefined);
        avgdensityArr.push(Number(Number(item?.density ?? 0).toFixed(4)));
      }
    }

    voiceVisible.value = true;
    nextTick(() => {
      const baseGrid = { left: 40, right: 20, top: 30, bottom: 50 };
      const dataZoom = [
        { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
        { type: 'slider', xAxisIndex: [0], bottom: 10, height: 20, filterMode: 'none' }
      ];

      // 将 source 图表的 dataZoom 范围同步到 target 图表
      const applyDataZoom = (source: echarts.ECharts, target: echarts.ECharts | null) => {
        if (!target || dataZoomSyncing) return;
        const opt = source.getOption();
        const dz = (opt as any).dataZoom as Array<{ start?: number; end?: number }> | undefined;
        const first = Array.isArray(dz) && dz.length > 0 ? dz[0] : undefined;
        if (first) {
          const start = first.start;
          const end = first.end;
          if (start != null && end != null) {
            dataZoomSyncing = true;
            target.setOption({
              dataZoom: [
                { type: 'inside', xAxisIndex: [0], filterMode: 'none', start, end },
                { type: 'slider', xAxisIndex: [0], bottom: 10, height: 20, filterMode: 'none', start, end }
              ]
            } as any);
            setTimeout(() => { dataZoomSyncing = false; }, 0);
          }
        }
      };

      // 能量图表
      if (modalEnergyChartRef.value) {
        if (modalEnergyChartInstance.value) {
          modalEnergyChartInstance.value.dispose();
          modalEnergyChartInstance.value = null;
        }
        modalEnergyChartInstance.value = echarts.init(modalEnergyChartRef.value);
        const energyLegend = avgdbArr.length > 0 ? ['能量', '标准能量线'] : ['能量'];
        modalEnergyChartInstance.value.setOption({
          tooltip: { trigger: 'axis' },
          grid: baseGrid,
          legend: { show: true, top: 10, data: energyLegend },
          xAxis: [{ type: 'category', data: XARR, boundaryGap: false }],
          yAxis: [{ type: 'value', name: '能量' }],
          dataZoom: [...dataZoom],
          series: [
            { name: '能量', type: 'line', data: nowdbArr, symbolSize: 1 },
            ...(avgdbArr.length > 0 ? [{ name: '标准能量线', type: 'line', data: avgdbArr, symbolSize: 1 }] : [])
          ]
        });
        enableMouseWheelZoom(modalEnergyChartInstance.value);
        modalEnergyChartInstance.value.on('dataZoom', () => {
          const src = modalEnergyChartInstance.value;
          const tgt = modalDensityChartInstance.value;
          if (src && tgt) applyDataZoom(src, tgt);
        });
        modalEnergyChartInstance.value.on('updateAxisPointer', (event: any) => {
          if (tooltipSyncing) return;
          const other = modalDensityChartInstance.value;
          const batch = event?.batch;
          const dataIndex = Array.isArray(batch) && batch[0]?.dataIndex != null ? batch[0].dataIndex : undefined;
          if (other && dataIndex != null) {
            tooltipSyncing = true;
            other.dispatchAction({ type: 'showTip', dataIndex });
            setTimeout(() => { tooltipSyncing = false; }, 0);
          }
        });
      }

      // 密度图表
      if (modalDensityChartRef.value) {
        if (modalDensityChartInstance.value) {
          modalDensityChartInstance.value.dispose();
          modalDensityChartInstance.value = null;
        }
        modalDensityChartInstance.value = echarts.init(modalDensityChartRef.value);
        const densityLegend = avgdensityArr.length > 0 ? ['密度', '标准密度线'] : ['密度'];
        modalDensityChartInstance.value.setOption({
          tooltip: { trigger: 'axis' },
          grid: baseGrid,
          legend: { show: true, top: 10, data: densityLegend },
          xAxis: [{ type: 'category', data: XARR, boundaryGap: false }],
          yAxis: [{ type: 'value', name: '密度' }],
          dataZoom: [...dataZoom],
          series: [
            { name: '密度', type: 'line', data: nowdensityArr, symbolSize: 1 },
            ...(avgdensityArr.length > 0 ? [{ name: '标准密度线', type: 'line', data: avgdensityArr, symbolSize: 1 }] : [])
          ]
        });
        enableMouseWheelZoom(modalDensityChartInstance.value);
        modalDensityChartInstance.value.on('dataZoom', () => {
          const src = modalDensityChartInstance.value;
          const tgt = modalEnergyChartInstance.value;
          if (src && tgt) applyDataZoom(src, tgt);
        });
        modalDensityChartInstance.value.on('updateAxisPointer', (event: any) => {
          if (tooltipSyncing) return;
          const other = modalEnergyChartInstance.value;
          const batch = event?.batch;
          const dataIndex = Array.isArray(batch) && batch[0]?.dataIndex != null ? batch[0].dataIndex : undefined;
          if (other && dataIndex != null) {
            tooltipSyncing = true;
            other.dispatchAction({ type: 'showTip', dataIndex });
            setTimeout(() => { tooltipSyncing = false; }, 0);
          }
        });
      }
    });
  } catch (e) {
    console.error('查看曲线失败', e);
    ElMessage.error('加载曲线数据失败');
  }
};

// 下载文件：使用 findWavByFreqGroupId 地址，下载完成后提示
const downloadFile = async (id: string) => {
  const url = getWavByFreqGroupIdUrl(id);
  ElMessage.info('正在下载文件');
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(res.statusText);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sound_${id}.wav`;
    a.click();
    URL.revokeObjectURL(a.href);
    ElMessage.success('下载完成');
  } catch {
    window.location.href = url;
    setTimeout(() => ElMessage.success('下载完成'), 2000);
  }
};

// 播放：更新右侧详细信息 + 音频地址（freqGroupId），并播放
const playAudio = (row: DeviationListItem) => {
  pointName.value = row.pointName ?? '';
  deviceName.value = row.deviceName ?? '';
  clusterName.value = row.clusterName ?? '';
  productionEquipment.value = row.productionEquipment ?? '';
  subComponent.value = row.subComponent ?? '';
  detectionEquipment.value = row.detectionEquipment ?? '';
  microphone.value = row.microphone ?? '';
  currentDataTime.value = row.time;
  currentDeviationValue.value = row.deviationValue.toFixed(2);
  audioPath.value = getWavByFreqGroupIdUrl(row.id);
  nextTick(() => {
    const el = document.querySelector('.info-section-right audio') as HTMLAudioElement;
    if (el) el.play().catch(() => { });
  });
  ElMessage.success('正在播放音频');
};

/** 弹窗打开后：禁止页面滚动，图表 resize，并监听弹窗内容区尺寸变化 */
const handleModalOpened = () => {
  document.body.style.overflow = 'hidden';
  modalChartsResizeObserver?.disconnect();
  modalChartsResizeObserver = null;
  const doResize = () => {
    try {
      modalEnergyChartInstance.value?.resize();
      modalDensityChartInstance.value?.resize();
    } catch (error) {
      console.warn('Modal chart resize failed:', error);
    }
  };
  setTimeout(doResize, 0);
  const container = document.querySelector('.voice-detail-dialog .el-dialog__body');
  if (container) {
    modalChartsResizeObserver = new ResizeObserver(() => setTimeout(doResize, 0));
    modalChartsResizeObserver.observe(container);
  }
};

const handleModalClosed = () => {
  document.body.style.overflow = '';
  modalChartsResizeObserver?.disconnect();
  modalChartsResizeObserver = null;
  if (modalEnergyChartInstance.value) {
    modalEnergyChartInstance.value.dispose();
    modalEnergyChartInstance.value = null;
  }
  if (modalDensityChartInstance.value) {
    modalDensityChartInstance.value.dispose();
    modalDensityChartInstance.value = null;
  }
};

const handleResize = () => {
  if (!voiceVisible.value) return;
  setTimeout(() => {
    try {
      modalEnergyChartInstance.value?.resize();
      modalDensityChartInstance.value?.resize();
    } catch (error) {
      console.warn('Modal chart resize failed:', error);
    }
  }, 0);
};

// 设备树切换点位时路由 query 会变，需重新拉取数据并更新选中状态
watch(
  () => route.query.pointId,
  (newId, oldId) => {
    if (newId !== oldId) {
      if (newId) {
        deviceTreeStore.setSelectedDeviceId(newId as string);
        applyStorePointInfo();
      }
      loadDeviationList();
    }
  }
);

onMounted(() => {
  if (pointIdFromQuery.value) {
    deviceTreeStore.setSelectedDeviceId(pointIdFromQuery.value);
    applyStorePointInfo();
  }
  loadDeviationList();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  modalEnergyChartInstance.value?.dispose();
  modalDensityChartInstance.value?.dispose();
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

/* 弹窗 70vw × 95vh，水平垂直居中，禁止出现滚动条 */
:deep(.voice-detail-dialog) {
  overflow: hidden !important;
  .el-dialog {
    height: 95vh;
    max-height: 95vh;
    margin: 0 !important;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .el-dialog__header {
    flex-shrink: 0;
  }
  .el-dialog__body {
    flex: 1;
    min-height: 0;
    overflow: hidden !important;
    padding: 12px 20px;
    display: flex;
    flex-direction: column;
  }
}

.modal-charts {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  min-height: 0;
  flex: 1;

  .modal-chart-item {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .modal-chart-dom {
      width: 100%;
      height: 40vh;
    }
  }
}
</style>