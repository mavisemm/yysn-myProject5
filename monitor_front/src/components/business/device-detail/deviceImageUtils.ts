import { getEquipmentImages } from '@/api/modules/hardware'
import { getTenantId } from '@/api/tenant'

export function extractEquipmentImageUrls(ret: unknown): string[] {
  if (!Array.isArray(ret)) return []
  return ret
    .map((item) => String((item as { imageUrl?: string })?.imageUrl ?? '').trim())
    .filter(Boolean)
}

export async function fetchEquipmentImageUrls(
  equipmentId: string,
  tenantId?: string,
): Promise<string[]> {
  const id = String(equipmentId ?? '').trim()
  if (!id) return []
  try {
    const res = await getEquipmentImages({
      equipmentId: id,
      tenantId: tenantId ?? getTenantId(),
    })
    if (res.rc !== 0) return []
    return extractEquipmentImageUrls(res.ret)
  } catch {
    return []
  }
}

export function formatDeviceInfoValueWithUnit(value: unknown, unit: string): string {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' ? value.trim() : value
  if (raw === '') return ''
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(num) || num === 0) return ''
  return `${raw} ${unit}`
}
