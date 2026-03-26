<template>
    <div class="device-info-module">
        <div class="module-header">
            <div class="header-main">
                <h3 class="module-title app-section-title">设备详情</h3>
            </div>
        </div>
        <div class="device-main">
            <!-- 设备图片：放在最上方 -->
            <div class="device-image-container">
                <img :src="deviceImageSrc" alt="设备图片" class="device-image" />
            </div>

            <!-- 健康度：同时显示（上：声音，下：振动） -->
            <div class="health-gauge-container">
                <div class="gauge-block">
                    <div class="gauge-block-topbar">
                        <el-button
                            class="stage-report-btn"
                            type="primary"
                            size="small"
                            @click="openSoundStageReportDialog"
                        >
                            阶段性报告
                        </el-button>
                    </div>
                    <div class="gauge-title">声音健康度</div>
                    <div class="gauge-wrapper">
                        <div ref="soundGaugeRef" class="gauge"></div>
                    </div>
                </div>
                <div class="gauge-block">
                    <div class="gauge-title">振动健康度</div>
                    <div class="gauge-wrapper">
                        <div ref="vibrationGaugeRef" class="gauge"></div>
                    </div>
                </div>
            </div>

            <el-dialog
                v-model="soundStageReportDialogVisible"
                title="阶段性报告"
                width="530px"
                :close-on-click-modal="true"
                destroy-on-close
                :teleported="true"
                :append-to-body="true"
                :modal-append-to-body="true"
            >
                <div class="sound-stage-report-row">
                    <CommonDateTimePicker v-model="soundStageReportDateRange" width="100%" />
                    <el-button
                        class="sound-stage-report-download"
                        size="small"
                        type="primary"
                        :loading="soundStageReportDownloading"
                        @click="downloadSoundStageReport"
                    >
                        下载
                    </el-button>
                </div>
            </el-dialog>

            <!-- 操作按钮：放在健康度下方、设备信息上方 -->
            <div class="header-actions">
                <el-button type="primary" size="small" @click="openAddFieldDialog" class="add-field-btn">
                    添加信息
                </el-button>
                <el-button type="primary" size="small" @click="toggleEdit" class="edit-btn">
                    {{ isEditing ? '保存' : '编辑' }}
                </el-button>
            </div>

            <!-- 设备基本信息：排在最下方 -->
            <div v-if="!hasDeviceInfo" class="device-no-data">暂无数据</div>
            <div v-else class="device-basic-info">
                <div class="info-row" v-if="!isEditing">
                    <div class="info-item">
                        <span class="info-label  ">设备名称：</span>
                        <span class="info-value  ">{{ deviceInfo.equipmentName }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label  ">设备型号：</span>
                        <span class="info-value  ">{{ deviceInfo.deviceModel }}</span>
                    </div>
                </div>

                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label  ">设备名称：</span>
                        <el-input v-model="editForm.equipmentName" size="small" class="info-input" />
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
                        <span class="info-label  ">额定转速：</span>
                        <span class="info-value  ">{{ formatValueWithUnit(deviceInfo.rotationSpeed, 'rpm') }}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label  ">设计流量：</span>
                        <span class="info-value  ">{{ formatValueWithUnit(deviceInfo.designFlow, 'm³/h') }}</span>
                    </div>
                </div>
                <div class="info-row" v-else>
                    <div class="info-item">
                        <span class="info-label  ">额定转速：</span>
                        <el-input v-model="editForm.rotationSpeed" size="small" class="info-input" />
                    </div>
                    <div class="info-item">
                        <span class="info-label  ">设计流量：</span>
                        <el-input v-model="editForm.designFlow" size="small" class="info-input" />
                    </div>
                </div>

                <div class="info-row" v-if="!isEditing">
                    <!-- 左侧固定显示压力 -->
                    <div class="info-item">
                        <span class="info-label  ">压力：</span>
                        <span class="info-value  ">{{ formatValueWithUnit(deviceInfo.pressure, 'MPa') }}</span>
                    </div>
                    <!-- 右侧：如果有自定义字段，则第一条跟在压力后面，同排展示 -->
                    <div v-if="extraFields.length > 0" class="info-item">
                        <span class="info-label">{{ extraFields[0]?.label }}：</span>
                        <span class="info-value">{{ extraFields[0]?.value }}</span>
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

                <!-- 额外自定义字段：压力之后的其余字段，两两一行 -->
                <div
                    class="info-row"
                    v-for="(row, rowIndex) in extraFieldRows"
                    :key="'extra-row-' + rowIndex"
                    v-if="!isEditing"
                >
                    <div
                        v-for="(field, index) in row"
                        :key="'extra-' + rowIndex + '-' + index"
                        class="info-item"
                    >
                        <span class="info-label">{{ field.label }}：</span>
                        <span class="info-value">{{ field.value }}</span>
                    </div>
                </div>

            </div>
        </div>

        <!-- 添加自定义设备信息字段弹窗 -->
        <el-dialog
            v-model="addFieldDialogVisible"
            title="添加设备信息"
            width="360px"
            :close-on-click-modal="false"
            :teleported="true"
            :append-to-body="true"
            :modal-append-to-body="true"
        >
            <div class="add-field-form">
                <div class="form-row">
                    <span class="form-label">名称：</span>
                    <el-input
                        v-model="newField.label"
                        size="small"
                        placeholder="例如：维护周期"
                    />
                </div>
                <div class="form-row">
                    <span class="form-label">值：</span>
                    <el-input
                        v-model="newField.value"
                        size="small"
                        placeholder="例如：每3个月"
                    />
                </div>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button size="small" @click="addFieldDialogVisible = false">取消</el-button>
                    <el-button size="small" type="primary" @click="confirmAddField">确定</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { ElButton, ElInput, ElMessage, ElForm, ElFormItem } from 'element-plus'
import * as echarts from 'echarts'
import { getDeviceInfoByEquipmentId, editEquipmentInfo, getEquipmentHealth, type DeviceInfoDto, type DeviceHealthResponse } from '@/api/modules/hardware'
import { service } from '@/api/request'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'

const FALLBACK_DEVICE_IMAGE_URL: string = new URL('@/assets/images/background/背景图.png', import.meta.url).href

const deviceImages = import.meta.glob('@/assets/images/background/*.{png,jpg,jpeg,webp,svg}', {
    eager: true,
    import: 'default'
}) as Record<string, string>

const normalizeDeviceImageKey = (name: string) =>
    String(name ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[（(].*?[）)]/g, '')
        .replace(/[-_]/g, '')

const deviceImageByBaseName = (() => {
    const map = new Map<string, string>()
    for (const [path, url] of Object.entries(deviceImages)) {
        const fileName = path.split('/').pop() ?? ''
        const base = fileName.replace(/\.[^.]+$/, '')
        if (!base) continue
        map.set(base, url)
    }
    return map
})()

const resolveDeviceImageFromName = (equipmentName: string): string => {
    const rawName = String(equipmentName ?? '').trim()
    if (!rawName) return FALLBACK_DEVICE_IMAGE_URL

    // 1) 原始文件名精确匹配（例如：五线一路风机 -> 五线一路风机.png）
    const exact = deviceImageByBaseName.get(rawName)
    if (exact) return exact

    // 2) 规范化后精确匹配（去空格、大小写、括号备注、连字符）
    const normalizedRawName = normalizeDeviceImageKey(rawName)
    if (!normalizedRawName) return FALLBACK_DEVICE_IMAGE_URL
    for (const [baseName, url] of deviceImageByBaseName.entries()) {
        if (normalizeDeviceImageKey(baseName) === normalizedRawName) {
            return url
        }
    }

    // 3) 包含匹配（兼容“设备名后面带编号/前缀”等场景）
    for (const [baseName, url] of deviceImageByBaseName.entries()) {
        const normalizedBase = normalizeDeviceImageKey(baseName)
        if (!normalizedBase) continue
        if (normalizedBase.includes(normalizedRawName) || normalizedRawName.includes(normalizedBase)) {
            return url
        }
    }

    return FALLBACK_DEVICE_IMAGE_URL
}

const formatValueWithUnit = (value: unknown, unit: string) => {
    if (value === null || value === undefined) return ''
    const raw = typeof value === 'string' ? value.trim() : value
    if (raw === '') return ''
    const num = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(num) || num === 0) return ''
    return `${raw} ${unit}`
}

// 定义设备信息类型 - 对应API返回的数据结构
interface DeviceInfo {
    id: number;
    equipmentId: string;
    equipmentName: string;
    deviceModel: string;
    deviceFactory: string;
    locationDetail: string;
    pressure: number;
    rotationSpeed: number;
    designFlow: number;
    onlineStatus: number;
    createdTime: string | null;
    updatedTime: string | null;
    // 后端返回的自定义字段（新结构：数组）
    deviceNewInfo?: Array<{ label: string; value: string }>;
}

// 设备信息prop
const props = defineProps<{
    deviceId: string
}>()

const emit = defineEmits<{
    (e: 'edit-status-change', status: { isEditing: boolean; hasChanges: boolean }): void
}>()

const hasDeviceInfo = ref(true);

// 额外自定义字段（仅前端展示）
interface ExtraField {
    label: string;
    value: string;
    type: 'input' | 'select';
    options?: string[];
}

const extraFields = ref<ExtraField[]>([]);
// 压力之后的自定义字段（不含第一条），两两一行用于展示
const extraFieldRows = computed<ExtraField[][]>(() => {
    const rows: ExtraField[][] = []
    const list = extraFields.value.slice(1) // 从第二条开始
    for (let i = 0; i < list.length; i += 2) {
        rows.push(list.slice(i, i + 2))
    }
    return rows
})
const addFieldDialogVisible = ref(false);
const newField = ref<ExtraField>({ label: '', value: '', type: 'input' });
const newFieldType = ref<'input' | 'select'>('input');
const newOptionInput = ref('');
const newFieldOptions = ref<string[]>([]);

type DateRange = [string, string] | null
const soundStageReportDialogVisible = ref(false)
const soundStageReportDateRange = ref<DateRange>(null)
const soundStageReportDownloading = ref(false)

// 设备信息响应式数据
const deviceInfo = ref<DeviceInfo>({
    id: 0,
    equipmentId: '',
    equipmentName: '',
    deviceModel: '',
    deviceFactory: '',
    locationDetail: '',
    pressure: 0,
    rotationSpeed: 0,
    designFlow: 0,
    onlineStatus: 0,
    createdTime: null,
    updatedTime: null,
    deviceNewInfo: []
})

const deviceImageSrc = computed<string>(() => {
    return resolveDeviceImageFromName(deviceInfo.value.equipmentName)
})

// 根据后端返回的 deviceNewInfo 解析出 extraFields（按 label1/value1 顺序，还兼容旧的扁平结构）
const syncExtraFieldsFromDeviceInfo = () => {
    const raw = (deviceInfo.value as any).deviceNewInfo
    const parsed: ExtraField[] = []
    if (!raw) {
        extraFields.value = []
        return
    }

    // 新结构：数组 [{label, value}, ...]
    if (Array.isArray(raw)) {
        raw.forEach((it: any) => {
            const label = String(it?.label ?? '').trim()
            const value = String(it?.value ?? '').trim()
            if (label && value) parsed.push({ label, value, type: 'input' })
        })
        extraFields.value = parsed
        return
    }

    // 兼容旧结构1：{ item1: { label1:'', value1:'' }, item2: {...} }
    let idx = 1
    let foundAny = false
    while (idx <= 50) {
        const itemKey = `item${idx}`
        const item = raw[itemKey]
        if (!item) break
        const labelKey = `label${idx}`
        const valueKey = `value${idx}`
        const label = String(item[labelKey] ?? '').trim()
        const value = String(item[valueKey] ?? '').trim()
        if (label && value) {
            parsed.push({ label, value, type: 'input' })
            foundAny = true
        }
        idx++
    }

    // 兼容旧结构2：扁平 { label1:'', value1:'', label2:'', value2:'' }
    if (!foundAny) {
        let j = 1
        while (j <= 50) {
            const labelKey = `label${j}`
            const valueKey = `value${j}`
            if (!(labelKey in raw) || !(valueKey in raw)) break
            const label = String(raw[labelKey] ?? '').trim()
            const value = String(raw[valueKey] ?? '').trim()
            if (label && value) parsed.push({ label, value, type: 'input' })
            j++
        }
    }

    extraFields.value = parsed
}

// 打开添加字段弹窗
const openAddFieldDialog = () => {
    newField.value = { label: '', value: '', type: 'input' };
    newFieldType.value = 'input';
    newOptionInput.value = '';
    newFieldOptions.value = [];
    addFieldDialogVisible.value = true;
}

// 下拉选项：添加一条
const addOption = () => {
    const v = newOptionInput.value.trim();
    if (!v) {
        ElMessage.warning('请输入选项值');
        return;
    }
    if (newFieldOptions.value.includes(v)) {
        ElMessage.warning('该选项已存在');
        return;
    }
    newFieldOptions.value.push(v);
    newOptionInput.value = '';
}

// 下拉选项：删除一条
const removeOption = (index: number) => {
    newFieldOptions.value.splice(index, 1);
}

const openSoundStageReportDialog = () => {
    soundStageReportDialogVisible.value = true
}

const sanitizeFilename = (name: string) => name.replace(/[\\/:*?"<>|]/g, '-')

const downloadSoundStageReport = async () => {
    if (!props.deviceId) {
        ElMessage.warning('缺少设备ID')
        return
    }
    const range = soundStageReportDateRange.value
    if (!range || range.length !== 2 || !range[0] || !range[1]) {
        ElMessage.warning('请选择时间范围')
        return
    }

    const [startTime, endTime] = range
    soundStageReportDownloading.value = true
    try {
        const res = await service.get(`/hardware/device/health-report/${props.deviceId}`, {
            params: { startTime, endTime, type: 'sound' },
            responseType: 'blob',
            showLoading: true
        })

        const blob = res as unknown as Blob
        if (blob && typeof (blob as any).text === 'function' && blob.type?.includes('application/json')) {
            const text = await blob.text()
            try {
                const json = JSON.parse(text)
                const msg = json?.message || json?.err || json?.msg || '下载失败'
                ElMessage.error(String(msg))
            } catch {
                ElMessage.error('下载失败')
            }
            return
        }

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const fileName = sanitizeFilename(`声音健康度阶段性报告_${startTime}_${endTime}`)
        a.href = url
        a.download = `${fileName}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)

        soundStageReportDialogVisible.value = false
    } catch (e) {
        console.error('下载阶段性报告失败:', e)
        ElMessage.error('下载失败')
    } finally {
        soundStageReportDownloading.value = false
    }
}

// 加载设备信息
const loadDeviceInfo = async () => {
    if (!props.deviceId) return;

    try {
        const response = await getDeviceInfoByEquipmentId(props.deviceId);
        if (response.rc === 0 && response.ret) {
            const raw: any = response.ret
            deviceInfo.value = {
                ...response.ret,
                equipmentId: raw.equipmentId ?? '',
                equipmentName: raw.equipmentName ?? ''
            } as any
            hasDeviceInfo.value = true;
            syncExtraFieldsFromDeviceInfo();
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
        // 并行执行设备信息 + 声音/振动健康度查询
        const [infoResponse, soundHealthResponse, vibrationHealthResponse] = await Promise.all([
            getDeviceInfoByEquipmentId(props.deviceId),
            getEquipmentHealth({
                equipmentId: props.deviceId,
                type: 'sound'
            }),
            getEquipmentHealth({
                equipmentId: props.deviceId,
                type: 'vibration'
            }),
        ]);

        // 处理设备信息响应
        if (infoResponse.rc === 0 && infoResponse.ret) {
            const raw: any = infoResponse.ret
            deviceInfo.value = {
                ...infoResponse.ret,
                equipmentId: raw.equipmentId ?? '',
                equipmentName: raw.equipmentName ?? ''
            } as any
            syncExtraFieldsFromDeviceInfo();
        } else {
            ElMessage.error('获取设备信息失败');
        }

        // 处理声音健康度
        if (soundHealthResponse.rc === 0 && soundHealthResponse.ret) {
            const ret: any = soundHealthResponse.ret
            const score = typeof ret.healthScore === 'number' ? ret.healthScore : null
            const grade = extractHealthGrade(ret)
            hasSoundHealthData.value = score !== null || !!grade
            soundHealthScore.value = score ?? 0
            soundHealthGrade.value = grade
        } else {
            hasSoundHealthData.value = false
            soundHealthScore.value = 0
            soundHealthGrade.value = ''
        }

        // 处理振动健康度
        if (vibrationHealthResponse.rc === 0 && vibrationHealthResponse.ret) {
            const ret: any = vibrationHealthResponse.ret
            const grade = extractHealthGrade(ret)
            hasVibrationHealthData.value = !!grade
            vibrationHealthGrade.value = grade
            vibrationHealthScore.value = mapGradeToScore(grade)
        } else {
            hasVibrationHealthData.value = false
            vibrationHealthGrade.value = ''
            vibrationHealthScore.value = 0
        }

        nextTick(() => {
            initGaugeCharts()
        })
    } catch (error) {
        ElMessage.error('获取设备数据失败');
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

// 将自定义字段序列化为后端需要的数组结构：
// deviceNewInfo: [{ label: '名称1', value: '值1' }, { label: '名称2', value: '值2' }, ...]
const buildDeviceNewInfo = (fields: ExtraField[]): Array<{ label: string; value: string }> => {
    const arr: Array<{ label: string; value: string }> = []
    for (const f of fields) {
        const label = String(f.label ?? '').trim()
        if (!label) continue
        const value =
            f.type === 'select'
                ? String((f.value || (f.options && f.options[0]) || '')).trim()
                : String(f.value ?? '').trim()
        if (!value) continue
        arr.push({ label, value })
    }
    return arr
}

// 确认添加字段：仅更新前端配置列表（等待后端接口接入）
const confirmAddField = () => {
    const label = newField.value.label.trim()
    if (!label) {
        ElMessage.warning('请填写名称')
        return
    }

    if (newFieldType.value === 'input') {
        const value = newField.value.value.trim()
        if (!value) {
            ElMessage.warning('请填写值')
            return
        }
        extraFields.value.push({ label, value, type: 'input' })
    } else {
        if (newFieldOptions.value.length === 0) {
            ElMessage.warning('请至少添加一个选项')
            return
        }
        extraFields.value.push({
            label,
            value: newFieldOptions.value[0] ?? '',
            type: 'select',
            options: [...newFieldOptions.value]
        })
    }

    ElMessage.success('已添加')
    addFieldDialogVisible.value = false
}

// 健康度相关：同时展示声音/振动
const soundHealthScore = ref(0)
const vibrationHealthScore = ref(0)
// 声音健康度：是否有数据（无数据时显示 '-' 而不是 0）
const hasSoundHealthData = ref(false)
// 振动健康度：是否有数据（无数据时显示 '-'）
const hasVibrationHealthData = ref(false)
// 按接口返回的 healthGrade 划分 A/B/C/D 四个等级（兼容大小写）
const soundHealthGrade = ref<'A' | 'B' | 'C' | 'D' | ''>('')
const vibrationHealthGrade = ref<'A' | 'B' | 'C' | 'D' | ''>('')

const soundGaugeRef = ref<HTMLDivElement>()
const vibrationGaugeRef = ref<HTMLDivElement>()
let soundGaugeChart: echarts.ECharts | null = null
let vibrationGaugeChart: echarts.ECharts | null = null

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

type GaugeMode = 'sound' | 'vibration'

const resolveHealthColor = (score: number, grade: 'A' | 'B' | 'C' | 'D' | '') => {
    // 根据 grade 映射颜色：A 深绿、B 淡绿、C 橙色、D 红色
    if (grade === 'D') return '#ff5722'
    if (grade === 'C') return '#f2b504'
    if (grade === 'B') return '#85ea8c'
    if (grade === 'A') return '#309735'
    // 兼容没有 grade 时按分数判断
    if (score >= 80) return '#309735'
    if (score >= 60) return '#85ea8c'
    if (score >= 20) return '#f2b504'
    return '#ff5722'
}

// 根据当前容器尺寸生成仪表盘 option（resize 时用新尺寸重新调用，实现自适应字体与布局）
const buildGaugeOption = (mode: GaugeMode, containerWidth: number, containerHeight: number) => {
    const isVibration = mode === 'vibration'
    const score = isVibration ? vibrationHealthScore.value : soundHealthScore.value
    const grade = isVibration ? vibrationHealthGrade.value : soundHealthGrade.value

    const hasData = isVibration ? hasVibrationHealthData.value : hasSoundHealthData.value
    const healthColor = hasData ? resolveHealthColor(score, grade) : 'rgba(255,255,255,0.65)'

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
                    isVibration ? -130 : -105,
                    containerWidth,
                    containerHeight
                ),
                fontSize: axisLabelFontSize,
                color: '#fff',
                formatter: function (value: number) {
                    // 振动健康度：在各自颜色区间中間附近顯示 A/B/C/D（使用實際刻度值 10/40/60/90）
                    if (isVibration) {
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
                    if (isVibration) return grade || '-'
                    if (!hasSoundHealthData.value) return '-'
                    return String(Math.round(value))
                },
                color: healthColor
            },
            data: [{ value: score, name: isVibration ? '振动健康度' : '声音健康度' }]
        }]
    }
}

// 切换编辑状态
const toggleEdit = async () => {
    if (isEditing.value) {
        // 保存编辑
        try {
            // 构造要发送的设备信息对象
            const deviceInfoDto: DeviceInfoDto = {
                id: deviceInfo.value.id,
                equipmentId: props.deviceId,
                equipmentName: editForm.value.equipmentName,
                deviceModel: editForm.value.deviceModel,
                deviceFactory: editForm.value.deviceFactory,
                locationDetail: editForm.value.locationDetail,
                pressure: Number(editForm.value.pressure),
                rotationSpeed: Number(editForm.value.rotationSpeed),
                designFlow: Number(editForm.value.designFlow),
                onlineStatus: deviceInfo.value.onlineStatus
            };
            // 把弹窗新增的字段按 label1/value1... 推送给后端
            (deviceInfoDto as any).deviceNewInfo = buildDeviceNewInfo(extraFields.value)

            const response = await editEquipmentInfo(props.deviceId, deviceInfoDto);

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

const initOneGauge = (mode: GaugeMode) => {
    const el = mode === 'sound' ? soundGaugeRef.value : vibrationGaugeRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    if (mode === 'sound') {
        if (soundGaugeChart) soundGaugeChart.dispose()
        soundGaugeChart = echarts.init(el)
        soundGaugeChart.setOption(buildGaugeOption('sound', el.clientWidth, el.clientHeight))
    } else {
        if (vibrationGaugeChart) vibrationGaugeChart.dispose()
        vibrationGaugeChart = echarts.init(el)
        vibrationGaugeChart.setOption(buildGaugeOption('vibration', el.clientWidth, el.clientHeight))
    }
}

// 初始化两个仪表盘
const initGaugeCharts = () => {
    initOneGauge('sound')
    initOneGauge('vibration')
}

let resizeObserver: ResizeObserver | null = null
let parentResizeObserver: ResizeObserver | null = null

// 窗口/容器大小改变时：先 resize 画布，再用当前容器尺寸重新生成 option（字体、刻度距离等自适应）
const resizeGauge = () => {
    setTimeout(() => {
        try {
            if (soundGaugeChart && soundGaugeRef.value) {
                soundGaugeChart.resize()
                const w = soundGaugeRef.value.clientWidth
                const h = soundGaugeRef.value.clientHeight
                if (w > 0 && h > 0) soundGaugeChart.setOption(buildGaugeOption('sound', w, h))
            }
            if (vibrationGaugeChart && vibrationGaugeRef.value) {
                vibrationGaugeChart.resize()
                const w = vibrationGaugeRef.value.clientWidth
                const h = vibrationGaugeRef.value.clientHeight
                if (w > 0 && h > 0) vibrationGaugeChart.setOption(buildGaugeOption('vibration', w, h))
            }
        } catch (e) {
            console.warn('Error resizing gauge chart:', e)
            nextTick(() => initGaugeCharts())
        }
    }, 50)
}

// 存储用于重试的定时器ID
let gaugeRetryTimerId: number | null = null;

// 使用ResizeObserver监听容器变化
const setupGaugeResizeObserver = () => {
    if (soundGaugeRef.value && vibrationGaugeRef.value) {
        resizeObserver = new ResizeObserver(resizeGauge);
        resizeObserver.observe(soundGaugeRef.value);
        resizeObserver.observe(vibrationGaugeRef.value);
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
        initGaugeCharts()
        setupGaugeResizeObserver();
        setupParentResizeObserver();
    })
})

// 组件卸载时清理资源
onUnmounted(() => {
    if (soundGaugeChart) soundGaugeChart.dispose()
    if (vibrationGaugeChart) vibrationGaugeChart.dispose()

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
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding-bottom: 20px;
    /* 允许flex子项收缩 */
    overflow: hidden;
    /* 保持可见，让内部滚动条正常显示 */


    .module-header {
        padding: 10px 20px 0 20px;

        .header-main {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;

            .module-title {
                margin: 0;
            }
        }
    }

    /* 顶部健康度与下方设备信息之间的操作按钮区域 */
    .header-actions {
        margin-top: 12px;
        margin-bottom: 4px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;

        .add-field-btn {
            margin-right: -12px;
        }
    }

    .device-main {
        padding: 10px 20px 20px 20px;
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
            margin-top: 20px;

            .info-row {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
                flex: 0 0 auto;

                .info-item {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;

                    .info-label {
                        color: #ccc;
                        font-size: 0.9rem;
                    }

                    .info-value {
                        font-size: 0.9rem;
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

            .add-field-form {
                .form-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;

                    .form-label {
                        width: 60px;
                        flex-shrink: 0;
                        color: #ccc;
                    }
                }
            }
        }

        .health-gauge-container {
            flex: 0 0 auto;
            margin-top: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;

            .gauge-block {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .gauge-block-topbar {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                margin-bottom: 2px;
            }

            .gauge-title {
                color: rgba(255, 255, 255);
                font-size: 1rem;
                font-weight: 500;
                text-align: left;
            }

            .stage-report-btn {
                flex: 0 0 auto;
            }

            .gauge-wrapper {
                position: relative;
                height: 170px;
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
                        color: white;
                    }
                }
            }
        }

        .sound-stage-report-row {
            display: flex;
            align-items: center;
            gap: 10px;

            .sound-stage-report-download {
                flex: 0 0 auto;
            }
        }

        .device-image-container {
            flex: 0 0 auto;

            .device-image {
                width: 100%;
                height: auto;
                object-fit: contain;
                display: block;
                border-radius: 8px;
            }
        }
    }
}
</style>