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
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: 'Dashboard' }
      },
      {
        path: 'device-detail/:id',
        name: 'DeviceDetail',
        component: () => import('@/views/DeviceDetail.vue'),
        meta: { title: 'Device Detail' }
      },
      {
        path: 'sound-point',
        name: 'SoundPoint',
        component: () => import('@/views/SoundPoint.vue'),
        meta: { title: 'Sound Point' }
      },
      {
        path: 'vibration-point',
        name: 'VibrationPoint',
        component: () => import('@/views/VibrationPoint.vue'),
        meta: { title: 'Vibration Point' }
      },
      {
        path: 'datetime-test',
        name: 'DateTimeTest',
        component: () => import('@/views/DateTimeTest.vue'),
        meta: { title: 'DateTime Test' }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: 'Login' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

setupRouterGuard(router)

export default router