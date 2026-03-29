import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 扩展 AxiosRequestConfig 类型，添加自定义属性
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  showLoading?: boolean
  hideNotification?: boolean
  cacheControl?: boolean
  customBaseURL?: string
}
declare module 'axios' {
  interface AxiosRequestConfig {
    showLoading?: boolean
    hideNotification?: boolean
    cacheControl?: boolean
    customBaseURL?: string
  }
}

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', 
  timeout: 180000, // 请求超时时间：3分钟
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 存储请求标识符的集合，用于取消重复请求
const pendingRequests = new Map<string, AbortController>()

// 生成请求唯一标识符
function generateReqKey(config: InternalAxiosRequestConfig): string {
  const { method, url, params, data } = config
  return [method, url, JSON.stringify(params), JSON.stringify(data)].join('&')
}

// 取消重复请求
function removePendingRequest(config: InternalAxiosRequestConfig): void {
  const reqKey = generateReqKey(config)
  if (pendingRequests.has(reqKey)) {
    const controller = pendingRequests.get(reqKey)
    controller?.abort()
    pendingRequests.delete(reqKey)
  }
}

// 添加请求到待处理队列
function addPendingRequest(config: InternalAxiosRequestConfig): void {
  const reqKey = generateReqKey(config)
  const controller = new AbortController()
  config.signal = controller.signal
  pendingRequests.set(reqKey, controller)
}

// 全局加载状态管理
let loadingInstance: any = null;
let loadingCount = 0;

// 连接/服务不可用场景：同一页面打开期间只提示一次，避免接口并发失败刷屏
let hasShownBackendUnavailableNotification = false

const showLoading = () => {
  if (loadingCount === 0) {
    loadingInstance = ElMessage({
      message: '加载中...',
      type: 'info',
      duration: 0,
      showClose: false
    });
  }
  loadingCount++;
};

const hideLoading = () => {
  if (loadingCount <= 0) return;
  loadingCount--;
  if (loadingCount === 0 && loadingInstance) {
    loadingInstance.close();
    loadingInstance = null;
  }
};

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    removePendingRequest(config)
    
    const url = config.url || ''
    const isLoginRequest = url.includes('/taicang/hardware/user/name/login')

    // 携带认证 token（登录接口不需要 token）
    if (!isLoginRequest) {
      const token = localStorage.getItem('token')
      if (token) {
        const raw = String(token).trim()
        // 兼容 token 可能已包含 `Bearer ` 前缀（甚至重复前缀）
        let tokenValue = raw
        while (/^Bearer\s+/i.test(tokenValue)) {
          tokenValue = tokenValue.replace(/^Bearer\s+/i, '').trim()
        }

        config.headers = config.headers ?? {}
        // 后端通常按 Bearer 格式解析；这里统一成单一 Bearer 前缀
        config.headers.Authorization = `Bearer ${tokenValue}`
        // 额外兜底：有些后端可能读取自定义 header 名
        config.headers.token = tokenValue
      }
    }
    
    // 统一由 VITE_API_BASE_URL（生产通常为 8006）承载，再由网关反代到各后端；
    // 避免浏览器直连 8003/36052 带来的跨域问题。
    if (
      !import.meta.env.PROD &&
      config.url &&
      (config.url.startsWith('/taicang') ||
        config.url.startsWith('/vortex') ||
        config.url.startsWith('/jiepai') ||
        config.url.startsWith('/cas') ||
        config.url.startsWith('/zhongyuan'))
    ) {
      // 开发环境退回到当前源路径，交给 devServer.proxy
      config.baseURL = ''
    }
    
    if (config.customBaseURL) {
      config.baseURL = config.customBaseURL
    }
    
    if (config.method === 'get' && config.cacheControl !== false) {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    addPendingRequest(config)
    
    if (config.showLoading !== false) {
      showLoading();
    }
    
    return config
  },
  (error: any) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const reqKey = generateReqKey(response.config as InternalAxiosRequestConfig)
    if (pendingRequests.has(reqKey)) {
      pendingRequests.delete(reqKey)
    }
    
    if (response.config.showLoading !== false) {
      hideLoading();
    }
    
    const res = response.data
    
    if (res.hasOwnProperty('rc')) {
      if (res.rc !== 0) {
        if (!response.config.hideNotification) {
          ElMessage.error(res.err || '请求失败')
        }
        
        return Promise.reject(new Error(res.err || 'Error'))
      } else {
        return res
      }
    } else {
      if (res.code && res.code !== 200) {
        if (!response.config.hideNotification) {
          ElMessage.error(res.message || '请求失败')
        }
        
        if (res.code === 401) {
          localStorage.removeItem('token')
          ElMessageBox.alert('登录已过期，请重新登录', '提示', {
            confirmButtonText: '确定',
            callback: () => {
              window.location.href = '/login'
            }
          })
        }
        
        return Promise.reject(new Error(res.message || 'Error'))
      } else {
        return res
      }
    }
  },
  (error: any) => {
    if (error.config) {
      const reqKey = generateReqKey(error.config as InternalAxiosRequestConfig)
      if (pendingRequests.has(reqKey)) {
        pendingRequests.delete(reqKey)
      }
    }
    
    if (error.config?.showLoading !== false) {
      hideLoading();
    }
    
    console.error('响应错误:', error)
    
    let errorMessage = '请求失败'
    // 用于判断是否是“后端没开/网络不可达”的连接问题（通常会并发触发多次）
    let isBackendUnavailable = false
    
    if (error.response) {
      const { status, data } = error.response

      // 后端未开启/不可用时也可能直接返回 5xx，或以 408/504 超时形式出现；
      // 这类错误在页面并发请求时会刷屏，因此纳入“仅提示一次”的限流范围。
      if (status === 408 || status === 504 || status >= 500) {
        isBackendUnavailable = true
      }
      
      switch (status) {
        case 400:
          errorMessage = '请求参数错误'
          break
        case 401:
          errorMessage = '未授权，请重新登录'
          // 登录接口本身不依赖 token：避免错误凭据导致误清 token/跳转
          if (!(error.config?.url || '').includes('/taicang/hardware/user/name/login')) {
            localStorage.removeItem('token')
            setTimeout(() => {
              window.location.href = '/login'
            }, 1000)
          }
          break
        case 403:
          errorMessage = '拒绝访问'
          break
        case 404:
          errorMessage = '请求地址不存在'
          break
        case 408:
          errorMessage = '请求超时'
          break
        case 500:
          errorMessage = '服务器内部错误'
          break
        case 501:
          errorMessage = '服务未实现'
          break
        case 502:
          errorMessage = '网关错误'
          break
        case 503:
          errorMessage = '服务不可用'
          break
        case 504:
          errorMessage = '网关超时'
          break
        default:
          errorMessage = data?.message || `连接错误${status}`
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时'
      isBackendUnavailable = true
    } else {
      errorMessage = '网络异常，请检查网络连接'
      // 没有 response 通常意味着服务不可达/后端未开启
      isBackendUnavailable = true
    }
    
    if (!error.config?.hideNotification) {
      // 只对“连接/后端不可用”做限流，其它错误仍照常提示
      if (isBackendUnavailable) {
        if (!hasShownBackendUnavailableNotification) {
          hasShownBackendUnavailableNotification = true
          ElMessage.error(errorMessage)
        }
      } else {
        ElMessage.error(errorMessage)
      }
    }
    
    return Promise.reject(error)
  }
)

// 封装请求方法
const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return service.get(url, config)
  },
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return service.post(url, data, config)
  },
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return service.put(url, data, config)
  },
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return service.delete(url, config)
  },
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return service.patch(url, data, config)
  }
}

export default request
export { service }