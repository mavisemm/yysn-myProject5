import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  showLoading?: boolean
  hideNotification?: boolean
  cacheControl?: boolean
  customBaseURL?: string
  dedupe?: 'none' | 'abortPrevious'
  cacheBust?: boolean
}
declare module 'axios' {
  interface AxiosRequestConfig {
    showLoading?: boolean
    hideNotification?: boolean
    cacheControl?: boolean
    customBaseURL?: string
    dedupe?: 'none' | 'abortPrevious'
    cacheBust?: boolean
  }
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', 
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

const pendingRequests = new Map<string, AbortController>()
const REQUEST_KEY_FIELD = '__reqKey'

function generateReqKey(config: InternalAxiosRequestConfig): string {
  const { method, url, params, data } = config
  const normalizedParams = (() => {
    if (!params || typeof params !== 'object' || Array.isArray(params)) return params
    const clone = { ...(params as Record<string, unknown>) }
    if ('_t' in clone) delete clone._t
    return clone
  })()
  return [method, url, JSON.stringify(normalizedParams), JSON.stringify(data)].join('&')
}

function getReqKey(config: InternalAxiosRequestConfig): string {
  const existing = (config as any)?.[REQUEST_KEY_FIELD]
  if (typeof existing === 'string' && existing) return existing
  const key = generateReqKey(config)
  ;(config as any)[REQUEST_KEY_FIELD] = key
  return key
}

function removePendingRequest(config: InternalAxiosRequestConfig): void {
  const dedupeMode = (config as ExtendedAxiosRequestConfig).dedupe ?? 'none'
  if (dedupeMode !== 'abortPrevious') return
  const reqKey = getReqKey(config)
  if (pendingRequests.has(reqKey)) {
    const controller = pendingRequests.get(reqKey)
    controller?.abort()
    pendingRequests.delete(reqKey)
  }
}

const shouldEnableCacheBust = (config: InternalAxiosRequestConfig) => {
  const ext = config as ExtendedAxiosRequestConfig
  if (typeof ext.cacheBust === 'boolean') return ext.cacheBust
  return false
}

function addPendingRequest(config: InternalAxiosRequestConfig): void {
  const dedupeMode = (config as ExtendedAxiosRequestConfig).dedupe ?? 'none'
  if (dedupeMode !== 'abortPrevious') return

  const reqKey = getReqKey(config)
  const controller = new AbortController()
  config.signal = controller.signal
  pendingRequests.set(reqKey, controller)
}

let loadingInstance: any = null;
let loadingCount = 0;

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

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    removePendingRequest(config)
    
    const url = config.url || ''
    const isLoginRequest = url.includes('/taicang/hardware/user/name/login')

    if (!isLoginRequest) {
      const token = localStorage.getItem('token')
      if (token) {
        const raw = String(token).trim()
        let tokenValue = raw
        while (/^Bearer\s+/i.test(tokenValue)) {
          tokenValue = tokenValue.replace(/^Bearer\s+/i, '').trim()
        }

        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${tokenValue}`
        config.headers.token = tokenValue
      }
    }
    
    if (
      config.url &&
      (config.url.startsWith('/taicang') ||
        config.url.startsWith('/vortex') ||
        config.url.startsWith('/jiepai') ||
        config.url.startsWith('/cas') ||
        config.url.startsWith('/zhongyuan'))
    ) {
      config.baseURL = ''
    }
    
    if (config.customBaseURL) {
      config.baseURL = config.customBaseURL
    }
    
    if (config.method === 'get' && config.cacheControl !== false && shouldEnableCacheBust(config)) {
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

service.interceptors.response.use(
  (response: AxiosResponse) => {
    const reqKey = getReqKey(response.config as InternalAxiosRequestConfig)
    pendingRequests.delete(reqKey)
    
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
    if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
      if (error.config) {
        const reqKey = getReqKey(error.config as InternalAxiosRequestConfig)
        pendingRequests.delete(reqKey)
      }
      if (error.config?.showLoading !== false) {
        hideLoading();
      }
      return Promise.reject(error)
    }

    if (error.config) {
      const reqKey = getReqKey(error.config as InternalAxiosRequestConfig)
      pendingRequests.delete(reqKey)
    }
    
    if (error.config?.showLoading !== false) {
      hideLoading();
    }
    
    console.error('响应错误:', error)
    
    let errorMessage = '请求失败'
    let isBackendUnavailable = false
    
    if (error.response) {
      const { status, data } = error.response

      if (status === 408 || status === 504 || status >= 500) {
        isBackendUnavailable = true
      }
      
      switch (status) {
        case 400:
          errorMessage = '请求参数错误'
          break
        case 401:
          errorMessage = '未授权，请重新登录'
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
      isBackendUnavailable = true
    }
    
    if (!error.config?.hideNotification) {
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