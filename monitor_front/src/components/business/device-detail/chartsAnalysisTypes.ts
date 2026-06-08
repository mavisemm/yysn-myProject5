export type ChartsAnalysisViewKey =
  | 'svt-trend'
  | 'spectrum'
  | 'sound-trend'
  | 'vibration-analysis'
  | 'waterfall'

export interface ChartsAnalysisTab {
  id: string
  viewKey: ChartsAnalysisViewKey
  receiverId: string
  pointName: string
  label: string
}

export interface ChartsAnalysisSessionPayload {
  receiverId: string
  viewKey: ChartsAnalysisViewKey
}

export const CHARTS_ANALYSIS_VIEW_META: Record<
  ChartsAnalysisViewKey,
  { label: string; shortLabel: string }
> = {
  'svt-trend': { label: '声振温趋势图', shortLabel: '声振温' },
  spectrum: { label: '声音+振动频谱图', shortLabel: '频谱' },
  'sound-trend': { label: '声音趋势分析', shortLabel: '声音趋势' },
  'vibration-analysis': { label: '振动分析', shortLabel: '振动分析' },
  waterfall: { label: '瀑布图', shortLabel: '瀑布图' },
}

export function buildChartsAnalysisTabId(viewKey: ChartsAnalysisViewKey, receiverId: string): string {
  return `${viewKey}::${receiverId}`
}
