import type { RouteRecordName } from 'vue-router'

export function layoutShowHomeButton(_routeName: RouteRecordName | null | undefined): boolean {
  return false
}

export function layoutShowReturnDevice(routeName: RouteRecordName | null | undefined): boolean {
  return routeName === 'SoundPoint' || routeName === 'VibrationPoint'
}

export function layoutShowPointTypeSwitch(routeName: RouteRecordName | null | undefined): boolean {
  return routeName === 'SoundPoint' || routeName === 'VibrationPoint'
}