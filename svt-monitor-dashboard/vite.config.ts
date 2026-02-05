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
      '/taicang': {
        target: 'http://192.168.0.199:36000',
        // target:'http://122.224.196.178:8003',
        // target:'http://192.168.1.219:36052',
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