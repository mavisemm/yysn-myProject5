import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  isLayoutNavMenuRoute,
  LAYOUT_NAV_ROUTE_NAMES,
} from '@/components/layout/layoutNavMenu'

const STORAGE_KEY = 'layoutNavActiveRoute'

function readStoredRoute(): string {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored && LAYOUT_NAV_ROUTE_NAMES.includes(stored)) return stored
  } catch {
    /* ignore */
  }
  return 'DeviceCockpit'
}

/** 记录主导航当前应高亮的菜单（设备详情等子路由不覆盖此项） */
export const useLayoutNavStore = defineStore('layoutNav', () => {
  const activeMenuRouteName = ref(readStoredRoute())

  const setActiveMenuRouteName = (routeName: string) => {
    if (!isLayoutNavMenuRoute(routeName)) return
    activeMenuRouteName.value = routeName
    try {
      sessionStorage.setItem(STORAGE_KEY, routeName)
    } catch {
      /* ignore */
    }
  }

  return {
    activeMenuRouteName,
    setActiveMenuRouteName,
  }
})
