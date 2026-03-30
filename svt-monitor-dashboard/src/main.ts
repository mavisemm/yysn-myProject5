import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import  zhCn from  'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import { registerTenantRouteReader } from './api/tenant'

import './assets/styles/common.scss'

registerTenantRouteReader(() => {
  const q = router.currentRoute.value?.query?.tenantId
  const raw = Array.isArray(q) ? q[0] : q
  if (raw == null) return ''
  const s = typeof raw === 'string' ? raw.trim() : String(raw).trim()
  return s
})

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
