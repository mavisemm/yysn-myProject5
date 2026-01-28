import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 扩展 AxiosRequestConfig 类型，添加自定义属性
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  showLoading?: boolean
  hideNotification?: boolean
}
declare module 'axios' {
  interface AxiosRequestConfig {
    showLoading?: boolean
    hideNotification?: boolean
  }
}

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', 
  timeout: 3000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 全局加载状态管理
let loadingInstance: any = null;

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 携带认证 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    // 显示加载状态
    if (config.showLoading !== false) {
      loadingInstance = ElMessage({
        message: '加载中...',
        type: 'info',
        duration: 0,
        showClose: false
      })
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
    // 关闭加载状态
    if (loadingInstance) {
      loadingInstance.close();
      loadingInstance = null;
    }
    
    const res = response.data
    
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
  },
  (error: any) => {
    // 关闭加载状态
    if (loadingInstance) {
      loadingInstance.close();
      loadingInstance = null;
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