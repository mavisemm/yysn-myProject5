import request from '../request'

// 登录相关 API 接口

// 用户登录信息类型定义
export interface LoginParams {
  username: string
  password: string
  captcha?: string
  rememberMe?: boolean
}

export interface UserInfo {
  userId: string
  username: string
  nickname: string
  avatar: string
  roles: string[]
  permissions: string[]
  token: string
}

export interface LoginResponse {
  code: number
  message: string
  data: {
    userInfo: UserInfo
    accessToken: string
    refreshToken: string
    expireTime: number
  }
}

export interface CaptchaResponse {
  code: number
  message: string
  data: {
    captchaId: string
    img: string // base64 图片
  }
}

export interface LogoutResponse {
  code: number
  message: string
  data: boolean
}

// 用户登录
export const userLogin = (data: LoginParams): Promise<LoginResponse> => {
  return request.post('/auth/login', data, {
    showLoading: true,
    cacheControl: false
  })
}

// 获取验证码
export const getCaptcha = (): Promise<CaptchaResponse> => {
  return request.get('/auth/captcha', {
    showLoading: false,
    cacheControl: false
  })
}

// 用户登出
export const userLogout = (): Promise<LogoutResponse> => {
  return request.post('/auth/logout', {}, {
    showLoading: true
  })
}

// 刷新令牌
export const refreshToken = (refreshToken: string): Promise<LoginResponse> => {
  return request.post('/auth/refresh', {
    refreshToken
  }, {
    showLoading: false,
    cacheControl: false
  })
}

// 获取当前用户信息
export const getCurrentUserInfo = (): Promise<any> => {
  return request.get('/auth/userinfo', {
    showLoading: true
  })
}

// 检查用户是否已登录
export const checkLoginStatus = (): Promise<any> => {
  return request.get('/auth/check', {
    showLoading: false
  })
}