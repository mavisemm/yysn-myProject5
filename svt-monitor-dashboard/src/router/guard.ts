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

    // 业务要求：在首页、设备详情、声音点位、振动点位的地址栏拼接 tenantId
    // tenantId 来自登录接口返回并存储在 localStorage
    const requireTenantIdRouteNames = new Set(['Dashboard', 'DeviceDetail', 'SoundPoint', 'VibrationPoint'])
    const tenantIdInQuery = (to.query?.tenantId as string | undefined) ?? ''
    const tenantId = localStorage.getItem('tenantId') ?? ''
    if (isLoggedIn && requireTenantIdRouteNames.has(String(to.name ?? ''))) {
      const effectiveTenantId = tenantIdInQuery || tenantId
      if (effectiveTenantId) {
        // 确保 tenantId 永远排在 query 的第一个
        const queryKeys = Object.keys(to.query ?? {})
        const isTenantIdFirst = queryKeys.length > 0 ? queryKeys[0] === 'tenantId' : false
        if (!tenantIdInQuery || !isTenantIdFirst) {
          const { tenantId: _omit, ...rest } = (to.query ?? {}) as Record<string, any>
          next({
            ...to,
            query: { tenantId: effectiveTenantId, ...rest },
            replace: true
          })
          return
        }
      }
    }
    
    // 其他情况正常导航
    next()
  })
}