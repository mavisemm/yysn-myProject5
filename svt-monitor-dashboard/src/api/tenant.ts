type RouteTenantReader = () => string

let routeTenantReader: RouteTenantReader | null = null

export function registerTenantRouteReader(fn: RouteTenantReader | null) {
  routeTenantReader = fn
}

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

export function getTenantId(): string {
  return readTenantIdFromStorageOrAddressBar()
}
