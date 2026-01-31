import type { Router } from 'vue-router'
import { ElMessage } from 'element-plus'

export function setupRouterGuard(router: Router) {
  router.beforeEach((to, from, next) => {
    // 定义不需要登录验证的页面
    const publicPages = ['/login']
    
    // 检查用户是否已登录
    const isLoggedIn = localStorage.getItem('token') !== null
    
    // 如果访问的是公共页面且已登录，则跳转到首页
    if (publicPages.includes(to.path) && isLoggedIn) {
      next('/')
      return
    }
    
    // 如果访问的是受保护页面且未登录，则跳转到登录页面
    if (!publicPages.includes(to.path) && !isLoggedIn) {
      ElMessage.warning('请先登录')
      next('/login')
      return
    }
    
    // 其他情况正常导航
    next()
  })
}