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
      <el-dialog
        v-model="chartDialogVisible"
        title="趋势分析图表"
        width="70vw"
        align-center
        modal-class="trend-chart-dialog-modal"
        :close-on-click-modal="true"
        destroy-on-close
        class="trend-chart-dialog"
        @opened="onTrendDialogOpened"
        @closed="onTrendDialogClosed"
        append-to-body
      >
        <template #header>
          <div class="trend-chart-dialog-header">
            <span class="el-dialog__title trend-chart-title">趋势分析图表</span>
          </div>
        </template>
        <div class="trend-charts-container">
          <div class="chart-wrapper">
            <div class="chart-title" style="text-align: center; font-size: 18px; font-weight: 500;">能量曲线图</div>
            <div class="chart-box" style="width: 100%; height: 300px;">
              <CommonEcharts
                :option="dbChartOption"
                :not-merge="true"
                :tooltip-follow-mouse="false"
                linkage-group="trend-analysis-charts"
                :enable-linkage-zoom="true"
                :enable-wheel-zoom="true"
                :show-range-controls="true"
                range-controls-label="频率范围："
                range-controls-unit="Hz"
                :range-controls-data="trendXAxisData"
                :range-controls-step="0.0001"
                :range-controls-precision="4"
              />
            </div>
          </div>
          <div class="chart-wrapper">
            <div class="chart-title" style="text-align: center; font-size: 18px; font-weight: 500;">密度曲线图</div>
            <div class="chart-box" style="width: 100%; height: 300px;">
              <CommonEcharts
                :option="densityChartOption"
                :not-merge="true"
                :tooltip-follow-mouse="false"
                linkage-group="trend-analysis-charts"
                :enable-linkage-zoom="true"
                :enable-wheel-zoom="true"
              />
            </div>
          </div>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'
import { CommonEcharts } from '@/components/common/chart'
import { handleDatePickerChange } from '@/utils/datetime'
import { getPointMessage, getTrendAnalysis, type PointMessageGroupItem, type TrendAnalysisItem } from '@/api/modules/hardware'

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
const dbChartOption = ref<any>({})
const densityChartOption = ref<any>({})
const trendXAxisData = ref<Array<string | number>>([])

// 存储趋势分析数据用于图表展示
const trendAnalysisData = ref<any[]>([])

type TrendChartGroup = {
  name: string
  xArr: string[]
  dbArr: Array<number | null>
  densityArr: Array<number | null>
}

// 调试用：当接口无有效数据时，用一组假数据先看效果
const buildMockTrendChartGroups = (): TrendChartGroup[] => {
  const xArr = ['1.0000', '2.0000', '3.0000', '4.0000', '5.0000']
  return [
    {
      name: '2026-03-13 10:00:00',
      xArr,
      dbArr: [10, 12, 18, 16, 14],
      densityArr: [0.1, 0.12, 0.2, 0.18, 0.15],
    },
    {
      name: '2026-03-13 11:00:00',
      xArr,
      dbArr: [9, 11, 15, 17, 13],
      densityArr: [0.09, 0.11, 0.18, 0.19, 0.14],
    },
  ]
}

const getAvgFreqDtos = (row: any): any[] => {
  const candidates = [
    row?.avgFrequencyDtoList,
    row?.soundAvgFrequencyDtoList,
    row?.soundFrequencyDtoList,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
  }
  return []
}

const buildTrendChartGroups = (list: TrendAnalysisItem[] | any[]): TrendChartGroup[] => {
  const rows = Array.isArray(list) ? list : []
  if (rows.length === 0) return []

  // X 轴默认取第一条的频段结构（假设各 time 下频段一致）
  const firstDtos = getAvgFreqDtos(rows[0] as any)
  const xArr = firstDtos.map((dto: any) => {
    const f1 = Number(dto?.freq1 ?? 0)
    const f2 = Number(dto?.freq2 ?? 0)
    const x = Math.sqrt(Math.max(0, f1) * Math.max(0, f2))
    return Number.isFinite(x) ? x.toFixed(4) : ''
  }).filter((x: string) => x !== '')

  return rows.map((row: any, index: number) => {
    const dtos = getAvgFreqDtos(row)
    const dbArr = dtos.map((dto: any) => {
      const v = dto?.db
      const n = v == null ? NaN : Number(v)
      return Number.isFinite(n) ? n : null
    })
    const densityArr = dtos.map((dto: any) => {
      const v = dto?.density
      const n = v == null ? NaN : Number(v)
      return Number.isFinite(n) ? n : null
    })
    let nameRaw = row?.time != null ? String(row.time) : `组${index + 1}`
    const parsed = dayjs(nameRaw)
    if (parsed.isValid()) {
      nameRaw = parsed.format('YYYY-MM-DD HH:mm:ss')
    }
    return { name: nameRaw, xArr, dbArr, densityArr }
  })
}

const showTrendChart = () => {
  if (trendAnalysisData.value.length === 0) {
    ElMessage.warning('暂无趋势分析数据')
    return
  }
  chartDialogVisible.value = true
}

const onTrendDialogOpened = () => {
  nextTick(() => {
    // 等弹窗完全展开后再初始化和 resize，避免容器高度为 0
    setTimeout(() => {
      buildTrendChartOptions()
    }, 200)
  })
}

const onTrendDialogClosed = () => {
  // CommonEcharts 会自行 dispose；这里仅清空 option，避免下次打开残留旧数据
  dbChartOption.value = {}
  densityChartOption.value = {}
  trendXAxisData.value = []
}

// 生成按时间渐变的颜色：由黄 -> 红（用 HSL 插值避免中段发灰）
const generateTimeGradientColors = (totalCount: number): string[] => {
  const colors: string[] = []
  const count = Math.max(totalCount, 1)
  const denom = Math.max(1, count - 1)

  // 起始：黄色（更亮），终止：红色
  const start = { r: 255, g: 206, b: 86 } // #FFCE56
  const end = { r: 245, g: 108, b: 108 }  // #F56C6C

  const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min
    let h = 0
    let s = 0
    const l = (max + min) / 2
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1))
      switch (max) {
        case r:
          h = ((g - b) / d) % 6
          break
        case g:
          h = (b - r) / d + 2
          break
        default:
          h = (r - g) / d + 4
          break
      }
      h *= 60
      if (h < 0) h += 360
    }
    return { h, s, l }
  }
  const hslToRgb = (h: number, s: number, l: number) => {
    const c = (1 - Math.abs(2 * l - 1)) * s
    const hp = (h % 360) / 60
    const x = c * (1 - Math.abs((hp % 2) - 1))
    let r1 = 0, g1 = 0, b1 = 0
    if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0]
    else if (hp < 2) [r1, g1, b1] = [x, c, 0]
    else if (hp < 3) [r1, g1, b1] = [0, c, x]
    else if (hp < 4) [r1, g1, b1] = [0, x, c]
    else if (hp < 5) [r1, g1, b1] = [x, 0, c]
    else [r1, g1, b1] = [c, 0, x]
    const m = l - c / 2
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    }
  }

  const startHsl = rgbToHsl(start.r, start.g, start.b)
  const endHsl = rgbToHsl(end.r, end.g, end.b)

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  // Hue 走最短路径插值，避免绕一圈
  const lerpHue = (h1: number, h2: number, t: number) => {
    let delta = ((h2 - h1 + 540) % 360) - 180
    return (h1 + delta * t + 360) % 360
  }

  for (let i = 0; i < count; i++) {
    const t = i / denom
    const h = lerpHue(startHsl.h, endHsl.h, t)
    // 保持较高饱和度，避免中段灰；同时让亮度从黄到略暗蓝略微下降
    const s = clamp01(lerp(Math.max(startHsl.s, 0.85), Math.max(endHsl.s, 0.85), t))
    const l = clamp01(lerp(startHsl.l, endHsl.l, t))
    const { r, g, b } = hslToRgb(h, s, l)
    colors.push(`rgb(${r}, ${g}, ${b})`)
  }
  return colors
}

type DbMaxDiffInfo = {
  diff: number
  freq: string
  index: number
  maxValue: number
  minValue: number
}

const calcDbMaxDiff = (groups: TrendChartGroup[], xArr: string[]): DbMaxDiffInfo => {
  const diffInfo: DbMaxDiffInfo = {
    diff: 0,
    freq: '',
    index: -1,
    maxValue: 0,
    minValue: 0
  }
  if (!groups.length || !xArr.length) return diffInfo

  for (let xIndex = 0; xIndex < xArr.length; xIndex++) {
    const currentFreq = xArr[xIndex] ?? ''
    const dbValues: number[] = []
    for (let gIndex = 0; gIndex < groups.length; gIndex++) {
      const grp = groups[gIndex]
      const dbArr = (grp && Array.isArray(grp.dbArr) ? grp.dbArr : []) as Array<number | null>
      const dbValue = dbArr[xIndex]
      if (dbValue != null && !Number.isNaN(Number(dbValue))) {
        dbValues.push(Number(dbValue))
      }
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

// 能量曲线 tooltip：显示当前频点的差值 + 高亮最大值曲线
const updateDbEchartsTooltip = (option: any, xArr: string[], groups: TrendChartGroup[]) => {
  option.tooltip = {
    ...option.tooltip,
    hideDelay: 10000,
    formatter: (params: any[]) => {
      if (!params || !params.length) return ''

      const xIndex = params[0].dataIndex
      const currentFreq = xArr[xIndex] || '未知'

      const dbValues: number[] = []
      for (let gIndex = 0; gIndex < groups.length; gIndex++) {
        const grp = groups[gIndex]
        const dbArr = (grp && Array.isArray(grp.dbArr) ? grp.dbArr : []) as Array<number | null>
        const dbValue = dbArr[xIndex]
        if (dbValue != null && !Number.isNaN(Number(dbValue))) {
          dbValues.push(Number(dbValue))
        }
      }

      let currentDiffStr = '当前差值：无有效数据'
      let currentMax: number | null = null
      if (dbValues.length >= 2) {
        currentMax = Math.max(...dbValues)
        const currentMin = Math.min(...dbValues)
        const currentDiff = currentMax - currentMin
        currentDiffStr =
          `当前差值：${currentDiff.toFixed(4)}<br/>` +
          `最大值：${currentMax.toFixed(4)}<br/>` +
          `最小值：${currentMin.toFixed(4)}`
      }

      let tooltipContent = ''
      tooltipContent += currentDiffStr
      tooltipContent += `<br/><hr style="border: none; border-top: 1px solid #ccc; margin: 6px 0;"/>`
      tooltipContent += `频率：${currentFreq}Hz<br/>`

      for (const item of params) {
        const colorCircle =
          `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:4px;"></span>`
        const isMaxValue =
          currentMax !== null && Math.abs(Number(item.data) - currentMax) < 0.0001
        if (isMaxValue) {
          tooltipContent +=
            `${colorCircle}<span style="color:#ff6a6a;font-size:16px;font-weight:500;">` +
            `${item.seriesName}：${item.data ?? '无数据'}</span><br/>`
        } else {
          tooltipContent += `${colorCircle}${item.seriesName}：${item.data ?? '无数据'}<br/>`
        }
      }

      return tooltipContent
    }
  }
}

// 密度曲线 tooltip：保持原先简单格式
const updateTrendTooltip = (option: any, xArr: any[]) => {
  option.tooltip = {
    ...option.tooltip,
    hideDelay: 10000,
    formatter: (params: any) => {
      if (!params || !params.length) return ''
      const xIndex = params[0].dataIndex
      const currentFreq = xArr[xIndex] || '未知'
      let html = `<div style="font-weight:600;margin-bottom:6px;">频率：${currentFreq}Hz</div>`
      for (const p of params) {
        html += `<div style="margin:2px 0;">${p.marker}${p.seriesName}：${Number(p.data).toFixed(2)}</div>`
      }
      return html
    }
  }
}

// 初始化趋势分析图表（从原 ChartsAnalysisModule 迁移）
const buildTrendChartOptions = () => {
  // 如果接口还没返回有效数据，先用一组假数据渲染出来方便确认样式
  const totalArr: TrendChartGroup[] = (trendAnalysisData.value && trendAnalysisData.value.length > 0)
    ? (trendAnalysisData.value as TrendChartGroup[])
    : buildMockTrendChartGroups()
  const xArr = totalArr[0]?.xArr || (totalArr as any)[0]?.freqArr || (totalArr as any)[0]?.xAxis || []
  trendXAxisData.value = Array.isArray(xArr) ? xArr : []

  // 生成按时间渐变的颜色映射（时间越新颜色越亮）
  const sortedByTime = [...totalArr].sort((a, b) => {
    const ta = dayjs(a.name ?? '').valueOf()
    const tb = dayjs(b.name ?? '').valueOf()
    return tb - ta
  })
  const timeGradientColors = generateTimeGradientColors(sortedByTime.length)
  const colorMap: Record<string, string> = {}
  sortedByTime.forEach((g, idx) => {
    const key = typeof g.name === 'string' && g.name ? g.name : `组${idx + 1}`
    colorMap[key] = timeGradientColors[idx]!
  })

  const dbMaxDiffInfo = calcDbMaxDiff(totalArr, xArr)

  const finallyDbArr = totalArr.map((item: TrendChartGroup, index: number) => {
    const seriesKey = typeof item.name === 'string' && item.name ? item.name : `组${index + 1}`
    const color = colorMap[seriesKey] || timeGradientColors[index] || '#3ba272'
    return {
      name: seriesKey,
      type: 'line',
      data: item.dbArr ?? [],
      smooth: true,
      symbol: 'circle',
      symbolSize: 1,
      lineStyle: { width: 2.5, shadowBlur: 3, shadowColor: 'rgba(0,0,0,0.2)', color },
      itemStyle: { borderWidth: 2, borderColor: '#ffffff', shadowBlur: 4, shadowColor: 'rgba(0,0,0,0.3)', color }
    }
  })
  const nextDbOption: any = {
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    grid: { left: 60, right: 35, top: 30, bottom: 60 },
    xAxis: { type: 'category', data: xArr },
    // 保留 y 轴刻度与坐标，只去掉 “dB” 文本
    yAxis: {
      type: 'value',
      name: ''
    },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, height: 20 }],
    series: finallyDbArr
  }

  // 在“xx Hz 时最大差值”位置打一个标记点
  if (dbMaxDiffInfo.index !== -1 && Array.isArray(nextDbOption.series) && nextDbOption.series.length > 0) {
    const firstSeries = nextDbOption.series[0]
    firstSeries.markPoint = {
      enabled: true,
      symbol: 'pin',
      symbolSize: 15,
      z: 10,
      label: {
        show: true,
        formatter: `${dbMaxDiffInfo.freq}Hz最大差值\n${dbMaxDiffInfo.diff.toFixed(4)}`,
        color: 'grey',
        fontSize: 12,
        fontWeight: 'bold',
        position: 'top'
      },
      itemStyle: {
        color: '#f56954',
        borderColor: '#fff',
        borderWidth: 2
      },
      data: [
        {
          name: `@${dbMaxDiffInfo.freq}Hz`,
          xAxis: dbMaxDiffInfo.index,
          yAxis: dbMaxDiffInfo.maxValue,
          value: dbMaxDiffInfo.diff.toFixed(4)
        }
      ]
    }
  }

  updateDbEchartsTooltip(nextDbOption, xArr, totalArr)
  dbChartOption.value = nextDbOption

  // 密度图表
  const finallyDensityArr = totalArr.map((item: TrendChartGroup, index: number) => {
    const seriesKey = typeof item.name === 'string' && item.name ? item.name : `组${index + 1}`
    const color = colorMap[seriesKey] || timeGradientColors[index] || '#5470c6'
    return {
      name: seriesKey,
      type: 'line',
      data: item.densityArr ?? [],
      smooth: true,
      symbol: 'circle',
      symbolSize: 1,
      lineStyle: { width: 2.5, shadowBlur: 3, shadowColor: 'rgba(0,0,0,0.2)', color },
      itemStyle: { borderWidth: 2, borderColor: '#ffffff', shadowBlur: 4, shadowColor: 'rgba(0,0,0,0.3)', color }
    }
  })
  const nextDensityOption: any = {
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    grid: { left: 60, right: 35, top: 30, bottom: 60 },
    xAxis: { type: 'category', data: xArr },
    yAxis: { type: 'value', name: '密度' },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, height: 20 }],
    series: finallyDensityArr
  }
  updateTrendTooltip(nextDensityOption, xArr)
  densityChartOption.value = nextDensityOption
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
        const list = Array.isArray((first as any)?.list) ? (first as any).list : []
        // 兼容后端直接把 avgFrequencyDtoList 挂在外层（无 list）的情况
        const normalizedList = list.length > 0 ? list : (getAvgFreqDtos(first).length > 0 ? [first] : [])
        trendAnalysisData.value = buildTrendChartGroups(normalizedList)
        ElMessage.success('趋势分析完成')
        // 若弹窗已打开，立即刷新图表 option（包含能量图下方的筛选范围）
        if (chartDialogVisible.value) {
          buildTrendChartOptions()
        }
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
/* 弹窗是 append-to-body，需要全局选择器设置图表容器高度，否则 echarts 0 高度不渲染 */
/* 弹窗水平/垂直居中，并限制在可视窗口内（避免小屏溢出） */
:global(.trend-chart-dialog) {
  /* 不要覆盖 Element Plus 默认的水平居中（margin: ... auto） */
  margin: auto !important;
  max-width: calc(100vw - 32px);
  /* 不在弹窗内部滚动：超出时交给外层遮罩滚动 */
  max-height: unset;
}
/* 外层滚动条（在弹窗外面） */
:global(.trend-chart-dialog-modal) {
  overflow: auto;
  padding: 16px;
  box-sizing: border-box;
}
:global(.trend-chart-dialog-modal .el-overlay-dialog) {
  min-height: calc(100vh - 32px);
}
::global(.trend-chart-dialog .trend-charts-container) {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;
  min-height: 360px;
}
::global(.trend-chart-dialog .chart-wrapper) {
  min-width: 0;
  min-height: 0;
}
::global(.trend-chart-dialog .chart-box) {
  width: 100%;
  height: 300px;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #303133;
  text-align: center;
}

@media (max-width: 980px) {
  ::global(.trend-chart-dialog .trend-charts-container) {
    grid-template-columns: 1fr;
  }
  ::global(.trend-chart-dialog .chart-box) {
    height: 300px;
  }
}
</style>

