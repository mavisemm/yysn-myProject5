<template>
    <div class="device-info-module">
        <div class="module-header">
            <div class="header-main">
                <h3 class="module-title">设备信息</h3>
                <div class="header-actions">
                    <el-button type="primary" size="small" @click="toggleEdit" class="edit-btn">
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
                        <span class="info-value">{{ deviceInfo.deviceModel }}</span>
                    </div>
                </div>

                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label">设备名称：</span>
                        <el-input v-model="editForm.deviceName" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label">设备型号：</span>
                        <el-input v-model="editForm.deviceModel" size="small" class="info-input" />
                    </div>
                </div>

                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label">生产厂家：</span>
                        <span class="info-value">{{ deviceInfo.deviceFactory }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">安装位置：</span>
                        <span class="info-value">{{ deviceInfo.locationDetail }}</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label">生产厂家：</span>
                        <el-input v-model="editForm.deviceFactory" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label">安装位置：</span>
                        <el-input v-model="editForm.locationDetail" size="small" class="info-input" />
                    </div>
                </div>

                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label">工作转速：</span>
                        <span class="info-value">{{ deviceInfo.rotationSpeed }} rpm</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">设计流量：</span>
                        <span class="info-value">{{ deviceInfo.designFlow }} m³/h</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label">工作转速：</span>
                        <el-input v-model="editForm.rotationSpeed" size="small" class="info-input" />
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
                        <!-- 在线状态已移除 -->
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label">压力：</span>
                        <el-input v-model="editForm.pressure" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <!-- 在线状态已移除 -->
                    </div>
                </div>
            </div>

            <div class="health-gauge-container">
                <div class="gauge-header">
                    <el-button type="primary" size="small" @click="toggleHealthType" class="switch-health-btn">
                        切换{{ healthType === '声音' ? '振动' : '声音' }}健康度
                    </el-button>
                </div>
                <div class="gauge-wrapper">
                    <div ref="gaugeRef" class="gauge"></div>
                </div>
            </div>

            <!-- 设备图片 - 总是显示 -->
            <div class="device-image-container">
                <img src="@/assets/images/background/设备详情页-设备实物图.png" alt="设备图片" class="device-image" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { ElButton, ElInput, ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getDeviceInfoByDeviceId, editDeviceInfo, getDeviceHealth, type DeviceInfoDto, type DeviceHealthResponse } from '@/api/modules/hardware'

// 定义设备信息类型 - 对应API返回的数据结构
interface DeviceInfo {
    id: number;
    deviceId: string;
    deviceName: string;
    deviceModel: string;
    deviceFactory: string;
    locationDetail: string;
    pressure: number;
    rotationSpeed: number;
    designFlow: number;
    onlineStatus: number;
    createdTime: string | null;
    updatedTime: string | null;
}

// 设备信息prop
const props = defineProps<{
    deviceId: string
}>()

// 设备信息响应式数据
const deviceInfo = ref<DeviceInfo>({
    id: 0,
    deviceId: '',
    deviceName: '加载中...',
    deviceModel: '',
    deviceFactory: '',
    locationDetail: '',
    pressure: 0,
    rotationSpeed: 0,
    designFlow: 0,
    onlineStatus: 0,
    createdTime: null,
    updatedTime: null
})

// 加载设备信息
const loadDeviceInfo = async () => {
    if (!props.deviceId) return;

    try {
        const response = await getDeviceInfoByDeviceId(props.deviceId);
        if (response.rc === 0 && response.ret) {
            deviceInfo.value = response.ret;
        } else {
            ElMessage.error('获取设备信息失败');
        }
    } catch (error) {
        console.error('获取设备信息失败:', error);
        ElMessage.error('获取设备信息失败');
    }
}

// 并行加载设备信息和健康度（根据用户记忆要求）
const loadDeviceDataParallel = async () => {
    if (!props.deviceId) return;

    try {
        // 并行执行设备信息和健康度查询
        const [infoResponse, healthResponse] = await Promise.all([
            getDeviceInfoByDeviceId(props.deviceId),
            getDeviceHealth({
                deviceId: props.deviceId,
                type: 'sound'
            })
        ]);

        // 处理设备信息响应
        if (infoResponse.rc === 0 && infoResponse.ret) {
            deviceInfo.value = infoResponse.ret;
        } else {
            ElMessage.error('获取设备信息失败');
        }

        // 处理健康度响应
        if (healthResponse.rc === 0 && healthResponse.ret) {
            currentHealthScore.value = healthResponse.ret.healthScore;
            nextTick(() => {
                initGaugeChart();
            });
        }
    } catch (error) {
        console.error('并行加载设备数据失败:', error);
        ElMessage.error('加载设备数据失败');
    }
}

// 监听deviceId变化
watch(() => props.deviceId, (newId) => {
    if (newId) {
        loadDeviceDataParallel();
    }
}, { immediate: true })

// 编辑状态
const isEditing = ref(false)
const editForm = ref<DeviceInfo>({ ...deviceInfo.value })

// 折叠状态
const isCollapsed = ref(false)

// 健康度相关
const healthType = ref('声音')
const currentHealthScore = ref(98) // 默认声音健康度分数
const healthTitle = ref('声音健康度')
const gaugeRef = ref<HTMLDivElement>()
let gaugeChart: echarts.ECharts | null = null

// 响应式字体/距离计算（供初始化与 resize 时按当前容器尺寸重建 option）
const calculateResponsiveFontSize = (baseSize: number, containerWidth: number, containerHeight: number) => {
    const baseDimension = Math.min(containerWidth, containerHeight)
    const scaleRatio = Math.min(baseDimension / 200, 2)
    return Math.max(baseSize * scaleRatio, baseSize * 0.5)
}
const calculateResponsiveDistance = (baseDistance: number, containerWidth: number, containerHeight: number) => {
    const baseDimension = Math.min(containerWidth, containerHeight)
    const scaleRatio = Math.min(baseDimension / 200, 2)
    return Math.max(baseDistance * scaleRatio, baseDistance * 0.5)
}

// 根据当前容器尺寸生成仪表盘 option（resize 时用新尺寸重新调用，实现自适应字体与布局）
const buildGaugeOption = (containerWidth: number, containerHeight: number) => {
    const score = currentHealthScore.value
    let healthColor = ''
    if (score >= 80) healthColor = '#309735'
    else if (score >= 60) healthColor = '#85ea8c'
    else if (score >= 20) healthColor = '#f2b504'
    else healthColor = '#ff5722'

    const axisLabelFontSize = Math.round(calculateResponsiveFontSize(15, containerWidth, containerHeight))
    const titleFontSize = Math.round(calculateResponsiveFontSize(20, containerWidth, containerHeight))
    const detailFontSize = Math.round(calculateResponsiveFontSize(24, containerWidth, containerHeight))

    return {
        series: [{
            type: 'gauge',
            center: ['50%', '60%'],
            radius: '80%',
            startAngle: 210,
            endAngle: -30,
            min: 0,
            max: 100,
            splitNumber: 10,
            progress: { show: false },
            pointer: { show: false },
            axisLine: {
                roundCap: true,  // 使用 Sausage 形状绘制弧线，两端圆润（lineStyle 的 cap/join 对 gauge 不生效）
                lineStyle: {
                    width: Math.round(12 * Math.min(containerWidth / 300, 2)),
                    color: [[0.2, '#ff5722'], [0.6, '#f2b504'], [0.8, '#85ea8c'], [1, '#309735']]
                }
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: {
                show: true,
                distance: calculateResponsiveDistance(-105, containerWidth, containerHeight),
                fontSize: axisLabelFontSize,
                color: '#fff',
                formatter: function (value: number) {
                    if (value === 0) return '{stop|0}'
                    if (value === 10) return '{stop|停机}'
                    if (value === 20) return '{stop|20}'
                    if (value === 40) return '{inspect|巡检}'
                    if (value === 60) return '{inspect|60}'
                    if (value === 70) return '{focus|关注}'
                    if (value === 80) return '{focus|80}'
                    if (value === 90) return '{health|健康}'
                    if (value === 100) return '{health|100}'
                    return ''
                },
                rich: {
                    stop: { color: '#ff5722', fontSize: axisLabelFontSize },
                    inspect: { color: '#f2b504', fontSize: axisLabelFontSize },
                    focus: { color: '#85ea8c', fontSize: axisLabelFontSize },
                    health: { color: '#309735', fontSize: axisLabelFontSize }
                }
            },
            anchor: { show: false },
            title: {
                show: true,
                color: healthColor,
                fontSize: titleFontSize,
                fontWeight: 'bolder',
                offsetCenter: [0, '0%']
            },
            detail: {
                valueAnimation: true,
                offsetCenter: [0, '-30%'],
                fontSize: detailFontSize,
                fontWeight: 'bolder',
                formatter: '{value}',
                color: healthColor
            },
            data: [{ value: score, name: healthTitle.value }]
        }]
    }
}

// 切换折叠状态
const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value
}

// 切换编辑状态
const toggleEdit = async () => {
    if (isEditing.value) {
        // 保存编辑
        try {
            // 构造要发送的设备信息对象
            const deviceInfoDto: DeviceInfoDto = {
                id: deviceInfo.value.id,
                deviceId: props.deviceId,
                deviceName: editForm.value.deviceName,
                deviceModel: editForm.value.deviceModel,
                deviceFactory: editForm.value.deviceFactory,
                locationDetail: editForm.value.locationDetail,
                pressure: Number(editForm.value.pressure),
                rotationSpeed: Number(editForm.value.rotationSpeed),
                designFlow: Number(editForm.value.designFlow),
                onlineStatus: deviceInfo.value.onlineStatus
            };

            const response = await editDeviceInfo(props.deviceId, deviceInfoDto);

            if (response.rc === 0) {
                // 更新本地数据
                Object.assign(deviceInfo.value, editForm.value);
                ElMessage.success('设备信息更新成功');
                isEditing.value = false;
            } else {
                ElMessage.error(response.err || '设备信息更新失败');
            }
        } catch (error) {
            console.error('更新设备信息失败:', error);
            ElMessage.error('设备信息更新失败');
        }
    } else {
        // 进入编辑模式
        Object.assign(editForm.value, deviceInfo.value)
        isEditing.value = true;
    }
}

// 切换健康度类型
const toggleHealthType = async () => {
    const newType = healthType.value === '声音' ? '振动' : '声音'

    try {
        const response = await getDeviceHealth({
            deviceId: props.deviceId,
            type: newType === '声音' ? 'sound' : 'vibration'
        });

        if (response.rc === 0 && response.ret) {
            healthType.value = newType
            healthTitle.value = newType + '健康度'
            currentHealthScore.value = response.ret.healthScore
            nextTick(() => {
                initGaugeChart()
            })
        } else {
            ElMessage.error(response.err || '获取健康度数据失败')
        }
    } catch (error) {
        console.error('获取健康度数据失败:', error)
        ElMessage.error('获取健康度数据失败')
    }
}

// 初始化仪表盘
const initGaugeChart = () => {
    if (!gaugeRef.value) return
    const rect = gaugeRef.value.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
        setTimeout(() => initGaugeChart(), 100)
        return
    }
    if (gaugeChart) gaugeChart.dispose()
    gaugeChart = echarts.init(gaugeRef.value)
    const w = gaugeRef.value.clientWidth
    const h = gaugeRef.value.clientHeight
    gaugeChart.setOption(buildGaugeOption(w, h))
}

let resizeObserver: ResizeObserver | null = null
let parentResizeObserver: ResizeObserver | null = null

// 窗口/容器大小改变时：先 resize 画布，再用当前容器尺寸重新生成 option（字体、刻度距离等自适应）
const resizeGauge = () => {
    setTimeout(() => {
        if (!gaugeChart || !gaugeRef.value) return
        try {
            gaugeChart.resize()
            const w = gaugeRef.value.clientWidth
            const h = gaugeRef.value.clientHeight
            if (w > 0 && h > 0) gaugeChart.setOption(buildGaugeOption(w, h))
        } catch (e) {
            console.warn('Error resizing gauge chart:', e)
            nextTick(() => initGaugeChart())
        }
    }, 50)
}

// 存储用于重试的定时器ID
let gaugeRetryTimerId: number | null = null;

// 使用ResizeObserver监听容器变化
const setupGaugeResizeObserver = () => {
    if (gaugeRef.value) {
        resizeObserver = new ResizeObserver(resizeGauge);
        resizeObserver.observe(gaugeRef.value);
    } else {
        // 如果ref还未绑定，稍后重试
        if (gaugeRetryTimerId) {
            clearTimeout(gaugeRetryTimerId);
        }
        gaugeRetryTimerId = window.setTimeout(setupGaugeResizeObserver, 100);
    }
}

// 使用ResizeObserver监听父容器变化
const setupParentResizeObserver = () => {
    const parentElement = document.querySelector('.device-info-module') as HTMLDivElement;
    if (parentElement) {
        parentResizeObserver = new ResizeObserver(resizeGauge);
        parentResizeObserver.observe(parentElement);
    }
}

// 在组件挂载时初始化图表监听
onMounted(async () => {
    nextTick(() => {
        initGaugeChart()
        setupGaugeResizeObserver();
        setupParentResizeObserver();
    })
})

// 监听健康度类型变化时重新初始化图表
watch(healthType, () => {
    nextTick(() => {
        initGaugeChart()
    })
})

// 组件卸载时清理资源
onUnmounted(() => {
    if (gaugeChart) gaugeChart.dispose()

    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }

    if (parentResizeObserver) {
        parentResizeObserver.disconnect();
        parentResizeObserver = null;
    }

    // 清理重试图表初始化的定时器
    if (gaugeRetryTimerId) {
        clearTimeout(gaugeRetryTimerId);
        gaugeRetryTimerId = null;
    }
})
</script>

<style lang="scss" scoped>
.device-info-module {
    width: 33%;
    min-width: 200px;
    max-width: 400px;
    flex: 0 0 auto;
    background: url('@/assets/images/background/设备详情页-设备信息背景.png') no-repeat center center;
    background-size: 100% 100%;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    /* 允许flex子项收缩 */
    overflow: visible;
    /* 保持可见，让内部滚动条正常显示 */


    .module-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 0 20px;

        .header-main {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;

            .module-title {
                margin: 0;
                font-size: clamp(18px, 2.5vw, 22px);
                font-weight: 600;
            }

            .header-actions {
                display: flex;
                gap: 15px;
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
        padding: 20px;
        flex: 1;
        width: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow-y: auto;

        .device-basic-info {

            .info-row {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
                flex: 0 0 auto;

                .info-item {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;

                    .info-label {
                        font-size: 12px;
                        color: #ccc;
                    }

                    .info-value {
                        font-size: 14px;
                        color: #fff;
                        margin-bottom: 5px;
                        font-weight: 500;
                        white-space: normal;
                        /* 允许换行 */
                        overflow: visible;
                        /* 不隐藏内容 */
                        text-overflow: clip;
                        /* 不显示省略号 */
                        word-wrap: break-word;
                        /* 长单词自动换行 */
                    }

                    .info-input {
                        width: 100%;

                        :deep(.el-input__wrapper) {

                            // 确保输入框能适应长内容
                            .el-input__inner {
                                white-space: normal;
                                word-wrap: break-word;
                            }
                        }
                    }
                }
            }
        }

        .health-gauge-container {
            flex: 0 0 auto;
            margin-top: 20px;

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
                min-height: 150px;

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
            flex: 0 0 auto;
            margin-top: 20px;
            /* 不伸缩，保持固定高度 */

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