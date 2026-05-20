import type { EChartsOption } from 'echarts'
import type { DeviceTrendChartData } from './deviceDetailTypes'

export const DEVICE_TREND_COLORS = {
  temp: '#ff4d4f',
  vib: '#1890ff',
  sound: '#fadb14',
} as const

export type DeviceTrendChartKind = keyof typeof DEVICE_TREND_COLORS

export interface DeviceTrendChartLayout {
  gridBottom: string | number
  gridTop: string | number
  dataZoomBottom: string | number
  dataZoomSliderHeight: string | number
}

export function formatTrendYAxisTick(v: number | string): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(2)))
}

export function extractTrendTimeLabel(dt: string): string {
  if (dt.includes(' ')) return (dt.split(' ')[1] || dt).trim().substring(0, 8)
  if (dt.includes('T')) return (dt.split('T')[1] || dt).substring(0, 8)
  return dt || ''
}

export function normalizeTrendApiList(response: unknown): any[] {
  if (Array.isArray(response)) return response
  const ret = (response as { ret?: unknown })?.ret
  return Array.isArray(ret) ? ret : []
}

function roundAxis(min: number, max: number, step: number) {
  return {
    min: Math.floor(min / step) * step,
    max: Math.ceil(max / step) * step,
  }
}

export function computeTempTrendYAxisRange(dataMin: number, dataMax: number): { min: number; max: number } {
  const span = dataMax - dataMin
  const padding = Math.max(span * 0.1, 2)
  let min = dataMin - padding
  let max = dataMax + padding
  const range = max - min
  const step = range <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(range)))
  return roundAxis(min, max, step)
}

export function computeVibTrendYAxisRange(dataMin: number, dataMax: number): { min: number; max: number } {
  const span = dataMax - dataMin
  const padding = Math.max(span * 0.1, 0.5)
  let min = Math.min(0, dataMin - padding)
  let max = dataMax + padding
  const range = max - min
  const step = range <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(range)))
  const safeStep = step < 0.1 ? 0.1 : step
  return roundAxis(min, max, safeStep)
}

export function computeSoundTrendYAxisRange(dataMin: number, dataMax: number): { min: number; max: number } {
  const span = Math.max(dataMax - dataMin, 1)
  const padding = Math.max(span * 0.1, 2)
  let min = Math.min(0, dataMin - padding)
  let max = dataMax + padding
  const range = max - min
  const step = range <= 0 ? 10 : Math.pow(10, Math.floor(Math.log10(range)))
  const safeStep = step < 1 ? 1 : step
  return roundAxis(min, max, safeStep)
}

const AREA_GRADIENT: Record<DeviceTrendChartKind, [string, string]> = {
  temp: ['rgba(255, 77, 79, 0.5)', 'rgba(255, 77, 79, 0.1)'],
  vib: ['rgba(24, 144, 255, 0.5)', 'rgba(24, 144, 255, 0.1)'],
  sound: ['rgba(250, 219, 20, 0.5)', 'rgba(250, 219, 20, 0.1)'],
}

const ZOOM_FILLER: Record<DeviceTrendChartKind, string> = {
  temp: 'rgba(255, 77, 79, 0.3)',
  vib: 'rgba(24, 144, 255, 0.3)',
  sound: 'rgba(250, 219, 20, 0.3)',
}

const ZOOM_BORDER: Record<DeviceTrendChartKind, string> = {
  temp: 'rgba(255, 77, 79, 0.5)',
  vib: 'rgba(24, 144, 255, 0.5)',
  sound: 'rgba(250, 219, 20, 0.5)',
}

export function buildDeviceTrendChartOption(params: {
  kind: DeviceTrendChartKind
  data: DeviceTrendChartData | null
  layout: DeviceTrendChartLayout
  axisColor: string
  splitLineColor: string
}): EChartsOption {
  const { kind, data, layout, axisColor, splitLineColor } = params
  const color = DEVICE_TREND_COLORS[kind]
  const timeLabels = data?.timeLabels ?? []
  const values = data?.values ?? []
  const yMin = data?.yMin
  const yMax = data?.yMax
  const [areaTop, areaBottom] = AREA_GRADIENT[kind]

  const yAxis: Record<string, unknown> = {
    type: 'value',
    axisLabel: { fontSize: 10, color: axisColor, formatter: formatTrendYAxisTick },
    axisLine: { lineStyle: { color: axisColor } },
    axisTick: { lineStyle: { color: axisColor } },
    splitLine: { lineStyle: { color: splitLineColor } },
    splitNumber: 4,
  }

  if (kind === 'temp') {
    yAxis.scale = true
    Object.assign(
      yAxis,
      yMin != null && yMax != null ? { min: yMin, max: yMax } : { min: 'dataMin', max: 'dataMax' },
    )
  } else {
    if (kind === 'sound') yAxis.scale = true
    if (yMin != null && yMax != null) {
      yAxis.min = yMin
      yAxis.max = yMax
    }
  }

  return {
    tooltip: {
      trigger: 'axis',
      className: 'echarts-tooltip',
      backgroundColor: 'rgba(50,50,50,0.8)',
      borderColor: 'rgba(50,50,50,0.8)',
      textStyle: { color: '#fff' },
    },
    grid: {
      left: '3%',
      right: '6%',
      bottom: layout.gridBottom,
      top: layout.gridTop,
      containLabel: true,
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0], filterMode: 'none' },
      {
        type: 'slider',
        xAxisIndex: [0],
        bottom: layout.dataZoomBottom,
        height: layout.dataZoomSliderHeight,
        fillerColor: ZOOM_FILLER[kind],
        borderColor: ZOOM_BORDER[kind],
        handleStyle: { color },
        filterMode: 'none',
      },
    ],
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: {
        fontSize: 10,
        color: axisColor,
        margin: 8,
        showMaxLabel: true,
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: axisColor }, onZero: false },
      axisTick: { lineStyle: { color: axisColor }, alignWithLabel: true },
    },
    yAxis,
    series: values.length
      ? [
          {
            data: values,
            type: 'line',
            smooth: true,
            symbolSize: 1,
            itemStyle: { color },
            lineStyle: { color, width: 2 },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: areaTop },
                  { offset: 1, color: areaBottom },
                ],
              },
              opacity: 0.3,
            },
          },
        ]
      : [],
    backgroundColor: 'transparent',
  } as EChartsOption
}
