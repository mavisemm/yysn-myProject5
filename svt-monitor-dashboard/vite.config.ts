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
      '/taicang/hardware/device/overview': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
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
      '/taicang/hardware/user': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
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
      '^/taicang/event/findVibrationAlarm$': {
        target: 'http://122.224.196.178:8006',
        changeOrigin: true,
        secure: false,
      },
      '/taicang/event': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      '/jiepai': {
        target: 'http://122.224.196.178:36052',
        changeOrigin: true,
        secure: false,
      },
      '/api/sound': {
        target: 'http://122.224.196.178:8003',
        changeOrigin: true,
        secure: false,
      },
      '/taicang': {
        target: 'http://122.224.196.178:8006',
        // target: 'http://192.168.0.199:36001',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://122.224.196.178:8006',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
})