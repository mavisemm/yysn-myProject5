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
      next('/dashboard')
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
    const requireTenantIdRouteNames = new Set(['Dashboard', 'DeviceDetail', 'DeviceDetailQueryLegacy', 'SoundPoint', 'VibrationPoint'])
    const tenantIdInQuery = (to.query?.tenantId as string | undefined) ?? ''
    const tenantId = localStorage.getItem('tenantId') ?? ''
    if (isLoggedIn && requireTenantIdRouteNames.has(String(to.name ?? ''))) {
      // 已登录时，localStorage 的 tenantId 作为权威来源，避免被旧书签/历史URL里的 tenantId 污染
      const effectiveTenantId = tenantId || tenantIdInQuery
      if (effectiveTenantId) {
        // 统一 query 参数顺序：tenantId -> equipmentId -> receiverId（receiverId 永远放在最后）
        const queryObj = (to.query ?? {}) as Record<string, any>
        const { tenantId: _omit, ...rest } = queryObj
        const { equipmentId, receiverId, ...others } = rest as Record<string, any>
        // DeviceDetail 页面本身用 path 的 :id 表示 equipmentId
        // 为避免“路径+query 双重 equipmentId”，这里剔除 query.equipmentId
        const equipmentIdForQuery = to.name === 'DeviceDetail' ? undefined : equipmentId
        const reorderedQuery: Record<string, any> = {
          tenantId: effectiveTenantId,
          ...(equipmentIdForQuery !== undefined ? { equipmentId: equipmentIdForQuery } : {}),
          ...others,
          ...(receiverId !== undefined ? { receiverId } : {})
        }

        const currentKeys = Object.keys(queryObj)
        const reorderedKeys = Object.keys(reorderedQuery)
        const isOrderCorrect = currentKeys.length === reorderedKeys.length
          && currentKeys.every((k, i) => k === reorderedKeys[i])

        const shouldFixTenantValue = Boolean(tenantId && tenantIdInQuery && tenantIdInQuery !== tenantId)
        const shouldFixTenantMissing = !tenantIdInQuery

        if (!isOrderCorrect || shouldFixTenantValue || shouldFixTenantMissing) {
          next({
            ...to,
            query: reorderedQuery,
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