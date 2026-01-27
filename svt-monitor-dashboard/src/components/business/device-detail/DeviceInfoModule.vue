<template>
    <div class="device-info-module">
        <div class="module-header">
            <div class="header-main">
                <h3 class="module-title" v-if="!isCollapsed">设备信息</h3>
                <div class="device-name" v-if="isCollapsed">{{ deviceInfo.deviceName }}</div>
                <div class="header-actions">
                    <el-button v-if="!isCollapsed" type="primary" size="small" @click="toggleEdit" class="edit-btn">
                        {{ isEditing ? '保存' : '编辑' }}
                    </el-button>
                    <el-button type="primary" size="small" @click="toggleCollapse" class="collapse-btn">
                        {{ isCollapsed ? '展开' : '收起' }}
                    </el-button>
                </div>
            </div>
        </div>
        <div class="device-main">
            <div class="device-basic-info" v-show="!isCollapsed">
                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label">设备名称：</span>
                        <span class="info-value">{{ deviceInfo.deviceName }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">设备型号：</span>
                        <span class="info-value">{{ deviceInfo.model }}</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label">设备名称：</span>
                        <el-input v-model="editForm.deviceName" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label">设备型号：</span>
                        <el-input v-model="editForm.model" size="small" class="info-input" />
                    </div>
                </div>

                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label">生产厂家：</span>
                        <span class="info-value">{{ deviceInfo.manufacturer }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">安装位置：</span>
                        <span class="info-value">{{ deviceInfo.installationLocation }}</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label">生产厂家：</span>
                        <el-input v-model="editForm.manufacturer" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label">安装位置：</span>
                        <el-input v-model="editForm.installationLocation" size="small" class="info-input" />
                    </div>
                </div>

                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label">工作转速：</span>
                        <span class="info-value">{{ deviceInfo.operatingSpeed }} rpm</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">设计流量：</span>
                        <span class="info-value">{{ deviceInfo.designFlow }} m³/h</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label">工作转速：</span>
                        <el-input v-model="editForm.operatingSpeed" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label">设计流量：</span>
                        <el-input v-model="editForm.designFlow" size="small" class="info-input" />
                    </div>
                </div>

                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label">压力：</span>
                        <span class="info-value">{{ deviceInfo.pressure }} MPa</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">最近预警时间：</span>
                        <span class="info-value">{{ deviceInfo.lastAlarmTime }}</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label">压力：</span>
                        <el-input v-model="editForm.pressure" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label">最近预警时间：</span>
                        <el-input v-model="editForm.lastAlarmTime" size="small" class="info-input" />
                    </div>
                </div>
            </div>

            <!-- 设备健康度仪表盘 -->
            <div class="health-gauge-container" v-show="!isCollapsed">
                <div class="gauge-header">
                    <el-button type="primary" size="small" @click="toggleHealthType" class="switch-health-btn">
                        切换{{ healthType === '声音' ? '震动' : '声音' }}健康度
                    </el-button>
                </div>
                <div class="gauge-wrapper">
                    <div ref="gaugeRef" class="gauge"></div>
                    <!-- <div class="gauge-center-text">
                    <div class="gauge-score">{{ currentHealthScore }}分</div>
                </div> -->
                </div>
            </div>

            <!-- 设备图片 -->
            <div class="device-image-container" v-show="!isCollapsed">
                <img src="@/assets/images/background/设备详情页-设备实物图.png" alt="设备图片" class="device-image" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { ElButton, ElInput, ElMessage } from 'element-plus'
import * as echarts from 'echarts'

// 定义设备信息类型
interface DeviceInfo {
    deviceName: string,
    model: string,
    manufacturer: string,
    installationLocation: string,
    operatingSpeed: string,
    designFlow: string,
    pressure: string,
    lastAlarmTime: string
}

// 设备信息
const props = defineProps<{
    deviceInfo: DeviceInfo
}>()

const emit = defineEmits(['update:device-info'])

// 编辑状态
const isEditing = ref(false)
const editForm = ref<DeviceInfo>({ ...props.deviceInfo })

// 折叠状态
const isCollapsed = ref(false)

// 健康度相关
const healthType = ref('声音')
const currentHealthScore = ref(85)
const gaugeRef = ref<HTMLDivElement>()
let gaugeChart: echarts.ECharts | null = null

// 切换折叠状态
const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value
}

// 切换编辑状态
const toggleEdit = () => {
    if (isEditing.value) {
        // 保存编辑
        Object.assign(props.deviceInfo, editForm.value)
        emit('update:device-info', { ...editForm.value })
        ElMessage.success('设备信息已更新')
    } else {
        // 进入编辑模式
        Object.assign(editForm.value, props.deviceInfo)
    }
    isEditing.value = !isEditing.value
}

// 切换健康度类型
const toggleHealthType = () => {
    healthType.value = healthType.value === '声音' ? '震动' : '声音'
    // 更新分数，模拟不同健康度的分数
    currentHealthScore.value = healthType.value === '声音' ? 85 : 78
    nextTick(() => {
        initGaugeChart()
    })
}

// 初始化仪表盘
const initGaugeChart = () => {
    if (!gaugeRef.value) return

    if (gaugeChart) {
        gaugeChart.dispose()
    }

    gaugeChart = echarts.init(gaugeRef.value)

    const score = currentHealthScore.value

    let healthColor = ''
    if (score >= 80) {
        healthColor = '#2E7D32' // 深绿色
    } else if (score >= 60) {
        healthColor = '#8bf58fff' // 淡绿色
    } else if (score >= 40) {
        healthColor = '#FFC107' // 黄色
    } else if (score >= 20) {
        healthColor = '#FF9800' // 橙色
    } else {
        healthColor = '#FF5722' // 红色
    }

    const option = {
        series: [
            {
                type: 'gauge',
                center: ['50%', '60%'],
                radius: '90%',
                startAngle: 210,
                endAngle: -30,
                min: 0,
                max: 100,
                splitNumber: 5,
                progress: {
                    show: false
                },
                pointer: {
                    show: false, // 隐藏指针
                },
                axisLine: {
                    lineStyle: {
                        width: 12,
                        color: [
                            [0.2, '#FF5722'], // 0-20 红色
                            [0.4, '#FF9800'], // 20-40 橙色
                            [0.6, '#FFC107'], // 40-60 黄色
                            [0.8, '#8bf58fff'], // 60-80 淡绿色
                            [1, '#2E7D32'] // 80-100 深绿色
                        ]
                    }
                },
                axisTick: {
                    show: false,
                },
                splitLine: {
                    show: false
                },
                axisLabel: {
                    show: true,
                    distance: -35, // 调整标签距离
                    fontSize: 12,
                    color: '#fff',
                    formatter: function (value: number) {
                        if (value % 20 === 0) { // 每20分显示一个刻度
                            return value.toString();
                        }
                        return '';
                    }
                },
                anchor: {
                    show: false, // 隐藏锚点
                },
                title: {
                    show: true, // 隐藏标题  
                    color: healthColor,
                    fontSize: 25,
                    fontWeight: 'bolder',
                    offsetCenter: [0, '0%'],
                },
                detail: {
                    valueAnimation: true,
                    offsetCenter: [0, '-30%'],
                    fontSize: 35,
                    fontWeight: 'bolder',
                    formatter: '{value}',
                    color: healthColor,
                },
                data: [
                    {
                        value: score,
                        name: '设备健康度'
                    }
                ]
            }
        ]
    };

    gaugeChart.setOption(option)
}

onMounted(() => {
    nextTick(() => {
        initGaugeChart()
    })
})

// 窗口大小改变时，重新调整图表大小
window.addEventListener('resize', () => {
    if (gaugeChart) gaugeChart.resize()
})

// 组件卸载时清理资源
onUnmounted(() => {
    if (gaugeChart) gaugeChart.dispose()
})
</script>

<style lang="scss" scoped>
.device-info-module {
    width: 25vw;
    min-width: 300px;
    background: url('@/assets/images/background/设备详情页-设备信息背景.png') no-repeat center center;
    background-size: 100% 100%;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    /* 允许flex子项收缩 */
    overflow: hidden;
    /* 防止内容溢出 */


    .module-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;

        .header-main {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;

            .module-title {
                margin: 0;
                font-size: clamp(22px, 3vw, 26px);
                font-weight: 600;
            }

            .device-name {
                margin: 0;
                font-size: clamp(22px, 3vw, 26px);
                font-weight: 600;
                color: white;
            }

            .header-actions {
                display: flex;
                gap: 10px;
            }

            .edit-btn {
                font-size: 12px;
            }

            .collapse-btn {
                font-size: 12px;
            }
        }




    }

    .device-main {
        flex: 1;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-height: 0;
        /* 允许flex子项收缩 */
        overflow: auto;
        /* 防止内容溢出 */

        .device-basic-info {
            flex: 1;
            /* 占据剩余空间 */
            min-height: 0;
            /* 允许内容区域收缩 */
            overflow-y: auto;
            /* 当内容过多时显示滚动条 */

            .info-row {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;

                .info-item {
                    flex: 1;
                    min-width: 0;
                    /* 允许flex子项收缩 */
                    display: flex;
                    flex-direction: column;

                    .info-label {
                        font-size: 12px;
                        color: #c0c4cc;
                        margin-bottom: 5px;
                    }

                    .info-value {
                        font-size: 14px;
                        color: white;
                        font-weight: 500;
                    }

                    .info-input {
                        width: 100%;
                    }
                }
            }
        }

        .health-gauge-container {
            flex-shrink: 0;
            /* 防止过度收缩 */

            .gauge-header {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                margin-bottom: 10px;

                .switch-health-btn {
                    font-size: 12px;
                }
            }

            .gauge-wrapper {
                position: relative;
                height: 200px;
                width: 100%;

                .gauge {
                    width: 100%;
                    height: 100%;
                }

                .gauge-center-text {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;

                    .gauge-score {
                        font-size: 20px;
                        font-weight: bold;
                        color: white;
                    }
                }
            }
        }

        .device-image-container {
            flex-shrink: 0;
            /* 防止图片区域过度收缩 */

            .device-image {
                width: 100%;
                height: 150px;
                object-fit: cover;
                border-radius: 8px;
            }
        }
    }


}
</style>