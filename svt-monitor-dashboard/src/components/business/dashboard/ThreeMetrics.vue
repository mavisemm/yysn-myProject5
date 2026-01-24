<template>
    <div class="metrics-area">
        <div v-for="(metric, index) in metrics" :key="index" class="chart-container">
            <h3>{{ metric.title }}</h3>
            <slot :name="'metric-' + index"></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { MetricItem } from '@/types/device'

interface Props {
    metrics: MetricItem[];
}

defineProps<Props>();
</script>

<style lang="scss" scoped>
.metrics-area {
    height: 100%;
    display: flex;
    gap: 15px;
    overflow: hidden;
    box-sizing: border-box;
    background: url('@/assets/images/background/Top5背景.png') no-repeat center center;
    background-size: 100% 100%;
    padding: 10px 0 0;

    >div {
        flex: 1;
        padding: 10px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-sizing: border-box;

        .chart-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;

            h3 {
                margin-top: 0;
                margin-bottom: 16px;
                text-align: center !important;
            }
        }
    }
}
</style>