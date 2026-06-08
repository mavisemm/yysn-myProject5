<template>
  <div
    class="stats-area"
    :class="{
      'stats-area--alarm': variant === 'alarm',
      'stats-area--trend-pair': isTrendPairLayout,
    }"
  >
    <div class="header-section home-title home-title--device-monitor">
      <div class="header-section__left home-title__left">
        <img class="header-section__icon home-title__icon" src="@/assets/images/background/小图标.webp" alt="" />
        <div class="title-with-legend">
          <h3 class="app-section-title">设备监测</h3>
        </div>
      </div>
    </div>

    <!-- 设备驾驶舱：四宫格，数字在上、标题在下 -->
    <div v-if="variant === 'default'" class="stats-grid">
      <div
        v-for="(stat, index) in stats"
        :key="index"
        class="stat-card"
        :class="[
          `stat-card-${index}`,
          isTrendStat(stat.title) ? 'stat-card-trend' : '',
        ]"
        @click="handleCardClick(stat.title)"
      >
        <div class="stat-content">
          <div class="stat-icon" :class="{ 'stat-icon-blink': isAlertOrWarning(stat) }">
            <img v-if="getIconSrc(stat.title)" :src="getIconSrc(stat.title)" :alt="stat.title" class="stat-icon-img" />
            <el-icon v-else>
              <Monitor />
            </el-icon>
          </div>
          <div class="stat-text-wrap">
            <div class="stat-number mobile-font-number">
              <template v-for="(ch, i) in splitNumberChars(stat.number)" :key="i">
                <span v-if="isSingleDigit(ch)" class="digit-bg">
                  <span class="digit-text mobile-font-number">{{ ch }}</span>
                </span>
                <span v-else class="digit-text digit-text-plain mobile-font-number">{{ ch }}</span>
              </template>
            </div>
            <div class="stat-text mobile-font-title">{{ stat.title }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 报警管理：标题下方小卡片，横向 图标 + 文字 + 数字 -->
    <div v-else-if="variant === 'alarm'" class="stats-grid stats-grid--alarm">
      <div
        v-for="(stat, index) in stats"
        :key="index"
        class="stat-card stat-card--alarm"
        :class="[
          `stat-card-${index}`,
          isTrendStat(stat.title) ? 'stat-card-trend' : '',
        ]"
        @click="handleCardClick(stat.title)"
      >
        <div class="stat-content stat-content--alarm-row">
          <div class="stat-icon" :class="{ 'stat-icon-blink': isAlertOrWarning(stat) }">
            <img v-if="getIconSrc(stat.title)" :src="getIconSrc(stat.title)" :alt="stat.title" class="stat-icon-img" />
            <el-icon v-else>
              <Monitor />
            </el-icon>
          </div>
          <div class="stat-text mobile-font-title">{{ stat.title }}</div>
          <div class="stat-number stat-number--alarm mobile-font-number">
            <template v-for="(ch, i) in splitNumberChars(stat.number)" :key="i">
              <span v-if="isSingleDigit(ch)" class="digit-bg">
                <span class="digit-text mobile-font-number">{{ ch }}</span>
              </span>
              <span v-else class="digit-text digit-text-plain mobile-font-number">{{ ch }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatItem } from '@/types/device'
import { Monitor } from '@element-plus/icons-vue'

interface Props {
  stats: StatItem[]
  /** default：驾驶舱四宫格；alarm：报警管理双卡片横排 */
  variant?: 'default' | 'alarm'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})

const TREND_STAT_TITLES = new Set(['声音趋势预警', '振动烈度报警'])

const isTrendStat = (title: string) => TREND_STAT_TITLES.has(title)

const isTrendPairLayout = computed(
  () =>
    props.variant === 'default' &&
    props.stats.length > 0 &&
    props.stats.every((s) => isTrendStat(s.title)),
)

const emit = defineEmits<{
  (e: 'clickTrendWarning'): void
  (e: 'clickFaultWarning'): void
}>()

const ICON_BY_TITLE: Record<string, string> = {
  健康设备: new URL('@/assets/images/background/首页-健康设备.webp', import.meta.url).href,
  监控总设备: new URL('@/assets/images/background/首页-监控总设备.webp', import.meta.url).href,
  声音趋势预警: new URL('@/assets/images/background/首页-声音趋势预警.webp', import.meta.url).href,
  振动烈度报警: new URL('@/assets/images/background/首页-振动烈度报警.webp', import.meta.url).href,
}

const getIconSrc = (title: string) => {
  return ICON_BY_TITLE[title] || ''
}

const splitNumberChars = (value: StatItem['number']): string[] => {
  const str = String(value ?? 0)
  return str.split('')
}

const isSingleDigit = (ch: string): boolean => {
  return /^[0-9]$/.test(ch)
}

const handleCardClick = (title: string) => {
  if (title === '声音趋势预警') {
    emit('clickTrendWarning')
  } else if (title === '振动烈度报警') {
    emit('clickFaultWarning')
  }
}

function isAlertOrWarning(stat: StatItem) {
  return (
    (stat.title === '振动烈度报警' || stat.title === '声音趋势预警') && Number(stat.number ?? 0) > 0
  )
}
</script>

<style lang="scss" scoped>
.stats-area {
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 10px 10px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex: 0 0 auto;
    min-width: 0;

    .header-section__left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1 1 auto;
      min-width: 0;
    }

    .title-with-legend {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 0 0 auto;
      min-width: 0;
    }

    h3 {
      margin: 0;
      font-weight: 500;
      white-space: nowrap;
    }
  }

  &.stats-area--alarm {
    height: auto;
    flex: 0 0 auto;
    padding-bottom: 0;
  }

  &.stats-area--trend-pair .stats-grid:not(.stats-grid--alarm) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
    padding-top: 10px;

    &--alarm {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      flex: 0 0 auto;
      height: auto;
      min-height: 88px;
    }

    .stat-card {
      min-width: 0;
      min-height: 0;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      color: white;
      box-sizing: border-box;
      background: url('@/assets/images/background/首页-数据统计小背景.webp') no-repeat center center;
      background-size: 100% 100%;

      &--alarm {
        min-height: 88px;
        height: auto;
      }

      &.stat-card-trend {
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
        }
      }
    }

    .stat-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
      padding: 0 4px;

      &--alarm-row {
        justify-content: flex-start;
        gap: 10px;
        padding: 0 14px;
      }
    }

    .stat-icon {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: clamp(24px, 6vw, 100px);
      margin-right: 10px;

      .stat-content--alarm-row & {
        width: clamp(32px, 4.5vw, 56px);
        margin-right: 0;
      }

      .stat-icon-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      &.stat-icon-blink .stat-icon-img {
        animation: stat-icon-blink 1.5s ease-in-out infinite;
      }
    }

    @keyframes stat-icon-blink {
      0%,
      100% {
        opacity: 1;
      }

      50% {
        opacity: 0.2;
      }
    }

    .stat-text-wrap {
      flex: 0 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .stat-text {
      font-size: 1.05rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-align: center;

      .stat-content--alarm-row & {
        flex: 1 1 auto;
        text-align: left;
      }
    }

    .stat-number {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-weight: 500;
      letter-spacing: 0.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 1.8rem;
      line-height: 1;

      &--alarm {
        flex: 0 0 auto;
        margin-left: auto;
      }
    }

    .digit-bg {
      width: clamp(18px, 3vw, 44px);
      height: clamp(22px, 3.2vw, 50px);
      background: url('@/assets/images/background/数字背景.webp') no-repeat center center;
      background-size: 100% 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }

    .digit-text {
      color: #fff;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .digit-text-plain {
      background: none;
    }
  }
}

@media (max-width: 800px) {
  .stats-area {
    padding: 10px 10px 0 10px;

    .stats-grid:not(.stats-grid--alarm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
      align-content: stretch;
      gap: 10px;
    }

    .stats-grid--alarm {
      grid-template-columns: 1fr;
    }

    .stats-grid .stat-icon {
      width: 50px;
    }
  }
}
</style>
