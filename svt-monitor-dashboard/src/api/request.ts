import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 扩展 AxiosRequestConfig 类型，添加自定义属性
declare module 'axios' {
  interface AxiosRequestConfig {
    loading?: boolean
  }
}

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // 从环境变量中获取基础URL
  timeout: 15000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 在发送请求之前做些什么
    // 携带认证 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加时间戳防止缓存（可选）
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    // 添加加载状态（可选）
    if (config.loading !== false) {
      // 这里可以集成 loading 状态管理
    }
    
    return config
  },
  (error: any) => {
    // 对请求错误做些什么
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    // 对响应数据做点什么
    const res = response.data
    
    // 根据项目实际情况调整响应格式判断
    if (res.code && res.code !== 200) {
      // 业务错误处理
      ElMessage.error(res.message || '请求失败')
      
      // 特殊状态码处理
      if (res.code === 401) {
        // Token 过期，跳转到登录页
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
      // 成功响应
      return res
    }
  },
  (error: any) => {
    // 对响应错误做点什么
    console.error('响应错误:', error)
    
    // 根据错误状态码进行处理
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
          errorMessage = data.message || `连接错误${status}`
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时'
    } else {
      errorMessage = '网络异常，请检查网络连接'
    }
    
    ElMessage.error(errorMessage)
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