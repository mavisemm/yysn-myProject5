/** 将数值四舍五入到两位小数（用于图表序列数据） */
export function roundChartYValue2(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Number(n.toFixed(2))
}

/** 批量将 Y 轴序列数据保留两位小数 */
export function roundChartYValues2(values: unknown[]): number[] {
  if (!Array.isArray(values)) return []
  return values.map((v) => roundChartYValue2(v))
}

/** Y 轴刻度：固定保留两位小数 */
export function formatChartYAxisTick2(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(2)
}

/** X 轴刻度：固定保留一位小数 */
export function formatChartXAxisTick1(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v ?? '')
  return n.toFixed(1)
}

/** Y 轴刻度：固定保留五位小数（用于需要展示更高精度的图表） */
export function formatChartYAxisTick5(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return n.toFixed(5)
}
