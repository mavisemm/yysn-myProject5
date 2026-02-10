<!-- 统计数据展示区域：显示各类设备统计数据 -->
<template>
    <div class="stats-area">
        <div class="stats-grid">
            <div v-for="(stat, index) in stats" :key="index" class="stat-card"
                :class="[`stat-card-${index}`, (stat.title === '趋势预警设备' || stat.title === '故障报警设备') ? 'stat-card-trend' : '']"
                @click="handleCardClick(stat.title)">
                <div class="stat-content">
                    <div class="stat-icon">
                        <img v-if="index === 0" src="@/assets/images/background/首页-健康设备数.png" alt="健康设备数"
                            class="stat-icon-img" />
                        <img v-else-if="index === 1" src="@/assets/images/background/首页-预警设备数.png" alt="预警设备数"
                            class="stat-icon-img" />
                        <img v-else-if="index === 2" src="@/assets/images/background/首页-监控总设备数.png" alt="监控总设备数"
                            class="stat-icon-img" />
                        <img v-else-if="index === 3" src="@/assets/images/background/首页-监测点位数.png" alt="监测点位数"
                            class="stat-icon-img" />
                        <el-icon v-else>
                            <Monitor />
                        </el-icon>
                    </div>
                    <div class="stat-text">{{ stat.title }}</div>
                    <div class="stat-number">{{ stat.number }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { StatItem } from '@/types/device'
import { Monitor } from '@element-plus/icons-vue'

/**
 * 组件属性接口
 */
interface Props {
    stats: StatItem[];
}

defineProps<Props>();

const emit = defineEmits<{
    (e: 'clickTrendWarning'): void;
    (e: 'clickFaultWarning'): void;
}>();

const handleCardClick = (title: string) => {
    if (title === '趋势预警设备') {
        emit('clickTrendWarning');
    } else if (title === '故障报警设备') {
        emit('clickFaultWarning');
    }
};
</script>

<style lang="scss" scoped>
.stats-area {
    flex: 1 1 calc(40% - 20px);
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
    background: url('@/assets/images/background/首页-数据统计背景.png') no-repeat center center;
    background-size: 100% 100%;

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: clamp(6px, 1.2vw, 15px);
        height: 100%;
        min-height: 0;
        min-width: 0;
        overflow: hidden;
        box-sizing: border-box;
        padding: clamp(4px, 1vw, 10px);

        .stat-card {
            min-width: 0;
            min-height: 0;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: clamp(10px, 1.8vw, 16px);
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
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-width: 100%;
            height: 100%;
            min-height: 0;
            min-width: 0;
            text-align: center;
            white-space: nowrap;
            gap: clamp(2px, 0.5vw, 6px);
        }

        .stat-icon {
            flex: 1 1 0;
            min-height: 0;
            max-height: 50%;
            display: flex;
            align-items: center;
            justify-content: center;

            .stat-icon-img {
                width: auto;
                height: 100%;
                max-height: 100%;
                min-height: 20px;
                object-fit: contain;
            }
        }

        .stat-text {
            /* 以 22px 為主的自適應字體大小 */
            font-size: clamp(18px, 2vw, 22px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            font-weight: 500;
            letter-spacing: 1.22px;
        }

        .stat-number {
            /* 以 26px 為主的自適應字體大小 */
            font-size: clamp(20px, 2.5vw, 26px);
            // font-weight: bold;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            font-weight: 500;
            letter-spacing: 1.22px;
        }
    }
}
</style>