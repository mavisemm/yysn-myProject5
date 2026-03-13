<template>
  <div class="trend-analysis-panel" :class="themeClass">
    <div class="module-header">
      <h3 class="module-title">趋势分析</h3>
    </div>

    <div class="module-content">
      <div class="analysis-form">
        <el-form label-position="top">
          <div class="form-row">
            <el-form-item label="点位选择" style="flex: 1; margin-right: 10px;">
              <el-tree-select
                v-model="analysisForm.pointIds"
                placeholder="请选择点位"
                size="small"
                style="width: 100%;"
                :data="pointTreeData"
                multiple
                show-checkbox
                :check-strictly="false"
                :leaf-only="true"
                filterable
                clearable
                :loading="pointLoading"
                :props="treeSelectProps"
                :filter-node-method="filterPointNode"
                popper-class="trend-point-tree-popper"
              />
            </el-form-item>

            <el-form-item label="间隔天数" style="flex: 1;">
              <el-input-number v-model="analysisForm.days" :min="0" :max="365" placeholder="输入天数" size="small"
                style="width: 100%;" />
            </el-form-item>
          </div>

          <el-form-item label="时间选择">
            <CommonDateTimePicker v-model="analysisForm.dateRange" width="100%" />
          </el-form-item>

          <el-button type="primary" @click="analyzeTrend" style="width: 100%; margin-top: 10px;">
            开始分析
          </el-button>
        </el-form>
      </div>

      <div class="analysis-result">
        <div class="result-row">
          <span class="result-label">偏差值：</span>
          <span class="result-value">{{ analysisResult.deviation }}</span>
        </div>
        <div class="result-row">
          <span class="result-label">点位名称：</span>
          <span class="result-value clickable" @click="showTrendChart">{{ analysisResult.pointName }}</span>
        </div>
      </div>

      <!-- 趋势分析图表弹窗 -->
      <el-dialog v-model="chartDialogVisible" title="趋势分析图表" :close-on-click-modal="true" destroy-on-close
        class="trend-chart-dialog" @opened="onTrendDialogOpened" @closed="onTrendDialogClosed" append-to-body>
        <template #header>
          <div class="trend-chart-dialog-header">
            <span class="el-dialog__title trend-chart-title">趋势分析图表</span>
          </div>
        </template>
        <div class="trend-charts-container">
          <div class="chart-wrapper">
            <div ref="dbChartRef" class="chart-box"></div>
          </div>
          <div class="chart-wrapper">
            <div ref="densityChartRef" class="chart-box"></div>
          </div>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'
import { enableMouseWheelZoomForCharts, connectCharts } from '@/utils/chart'
import { handleDatePickerChange } from '@/utils/datetime'
import { getPointMessage, getTrendAnalysis, type PointMessageGroupItem } from '@/api/modules/hardware'

interface PointInfo {
  id: string
  name: string
}

export type DateRange = [string, string] | null

const props = withDefaults(defineProps<{
  pointList: PointInfo[]
  selectedPointId?: string
  /** light 用于白底弹窗，dark 用于深色卡片 */
  theme?: 'light' | 'dark'
}>(), {
  selectedPointId: '',
  theme: 'dark'
})

const themeClass = computed(() => `trend-analysis-panel--${props.theme}`)

const pointList = computed(() => props.pointList || [])

const pointLoading = ref(false)
const pointGroups = ref<PointMessageGroupItem[]>([])

const receiverIdToPointIdMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const g of pointGroups.value) {
    const list = Array.isArray(g.checkPointDtos) ? g.checkPointDtos : []
    for (const pt of list) {
      const receiverId = pt?.receiverId != null ? String(pt.receiverId) : ''
      const pointId = pt?.id != null ? String(pt.id) : ''
      if (receiverId && pointId) map[receiverId] = pointId
    }
  }
  return map
})

type TreeNode = {
  value: string
  label: string
  disabled?: boolean
  children?: TreeNode[]
}

const treeSelectProps = {
  value: 'value',
  label: 'label',
  children: 'children',
  disabled: 'disabled',
} as const

const filterPointNode = (keyword: string, data: TreeNode) => {
  if (!keyword) return true
  const k = keyword.trim().toLowerCase()
  return String(data.label ?? '').toLowerCase().includes(k)
}

const fetchPointGroups = async () => {
  const tenantId = localStorage.getItem('tenantId') ?? ''
  if (!tenantId) return
  try {
    pointLoading.value = true
    const res = await getPointMessage({
      filterPropertyMap: [{ code: 'tenantId', operate: 'EQ', value: tenantId }],
      pageIndex: 0,
      pageSize: 1000,
    })
    if (res?.rc === 0 && res?.ret?.items) {
      pointGroups.value = Array.isArray(res.ret.items) ? res.ret.items : []
    } else {
      pointGroups.value = []
    }
  } catch (e) {
    pointGroups.value = []
  } finally {
    pointLoading.value = false
  }
}

const resolvedPointList = computed<PointInfo[]>(() => {
  if (pointGroups.value.length) {
    const flat: PointInfo[] = []
    for (const g of pointGroups.value) {
      const list = Array.isArray(g.checkPointDtos) ? g.checkPointDtos : []
      for (const pt of list) {
        if (pt?.id == null) continue
        flat.push({ id: String(pt.id), name: String(pt.pointName ?? '') })
      }
    }
    return flat.filter((p) => p.id && p.name)
  }
  return pointList.value
})

const analysisForm = ref({
  pointIds: [] as string[],
  days: 1,
  dateRange: null as DateRange
})

const analysisResult = ref({
  deviation: '',
  pointName: ''
})

const handleCalendarChange = (val: [Date, Date] | null) => {
  const result = handleDatePickerChange(val)
  if (result) {
    analysisForm.value.dateRange = result
  }
}

// 根据声音点位页当前点位，自动设置默认选中点位
watch(
  () => ({
    selectedId: props.selectedPointId,
    list: resolvedPointList.value,
    receiverMap: receiverIdToPointIdMap.value
  }),
  (payload) => {
    const selectedId = payload?.selectedId
    const list = payload?.list ?? []
    const receiverMap = payload?.receiverMap ?? {}
    // 如果已经手动选过点位，就不再自动覆盖
    if (analysisForm.value.pointIds.length > 0) return

    const rawIdStr = selectedId ? String(selectedId) : ''
    // 路由 query 的 pointId 在声音点位页里往往是 receiverId，这里先尝试映射到真实 pointId（checkPointDtos.id）
    const resolvedIdStr = receiverMap[rawIdStr] || rawIdStr
    const exists = resolvedIdStr && list.some((p) => String(p.id) === resolvedIdStr)

    if (exists) {
      analysisForm.value.pointIds = [resolvedIdStr]
    } else if (Array.isArray(list) && list.length > 0 && list[0]?.id != null) {
      // 声音点位页没有给，或者给的 ID 不在当前列表里，则退回列表第一个
      analysisForm.value.pointIds = [String(list[0].id)]
    }
  },
  { immediate: true, deep: true }
)

const pointTreeData = computed<TreeNode[]>(() => {
  if (pointGroups.value.length) {
    return pointGroups.value
      .map((g, groupIndex) => {
        const children = (Array.isArray(g.checkPointDtos) ? g.checkPointDtos : [])
          .filter((pt) => pt?.id != null && String(pt.pointName ?? '').trim())
          .map((pt) => ({
            value: String(pt.id),
            label: String(pt.pointName ?? ''),
          }))
        if (children.length === 0) return null
        return {
          value: `group-${groupIndex}`,
          label: String(g.groupName ?? `分组${groupIndex + 1}`),
          children,
        } as TreeNode
      })
      .filter(Boolean) as TreeNode[]
  }

  return (pointList.value || [])
    .filter((p) => p?.id && String(p.name ?? '').trim())
    .map((p) => ({ value: String(p.id), label: String(p.name ?? '') }))
})

// 图表弹窗相关
const chartDialogVisible = ref(false)
const dbChartRef = ref<HTMLDivElement>()
const densityChartRef = ref<HTMLDivElement>()
let dbChart: echarts.ECharts | null = null
let densityChart: echarts.ECharts | null = null

// 存储趋势分析数据用于图表展示
const trendAnalysisData = ref<any[]>([])

const showTrendChart = () => {
  if (trendAnalysisData.value.length === 0) {
    ElMessage.warning('暂无趋势分析数据')
    return
  }
  chartDialogVisible.value = true
}

const onTrendDialogOpened = () => {
  nextTick(() => {
    setTimeout(() => {
      initTrendChart()
      if (dbChart && densityChart) {
        connectCharts([dbChart, densityChart])
        enableMouseWheelZoomForCharts([dbChart, densityChart])
        nextTick(() => {
          dbChart?.resize()
          densityChart?.resize()
        })
      }
    }, 50)
  })
}

const onTrendDialogClosed = () => {
  if (dbChart) {
    dbChart.dispose()
    dbChart = null
  }
  if (densityChart) {
    densityChart.dispose()
    densityChart = null
  }
}

// 计算dB最大差值信息
const calcDbMaxDiff = (totalArr: any[], xArr: any[]) => {
  const diffInfo = { diff: 0, freq: '', index: -1, maxValue: 0, minValue: 0 }
  if (!totalArr.length || !xArr.length) return diffInfo
  for (let xIndex = 0; xIndex < xArr.length; xIndex++) {
    const currentFreq = xArr[xIndex]
    const dbValues: number[] = []
    for (let groupIndex = 0; groupIndex < totalArr.length; groupIndex++) {
      const dbValue = totalArr[groupIndex].dbArr?.[xIndex]
      if (dbValue != null && !isNaN(Number(dbValue))) dbValues.push(Number(dbValue))
    }
    if (dbValues.length < 2) continue
    const currentMax = Math.max(...dbValues)
    const currentMin = Math.min(...dbValues)
    const currentDiff = currentMax - currentMin
    if (currentDiff > diffInfo.diff) {
      diffInfo.diff = currentDiff
      diffInfo.freq = currentFreq
      diffInfo.index = xIndex
      diffInfo.maxValue = currentMax
      diffInfo.minValue = currentMin
    }
  }
  return diffInfo
}

// 更新tooltip格式化器
const updateDbEchartsTooltip = (option: any, totalArr: any[], xArr: any[]) => {
  option.tooltip = {
    ...option.tooltip,
    hideDelay: 10000,
    formatter: (params: any) => {
      if (!params || !params.length) return ''
      const xIndex = params[0].dataIndex
      const currentFreq = xArr[xIndex] || '未知频率'
      const dbValues: number[] = []
      for (let groupIndex = 0; groupIndex < totalArr.length; groupIndex++) {
        const dbValue = totalArr[groupIndex].dbArr?.[xIndex]
        if (dbValue != null && !isNaN(Number(dbValue))) dbValues.push(Number(dbValue))
      }
      const diffInfo = calcDbMaxDiff(totalArr, xArr)
      const maxDiffText = diffInfo.index === xIndex
        ? `<div style="margin-top:6px;color:#F56C6C;">最大差值：${diffInfo.diff.toFixed(2)}（频率：${diffInfo.freq}）</div>`
        : ''
      let html = `<div style="font-weight:600;margin-bottom:6px;">频率：${currentFreq}</div>`
      for (const p of params) {
        html += `<div style="margin:2px 0;">${p.marker}${p.seriesName}：${Number(p.data).toFixed(2)} dB</div>`
      }
      html += maxDiffText
      return html
    }
  }
}

// 初始化趋势分析图表（从原 ChartsAnalysisModule 迁移）
const initTrendChart = () => {
  if ((!dbChartRef.value && !densityChartRef.value) || trendAnalysisData.value.length === 0) return

  const totalArr = trendAnalysisData.value || []
  const xArr = totalArr[0]?.xArr || totalArr[0]?.freqArr || totalArr[0]?.xAxis || []

  // dB 图表
  if (dbChartRef.value) {
    dbChart = echarts.init(dbChartRef.value)
    const finallyDbArr = totalArr.map((item: any, index: number) => ({
      name: item.name ?? `组${index + 1}`,
      type: 'line',
      data: item.dbArr ?? item.dbArray ?? [],
      smooth: true,
      symbol: 'circle',
      symbolSize: 1,
      lineStyle: { width: 2.5, shadowBlur: 3, shadowColor: 'rgba(0,0,0,0.2)' },
      itemStyle: { borderWidth: 2, borderColor: '#ffffff', shadowBlur: 4, shadowColor: 'rgba(0,0,0,0.3)' }
    }))
    const dbOption: any = {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 40, right: 20, top: 30, bottom: 40 },
      xAxis: { type: 'category', data: xArr },
      yAxis: { type: 'value', name: 'dB' },
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, height: 20 }],
      series: finallyDbArr
    }
    updateDbEchartsTooltip(dbOption, totalArr, xArr)
    dbChart.setOption(dbOption)
  }

  // 密度图表
  if (densityChartRef.value) {
    densityChart = echarts.init(densityChartRef.value)
    const finallyDensityArr = totalArr.map((item: any, index: number) => ({
      name: item.name ?? `组${index + 1}`,
      type: 'line',
      data: item.densityArr ?? item.densityArray ?? [],
      smooth: true,
      symbol: 'circle',
      symbolSize: 1,
      lineStyle: { width: 2.5, shadowBlur: 3, shadowColor: 'rgba(0,0,0,0.2)' },
      itemStyle: { borderWidth: 2, borderColor: '#ffffff', shadowBlur: 4, shadowColor: 'rgba(0,0,0,0.3)' }
    }))
    const densityOption: any = {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 40, right: 20, top: 30, bottom: 40 },
      xAxis: { type: 'category', data: xArr },
      yAxis: { type: 'value', name: '密度' },
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, height: 20 }],
      series: finallyDensityArr
    }
    densityChart.setOption(densityOption)
  }
}

const analyzeTrend = async () => {
  if (!analysisForm.value.pointIds.length) {
    ElMessage.warning('请选择点位')
    return
  }
  if (!analysisForm.value.dateRange || analysisForm.value.dateRange.length !== 2) {
    ElMessage.warning('请选择时间范围')
    return
  }
  try {
    const startTime = new Date(analysisForm.value.dateRange[0]).getTime()
    const endTime = new Date(analysisForm.value.dateRange[1]).getTime()
    const currentTime = Date.now()
    const tenantId = localStorage.getItem('tenantId') ?? '2b410e834b4b4ae49ab8d52f6d49e967'
    const pointIdNums = analysisForm.value.pointIds
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n))
    if (pointIdNums.length === 0) {
      ElMessage.warning('点位ID无效')
      return
    }
    const params = {
      tenantId,
      time: currentTime,
      startTime: startTime,
      pointIdList: pointIdNums,
      type: 1,
      days: analysisForm.value.days
    }
    const response = await getTrendAnalysis(params)
    if (response.rc === 0 && response.ret && response.ret.length > 0) {
      const first = response.ret[0]
      if (first) {
        analysisResult.value.deviation = first.value?.toString?.() ?? ''
        analysisResult.value.pointName =
          response.ret.length > 1 ? `已选 ${response.ret.length} 个点位` : (first.pointName ?? '')
        trendAnalysisData.value = first.list || []
        ElMessage.success('趋势分析完成')
      } else {
        ElMessage.error('趋势分析返回数据格式错误')
      }
    } else {
      ElMessage.error('趋势分析失败: ' + (response.err || '未知错误'))
    }
  } catch (e) {
    console.error('趋势分析请求失败:', e)
    ElMessage.error('趋势分析请求失败')
  }
}

onMounted(() => {
  void fetchPointGroups()
})

onUnmounted(() => {
  onTrendDialogClosed()
})
</script>

<style scoped lang="scss">
.trend-analysis-panel {
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;

  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    flex: 0 0 auto;
  }

  .module-title {
    font-weight: 500;
    font-size: 1rem;
  }

  .module-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .analysis-form {
    .form-row {
      display: flex;
      gap: 10px;
    }
  }

  .analysis-result {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid;

    .result-row {
      display: flex;
      justify-content: flex-start;
      margin-bottom: 8px;
      gap: 6px;
    }

    .result-label,
    .result-value {
      font-size: 0.8rem;
      font-weight: 500;
    }

    .result-value.clickable {
      cursor: pointer;
      text-decoration: underline;
    }
  }
}

.trend-analysis-panel--dark {
  background: url('@/assets/images/background/设备详情页-echarts背景.png') no-repeat center center;
  background-size: 100% 100%;

  .module-title {
    color: #fff;
  }

  :deep(.el-form-item__label),
  .analysis-result .result-label,
  .analysis-result .result-value {
    color: #fff;
  }

  .analysis-result {
    border-top-color: #e4e7ed;
  }
}

.trend-analysis-panel--light {
  background: #fff;
  border: 1px solid #ebeef5;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);

  .module-title {
    color: #303133;
  }

  :deep(.el-form-item__label),
  .analysis-result .result-label,
  .analysis-result .result-value {
    color: #606266;
  }

  .analysis-result {
    border-top-color: #ebeef5;
  }

  .analysis-result .result-value.clickable:hover {
    color: var(--el-color-primary);
  }

  /* 点位选择（多选下拉）已选标签文字统一为灰色 */
  :deep(.trend-analysis-panel--light .el-form-item__content .el-select .el-tag__content),
  :deep(.trend-analysis-panel--light .el-form-item__content .el-select .el-select__tags-text) {
    color: grey !important;
  }

  :deep(.el-tag)
  {
    color: grey !important;
  }
}

/* 下拉面板是 append-to-body，需要全局选择器命中 */
:global(.trend-point-tree-popper) {
  color: grey;
}
:global(.trend-point-tree-popper .el-tree-node__label),
:global(.trend-point-tree-popper .el-tree-node__content),
:global(.trend-point-tree-popper .el-checkbox__label),
:global(.trend-point-tree-popper .el-select-dropdown__item),
:global(.trend-point-tree-popper .el-tree-select__label) {
  color: grey !important;
}
</style>

