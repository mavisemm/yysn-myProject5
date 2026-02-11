import request from '../request'

// 登录接口（声学平台账号），走 8003 端口
// 返回示例：
// {
//   "rc": 0,
//   "ret": "2b410e834b4b4ae49ab8d52f6d49e967",
//   "err": null
// }
export const login = (data: { userName: string; password: string }) => {
  // 后端只支持 POST，GET 会报 "Request method 'GET' not supported"
  return request.post('http://122.224.196.178:8003/taicang/hardware/user/name/login', data, {
    showLoading: true
  })
}

// 下面的接口暂时保留占位，如后续有鉴权可继续对接
export const logout = () => {
  return request.post('/auth/logout')
}

export const getUserInfo = () => {
  return request.get('/auth/userInfo')
}