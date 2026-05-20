/** Y 轴刻度：最多保留两位小数并去掉无意义尾随 0 */
export function formatChartYAxisTick2(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Number(n.toFixed(2)))
}
