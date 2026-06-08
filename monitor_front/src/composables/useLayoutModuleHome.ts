import { useRoute, useRouter } from 'vue-router'
import { useLayoutNavStore } from '@/stores/layoutNav'
import {
  isLayoutNavChildRoute,
  isLayoutNavMenuRoute,
} from '@/components/layout/layoutNavMenu'

/** 设备详情等子页未匹配到业务模块时，默认回到设备驾驶舱 */
const MODULE_HOME_FALLBACK = 'DeviceCockpit'

function pickTenantQuery(query: Record<string, unknown>) {
  const tenantId = query.tenantId
  if (tenantId == null || tenantId === '') return {}
  const value = Array.isArray(tenantId) ? tenantId[0] : tenantId
  return typeof value === 'string' && value ? { tenantId: value } : {}
}

/**
 * 左上角「首页」：回到当前业务模块的首页，而非全局 Home。
 * 例如从报警管理进入设备详情 → 回报警管理；从设备驾驶舱进入 → 回设备驾驶舱。
 */
export function useLayoutModuleHome() {
  const router = useRouter()
  const route = useRoute()
  const layoutNavStore = useLayoutNavStore()

  const resolveModuleHomeRouteName = (): string => {
    const current = route.name
    if (isLayoutNavChildRoute(current)) {
      const active = layoutNavStore.activeMenuRouteName
      if (active && active !== 'Home' && isLayoutNavMenuRoute(active)) return active
      return MODULE_HOME_FALLBACK
    }
    if (current && isLayoutNavMenuRoute(current)) return String(current)
    return MODULE_HOME_FALLBACK
  }

  const goModuleHome = () => {
    const targetName = resolveModuleHomeRouteName()
    void router.push({
      name: targetName,
      query: pickTenantQuery(route.query as Record<string, unknown>),
    })
  }

  return {
    goModuleHome,
    resolveModuleHomeRouteName,
  }
}
