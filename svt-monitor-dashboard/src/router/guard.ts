import type { Router } from 'vue-router'
import { ElMessage } from 'element-plus'

export function setupRouterGuard(router: Router) {
  router.beforeEach((to, from, next) => {
    
    const publicPages = ['/login']
    
    
    const isLoggedIn = localStorage.getItem('token') !== null
    
    
    if (publicPages.includes(to.path) && isLoggedIn) {
      next('/dashboard')
      return
    }
    
    
    if (!publicPages.includes(to.path) && !isLoggedIn) {
      ElMessage.warning('请先登录')
      next('/login')
      return
    }

    
    
    const requireTenantIdRouteNames = new Set(['Dashboard', 'DeviceDetail', 'DeviceDetailQueryLegacy', 'SoundPoint', 'VibrationPoint'])
    const tenantIdInQuery = (to.query?.tenantId as string | undefined) ?? ''
    const tenantId = localStorage.getItem('tenantId') ?? ''
    if (isLoggedIn && requireTenantIdRouteNames.has(String(to.name ?? ''))) {
      
      const effectiveTenantId = tenantId || tenantIdInQuery
      if (effectiveTenantId) {
        
        const queryObj = (to.query ?? {}) as Record<string, any>
        const { tenantId: _omit, ...rest } = queryObj
        const { equipmentId, receiverId, ...others } = rest as Record<string, any>
        
        
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
    
    
    next()
  })
}