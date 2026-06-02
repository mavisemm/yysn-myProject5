import type { Component } from 'vue'
import { Bell, DataBoard, House, Message, Monitor, Odometer } from '@element-plus/icons-vue'

export type LayoutShell = 'classic' | 'modern'

export interface AppNavMenuItem {
  key: string
  label: string
  routeName: string
  icon: Component
  layoutShell?: LayoutShell
  /** 为 true 时不展示在主导航 */
  hidden?: boolean
}

/** 设备树左侧主导航（自上而下） */
export const APP_NAV_MENU_ITEMS: AppNavMenuItem[] = [
  { key: 'home', label: '首页', routeName: 'Home', icon: House, layoutShell: 'classic', hidden: true },
  { key: 'cockpit', label: '设备驾驶舱', routeName: 'DeviceCockpit', icon: Odometer },
  { key: 'alarm', label: '报警管理', routeName: 'AlarmManagement', icon: Bell },
  { key: 'status', label: '状态管理', routeName: 'StatusManagement', icon: DataBoard },
  { key: 'notice', label: '通知单管理', routeName: 'NoticeManagement', icon: Message },
  { key: 'monitor', label: '设备监控', routeName: 'DeviceMonitor', icon: Monitor },
]

export function resolveLayoutShell(routeName: string | symbol | null | undefined): LayoutShell {
  const item = APP_NAV_MENU_ITEMS.find((m) => m.routeName === routeName)
  return item?.layoutShell ?? 'modern'
}

/** 主导航项 routeName 列表 */
/** 主导航可见项（不含 hidden） */
export const APP_NAV_MENU_VISIBLE_ITEMS = APP_NAV_MENU_ITEMS.filter((m) => !m.hidden)

export const LAYOUT_NAV_ROUTE_NAMES = APP_NAV_MENU_ITEMS.map((m) => m.routeName)

/**
 * 设备树选中后进入的子页面，仍应高亮进入前所在的主导航项
 *（如设备详情、声纹/振动点位页）
 */
export const LAYOUT_NAV_CHILD_ROUTE_NAMES = new Set([
  'DeviceDetail',
  'DeviceDetailQueryLegacy',
  'SoundPoint',
  'VibrationPoint',
])

export function isLayoutNavChildRoute(routeName: string | symbol | null | undefined): boolean {
  return LAYOUT_NAV_CHILD_ROUTE_NAMES.has(String(routeName ?? ''))
}

export function isLayoutNavMenuRoute(routeName: string | symbol | null | undefined): boolean {
  return LAYOUT_NAV_ROUTE_NAMES.includes(String(routeName ?? ''))
}
