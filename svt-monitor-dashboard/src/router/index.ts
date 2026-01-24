import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'

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
      }
    ]
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

export default router