<template>
    <div class="device-info-module">
        <div class="module-header">
            <div class="header-main">
                <h3 class="module-title app-section-title">设备信息</h3>
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
            <div v-if="!hasDeviceInfo" class="device-no-data">暂无数据</div>
            <div v-else class="device-basic-info" v-show="!isCollapsed">
                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label  ">设备名称：</span>
                        <span class="info-value  ">{{ deviceInfo.deviceName }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label  ">设备型号：</span>
                        <span class="info-value  ">{{ deviceInfo.deviceModel }}</span>
                    </div>
                </div>

                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label  ">设备名称：</span>
                        <el-input v-model="editForm.deviceName" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label  ">设备型号：</span>
                        <el-input v-model="editForm.deviceModel" size="small" class="info-input" />
                    </div>
                </div>

                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label  ">生产厂家：</span>
                        <span class="info-value  ">{{ deviceInfo.deviceFactory }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label  ">安装位置：</span>
                        <span class="info-value  ">{{ deviceInfo.locationDetail }}</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label  ">生产厂家：</span>
                        <el-input v-model="editForm.deviceFactory" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label  ">安装位置：</span>
                        <el-input v-model="editForm.locationDetail" size="small" class="info-input" />
                    </div>
                </div>

                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label  ">工作转速：</span>
                        <span class="info-value  ">{{ deviceInfo.rotationSpeed }} rpm</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label  ">设计流量：</span>
                        <span class="info-value  ">{{ deviceInfo.designFlow }} m³/h</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label  ">工作转速：</span>
                        <el-input v-model="editForm.rotationSpeed" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label  ">设计流量：</span>
                        <el-input v-model="editForm.designFlow" size="small" class="info-input" />
                    </div>
                </div>

                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label  ">压力：</span>
                        <span class="info-value  ">{{ deviceInfo.pressure }} MPa</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label  ">压力：</span>
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

const emit = defineEmits<{
    (e: 'edit-status-change', status: { isEditing: boolean; hasChanges: boolean }): void
}>()

const hasDeviceInfo = ref(true);

// 设备信息响应式数据
const deviceInfo = ref<DeviceInfo>({
    id: 0,
    deviceId: '',
    deviceName: '',
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
            hasDeviceInfo.value = true;
        } else {
            hasDeviceInfo.value = false;
        }
    } catch (error) {
        console.error('获取设备信息失败:', error);
        hasDeviceInfo.value = false;
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
            // 初次並行加載的是聲音健康度（type: 'sound'），直接用 healthScore
            const ret: any = healthResponse.ret
            const score = typeof ret.healthScore === 'number' ? ret.healthScore : 0
            currentHealthScore.value = score
            // 同時記錄等級，供顏色映射使用（如果後端也返回聲音等級）
            healthGrade.value = extractHealthGrade(ret)
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
// 按接口返回的 healthGrade 划分 A/B/C/D 四个等级（兼容大小写）
const healthGrade = ref<'A' | 'B' | 'C' | 'D' | ''>('')
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

// 从接口原始对象里解析健康等级（兼容大小寫和不同字段命名）
const extractHealthGrade = (ret: any): 'A' | 'B' | 'C' | 'D' | '' => {
    if (!ret) return ''
    const raw = ret.healthGrade ?? ret.health_grade ?? ret.grade ?? ''
    if (!raw || typeof raw !== 'string') return ''
    const upper = raw.toUpperCase()
    if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') {
        return upper
    }
    return ''
}

// 将健康等级映射到一个代表分值，用於儀表盤指針位置（振动健康度使用）
const mapGradeToScore = (grade: 'A' | 'B' | 'C' | 'D' | ''): number => {
    switch (grade) {
        case 'A':
            return 90 // 深綠，高健康
        case 'B':
            return 70 // 淡綠
        case 'C':
            return 40 // 橙色
        case 'D':
            return 15 // 紅色
        default:
            return 0
    }
}

// 根据当前容器尺寸生成仪表盘 option（resize 时用新尺寸重新调用，实现自适应字体与布局）
const buildGaugeOption = (containerWidth: number, containerHeight: number) => {
    const score = currentHealthScore.value

    // 根据 healthGrade 映射颜色：A 深绿、B 淡绿、C 橙色、D 红色
    let healthColor = '#309735'
    const grade = healthGrade.value // 已经是大写
    if (grade === 'D') {
        healthColor = '#ff5722'
    } else if (grade === 'C') {
        healthColor = '#f2b504'
    } else if (grade === 'B') {
        healthColor = '#85ea8c'
    } else if (grade === 'A') {
        healthColor = '#309735'
    } else {
        // 兼容老数据，没有 healthGrade 时按分数区间判断
        if (score >= 80) healthColor = '#309735'
        else if (score >= 60) healthColor = '#85ea8c'
        else if (score >= 20) healthColor = '#f2b504'
        else healthColor = '#ff5722'
    }

    const axisLabelFontSize = Math.round(calculateResponsiveFontSize(15, containerWidth, containerHeight))
    const titleFontSize = Math.round(calculateResponsiveFontSize(20, containerWidth, containerHeight))
    const detailFontSize = Math.round(calculateResponsiveFontSize(24, containerWidth, containerHeight))

    // 仪表盘区间按 10, 8, 8, 10 的比例划分为 D/C/B/A 四个区段
    const total = 10 + 8 + 8 + 10
    const dEnd = 10 / total      // 红色 D 区结尾
    const cEnd = (10 + 8) / total // 橙色 C 区结尾
    const bEnd = (10 + 8 + 8) / total // 淡绿 B 区结尾

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
                    // 按 10,8,8,10 比例划分 D/C/B/A 四个颜色区间
                    color: [
                        [dEnd, '#ff5722'],   // D：红色
                        [cEnd, '#f2b504'],   // C：橙色
                        [bEnd, '#85ea8c'],   // B：淡绿色
                        [1, '#309735']       // A：深绿色
                    ]
                }
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: {
                show: true,
                // 振动健康度的文字再往裡（遠離刻度線）一點，避免與刻度線/色帶重疊
                distance: calculateResponsiveDistance(
                    healthType.value === '振动' ? -130 : -105,
                    containerWidth,
                    containerHeight
                ),
                fontSize: axisLabelFontSize,
                color: '#fff',
                formatter: function (value: number) {
                    // 振动健康度：在各自颜色区间中間附近顯示 A/B/C/D（使用實際刻度值 10/40/60/90）
                    if (healthType.value === '振动') {
                        // 根據 10,8,8,10 比例計算每段的中點，再對齊到最接近的 10 刻度
                        const total = 10 + 8 + 8 + 10
                        const dEnd = 10 / total
                        const cEnd = (10 + 8) / total
                        const bEnd = (10 + 8 + 8) / total
                        const roundToTick = (percent: number) => Math.round(percent / 10) * 10
                        const dCenter = roundToTick((0 + dEnd * 100) / 2)      // 約 10
                        const cCenter = roundToTick(((dEnd + cEnd) * 100) / 2) // 約 40
                        const bCenter = roundToTick(((cEnd + bEnd) * 100) / 2) // 約 60
                        const aCenter = roundToTick(((bEnd + 1) * 100) / 2)    // 約 90

                        if (value === dCenter) return '{gradeD|D\n不允许}'
                        if (value === cCenter) return '{gradeC|C\n注意}'
                        if (value === bCenter) return '{gradeB|B\n可接受}'
                        if (value === aCenter) return '{gradeA|A\n良好}'
                        return ''
                    }
                    // 声音健康度：保留原來的文字刻度
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
                    health: { color: '#309735', fontSize: axisLabelFontSize },
                    // 振动健康度 A/B/C/D 標籤：字稍微小一點，兩行顯示（字母在上，中文在下）
                    gradeD: { color: '#ff5722', fontSize: Math.round(axisLabelFontSize * 0.85), fontWeight: 'bold', lineHeight: axisLabelFontSize },
                    gradeC: { color: '#f2b504', fontSize: Math.round(axisLabelFontSize * 0.85), fontWeight: 'bold', lineHeight: axisLabelFontSize },
                    gradeB: { color: '#85ea8c', fontSize: Math.round(axisLabelFontSize * 0.85), fontWeight: 'bold', lineHeight: axisLabelFontSize },
                    gradeA: { color: '#309735', fontSize: Math.round(axisLabelFontSize * 0.85), fontWeight: 'bold', lineHeight: axisLabelFontSize }
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
                // 声音顯示分數，振动顯示等級字母
                formatter: function (value: number) {
                    if (healthType.value === '振动') {
                        return healthGrade.value || '-'
                    }
                    return String(Math.round(value))
                },
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
                emit('edit-status-change', { isEditing: false, hasChanges: false });
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
        emit('edit-status-change', { isEditing: true, hasChanges: false });
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
            const ret: any = response.ret
            healthType.value = newType
            healthTitle.value = newType + '健康度'

            if (newType === '声音') {
                // 声音健康度：用接口返回的 healthScore
                const score = typeof ret.healthScore === 'number' ? ret.healthScore : 0
                currentHealthScore.value = score
                healthGrade.value = extractHealthGrade(ret)
            } else {
                // 振动健康度：用接口返回的 healthGrade 來決定分數與顏色
                const grade = extractHealthGrade(ret)
                healthGrade.value = grade
                currentHealthScore.value = mapGradeToScore(grade)
            }

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

        .device-no-data {
            color: rgba(255, 255, 255, 0.6);
            padding: 20px;
        }

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
                        color: #ccc;
                        font-size: 12px;
                    }

                    .info-value {
                        font-size: 14px;
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
                                // color: #333 !important; // 编辑状态下输入文字颜色为黑色，强制覆盖全局样式
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
                        //font-weight: bold;
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