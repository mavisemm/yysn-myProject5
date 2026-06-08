import request from '../request'




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


export const authorize = (authRequest: AuthRequest): Promise<AuthResponse> => {
  return request.post('/zy/auth/authorize', authRequest, {
    showLoading: true,
    cacheControl: false
  })
}


export const validateAuthorization = (accessToken: string): Promise<ValidateAuthResponse> => {
  return request.post('/zy/auth/validate', {
    accessToken
  }, {
    showLoading: false,
    cacheControl: false
  })
}


export const refreshToken = (refreshToken: string, clientId: string): Promise<RefreshTokenResponse> => {
  return request.post('/zy/auth/refresh', {
    refreshToken,
    clientId
  }, {
    showLoading: true,
    cacheControl: false
  })
}


export const getAuthInfo = (authId: string): Promise<any> => {
  return request.get(`/zy/auth/info/${authId}`, {
    showLoading: true
  })
}


export const createAuthorization = (authData: Partial<AuthInfo>): Promise<any> => {
  return request.post('/zy/auth/create', authData, {
    showLoading: true
  })
}


export const updateAuthorization = (authId: string, authData: Partial<AuthInfo>): Promise<any> => {
  return request.put(`/zy/auth/update/${authId}`, authData, {
    showLoading: true
  })
}


export const revokeAuthorization = (authId: string): Promise<any> => {
  return request.post(`/zy/auth/revoke/${authId}`, {}, {
    showLoading: true
  })
}


export const checkApiPermission = (apiPath: string, method: string, accessToken: string): Promise<any> => {
  return request.post('/zy/auth/check-permission', {
    apiPath,
    method,
    accessToken
  }, {
    showLoading: false
  })
}


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


export const checkZyConnection = (): Promise<any> => {
  return request.get('/zy/connection/status', {
    showLoading: false
  })
}