import request from '../request'

// 声音相关 API 接口

// 声音数据类型定义
export interface SoundData {
  id: string
  deviceId: string
  deviceName: string
  soundType: string
  soundLevel: number
  frequency: number
  waveform: string // 波形图数据
  spectrum: SpectrumData[] // 频谱数据
  capturedTime: string
  duration: number
  status: 'normal' | 'warning' | 'alarm'
  threshold: {
    warning: number
    alarm: number
  }
}

export interface SpectrumData {
  frequency: number
  amplitude: number
}

export interface AISoundAnalysis {
  id: string
  soundId: string
  analysisResult: string
  confidence: number
  anomalyType?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestions: string[]
  createTime: string
}

export interface SoundPoint {
  id: string
  pointId: string
  pointName: string
  deviceId: string
  deviceName: string
  location: string
  status: 'normal' | 'warning' | 'alarm'
  lastSoundLevel: number
  lastFrequency: number
  threshold: {
    warning: number
    alarm: number
  }
  lastCapturedTime: string
}

export interface SoundAnalysisResult {
  soundId: string
  analysis: {
    frequencyComponents: { freq: number; amp: number }[]
    dominantFrequency: number
    soundLevel: number
    harmonicDistortion: number
    noiseLevel: number
    classification: string
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }
  recommendations: string[]
}

export interface SoundDataResponse {
  code: number
  message: string
  data: SoundData
}

export interface SoundAnalysisResponse {
  code: number
  message: string
  data: AISoundAnalysis
}

export interface SoundPointListResponse {
  code: number
  message: string
  data: {
    list: SoundPoint[]
    total: number
    page: number
    pageSize: number
  }
}

export interface SoundAnalysisResultResponse {
  code: number
  message: string
  data: SoundAnalysisResult
}

// 最新偏差数据（声音点位表格）
export interface SoundDeviationItem {
  id: number
  time: string
  deviceId: string
  deviceName: string | null
  receiverId: string
  receiverName: string | null
  sceneId: string | null
  sceneName: string | null
  fileFlag: boolean
  filePath: string
  productId: string | null
  productName: string | null
  subProductId: string | null
  subProductName: string | null
  pointId: number
  pointGroupId: number
  pointName: string | null
  status: number
  avgGroupId: string | null
  soundFrequencyDtoList: unknown
  soundAvgFrequencyDtoList: unknown
  detectorStatus: boolean
  deviationValue: number
  titleGroupName: string | null
  dbArray: number[] | null
  densityArray: number[] | null
  markFlag: unknown
  sampleSec: number
  deviceModel: string | null
  productionFactory: string | null
}

// 获取声音数据
export const getSoundData = (params?: {
  deviceId?: string
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
}): Promise<SoundDataResponse> => {
  return request.get('/sound/data', {
    params,
    showLoading: true
  })
}

// 获取AI声音分析结果
export const getAISoundAnalysis = (soundId: string): Promise<SoundAnalysisResponse> => {
  return request.get(`/sound/ai-analysis/${soundId}`, {
    showLoading: true
  })
}

// 执行AI声音分析
export const analyzeSoundByAI = (soundId: string): Promise<SoundAnalysisResponse> => {
  return request.post(`/sound/ai-analyze/${soundId}`, {}, {
    showLoading: true
  })
}

// 获取声音测点列表
export const getSoundPointList = (params?: {
  deviceId?: string
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<SoundPointListResponse> => {
  return request.get('/sound/points', {
    params,
    showLoading: true
  })
}

// 获取频谱数据
export const getSpectrumData = (params?: {
  deviceId?: string
  startTime?: string
  endTime?: string
}): Promise<any> => {
  return request.get('/sound/spectrum', {
    params,
    showLoading: true
  })
}

// 获取声音趋势数据
export const getSoundTrend = (deviceId: string, params?: {
  startTime?: string
  endTime?: string
  interval?: string
}): Promise<any> => {
  return request.get(`/sound/trend/${deviceId}`, {
    params,
    showLoading: true
  })
}

// 获取实时声音监测数据
export const getRealTimeSoundData = (deviceId: string): Promise<SoundDataResponse> => {
  return request.get(`/sound/realtime/${deviceId}`, {
    showLoading: false
  })
}

// 获取声音分析报告
export const getSoundAnalysisReport = (params?: {
  deviceId?: string
  startTime?: string
  endTime?: string
  reportType?: string
}): Promise<any> => {
  return request.get('/sound/report', {
    params,
    showLoading: true
  })
}

// 上传声音文件进行分析
export const uploadSoundForAnalysis = (formData: FormData): Promise<SoundAnalysisResultResponse> => {
  return request.post('/sound/upload-analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    showLoading: true
  })
}

// 获取历史声音数据
export const getHistoricalSoundData = (params?: {
  deviceId?: string
  pointId?: string
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
}): Promise<any> => {
  return request.get('/sound/history', {
    params,
    showLoading: true
  })
}

// 声音频率曲线（勾选记录后获取频率列表）
export const getStandardFrequencyList = (payload: {
  recordIdList: (number | string)[]
  type: number
}): Promise<{
  freqs: number[]
  responseList: Array<{
    recordId: number
    time: number
    sort: number
    machineNo: string | null
    pointName: string | null
    dbArray: number[] | null
    densityArray: number[] | null
  }>
}> => {
  return request.post('/taicang/hardware/device/standard-frequency-type/findSimpleFrequencyList', payload, {
    params: {
      userId: '',
      tenantId: '2b410e834b4b4ae49ab8d52f6d49e967',
      _t: '1770273268272'
    },
    // cacheControl: false,
    // customBaseURL: 'http://122.224.196.178:8003',
    // showLoading: true
  })
}

// 获取声音点位页最新偏差列表（固定参数）
export const getLatestDeviationByReceiver = (): Promise<SoundDeviationItem[]> => {
  return request.get('/taicang/device/sound/data/findLatestDeviationByReceiver/no-scene', {
    params: {
      userId: '',
      tenantId: '2b410e834b4b4ae49ab8d52f6d49e967',
      receiverId: '9sXGsnoV80oz7uB7AMv',
      startTime: '1770271033097',
      endTime: '1770272233097',
      _t: '1770272233097'
    },
    // cacheControl: false,
    // customBaseURL: 'http://122.224.196.178:8003',
    // showLoading: true
  })
}