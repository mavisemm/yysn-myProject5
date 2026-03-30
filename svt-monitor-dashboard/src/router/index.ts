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
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: 'Dashboard' }
      },
      {
        path: '',
        redirect: 'dashboard'
      },
      {
        
        path: 'device-detail/:id',
        name: 'DeviceDetail',
        component: () => import('@/views/DeviceDetail.vue'),
        meta: { title: 'Device Detail' }
      },
      {
        
        path: 'device-detail',
        name: 'DeviceDetailQueryLegacy',
        redirect: (to) => {
          const equipmentId = (to.query?.equipmentId as string | undefined) ?? ''
          return {
            name: 'DeviceDetail',
            params: { id: equipmentId },
            query: { ...(to.query ?? {}) }
          }
        }
      },
      {
        
        path: 'sound-point/:receiverId',
        name: 'SoundPoint',
        component: () => import('@/views/SoundPoint.vue'),
        meta: { title: 'Sound Point' }
      },
      {
        
        path: 'vibration-point/:receiverId',
        name: 'VibrationPoint',
        component: () => import('@/views/VibrationPoint.vue'),
        meta: { title: 'Vibration Point' }
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
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

setupRouterGuard(router)

export default router