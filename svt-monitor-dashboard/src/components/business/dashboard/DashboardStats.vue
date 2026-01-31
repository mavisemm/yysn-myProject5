<!-- 统计数据展示区域：显示各类设备统计数据 -->
<template>
    <div class="stats-area">
        <div class="stats-grid">
            <div v-for="(stat, index) in stats" :key="index" class="stat-card" :class="`stat-card-${index}`">
                <div class="stat-content">
                    <div class="stat-icon">
                        <component :is="stat.icon" v-if="stat.icon" />
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
</script>

<style lang="scss" scoped>
.stats-area {
    flex: 0 0 calc(40% - 20px);
    overflow: hidden;
    box-sizing: border-box;
    background: url('@/assets/images/background/首页-数据统计背景.png') no-repeat center center;
    background-size: 100% 100%;

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        height: 100%;
        overflow: hidden;
        box-sizing: border-box;
        padding: 10px;

        .stat-card {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: clamp(14px, 2.5vw, 16px);
            font-weight: bold;
            color: white;
            box-sizing: border-box;
        }

        .stat-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            text-align: center;
            white-space: nowrap;
        }

        .stat-icon {
            font-size: clamp(30px, 4.5vw, 36px);
            margin-bottom: 8px;
        }

        .stat-text {
            font-size: clamp(18px, 2.5vw, 24px);
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .stat-number {
            font-size: clamp(24px, 3.5vw, 30px);
            font-weight: bold;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }
}
</style>