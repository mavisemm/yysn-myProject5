import { computed, type Ref } from 'vue'
import type { VibrationAxis } from '@/api/modules/device'
import type { DeviceNode } from '@/types/device'
import { resolvePointDeviceIdFromTree as resolvePointDeviceIdFromTreeImpl } from '@/utils/deviceTreePoint'

export const VIBRATION_AXIS_OPTIONS: { label: string; value: VibrationAxis }[] = [
  { label: 'X轴(A)', value: 'X' },
  { label: 'Y轴(H)', value: 'Y' },
  { label: 'Z轴(V)', value: 'Z' },
]

export function vibrationAxisLabel(axis: VibrationAxis): string {
  return VIBRATION_AXIS_OPTIONS.find((o) => o.value === axis)?.label ?? `${axis}轴`
}

/** 振动分析页图表标题中的轴向标识，与表格/轴切换一致：X(A)、Y(H)、Z(V) */
const AXIS_DIRECTION: Record<VibrationAxis, string> = { X: 'A', Y: 'H', Z: 'V' }

/** 振动分析页：固定单轴图表标题（不含点位名，点位名在区块标题展示） */
export function vibrationAnalysisChartTitle(
  _pointName: string,
  axis: VibrationAxis,
  kind: 'freq' | 'time',
): string {
  const dir = AXIS_DIRECTION[axis] ?? ''
  const suffix = kind === 'freq' ? '振动速度频域图' : '振动速度时域图'
  return dir ? `${axis}轴（${dir}）${suffix}` : `${axis}轴${suffix}`
}

export function resolvePointDeviceIdFromTree(treeData: DeviceNode[], receiverId: string): string {
  return resolvePointDeviceIdFromTreeImpl(treeData, receiverId)
}

export function useVibrationInlineChartTheme(
  inlineChartTheme: Ref<'dark' | 'light'>,
  fullscreenUiActive: Ref<boolean>,
) {
  const chartAxisColor = computed(() => {
    if (fullscreenUiActive.value) return '#fff'
    return inlineChartTheme.value === 'light' ? '#303133' : '#fff'
  })
  const chartSplitLineColor = computed(() => {
    if (fullscreenUiActive.value) return 'rgba(255,255,255,0.1)'
    return inlineChartTheme.value === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)'
  })
  return { chartAxisColor, chartSplitLineColor }
}
