<template>
    <div class="stats-area">
        <div class="header-section home-title home-title--device-monitor">
            <div class="header-section__left home-title__left">
                <img class="header-section__icon home-title__icon" src="@/assets/images/background/小图标.png" alt="" />
                <div class="title-with-legend">
                    <h3 class="app-section-title">设备监测</h3>
                </div>
            </div>
        </div>
        <div class="stats-grid">
            <div v-for="(stat, index) in stats" :key="index" class="stat-card"
                :class="[`stat-card-${index}`, (stat.title === '趋势预警设备' || stat.title === '故障报警设备') ? 'stat-card-trend' : '']"
                @click="handleCardClick(stat.title)">
                <div class="stat-content">
                    <div class="stat-icon" :class="{ 'stat-icon-blink': isAlertOrWarning(stat) }">
                        <img v-if="getIconSrc(stat.title)" :src="getIconSrc(stat.title)" :alt="stat.title"
                            class="stat-icon-img" />
                        <el-icon v-else>
                            <Monitor />
                        </el-icon>
                    </div>
                    <div class="stat-text-wrap">
                        <div class="stat-number">
                            <template v-for="(ch, i) in splitNumberChars(stat.number)" :key="i">
                                <span v-if="isSingleDigit(ch)" class="digit-bg">
                                    <span class="digit-text">{{ ch }}</span>
                                </span>
                                <span v-else class="digit-text digit-text-plain">{{ ch }}</span>
                            </template>
                        </div>
                        <div class="stat-text">{{ stat.title }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { StatItem } from '@/types/device'
import { Monitor } from '@element-plus/icons-vue'

interface Props {
    stats: StatItem[];
}

defineProps<Props>();

const emit = defineEmits<{
    (e: 'clickTrendWarning'): void;
    (e: 'clickFaultWarning'): void;
}>();

const ICON_BY_TITLE: Record<string, string> = {
    '健康设备': new URL('@/assets/images/background/首页-健康设备.png', import.meta.url).href,
    '监控总设备': new URL('@/assets/images/background/首页-监控总设备.png', import.meta.url).href,
    '趋势预警设备': new URL('@/assets/images/background/首页-趋势预警设备.png', import.meta.url).href,
    '故障报警设备': new URL('@/assets/images/background/首页-故障报警设备.png', import.meta.url).href,
};

const getIconSrc = (title: string) => {
    return ICON_BY_TITLE[title] || '';
};

const splitNumberChars = (value: StatItem['number']): string[] => {
    const str = String(value ?? 0);
    return str.split('');
};

const isSingleDigit = (ch: string): boolean => {
    return /^[0-9]$/.test(ch);
};

const handleCardClick = (title: string) => {
    if (title === '趋势预警设备') {
        emit('clickTrendWarning');
    } else if (title === '故障报警设备') {
        emit('clickFaultWarning');
    }
};
function isAlertOrWarning(stat: StatItem) {
    return (stat.title === '故障报警设备' || stat.title === '趋势预警设备') && Number(stat.number ?? 0) > 0;
}
</script>

<style lang="scss" scoped>
.stats-area {
    height: 100%;
    min-width: 0;
    min-height: 0;
    padding: 10px 10px 0 20px;
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
            background: url('@/assets/images/background/首页-数据统计小背景.png') no-repeat center center;
            background-size: 100% 100%;

            &.stat-card-trend {
                cursor: pointer;
                transition: all 0.3s ease;

                &:hover {
                    // background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                    // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
        }

        .stat-icon {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: clamp(24px, 6vw, 100px);
            margin-right: 10px;

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
            width: 100%;
            max-width: 100%;
            min-width: 0;
            font-weight: 500;
            letter-spacing: 0.5px;
            text-align: center;
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
        }

        .digit-bg {
            width: clamp(18px, 3vw, 44px);
            height: clamp(22px, 3.2vw, 50px);
            background: url('@/assets/images/background/数字背景.png') no-repeat center center;
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
</style>