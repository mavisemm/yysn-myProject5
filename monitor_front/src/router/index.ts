import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import { setupRouterGuard } from './guard'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: PageLayout,
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/HomeEntry.vue'),
        meta: { title: '首页', layoutShell: 'classic' },
      },
      {
        path: '',
        redirect: { name: 'DeviceCockpit' },
      },
      {
        path: 'device-cockpit',
        name: 'DeviceCockpit',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '设备驾驶舱' },
      },
      {
        path: 'dashboard',
        redirect: { name: 'DeviceCockpit' },
      },
      {
        path: 'alarm-management',
        name: 'AlarmManagement',
        component: () => import('@/views/AlarmManagementHome.vue'),
        meta: { title: '报警管理' },
      },
      {
        path: 'status-management',
        name: 'StatusManagement',
        component: () => import('@/views/ModulePlaceholder.vue'),
        meta: { title: '状态管理' },
      },
      {
        path: 'notice-management',
        name: 'NoticeManagement',
        component: () => import('@/views/ModulePlaceholder.vue'),
        meta: { title: '通知单管理' },
      },
      {
        path: 'device-monitor',
        name: 'DeviceMonitor',
        component: () => import('@/views/ModulePlaceholder.vue'),
        meta: { title: '设备监控' },
      },
      {
        path: 'device-detail/:id',
        name: 'DeviceDetail',
        component: () => import('@/views/DeviceDetail.vue'),
        meta: { title: 'Device Detail' },
      },
      {
        path: 'device-detail',
        name: 'DeviceDetailQueryLegacy',
        redirect: (to) => ({
          name: 'DeviceDetail',
          params: { id: (to.query?.equipmentId as string | undefined) ?? '' },
          query: { ...(to.query ?? {}) },
        }),
      },
      {
        path: 'sound-point/:receiverId',
        name: 'SoundPoint',
        component: () => import('@/views/SoundPoint.vue'),
        meta: { title: 'Sound Point' },
      },
      {
        path: 'vibration-point/:receiverId',
        name: 'VibrationPoint',
        component: () => import('@/views/VibrationPoint.vue'),
        meta: { title: 'Vibration Point' },
      },
    ],
  },
  {
    path: '/vibration-analysis',
    name: 'DeviceVibrationAnalysis',
    component: () => import('@/views/DeviceVibrationAnalysis.vue'),
    meta: { title: 'Device Vibration Analysis' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: 'Login' },
  },
  {
    path: '/download/app',
    name: 'AppDownloadTest',
    component: () => import('@/views/AppDownloadTest.vue'),
    meta: { title: 'App Download Test' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

setupRouterGuard(router)

export default router
