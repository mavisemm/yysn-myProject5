import type { AnalysisPointItem } from './vibrationAnalysisTree'

export interface PointRmsRow extends AnalysisPointItem {
  xRms: number
  yRms: number
  zRms: number
  collectTime: string
}

const hashSeed = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const mockAxisValue = (seed: number, axis: number): number => {
  const base = ((seed % 97) + 13) / 10
  const jitter = ((seed >> (axis * 3)) % 41) / 100
  return Number((base + jitter).toFixed(2))
}

/** 第三部分 mock：按点位生成 X/Y/Z 速度有效值（待真实批量接口替换） */
export function buildMockPointRmsRows(points: AnalysisPointItem[]): PointRmsRow[] {
  const now = new Date().toISOString()
  return points.map((p) => {
    const seed = hashSeed(`${p.receiverId}:${p.pointDeviceId}`)
    return {
      ...p,
      xRms: mockAxisValue(seed, 0),
      yRms: mockAxisValue(seed, 1),
      zRms: mockAxisValue(seed, 2),
      collectTime: now,
    }
  })
}
