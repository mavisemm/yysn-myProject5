export interface EchartsPersistentPoint {
  id: string
  x: number
  y: number
}

export interface PersistentPointLabelFormatter {
  formatX: (v: number) => string
  formatY: (v: number) => string
}

export interface PersistentMarkPointStyle {
  activeSymbolSize?: number
  inactiveSymbolSize?: number
  activeColor?: string
  inactiveColor?: string
  borderColor?: string
  borderWidth?: number
}

export const buildPointMarkerId = (x: number, y: number, precision = 6): string =>
  `${x.toFixed(precision)}:${y.toFixed(precision)}`

export const formatPersistentPointLabel = (
  point: EchartsPersistentPoint,
  formatX: (v: number) => string,
  formatY: (v: number) => string,
): string => `x：${formatX(point.x)}\ny：${formatY(point.y)}`

export const upsertPersistentPoint = (
  points: EchartsPersistentPoint[],
  x: number,
  y: number,
  currentId = '',
  idBuilder: (x: number, y: number) => string = buildPointMarkerId,
): { points: EchartsPersistentPoint[]; currentId: string; id: string } => {
  const id = idBuilder(x, y)
  const exists = points.some((item) => item.id === id)
  return {
    points: exists ? points : [...points, { id, x, y }],
    currentId: id || currentId,
    id,
  }
}

export const removeCurrentPersistentPoint = (
  points: EchartsPersistentPoint[],
  currentId: string,
): { points: EchartsPersistentPoint[]; currentId: string } => {
  if (!currentId) return { points, currentId }
  const nextPoints = points.filter((item) => item.id !== currentId)
  return {
    points: nextPoints,
    currentId: nextPoints[nextPoints.length - 1]?.id ?? '',
  }
}

export const buildPersistentMarkPointData = (
  points: EchartsPersistentPoint[],
  currentId: string,
  formatter: PersistentPointLabelFormatter,
  style: PersistentMarkPointStyle = {},
) =>
  points.map((point) => {
    const isCurrent = point.id === currentId
    const labelText = formatPersistentPointLabel(point, formatter.formatX, formatter.formatY)
    return {
      name: point.id,
      coord: [point.x, point.y],
      symbol: 'circle',
      symbolSize: isCurrent ? (style.activeSymbolSize ?? 9) : (style.inactiveSymbolSize ?? 7),
      itemStyle: {
        color: isCurrent ? (style.activeColor ?? '#ffd166') : (style.inactiveColor ?? '#ff6b6b'),
        borderColor: style.borderColor ?? '#fff',
        borderWidth: style.borderWidth ?? 1,
      },
      label: {
        show: true,
        position: 'top',
        align: 'left',
        color: '#fff',
        fontSize: 12,
        lineHeight: 16,
        backgroundColor: 'rgba(10, 14, 33, 0.7)',
        borderColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderRadius: 4,
        padding: [4, 6],
        formatter: labelText,
      },
      tooltip: {
        show: true,
        formatter: labelText,
      },
    }
  })
