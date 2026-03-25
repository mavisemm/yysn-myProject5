import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      // 声音点位页接口 -> 8003
      '/taicang/device/sound': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      '/taicang/hardware/device/standard-frequency-type': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      // 数据统计 overview 接口 -> 8003
      '/taicang/hardware/device/overview': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      // 预警详情：布局、历史异常库等 -> 8003
      '/taicang/hardware/factory': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      '/taicang/hardware/device/sound': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      // 登录等 -> 8003
      '/taicang/hardware/user': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      // 弹窗用：测点、设备名下拉、事件类型下拉 -> 8003
      '/taicang/hardware/device/check-point': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      '/taicang/hardware/device/name': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      '/taicang/hardware/eventType': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      // 振动故障报警：该接口在 8006；用正则避免被下方 /taicang/event 前缀误匹配到 8003
      '^/taicang/event/findVibrationAlarm$': {
        target: 'http://122.224.196.178:8006',
        changeOrigin: true,
        secure: false,
      },
      // 弹窗用：事件查询 -> 8003
      '/taicang/event': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      // 声音点位页：wav 播放/下载（与另一项目一致，36052）
      '/jiepai': {
        target: 'http://122.224.196.178:36052',
        changeOrigin: true,
        secure: false,
      },
      // 其他 /taicang 接口 -> 8006
      '/taicang': {
        target: 'http://122.224.196.178:8006',
        // target: 'http://192.168.0.199:36001',
        changeOrigin: true,
        secure: false,
      },
      // /api 接口 -> 8006
      '/api': {
        target: 'http://122.224.196.178:8006',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  css: {
    postcss: {
      // 显式配置空的 PostCSS 插件列表，跳过自动查找
      plugins: [],
    },
  },
})