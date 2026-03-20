import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import  zhCn from  'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import { useAlarmBatchStore } from '@/stores/alarmBatch'

import './assets/styles/common.scss'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 预警批量弹窗用到的设备/类型下拉：首屏后台预拉，避免打开弹窗时与列表请求挤在同一帧渲染海量 DOM
void useAlarmBatchStore(pinia).ensureDropdowns()

app.mount('#app')
