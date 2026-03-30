import request from '../request'








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