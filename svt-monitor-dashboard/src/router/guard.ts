import type { Router } from 'vue-router'
import { ElMessage } from 'element-plus'

const TENANT_ROUTE_NAMES = new Set([
  'Dashboard',
  'DeviceDetail',
  'DeviceDetailQueryLegacy',
  'SoundPoint',
  'VibrationPoint',
  'DeviceVibrationAnalysis',
])

export function setupRouterGuard(router: Router) {
  router.beforeEach((to, _from, next) => {
    if (to.path === '/login') {
      localStorage.clear()
      sessionStorage.clear()
      next()
      return
    }

    const isLoggedIn = localStorage.getItem('token') !== null
    if (!isLoggedIn) {
      ElMessage.warning('请先登录')
      next('/login')
      return
    }

    const tenantIdInQuery = (to.query?.tenantId as string | undefined) ?? ''
    const tenantId = localStorage.getItem('tenantId') ?? ''

    if (TENANT_ROUTE_NAMES.has(String(to.name ?? ''))) {
      const effectiveTenantId = tenantId || tenantIdInQuery
      if (!effectiveTenantId) {
        next()
        return
      }

      const queryObj = (to.query ?? {}) as Record<string, any>
      const { tenantId: _omit, equipmentId, receiverId, ...others } = queryObj

      const reorderedQuery: Record<string, any> = {
        tenantId: effectiveTenantId,
        ...(to.name === 'DeviceDetail' ? {} : equipmentId !== undefined ? { equipmentId } : {}),
        ...others,
        ...(receiverId !== undefined ? { receiverId } : {}),
      }

      const currentKeys = Object.keys(queryObj)
      const reorderedKeys = Object.keys(reorderedQuery)
      const isOrderCorrect =
        currentKeys.length === reorderedKeys.length &&
        currentKeys.every((k, i) => k === reorderedKeys[i])
      const shouldFixTenantValue = Boolean(tenantId && tenantIdInQuery && tenantIdInQuery !== tenantId)
      const shouldFixTenantMissing = !tenantIdInQuery

      if (!isOrderCorrect || shouldFixTenantValue || shouldFixTenantMissing) {
        next({ ...to, query: reorderedQuery, replace: true })
        return
      }
    }

    next()
  })
}
