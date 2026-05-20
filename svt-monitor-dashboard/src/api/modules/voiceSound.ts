import request from '../request'
import { withTenantQuery } from '../helpers'

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
}> =>
  request.post('/taicang/hardware/device/standard-frequency-type/findSimpleFrequencyList', payload, {
    params: withTenantQuery(),
  })

export const getLatestDeviationByReceiver = (params?: {
  receiverId?: string
  startTime?: string
  endTime?: string
}): Promise<SoundDeviationItem[]> => {
  const now = Date.now()
  return request.get('/taicang/device/sound/data/findLatestDeviationByReceiver/no-scene', {
    params: withTenantQuery({
      ...(params?.receiverId ? { receiverId: params.receiverId } : {}),
      startTime: params?.startTime ?? String(now - 24 * 60 * 60 * 1000),
      endTime: params?.endTime ?? String(now),
    }),
  })
}

export interface FindLatestFrequencyByIdRet {
  soundFrequencyDtoList?: Array<{ freq1: number; freq2: number; db?: number; density?: number }>
  soundAvgFrequencyDtoList?: Array<{ db?: number; density?: number }>
}

export const findLatestFrequencyById = (params: {
  id: string | number
  type: number
}): Promise<FindLatestFrequencyByIdRet> =>
  request.get('/taicang/device/sound/data/findLatestFrequencyById', {
    params: withTenantQuery({ id: params.id, type: params.type }),
    showLoading: true,
  })

const SOUND_WAV_BASE = import.meta.env.VITE_SOUND_WAV_BASE_URL || ''

export const getWavByFreqGroupIdUrl = (freqGroupId: string | number): string => {
  const path = `/jiepai/hardware/device/type/das/soundDetector/findWavByFreqGroupId?freqGroupId=${encodeURIComponent(String(freqGroupId))}`
  return SOUND_WAV_BASE ? `${SOUND_WAV_BASE.replace(/\/$/, '')}${path}` : path
}

export interface LatestFrequencyBinDto {
  freq1: number
  freq2: number
  db?: number
  density?: number
  [k: string]: any
}

export interface LatestFrequencyNoSceneRet {
  productName?: string
  subProductName?: string
  deviceModel?: string
  productionFactory?: string
  soundFrequencyDtoList?: LatestFrequencyBinDto[]
  soundAvgFrequencyDtoList?: LatestFrequencyBinDto[]
  [k: string]: any
}

const latestFrequencyParams = (receiverId: string, type: number) =>
  withTenantQuery({ receiverId, type })

export const getLatestFrequencyByReceiver = (payload: {
  receiverId: string
  type: number
}): Promise<{ rc: number; ret?: LatestFrequencyBinDto[] }> =>
  request.get('/taicang/device/sound/data/findLatestFrequencyByReceiver', {
    params: latestFrequencyParams(payload.receiverId, payload.type),
    showLoading: true,
  })

export const getLatestFrequencyByReceiverNoScene = (payload: {
  receiverId: string
  type: number
}): Promise<{ rc: number; ret?: LatestFrequencyNoSceneRet }> =>
  request.get('/taicang/device/sound/data/findLatestFrequencyByReceiver/no-scene', {
    params: latestFrequencyParams(payload.receiverId, payload.type),
    showLoading: true,
  })

export const askAIModel = (payload: any): Promise<{ rc: number; ret?: string; err?: string }> =>
  request.post('/taicang/device/sound/qwen/max/analyze', payload, { showLoading: true })
