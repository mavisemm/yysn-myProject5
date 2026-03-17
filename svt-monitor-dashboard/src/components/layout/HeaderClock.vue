<template>
  <div class="header-clock">
    <div v-if="showFull" class="clock-left">
      <span class="clock-date">{{ dateText }}</span>
      <span class="clock-week">{{ weekText }}</span>
    </div>
    <div class="clock-right">
      <span class="clock-time">{{ timeText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const now = ref<Date | null>(null)
let timerId: number | null = null
const route = useRoute()

// 首页（/ 或 name === 'Home'）展示完整日期+星期，其它页面仅展示时分秒
const showFull = computed(() => {
  return route.path === '/' || route.name === 'Home'
})

const pad = (n: number) => String(n).padStart(2, '0')

const dateText = computed(() => {
  if (!now.value) return ''
  const y = now.value.getFullYear()
  const m = pad(now.value.getMonth() + 1)
  const d = pad(now.value.getDate())
  return `${y}-${m}-${d}`
})

const timeText = computed(() => {
  if (!now.value) return ''
  const h = pad(now.value.getHours())
  const m = pad(now.value.getMinutes())
  const s = pad(now.value.getSeconds())
  return `${h}:${m}:${s}`
})

const weekText = computed(() => {
  if (!now.value) return ''
  const map = ['日', '一', '二', '三', '四', '五', '六']
  const w = now.value.getDay()
  return `星期${map[w] ?? ''}`
})

onMounted(() => {
  now.value = new Date()
  timerId = window.setInterval(() => {
    // 仅更新本组件内部的时间，不触发全局刷新
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }
})
</script>

<style scoped lang="scss">
.header-clock {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  color: rgba(153, 240, 255, 0.9);
  white-space: nowrap;

  .clock-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    line-height: 1.2;
    margin-right: 8px;
    font-size: 1rem;

    .clock-week {
      margin-top: 2px;
    }
  }

  .clock-right {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;

    .clock-time {
      letter-spacing: 1px;
    }
  }
}
</style>
