import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const TARGET_8003 = env.VITE_PROXY_TARGET_8003 || 'http://122.224.196.178:8003'
  const TARGET_8006 = env.VITE_PROXY_TARGET_8006 || 'http://122.224.196.178:8006'
  const TARGET_JIEPAI = env.VITE_PROXY_TARGET_JIEPAI || 'http://122.224.196.178:36052'

  return {
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
        '^/taicang/event/findVibrationAlarm$': {
          target: TARGET_8006,
          changeOrigin: true,
          secure: false,
        },

        '/taicang/device/sound': {
          target: TARGET_8003,
          changeOrigin: true,
          secure: false,
        },
        '/taicang/hardware': {
          target: TARGET_8006,
          changeOrigin: true,
          secure: false,
        },
        '/taicang/event': {
          target: TARGET_8003,
          changeOrigin: true,
          secure: false,
        },
        '/api/sound': {
          target: TARGET_8003,
          changeOrigin: true,
          secure: false,
        },

        '/jiepai': {
          target: TARGET_JIEPAI,
          changeOrigin: true,
          secure: false,
        },

        '/taicang': {
          target: TARGET_8006,
          // target: 'http://192.168.0.199:36001',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: TARGET_8006,
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
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('echarts-gl')) return 'vendor-echarts-gl'
            if (id.includes('echarts')) return 'vendor-echarts'
            if (id.includes('element-plus') || id.includes('@element-plus')) return 'vendor-element-plus'
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) return 'vendor-vue-core'
            if (id.includes('axios') || id.includes('@stomp/stompjs')) return 'vendor-network'
            return 'vendor-misc'
          }
        }
      }
    }
  }
})