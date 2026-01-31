import request from '../request'

// 登录接口
export const login = (data: { userName: string; password: string }) => {
  return request.post('/auth/login', data)
}

// 登出接口
export const logout = () => {
  return request.post('/auth/logout')
}

// 获取用户信息接口
export const getUserInfo = () => {
  return request.get('/auth/userInfo')
}