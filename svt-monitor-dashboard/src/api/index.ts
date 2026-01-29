// API 模块统一导出
import * as deviceApi from './modules/device'
import * as loginApi from './modules/login'
import * as dashboardApi from './modules/dashboard'
import * as deviceLatestApi from './modules/deviceLatest'
import * as eventApi from './modules/event'
import * as hardwareApi from './modules/hardware'
import * as statsApi from './modules/stats'
import * as voiceSoundApi from './modules/voiceSound'
import * as zyServiceApi from './modules/zyservice'

// 统一导出所有 API 模块
export {
  deviceApi,
  loginApi,
  dashboardApi,
  deviceLatestApi,
  eventApi,
  hardwareApi,
  statsApi,
  voiceSoundApi,
  zyServiceApi
}

// 默认导出 request 实例
export { default } from './request'
export * from './request'