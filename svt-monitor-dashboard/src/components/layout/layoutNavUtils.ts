import type { RouteRecordName } from 'vue-router'

export function layoutShowHomeButton(routeName: RouteRecordName | null | undefined): boolean {
  return routeName === 'DeviceDetail' || routeName === 'SoundPoint' || routeName === 'VibrationPoint'
}

export function layoutShowReturnDevice(routeName: RouteRecordName | null | undefined): boolean {
  return routeName === 'SoundPoint' || routeName === 'VibrationPoint'
}

export function layoutShowPointTypeSwitch(routeName: RouteRecordName | null | undefined): boolean {
  return routeName === 'SoundPoint' || routeName === 'VibrationPoint'
}