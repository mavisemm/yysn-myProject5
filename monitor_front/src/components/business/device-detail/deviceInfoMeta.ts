export const DEFAULT_CATEGORY_NAME = '默认信息'

/** 前端虚拟默认类别 id（后端类别/扩展信息接口均不包含） */
export const FRONTEND_DEFAULT_TYPE_ID = 0

export interface InfoCategory {
  typeId: number
  typeName: string
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

export function createFrontendDefaultCategory(): InfoCategory {
  return {
    typeId: FRONTEND_DEFAULT_TYPE_ID,
    typeName: DEFAULT_CATEGORY_NAME,
    isDefault: true,
  }
}

export function isFrontendDefaultTypeId(typeId: number) {
  return typeId === FRONTEND_DEFAULT_TYPE_ID
}
