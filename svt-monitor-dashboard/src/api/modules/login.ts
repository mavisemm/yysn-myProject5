import request from '../request'

// 登录接口（声学平台账号）；生产与页面同源走 VITE_API_BASE_URL，由 nginx 反代到实际后端
// 返回示例：
// {
//   "rc": 0,
//   "ret": "2b410e834b4b4ae49ab8d52f6d49e967",
//   "err": null
// }
export const login = (data: { userName: string; password: string }) => {
  return request.post('http://122.224.196.178:8003/taicang/hardware/user/name/login', data, {
    showLoading: true
  })
}

export const logout = () => {
  return request.post('/auth/logout')
}

export const getUserInfo = () => {
  return request.get('/auth/userInfo')
}