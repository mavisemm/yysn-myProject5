import { getTenantId } from '@/api/tenant'

export const DEFAULT_CATEGORY_ID = 'default'
export const DEFAULT_CATEGORY_NAME = '默认信息'

export interface InfoCategory {
  id: string
  name: string
  isDefault: boolean
}

export type SystemFieldKey =
  | 'equipmentName'
  | 'deviceModel'
  | 'deviceFactory'
  | 'locationDetail'
  | 'rotationSpeed'
  | 'designFlow'
  | 'pressure'

/** [fieldKey, 展示名] */
export const SYSTEM_FIELDS: readonly [SystemFieldKey, string][] = [
  ['equipmentName', '设备名称'],
  ['deviceModel', '设备型号'],
  ['deviceFactory', '生产厂家'],
  ['locationDetail', '安装位置'],
  ['rotationSpeed', '额定转速'],
  ['designFlow', '设计流量'],
  ['pressure', '压力'],
]

export interface CustomDeviceField {
  id: string
  label: string
  value: string
  categoryId: string
  type: 'input' | 'select'
  options?: string[]
}

/** 为 true 时在「更多」设备信息中合并演示类别与字段，便于 UI 验收；验收完请改回 false */
export const ENABLE_DEVICE_INFO_UI_VERIFY_SEED = true

export const UI_VERIFY_CATEGORY_IDS = {
  maintenance: 'ui_verify_cat_maintenance',
  calibration: 'ui_verify_cat_calibration',
} as const

/** UI 验收用：两个新类别 */
export const UI_VERIFY_SEED_CATEGORIES: readonly InfoCategory[] = [
  { id: UI_VERIFY_CATEGORY_IDS.maintenance, name: '运维台账', isDefault: false },
  { id: UI_VERIFY_CATEGORY_IDS.calibration, name: '传感器标定', isDefault: false },
]

/** UI 验收用：各类别下的示例信息（含一条下拉） */
export const UI_VERIFY_SEED_FIELDS: readonly CustomDeviceField[] = [
  {
    id: 'ui_verify_f_last_pm',
    label: '上次保养日期',
    value: '2026-01-08',
    categoryId: UI_VERIFY_CATEGORY_IDS.maintenance,
    type: 'input',
  },
  {
    id: 'ui_verify_f_pm_cycle',
    label: '保养周期',
    value: '每 90 天',
    categoryId: UI_VERIFY_CATEGORY_IDS.maintenance,
    type: 'input',
  },
  {
    id: 'ui_verify_f_responsible',
    label: '责任人',
    value: '张三',
    categoryId: UI_VERIFY_CATEGORY_IDS.maintenance,
    type: 'input',
  },
  {
    id: 'ui_verify_f_vib_zero',
    label: '振动零点',
    value: '0.02 mm/s',
    categoryId: UI_VERIFY_CATEGORY_IDS.calibration,
    type: 'input',
  },
  {
    id: 'ui_verify_f_cert_status',
    label: '证书状态',
    value: '有效',
    categoryId: UI_VERIFY_CATEGORY_IDS.calibration,
    type: 'select',
    options: ['有效', '即将过期', '已过期'],
  },
  {
    id: 'ui_verify_f_next_cal',
    label: '下次标定',
    value: '2026-08-01',
    categoryId: UI_VERIFY_CATEGORY_IDS.calibration,
    type: 'input',
  },
]

function mergeUiVerifyCategories(list: InfoCategory[]): InfoCategory[] {
  if (!ENABLE_DEVICE_INFO_UI_VERIFY_SEED) return list
  const ids = new Set(list.map((c) => c.id))
  const extra = UI_VERIFY_SEED_CATEGORIES.filter((c) => !ids.has(c.id))
  return extra.length ? [...list, ...extra] : list
}

export function mergeUiVerifyFields(list: CustomDeviceField[]): CustomDeviceField[] {
  if (!ENABLE_DEVICE_INFO_UI_VERIFY_SEED) return list
  const ids = new Set(list.map((f) => f.id))
  const extra = UI_VERIFY_SEED_FIELDS.filter((f) => !ids.has(f.id)).map((f) => ({ ...f }))
  return extra.length ? [...list, ...extra] : list
}

/** 提交接口前剔除纯前端 UI 验收种子字段（id 以 ui_verify_ 开头），避免写入后端 */
export function stripUiVerifySeedFields(fields: CustomDeviceField[]): CustomDeviceField[] {
  return fields.filter((f) => !f.id.startsWith('ui_verify_'))
}

const storageKey = () => `svt-device-info-categories:${getTenantId() || 'default-tenant'}`

const defaultCat = (): InfoCategory => ({
  id: DEFAULT_CATEGORY_ID,
  name: DEFAULT_CATEGORY_NAME,
  isDefault: true,
})

const normalize = (list: InfoCategory[]): InfoCategory[] =>
  list.some((c) => c.isDefault || c.id === DEFAULT_CATEGORY_ID)
    ? list.map((c) =>
        c.id === DEFAULT_CATEGORY_ID ? { ...c, isDefault: true, name: DEFAULT_CATEGORY_NAME } : c,
      )
    : [defaultCat(), ...list]

export function loadTenantCategories(): InfoCategory[] {
  try {
    const raw = localStorage.getItem(storageKey())
    if (raw) {
      const list = JSON.parse(raw) as InfoCategory[]
      if (Array.isArray(list) && list.length) return mergeUiVerifyCategories(normalize(list))
    }
  } catch {
    /* ignore */
  }
  return mergeUiVerifyCategories([defaultCat()])
}

export function saveTenantCategories(categories: InfoCategory[]) {
  localStorage.setItem(storageKey(), JSON.stringify(normalize(categories)))
}

export const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export function parseCustomFieldsFromDeviceNewInfo(raw: unknown): CustomDeviceField[] {
  const out: CustomDeviceField[] = []
  if (!raw) return out

  const push = (label: unknown, value: unknown, idx: number, extra?: Record<string, unknown>) => {
    const l = String(label ?? '').trim()
    const v = String(value ?? '').trim()
    if (!l || !v) return
    const it = extra ?? {}
    const type = it.type === 'select' ? 'select' : 'input'
    const opts = Array.isArray(it.options)
      ? (it.options as unknown[]).map(String).filter(Boolean)
      : undefined
    out.push({
      id: String(it.id ?? `legacy_${idx}_${l}`),
      label: l,
      value: v,
      categoryId: String(it.categoryId ?? DEFAULT_CATEGORY_ID) || DEFAULT_CATEGORY_ID,
      type,
      options: type === 'select' ? opts : undefined,
    })
  }

  if (Array.isArray(raw)) {
    raw.forEach((it, i) => {
      if (it && typeof it === 'object') push((it as any).label, (it as any).value, i, it as any)
    })
    return out
  }

  const obj = raw as Record<string, unknown>
  for (let i = 1; i <= 50; i++) {
    const item = obj[`item${i}`] as Record<string, unknown> | undefined
    if (!item) break
    push(item[`label${i}`], item[`value${i}`], i)
  }
  if (!out.length) {
    for (let j = 1; j <= 50; j++) {
      if (!(`label${j}` in obj) || !(`value${j}` in obj)) break
      push(obj[`label${j}`], obj[`value${j}`], j)
    }
  }
  return out
}

export function buildDeviceNewInfoPayload(fields: CustomDeviceField[]) {
  return fields
    .map((f) => {
      const label = f.label.trim()
      if (!label) return null
      const value =
        f.type === 'select'
          ? String(f.value || f.options?.[0] || '').trim()
          : String(f.value ?? '').trim()
      if (!value) return null
      const row: Record<string, unknown> = {
        id: f.id,
        label,
        value,
        categoryId: f.categoryId || DEFAULT_CATEGORY_ID,
        type: f.type,
      }
      if (f.type === 'select' && f.options?.length) row.options = [...f.options]
      return row
    })
    .filter(Boolean) as Record<string, unknown>[]
}
