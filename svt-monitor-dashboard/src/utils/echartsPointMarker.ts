export interface EchartsPersistentPoint {
  id: string
  x: number
  y: number
}

export const buildPointMarkerId = (x: number, y: number, precision = 6): string =>
  `${x.toFixed(precision)}:${y.toFixed(precision)}`

export const formatPersistentPointLabel = (
  point: EchartsPersistentPoint,
  formatX: (v: number) => string,
  formatY: (v: number) => string,
): string => `x：${formatX(point.x)}\ny：${formatY(point.y)}`
