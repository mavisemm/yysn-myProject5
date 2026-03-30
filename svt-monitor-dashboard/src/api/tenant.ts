type RouteTenantReader = () => string

// 由 main.ts 在 createApp 阶段注入，避免 tenant 模块静态 import router 引发循环依赖。
// 用于登录首跳等场景：Vue Router 的 query 已与导航同步时，window.location.search 仍可能短暂滞后。
let routeTenantReader: RouteTenantReader | null = null

export function registerTenantRouteReader(fn: RouteTenantReader | null) {
  routeTenantReader = fn
}

/**
 * 从浏览器读取租户 ID，仅有以下两种来源（不从 token、cookie、内存变量等处推导）：
 *
 * 1. **localStorage** 键名 `tenantId`（登录成功后写入）
 * 2. **当前路由** 查询参数 `tenantId`（由 registerTenantRouteReader 提供，与 SPA 导航同步）
 * 3. **地址栏** `window.location.search` 中的 `tenantId`（兜底，可能与路由不同步）
 *
 * 优先级：localStorage → 路由 query → 地址栏（与 router/guard 中“已登录以 localStorage 为准”一致；
 * 路由优先于地址栏可避免登录后首屏请求读到滞后/错误的 search）。
 */
export function readTenantIdFromStorageOrAddressBar(): string {
  const fromStorage =
    typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null
  if (fromStorage?.trim()) return fromStorage.trim()

  let fromRoute = ''
  try {
    fromRoute = routeTenantReader?.() ?? ''
  } catch {
    fromRoute = ''
  }
  if (fromRoute.trim()) return fromRoute.trim()

  const fromUrl =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('tenantId')
      : null

  return (fromUrl?.trim() || '').trim()
}

/**
 * 与 {@link readTenantIdFromStorageOrAddressBar} 相同，供全项目统一调用。
 */
export function getTenantId(): string {
  return readTenantIdFromStorageOrAddressBar()
}
