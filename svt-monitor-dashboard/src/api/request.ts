import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

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
    'Content-Type': 'application/json;charset=UTF-8',
  },
})

const pendingRequests = new Map<string, AbortController>()
const REQUEST_KEY_FIELD = '__reqKey'

const ABSOLUTE_URL_PREFIXES = ['/taicang', '/vortex', '/jiepai', '/cas', '/zhongyuan']

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数错误',
  401: '未授权，请重新登录',
  403: '拒绝访问',
  404: '请求地址不存在',
  408: '请求超时',
  500: '服务器内部错误',
  501: '服务未实现',
  502: '网关错误',
  503: '服务不可用',
  504: '网关超时',
}

function generateReqKey(config: InternalAxiosRequestConfig): string {
  const { method, url, params, data } = config
  const normalizedParams = (() => {
    if (!params || typeof params !== 'object' || Array.isArray(params)) return params
    const clone = { ...(params as Record<string, unknown>) }
    delete clone._t
    return clone
  })()
  return [method, url, JSON.stringify(normalizedParams), JSON.stringify(data)].join('&')
}

function getReqKey(config: InternalAxiosRequestConfig): string {
  const cfg = config as InternalAxiosRequestConfig & { [REQUEST_KEY_FIELD]?: string }
  if (cfg[REQUEST_KEY_FIELD]) return cfg[REQUEST_KEY_FIELD]
  const key = generateReqKey(config)
  cfg[REQUEST_KEY_FIELD] = key
  return key
}

function releasePendingRequest(config: InternalAxiosRequestConfig): void {
  pendingRequests.delete(getReqKey(config))
}

function removePendingRequest(config: InternalAxiosRequestConfig): void {
  if ((config.dedupe ?? 'none') !== 'abortPrevious') return
  const reqKey = getReqKey(config)
  pendingRequests.get(reqKey)?.abort()
  pendingRequests.delete(reqKey)
}

function addPendingRequest(config: InternalAxiosRequestConfig): void {
  if ((config.dedupe ?? 'none') !== 'abortPrevious') return
  const reqKey = getReqKey(config)
  const controller = new AbortController()
  config.signal = controller.signal
  pendingRequests.set(reqKey, controller)
}

let loadingInstance: ReturnType<typeof ElMessage> | null = null
let loadingCount = 0
let hasShownBackendUnavailableNotification = false

const showLoading = () => {
  if (loadingCount === 0) {
    loadingInstance = ElMessage({
      message: '加载中...',
      type: 'info',
      duration: 0,
      showClose: false,
    })
  }
  loadingCount++
}

const hideLoading = () => {
  if (loadingCount <= 0) return
  loadingCount--
  if (loadingCount === 0 && loadingInstance) {
    loadingInstance.close()
    loadingInstance = null
  }
}

const stripBearerPrefix = (token: string) => {
  let value = token.trim()
  while (/^Bearer\s+/i.test(value)) {
    value = value.replace(/^Bearer\s+/i, '').trim()
  }
  return value
}

const shouldHideLoading = (config?: InternalAxiosRequestConfig) => config?.showLoading === false

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    removePendingRequest(config)

    const url = config.url || ''
    const isLoginRequest = url.includes('/taicang/hardware/user/name/login')

    if (!isLoginRequest) {
      const token = localStorage.getItem('token')
      if (token) {
        const tokenValue = stripBearerPrefix(token)
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${tokenValue}`
        config.headers.token = tokenValue
      }
    }

    if (url && ABSOLUTE_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      config.baseURL = ''
    }

    if (config.customBaseURL) {
      config.baseURL = config.customBaseURL
    }

    if (
      config.method === 'get' &&
      config.cacheControl !== false &&
      config.cacheBust === true
    ) {
      config.params = { ...config.params, _t: Date.now() }
    }

    addPendingRequest(config)

    if (!shouldHideLoading(config)) {
      showLoading()
    }

    return config
  },
  (error: unknown) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  },
)

service.interceptors.response.use(
  (response: AxiosResponse) => {
    releasePendingRequest(response.config as InternalAxiosRequestConfig)

    if (!shouldHideLoading(response.config)) {
      hideLoading()
    }

    const res = response.data

    if ('rc' in res) {
      if (res.rc !== 0) {
        if (!response.config.hideNotification) {
          ElMessage.error(res.err || '请求失败')
        }
        return Promise.reject(new Error(res.err || 'Error'))
      }
      return res
    }

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
          },
        })
      }

      return Promise.reject(new Error(res.message || 'Error'))
    }

    return res
  },
  (error: any) => {
    if (error.config) {
      releasePendingRequest(error.config as InternalAxiosRequestConfig)
    }

    if (!shouldHideLoading(error.config)) {
      hideLoading()
    }

    if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
      return Promise.reject(error)
    }

    console.error('响应错误:', error)

    let errorMessage = '请求失败'
    let isBackendUnavailable = false

    if (error.response) {
      const { status, data } = error.response
      if (status === 408 || status === 504 || status >= 500) {
        isBackendUnavailable = true
      }

      errorMessage = HTTP_ERROR_MESSAGES[status] ?? data?.message ?? `连接错误${status}`

      if (
        status === 401 &&
        !(error.config?.url || '').includes('/taicang/hardware/user/name/login')
      ) {
        localStorage.removeItem('token')
        setTimeout(() => {
          window.location.href = '/login'
        }, 1000)
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
  },
)

const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => service.get(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    service.post(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    service.put(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    service.delete(url, config),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    service.patch(url, data, config),
}

export default request
export { service }
