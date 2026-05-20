const deviceImages = import.meta.glob('@/assets/images/background/*.{webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const normalizeDeviceImageKey = (name: string) =>
  String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[-_]/g, '')

const deviceImageByBaseName = (() => {
  const map = new Map<string, string>()
  for (const [path, url] of Object.entries(deviceImages)) {
    const fileName = path.split('/').pop() ?? ''
    const base = fileName.replace(/\.[^.]+$/, '')
    if (base) map.set(base, url)
  }
  return map
})()

export function resolveDeviceImageFromName(equipmentName: string): string {
  const rawName = String(equipmentName ?? '').trim()
  if (!rawName) return ''

  const exact = deviceImageByBaseName.get(rawName)
  if (exact) return exact

  const normalizedRawName = normalizeDeviceImageKey(rawName)
  if (!normalizedRawName) return ''
  for (const [baseName, url] of deviceImageByBaseName.entries()) {
    if (normalizeDeviceImageKey(baseName) === normalizedRawName) return url
  }

  for (const [baseName, url] of deviceImageByBaseName.entries()) {
    const normalizedBase = normalizeDeviceImageKey(baseName)
    if (!normalizedBase) continue
    if (normalizedBase.includes(normalizedRawName) || normalizedRawName.includes(normalizedBase)) {
      return url
    }
  }

  return ''
}

export function formatDeviceInfoValueWithUnit(value: unknown, unit: string): string {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' ? value.trim() : value
  if (raw === '') return ''
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(num) || num === 0) return ''
  return `${raw} ${unit}`
}
