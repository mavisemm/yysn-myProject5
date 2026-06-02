<template>
  <div class="header-clock">
    <div class="clock-date-block">
      <span class="clock-date">{{ dateText }}</span>
      <span class="clock-week">{{ weekText }}</span>
    </div>
    <span class="clock-time">{{ timeText }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
const now = ref<Date | null>(null)
let timerId: number | null = null

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
  justify-content: flex-start;
  flex-wrap: nowrap;
  gap: 0;
  white-space: nowrap;
  font-family: 'DIN', 'Microsoft YaHei', sans-serif;
  font-style: normal;

  .clock-date-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .clock-date,
  .clock-week,
  .clock-time {
    background: linear-gradient(177.37deg, #ffffff 2.19%, #7ea8ff 160.82%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }

  .clock-date {
    font-size: 1rem;
    line-height: 1.2;
  }

  .clock-week {
    font-size: 0.85rem;
    line-height: 1.2;
    opacity: 0.92;
  }

  .clock-time {
    margin-left: 18px;
    font-size: 1.6rem;
    line-height: 1;
    letter-spacing: 0.02em;
  }
}

@media (max-width: 800px) {
  .header-clock {
    .clock-date {
      font-size: 0.85rem;
    }

    .clock-time {
      margin-left: 12px;
      font-size: 1.1rem;
    }
  }
}
</style>
