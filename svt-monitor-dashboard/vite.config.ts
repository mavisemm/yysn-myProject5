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
      // 其他 /taicang 接口 -> 8006
      '/taicang': {
        // target: 'http://122.224.196.178:8006',
        target: 'http://192.168.0.199:36001',
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