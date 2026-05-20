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
