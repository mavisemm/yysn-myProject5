import request from '../request'

// 中远授权验证相关 API 接口

// 授权信息类型定义
export interface AuthInfo {
  authId: string
  clientId: string
  clientSecret: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope: string[]
  createTime: string
  updateTime: string
  status: 'active' | 'expired' | 'revoked' | 'suspended'
}

export interface AuthRequest {
  clientId: string
  clientSecret: string
  grantType: string
  scope?: string
  username?: string
  password?: string
}

export interface AuthResponse {
  code: number
  message: string
  data: {
    accessToken: string
    refreshToken: string
    expiresIn: number
    tokenType: string
    scope: string
  }
}

export interface ValidateAuthResponse {
  code: number
  message: string
  data: {
    isValid: boolean
    authInfo?: AuthInfo
    expireIn?: number
  }
}

export interface RefreshTokenResponse {
  code: number
  message: string
  data: {
    newAccessToken: string
    expiresIn: number
  }
}

// 授权验证请求
export const authorize = (authRequest: AuthRequest): Promise<AuthResponse> => {
  return request.post('/zy/auth/authorize', authRequest, {
    showLoading: true,
    cacheControl: false
  })
}

// 验证授权信息
export const validateAuthorization = (accessToken: string): Promise<ValidateAuthResponse> => {
  return request.post('/zy/auth/validate', {
    accessToken
  }, {
    showLoading: false,
    cacheControl: false
  })
}

// 刷新访问令牌
export const refreshToken = (refreshToken: string, clientId: string): Promise<RefreshTokenResponse> => {
  return request.post('/zy/auth/refresh', {
    refreshToken,
    clientId
  }, {
    showLoading: true,
    cacheControl: false
  })
}

// 获取授权信息
export const getAuthInfo = (authId: string): Promise<any> => {
  return request.get(`/zy/auth/info/${authId}`, {
    showLoading: true
  })
}

// 创建新的授权
export const createAuthorization = (authData: Partial<AuthInfo>): Promise<any> => {
  return request.post('/zy/auth/create', authData, {
    showLoading: true
  })
}

// 更新授权信息
export const updateAuthorization = (authId: string, authData: Partial<AuthInfo>): Promise<any> => {
  return request.put(`/zy/auth/update/${authId}`, authData, {
    showLoading: true
  })
}

// 撤销授权
export const revokeAuthorization = (authId: string): Promise<any> => {
  return request.post(`/zy/auth/revoke/${authId}`, {}, {
    showLoading: true
  })
}

// 检查API权限
export const checkApiPermission = (apiPath: string, method: string, accessToken: string): Promise<any> => {
  return request.post('/zy/auth/check-permission', {
    apiPath,
    method,
    accessToken
  }, {
    showLoading: false
  })
}

// 获取授权列表
export const getAuthList = (params?: {
  page?: number
  pageSize?: number
  status?: string
  clientId?: string
}): Promise<any> => {
  return request.get('/zy/auth/list', {
    params,
    showLoading: true
  })
}

// 验证中远系统连接状态
export const checkZyConnection = (): Promise<any> => {
  return request.get('/zy/connection/status', {
    showLoading: false
  })
}