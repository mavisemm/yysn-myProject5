<template>
    <div class="dashboard">
        <div class="top-section">
            <DashboardStats :stats="stats" />
            <AlarmOverview>
                <slot name="alarms"></slot>
            </AlarmOverview>
        </div>
        <div class="bottom-section">
            <ThreeMetrics :metrics="metrics" :rankings="rankings">
                <template v-for="(metric, index) in metrics" #[`metric-${index}`]>
                    <slot :name="'metric-' + index"></slot>
                </template>
            </ThreeMetrics>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { StatItem, MetricItem } from '@/types/device'
import DashboardStats from './dashboard/DashboardStats.vue'
import AlarmOverview from './dashboard/AlarmOverview.vue'
import ThreeMetrics from './dashboard/ThreeMetrics.vue'

interface RankingItem {
    deviceName: string;
    workshopName: string;
}

interface Props {
    stats: StatItem[];
    metrics: MetricItem[];
    rankings?: RankingItem[][];
}

defineProps<Props>();
</script>

<style lang="scss" scoped>
.dashboard {
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .top-section {
        height: 60%;
        display: flex;
        gap: 15px;
        padding-bottom: 15px;
        box-sizing: border-box;
    }

    .bottom-section {
        height: 40%;
    }
}
</style>