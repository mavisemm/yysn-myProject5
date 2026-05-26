/** Y 轴刻度：最多保留两位小数并去掉无意义尾随 0 */
export function formatChartYAxisTick2(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(2)))
}

/** Y 轴刻度：固定保留五位小数（用于需要展示更高精度的图表） */
export function formatChartYAxisTick5(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(5)
}
