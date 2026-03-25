/**
 * 获取当前租户 tenantId
 * 规则：
 * 1) 优先从 URL 查询参数 `tenantId` 取
 * 2) 其次从 `localStorage.tenantId` 取（登录成功后写入）
 * 3) 若两者都没有，返回空字符串
 */
export function getTenantId(): string {
  const fromUrl =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('tenantId')
      : null
  const fromStorage =
    typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null

  return (fromUrl?.trim() || fromStorage?.trim() || '').trim()
}

