<template>
    <div class="card-item stats-card">
        <div class="card-header">
            <div class="card-title app-section-title">基本指标</div>
        </div>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">速度有效值</div>
                <div class="stat-value">{{ formatValue(vibrationData.velocityRms) }} <span class="unit">mm/s</span>
                </div>
            </div>
            <div class="stat-box">
                <div class="stat-label">速度最大值</div>
                <div class="stat-value">{{ formatValue(vibrationData.velocityMax) }} <span class="unit">mm/s</span>
                </div>
            </div>
            <div class="stat-box">
                <div class="stat-label">加速度有效值</div>
                <div class="stat-value">{{ formatValue(vibrationData.accelerationRms) }} <span class="unit">m/s²</span>
                </div>
            </div>
            <div class="stat-box">
                <div class="stat-label">加速度最大值</div>
                <div class="stat-value">{{ formatValue(vibrationData.accelerationMax) }} <span class="unit">m/s²</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getVibrationMetricData, type VibrationMetricData } from '@/api/modules/device'
import { ElMessage } from 'element-plus'

const route = useRoute()
const deviceId = computed(() => (route.query.deviceId as string) || '')
const pointId = computed(() => (route.query.pointId as string) || '')

const vibrationData = ref<VibrationMetricData>({
    velocityRms: 0,
    velocityMax: 0,
    accelerationRms: 0,
    accelerationMax: 0
})

const formatValue = (value: number): string => value.toFixed(2)

const loadVibrationData = async () => {
    if (!deviceId.value || !pointId.value) {
        ElMessage.warning('缺少设备或点位信息')
        return
    }
    try {
        const response = await getVibrationMetricData(deviceId.value, pointId.value)
        if (response.rc === 0 && response.ret) {
            vibrationData.value = {
                velocityRms: response.ret.velocityRms ?? 0,
                velocityMax: response.ret.velocityMax ?? 0,
                accelerationRms: response.ret.accelerationRms ?? 0,
                accelerationMax: response.ret.accelerationMax ?? 0
            }
        } else {
            ElMessage.warning('暂无振动数据')
        }
    } catch (error) {
        ElMessage.error('获取振动数据失败')
    }
}

onMounted(() => {
    loadVibrationData()
})
</script>

<style lang="scss" scoped>
.card-item {
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px 0 20px;

        .card-title {
            color: #fff;
        }
    }
}

.stats-card {
    width: 33.33%;

    .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 10px;
        flex: 1;
        padding: 10px 20px 20px;

        .stat-box {
            font-size: 0.9rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(150, 150, 150, 0.1);
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;

            .stat-label {
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 5px;
            }

            .stat-value {
                color: #00f2fe;
                font-size: 1rem;

                .unit {
                    font-weight: normal;
                    color: rgba(255, 255, 255, 0.5);
                    margin-left: 4px;
                    font-size: 0.9rem;
                }
            }
        }
    }
}
</style>