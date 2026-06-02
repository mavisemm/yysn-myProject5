<template>
  <div class="app-download-page">
    <div class="app-download-card">
      <h1 class="title">App 下载测试</h1>
      <p class="desc">验证接口</p>

      <div class="actions">
        <el-button type="primary" size="large" @click="handleDownload">
          下载 APK
        </el-button>
        <a class="plain-link" :href="apkUrl" :download="apkFileName">直接打开链接</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElButton } from 'element-plus'

/** APK 放在 public 目录，避免构建时打包进 assets（大文件且可能未提交仓库） */
const apkFileName = '__UNI__D2BE80A__20260529113654.apk'
const base = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`
const apkUrl = `${base}${apkFileName}`

function handleDownload() {
  const anchor = document.createElement('a')
  anchor.href = apkUrl
  anchor.download = apkFileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}
</script>

<style scoped lang="scss">
.app-download-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(160deg, #0b1a2e 0%, #132a45 50%, #0d2137 100%);
}

.app-download-card {
  width: min(520px, 100%);
  padding: 32px 28px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e8f1ff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
}

.desc {
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(232, 241, 255, 0.75);
}

.meta {
  margin: 0 0 28px;
  font-size: 13px;

  dt {
    margin-bottom: 4px;
    color: rgba(232, 241, 255, 0.55);
  }

  dd {
    margin: 0 0 14px;
    word-break: break-all;
  }

  .url {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: #9ec5ff;
  }
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.plain-link {
  font-size: 13px;
  color: #7eb6ff;
  text-decoration: underline;
}
</style>
