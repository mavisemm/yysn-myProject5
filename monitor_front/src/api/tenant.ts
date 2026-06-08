type RouteTenantReader = () => string

let routeTenantReader: RouteTenantReader | null = null

export function registerTenantRouteReader(fn: RouteTenantReader | null) {
  routeTenantReader = fn
}

const trimOrEmpty = (value: string | null | undefined) => value?.trim() ?? ''

export function readTenantIdFromStorageOrAddressBar(): string {
  const fromStorage =
    typeof window !== 'undefined' ? trimOrEmpty(localStorage.getItem('tenantId')) : ''
  if (fromStorage) return fromStorage

  try {
    const fromRoute = trimOrEmpty(routeTenantReader?.())
    if (fromRoute) return fromRoute
  } catch {
    // ignore route reader errors
  }

  const fromUrl =
    typeof window !== 'undefined'
      ? trimOrEmpty(new URLSearchParams(window.location.search).get('tenantId'))
      : ''

  return fromUrl
}

export function getTenantId(): string {
  return readTenantIdFromStorageOrAddressBar()
}
