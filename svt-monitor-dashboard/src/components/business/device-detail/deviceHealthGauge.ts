export type HealthGrade = 'A' | 'B' | 'C' | 'D' | ''
export type HealthGaugeMode = 'sound' | 'vibration'

export interface HealthGaugeViewState {
  soundScore: number
  vibrationScore: number
  soundGrade: HealthGrade
  vibrationGrade: HealthGrade
  hasSoundHealthData: boolean
  hasVibrationHealthData: boolean
}

const calculateResponsiveFontSize = (
  baseSize: number,
  containerWidth: number,
  containerHeight: number,
) => {
  const baseDimension = Math.min(containerWidth, containerHeight)
  const scaleRatio = Math.min(baseDimension / 200, 2)
  return Math.max(baseSize * scaleRatio, baseSize * 0.5)
}

const calculateResponsiveDistance = (
  baseDistance: number,
  containerWidth: number,
  containerHeight: number,
) => {
  const baseDimension = Math.min(containerWidth, containerHeight)
  const scaleRatio = Math.min(baseDimension / 200, 2)
  return Math.max(baseDistance * scaleRatio, baseDistance * 0.5)
}

export function extractHealthGrade(ret: unknown): HealthGrade {
  if (!ret || typeof ret !== 'object') return ''
  const raw =
    (ret as { healthGrade?: string; health_grade?: string; grade?: string }).healthGrade
    ?? (ret as { health_grade?: string }).health_grade
    ?? (ret as { grade?: string }).grade
    ?? ''
  if (!raw || typeof raw !== 'string') return ''
  const upper = raw.toUpperCase()
  if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') return upper
  return ''
}

export function mapGradeToScore(grade: HealthGrade): number {
  switch (grade) {
    case 'A':
      return 90
    case 'B':
      return 70
    case 'C':
      return 40
    case 'D':
      return 15
    default:
      return 0
  }
}

export function parseSoundHealthRet(ret: unknown): {
  score: number
  grade: HealthGrade
  hasData: boolean
} {
  if (!ret || typeof ret !== 'object') {
    return { score: 0, grade: '', hasData: false }
  }
  const scoreRaw = (ret as { healthScore?: number }).healthScore
  const score = typeof scoreRaw === 'number' ? scoreRaw : null
  const grade = extractHealthGrade(ret)
  const hasData = score !== null || !!grade
  return { score: score ?? 0, grade, hasData }
}

export function parseVibrationHealthRet(ret: unknown): {
  score: number
  grade: HealthGrade
  hasData: boolean
} {
  const grade = extractHealthGrade(ret)
  return {
    grade,
    score: mapGradeToScore(grade),
    hasData: !!grade,
  }
}

const resolveHealthColor = (score: number, grade: HealthGrade) => {
  if (grade === 'D') return '#ff5722'
  if (grade === 'C') return '#f2b504'
  if (grade === 'B') return '#85ea8c'
  if (grade === 'A') return '#309735'
  if (score >= 80) return '#309735'
  if (score >= 60) return '#85ea8c'
  if (score >= 20) return '#f2b504'
  return '#ff5722'
}

export function buildHealthGaugeOption(
  mode: HealthGaugeMode,
  state: HealthGaugeViewState,
  containerWidth: number,
  containerHeight: number,
) {
  const isVibration = mode === 'vibration'
  const score = isVibration ? state.vibrationScore : state.soundScore
  const grade = isVibration ? state.vibrationGrade : state.soundGrade
  const hasData = isVibration ? state.hasVibrationHealthData : state.hasSoundHealthData
  const healthColor = hasData ? resolveHealthColor(score, grade) : 'rgba(255,255,255,0.65)'

  const axisLabelFontSize = Math.round(
    calculateResponsiveFontSize(15, containerWidth, containerHeight),
  )
  const titleFontSize = Math.round(calculateResponsiveFontSize(20, containerWidth, containerHeight))
  const detailFontSize = Math.round(
    calculateResponsiveFontSize(24, containerWidth, containerHeight),
  )

  const total = 10 + 8 + 8 + 10
  const dEnd = 10 / total
  const cEnd = (10 + 8) / total
  const bEnd = (10 + 8 + 8) / total

  return {
    series: [
      {
        type: 'gauge',
        center: ['50%', '60%'],
        radius: '80%',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 10,
        progress: { show: false },
        pointer: { show: false },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: Math.round(12 * Math.min(containerWidth / 300, 2)),
            color: [
              [dEnd, '#ff5722'],
              [cEnd, '#f2b504'],
              [bEnd, '#85ea8c'],
              [1, '#309735'],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: true,
          distance: calculateResponsiveDistance(
            isVibration ? -130 : -105,
            containerWidth,
            containerHeight,
          ),
          fontSize: axisLabelFontSize,
          color: '#fff',
          formatter: function (value: number) {
            if (isVibration) {
              const roundToTick = (percent: number) => Math.round(percent / 10) * 10
              const dCenter = roundToTick((0 + dEnd * 100) / 2)
              const cCenter = roundToTick(((dEnd + cEnd) * 100) / 2)
              const bCenter = roundToTick(((cEnd + bEnd) * 100) / 2)
              const aCenter = roundToTick(((bEnd + 1) * 100) / 2)
              if (value === dCenter) return '{gradeD|D\n不允许}'
              if (value === cCenter) return '{gradeC|C\n注意}'
              if (value === bCenter) return '{gradeB|B\n可接受}'
              if (value === aCenter) return '{gradeA|A\n良好}'
              return ''
            }
            if (value === 0) return '{stop|0}'
            if (value === 10) return '{stop|停机}'
            if (value === 20) return '{stop|20}'
            if (value === 40) return '{inspect|巡检}'
            if (value === 60) return '{inspect|60}'
            if (value === 70) return '{focus|关注}'
            if (value === 80) return '{focus|80}'
            if (value === 90) return '{health|健康}'
            if (value === 100) return '{health|100}'
            return ''
          },
          rich: {
            stop: { color: '#ff5722', fontSize: axisLabelFontSize },
            inspect: { color: '#f2b504', fontSize: axisLabelFontSize },
            focus: { color: '#85ea8c', fontSize: axisLabelFontSize },
            health: { color: '#309735', fontSize: axisLabelFontSize },
            gradeD: {
              color: '#ff5722',
              fontSize: Math.round(axisLabelFontSize * 0.85),
              fontWeight: 'bold',
              lineHeight: axisLabelFontSize,
            },
            gradeC: {
              color: '#f2b504',
              fontSize: Math.round(axisLabelFontSize * 0.85),
              fontWeight: 'bold',
              lineHeight: axisLabelFontSize,
            },
            gradeB: {
              color: '#85ea8c',
              fontSize: Math.round(axisLabelFontSize * 0.85),
              fontWeight: 'bold',
              lineHeight: axisLabelFontSize,
            },
            gradeA: {
              color: '#309735',
              fontSize: Math.round(axisLabelFontSize * 0.85),
              fontWeight: 'bold',
              lineHeight: axisLabelFontSize,
            },
          },
        },
        anchor: { show: false },
        title: {
          show: true,
          color: healthColor,
          fontSize: titleFontSize,
          fontWeight: 'bolder',
          offsetCenter: [0, '0%'],
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-30%'],
          fontSize: detailFontSize,
          fontWeight: 'bolder',
          formatter: function (value: number) {
            if (isVibration) return grade || '-'
            if (!state.hasSoundHealthData) return '-'
            return String(Math.round(value))
          },
          color: healthColor,
        },
        data: [{ value: score, name: isVibration ? '振动健康度' : '声音健康度' }],
      },
    ],
  }
}
