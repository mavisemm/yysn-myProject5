<template>
    <div class="dashboard">
        <div class="top-section">
            <div class="stats-area">
                <div class="stats-grid">
                    <div v-for="(stat, index) in stats" :key="index" class="stat-card" :class="`stat-card-${index}`">
                        {{ stat.title }}
                    </div>
                </div>
            </div>
            <div class="alarm-area">
                <h3>{{ alarmTitle }}</h3>
                <div class="alarm-grid">
                    <!-- 预警内容 -->
                    <slot name="alarms"></slot>
                </div>
            </div>
        </div>
        <div class="bottom-section">
            <div class="metrics-area">
                <div v-for="(metric, index) in metrics" :key="index" class="chart-container">
                    <h3>{{ metric.title }}</h3>
                    <slot :name="'metric-' + index"></slot>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { StatItem, MetricItem } from '@/types/device'

interface Props {
    stats: StatItem[];
    alarmTitle: string;
    metrics: MetricItem[];
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
        flex: 0 0 60%;
        display: flex;
        gap: 20px;
        padding-bottom: 20px;
        box-sizing: border-box;

        .stats-area {
            flex: 0 0 40%;
            background: white;
            padding: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-sizing: border-box;

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                height: 100%;
                overflow: hidden;
                box-sizing: border-box;

                .stat-card {
                    height: 100px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: bold;
                    color: white;
                    box-sizing: border-box;

                    &.stat-card-0 {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }

                    &.stat-card-1 {
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    }

                    &.stat-card-2 {
                        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    }

                    &.stat-card-3 {
                        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                    }
                }
            }
        }

        .alarm-area {
            flex: 0 0 60%;
            background: white;
            padding: 20px;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;

            h3 {
                margin-top: 0;
                margin-bottom: 16px;
            }

            .alarm-grid {
                flex: 1;
                overflow: hidden;
                box-sizing: border-box;
            }
        }
    }

    .bottom-section {
        flex: 0 0 40%;

        .metrics-area {
            height: 100%;
            display: flex;
            gap: 20px;
            overflow: hidden;
            box-sizing: border-box;

            >div {
                flex: 1;
                background: white;
                padding: 20px;
                border-radius: 8px;
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
                    }
                }
            }
        }
    }
}
</style>