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

// 从路由获取真实参数
const deviceId = computed(() => (route.query.deviceId as string) || '')
const pointId = computed(() => (route.query.pointId as string) || '')

// 振动数据响应式变量
const vibrationData = ref<VibrationMetricData>({
    velocityRms: 0,
    velocityMax: 0,
    accelerationRms: 0,
    accelerationMax: 0
})

// 格式化数值显示
const formatValue = (value: number): string => {
    return value.toFixed(2)
}

// 加载振动数据
const loadVibrationData = async () => {
    // 检查必要参数
    if (!deviceId.value || !pointId.value) {
        console.warn('缺少 deviceId 或 pointId 参数')
        ElMessage.warning('缺少设备或点位信息')
        return
    }

    try {
        const response = await getVibrationMetricData(deviceId.value, pointId.value)
        if (response.rc === 0 && response.ret) {
            // 验证数据完整性，确保所有字段都有值
            const validData = {
                velocityRms: response.ret.velocityRms ?? 0,
                velocityMax: response.ret.velocityMax ?? 0,
                accelerationRms: response.ret.accelerationRms ?? 0,
                accelerationMax: response.ret.accelerationMax ?? 0
            }
            vibrationData.value = validData
        } else {
            // 接口返回错误或无数据时，保持默认值并显示提示
            console.warn('振动数据接口返回空数据或错误:', response)
            ElMessage.warning('暂无振动数据')
        }
    } catch (error) {
        console.error('获取振动数据失败:', error)
        // 网络错误时也保持模块显示
        ElMessage.warning('获取振动数据失败，显示默认值')
    }
}

// 组件挂载时加载数据
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
        padding: 20px 20px 0 20px;

        .card-title {
            font-size: clamp(16px, 1.5vw, 20px);
            //font-weight: bold;
            color: #fff;
        }
    }

    .chart-container {
        flex: 1;
        width: 100%;
        min-height: 0;
        padding: 20px;
    }
}

.stats-card {
    width: 33.33%;
    background: url('@/assets/images/background/首页-数据统计背景.png') no-repeat center center;
    background-size: 100% 100%;

    .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 15px;
        flex: 1;
        padding: 20px;

        .stat-box {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(150, 150, 150, 0.1);
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;

            .stat-label {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 5px;
            }

            .stat-value {
                font-size: 20px;
                //font-weight: bold;
                color: #00f2fe;

                .unit {
                    font-size: 12px;
                    font-weight: normal;
                    color: rgba(255, 255, 255, 0.5);
                    margin-left: 4px;
                }
            }
        }
    }
}
</style>