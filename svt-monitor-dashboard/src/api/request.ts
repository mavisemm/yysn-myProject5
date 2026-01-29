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
  timeout: 15000, // 请求超时时间增加到15秒
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
    
    // 携带认证 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 对于某些路径（如 /taicang/*），我们不需要添加基础URL
    // 所以对于这些路径，我们临时设置baseURL为空
    if (config.url && (config.url.startsWith('/taicang') || config.url.startsWith('/vortex') || config.url.startsWith('/jiepai') || config.url.startsWith('/cas') || config.url.startsWith('/zhongyuan'))) {
      config.baseURL = '';
    }
    
    // 使用自定义基础URL
    if (config.customBaseURL) {
      config.baseURL = config.customBaseURL
    }
    
    // 添加时间戳防止缓存（除非明确禁用）
    if (config.method === 'get' && config.cacheControl !== false) {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    // 添加请求到待处理队列
    addPendingRequest(config)
    
    // 显示加载状态
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
    // 从待处理队列中移除已完成的请求
    const reqKey = generateReqKey(response.config as InternalAxiosRequestConfig)
    if (pendingRequests.has(reqKey)) {
      pendingRequests.delete(reqKey)
    }
    
    // 关闭加载状态
    if (response.config.showLoading !== false) {
      hideLoading();
    }
    
    const res = response.data
    
    // 检查是否符合新的响应格式 (rc/ret/err)
    if (res.hasOwnProperty('rc')) {
      // 新格式：rc为0表示成功，非0表示失败
      if (res.rc !== 0) {
        // 隐藏通知如果配置了不显示
        if (!response.config.hideNotification) {
          ElMessage.error(res.err || '请求失败')
        }
        
        return Promise.reject(new Error(res.err || 'Error'))
      } else {
        return res
      }
    } else {
      // 旧格式：code不为200表示失败
      if (res.code && res.code !== 200) {
        // 隐藏通知如果配置了不显示
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
    // 从待处理队列中移除已失败的请求
    if (error.config) {
      const reqKey = generateReqKey(error.config as InternalAxiosRequestConfig)
      if (pendingRequests.has(reqKey)) {
        pendingRequests.delete(reqKey)
      }
    }
    
    // 关闭加载状态
    if (error.config?.showLoading !== false) {
      hideLoading();
    }
    
    console.error('响应错误:', error)
    
    let errorMessage = '请求失败'
    
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 400:
          errorMessage = '请求参数错误'
          break
        case 401:
          errorMessage = '未授权，请重新登录'
          localStorage.removeItem('token')
          setTimeout(() => {
            window.location.href = '/login'
          }, 1000)
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
    } else {
      errorMessage = '网络异常，请检查网络连接'
    }
    
    // 如果配置了隐藏通知则不显示错误消息
    if (!error.config?.hideNotification) {
      ElMessage.error(errorMessage)
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