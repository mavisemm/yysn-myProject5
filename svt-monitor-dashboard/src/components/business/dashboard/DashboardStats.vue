<!-- 统计数据展示区域：显示各类设备统计数据 -->
<template>
    <div class="stats-area">
        <div class="stats-grid">
            <div v-for="(stat, index) in stats" :key="index" class="stat-card"
                :class="[`stat-card-${index}`, (stat.title === '趋势预警设备' || stat.title === '故障报警设备') ? 'stat-card-trend' : '']"
                @click="handleCardClick(stat.title)">
                <div class="stat-content">
                    <div class="stat-icon" :class="{ 'stat-icon-blink': isAlertOrWarning(stat) }">
                        <img v-if="getIconSrc(stat.title)" :src="getIconSrc(stat.title)" :alt="stat.title"
                            class="stat-icon-img" />
                        <el-icon v-else><Monitor /></el-icon>
                    </div>
                    <div class="stat-text-wrap">
                        <div class="stat-number">{{ stat.number }}</div>
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
    '健康设备': new URL('@/assets/images/background/首页-健康设备数.png', import.meta.url).href,
    '监控总设备': new URL('@/assets/images/background/首页-监控总设备数.png', import.meta.url).href,
    '趋势预警设备': new URL('@/assets/images/background/首页-监测点位数.png', import.meta.url).href,
    '故障报警设备': new URL('@/assets/images/background/首页-预警设备数.png', import.meta.url).href,
};

const getIconSrc = (title: string) => {
    return ICON_BY_TITLE[title] || '';
};

const handleCardClick = (title: string) => {
    if (title === '趋势预警设备') {
        emit('clickTrendWarning');
    } else if (title === '故障报警设备') {
        emit('clickFaultWarning');
    }
};

/** 有报警或预警时（数量 > 0）返回 true，用于图标闪烁 */
function isAlertOrWarning(stat: StatItem) {
    return (stat.title === '故障报警设备' || stat.title === '趋势预警设备') && Number(stat.number ?? 0) > 0;
}
</script>

<style lang="scss" scoped>
.stats-area {
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
    background: url('@/assets/images/background/首页-Top5背景.png') no-repeat center center;
    background-size: 100% 100%;

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        height: 100%;
        min-height: 0;
        min-width: 0;
        overflow: hidden;
        box-sizing: border-box;
        padding: 10px 20px;

        .stat-card {
            min-width: 0;
            min-height: 0;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            /* 统计卡片基础文字大小，随根字号自适应 */
            font-size: 0.9rem;
            // font-weight: bold;
            color: white;
            box-sizing: border-box;
            border-radius: 8px;

            &.stat-card-trend {
                cursor: pointer;
                transition: all 0.3s ease;

                &:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
            /* 随视口缩放：小屏 24px，大屏最大 52px */
            width: clamp(24px, 5vw, 58px);
            margin-right: 10px;

            .stat-icon-img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }

            /* 有报警/预警时图标闪烁 */
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
            /* 统计标题文字 */
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
            /* 数值文字 */
            font-size: 1.8rem;
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
    }
}
</style>