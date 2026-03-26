import request from '../request'

import { getTenantId } from '../tenant'

// 声音相关 API 接口

// 声音数据类型定义
export interface SoundData {
  id: string
  deviceId: string
  deviceName: string
  soundType: string
  soundLevel: number
  frequency: number
  waveform: string 
  spectrum: SpectrumData[] 
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
  receiverId: string
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
  detectorName?: string | null
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
  receiverId?: string
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

// 声音频率曲线
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
      tenantId: getTenantId(),
      _t: Date.now()
    }
  })
}

// 获取声音点位页最新偏差列表（点位由 receiverId 传入，不传 deviceId）
export const getLatestDeviationByReceiver = (params?: {
  receiverId?: string
  startTime?: string
  endTime?: string
}): Promise<SoundDeviationItem[]> => {
  const receiverId = params?.receiverId ?? ''
  const now = Date.now()
  const startTime = params?.startTime ?? String(now - 24 * 60 * 60 * 1000)
  const endTime = params?.endTime ?? String(now)
  return request.get('/taicang/device/sound/data/findLatestDeviationByReceiver/no-scene', {
    params: {
      userId: '',
      tenantId: getTenantId(),
      ...(receiverId ? { receiverId } : {}),
      startTime,
      endTime,
      _t: now
    },
  })
}

// 查看曲线：根据 recordId 查询单条频率数据（弹窗用）
export interface FindLatestFrequencyByIdRet {
  soundFrequencyDtoList?: Array<{ freq1: number; freq2: number; db?: number; density?: number }>
  soundAvgFrequencyDtoList?: Array<{ db?: number; density?: number }>
}
export const findLatestFrequencyById = (params: { id: string | number; type: number }): Promise<FindLatestFrequencyByIdRet> => {
  return request.get('/taicang/device/sound/data/findLatestFrequencyById', {
    params: {
      userId: '',
      tenantId: getTenantId(),
      id: params.id,
      type: params.type,
      _t: Date.now()
    },
    showLoading: true
  })
}

// 播放/下载：根据 freqGroupId 获取 wav 文件地址
const SOUND_WAV_BASE = import.meta.env.VITE_SOUND_WAV_BASE_URL || ''

export const getWavByFreqGroupIdUrl = (freqGroupId: string | number): string => {
  const path = `/jiepai/hardware/device/type/das/soundDetector/findWavByFreqGroupId?freqGroupId=${freqGroupId}`
  return SOUND_WAV_BASE ? `${SOUND_WAV_BASE.replace(/\/$/, '')}${path}` : path
}

// ====== 预警详情中“频谱曲线/无工况基础数据/AI分析”接口（对应 src0 alarmModal 迁移）======

export interface LatestFrequencyBinDto {
  freq1: number
  freq2: number
  db?: number
  density?: number
  [k: string]: any
}

export interface LatestFrequencyByReceiverRet {
  // 对应 src0：ret.length 循环生成 xAxis + db/density
  ret?: LatestFrequencyBinDto[]
}

export interface LatestFrequencyNoSceneRet {
  // 对应 src0：ret.soundFrequencyDtoList / ret.soundAvgFrequencyDtoList
  productName?: string
  subProductName?: string
  deviceModel?: string
  productionFactory?: string
  soundFrequencyDtoList?: LatestFrequencyBinDto[]
  soundAvgFrequencyDtoList?: LatestFrequencyBinDto[]
  [k: string]: any
}

/**
 * 频段声音曲线（对应 src0 VoiceSound.freqencySound -> findLatestFrequencyByReceiver）
 */
export const getLatestFrequencyByReceiver = (payload: {
  receiverId: string
  type: number
}): Promise<{ rc: number; ret?: LatestFrequencyBinDto[] }> => {
  return request.get('/taicang/device/sound/data/findLatestFrequencyByReceiver', {
    params: {
      userId: '',
      tenantId: getTenantId(),
      receiverId: payload.receiverId,
      type: payload.type,
      _t: Date.now()
    },
    showLoading: true
  })
}

/**
 * 无工况基础数据（对应 src0 VoiceSound.nosceneVoice -> findLatestFrequencyByReceiver/no-scene）
 */
export const getLatestFrequencyByReceiverNoScene = (payload: {
  receiverId: string
  type: number
}): Promise<{ rc: number; ret?: LatestFrequencyNoSceneRet }> => {
  return request.get('/taicang/device/sound/data/findLatestFrequencyByReceiver/no-scene', {
    params: {
      userId: '',
      tenantId: getTenantId(),
      receiverId: payload.receiverId,
      type: payload.type,
      _t: Date.now()
    },
    showLoading: true
  })
}

/**
 * 智能故障分析（对应 src0 VoiceSound.askAIModel -> qwen/max/analyze）
 */
export const askAIModel = (payload: any): Promise<{ rc: number; ret?: string; err?: string }> => {
  return request.post('/taicang/device/sound/qwen/max/analyze', payload, {
    showLoading: true
  })
}