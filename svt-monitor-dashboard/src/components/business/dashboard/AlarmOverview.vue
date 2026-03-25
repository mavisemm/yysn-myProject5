<!-- 预警总览组件：显示设备告警信息 -->
<template>
    <div class="alarm-overview">
        <!-- 顶部区域：标题和搜索栏 -->
        <div class="header-section home-title home-title--device-monitor">
            <div class="header-section__left home-title__left">
                <img class="header-section__icon home-title__icon" src="@/assets/images/background/小图标.png" alt="" />
                <div class="title-with-legend">
                <h3 class="app-section-title">预警总览</h3>
                <div class="batch-actions">
                    <el-button size="small" class="batch-btn" @click="openRealtimeBatch">
                        实时预警
                    </el-button>
                    <el-button size="small" class="batch-btn" @click="openHistoryBatch">
                        历史预警
                    </el-button>
                </div>
                </div>
            </div>
            <div class="search-section">
                <!-- <div class="device-search-wrapper">
                    <el-input v-model="deviceSearch" placeholder="请输入设备名称" :prefix-icon="Search" size="small" clearable
                        style="width: 140px;" @focus="showDeviceDropdown" @blur="hideDeviceDropdown"
                        @keyup.enter="handleSearch" @clear="handleClear" class="custom-search-input" />
                    <div v-if="showDropdown" class="dropdown-list">
                        <div v-for="device in filteredDevices" :key="device.id" class="dropdown-item"
                            @click="selectDevice(device)">
                            <span class="device-name">{{ device.deviceName }}</span>
                            <span class="workshop-name">({{ device.workshopName }})</span>
                        </div>
                    </div>
                </div> -->

                <div class="time-section">
                    <CommonDateTimePicker v-model="dateRange" width="320px" />
                    <el-button @click="toggleSortOrder" class="sort-btn" :icon="sortIcon">
                    </el-button>
                </div>
            </div>
        </div>

        <div class="status-legend">
            <img class="status-legend__img" src="@/assets/images/background/首页-预警总览-图例.png"
                alt="图例：报警、预警、健康" />
        </div>

        <!-- 主内容区域 -->
        <div v-if="filteredAlarms.length === 0" class="alarm-empty">
            <CommonEmptyState />
        </div>
        <div v-else class="alarm-grid" :style="{
            'grid-template-columns': `repeat(${responsivePageSize.columns}, 1fr)`,
            'grid-template-rows': `repeat(${responsivePageSize.rows}, 1fr)`
        }">
            <div v-for="(alarm, index) in displayedAlarms" :key="index" class="alarm-card"
                :class="`alarm-card--${getDeviceDisplayStatus(alarm)}`"
                @click="goToDeviceDetail(alarm)">
                <!-- 第一部分：设备名和状态 -->
                <div class="card-header">
                    <span class="device-name" :title="alarm.deviceName">{{ alarm.deviceName }}</span>
                    <span :class="['status-dot', getDeviceDisplayStatus(alarm)]"></span>
                </div>

                <!-- 第二部分：厂区名 + 报警时间 -->
                <div class="alarm-time">{{ alarm.shopName ? alarm.shopName + ' ' : '' }}&nbsp;&nbsp;{{
                    formatAlarmTime(alarm.time) }}</div>

                <!-- 第三部分：测点网格 -->
                <div class="measurement-grid">
                    <div v-for="item in getDisplayPoints(alarm.measurementPoints)" :key="item.pointNum"
                        :class="['point-item', getPointStyleClass(item.point.status, getDeviceDisplayStatus(alarm))]">
                        {{ item.pointNum }}
                    </div>
                </div>
            </div>
        </div>

        <!-- 底部分页 -->
        <div v-if="filteredAlarms.length > 0" class="pagination-wrapper">
            <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="filteredAlarms.length"
                layout="prev, pager, next, jumper" @current-change="handleCurrentChange" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDeviceTreeStore } from '@/stores/deviceTree';
import { Search, Sort } from '@element-plus/icons-vue';
import { ElInput, ElButton, ElDatePicker, ElPagination } from 'element-plus';
import { useLocale } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import type { DeviceNode } from '@/types/device';
import { formatDateTime, disabledFutureDate, getDefaultDateRange } from '@/utils/datetime';
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue';
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue';
import { VibrationWsClient, type VibrationEventPayload } from '@/services/vibrationWs'
import { fetchVibrationAlarmsForOverview, fetchVibrationEventsForOverview } from '@/api/modules/vibrationEvent'
import { useAlarmBatchStore } from '@/stores/alarmBatch'

const { t } = useLocale();

const alarmBatchStore = useAlarmBatchStore()

const openRealtimeBatch = () => {
    void alarmBatchStore.openRealtime()
}

const openHistoryBatch = () => {
    void alarmBatchStore.openHistory()
}

const router = useRouter()
const deviceTreeStore = useDeviceTreeStore();

// 定义类型：报警(alarm)、预警(warning)、健康(healthy) 三种状态
interface MeasurementPoint {
    name: string;
    status: 'healthy' | 'warning' | 'alarm';
}

interface AlarmItem {
    id: string;
    deviceName: string;
    shopName: string;
    deviceNameWithShop: string;
    status: 'alarm' | 'warning' | 'healthy';
    statusText: string;
    time: string;
    measurementPoints: MeasurementPoint[];
}

function buildMockMeasurementPoints(type: 'healthy' | 'warning' | 'alarm'): MeasurementPoint[] {
    const total = 10;
    const points: MeasurementPoint[] = Array.from({ length: total }).map((_, i) => ({
        name: `测点${i + 1}`,
        status: 'healthy'
    }));

    if (type === 'warning') {
        points[2] = { name: points[2]!.name, status: 'warning' };
        points[6] = { name: points[6]!.name, status: 'warning' };
    }

    if (type === 'alarm') {
        points[1] = { name: points[1]!.name, status: 'alarm' };
        points[4] = { name: points[4]!.name, status: 'warning' };
    }

    return points;
}

function createMockOverviewAlarms(): AlarmItem[] {
    return [
        {
            id: 'MOCK-HEALTHY-001',
            deviceName: '一号风机',
            shopName: '合成车间',
            deviceNameWithShop: '一号风机（合成车间）',
            status: 'healthy',
            statusText: '健康',
            time: new Date().toISOString(),
            measurementPoints: buildMockMeasurementPoints('healthy')
        },
        {
            id: 'MOCK-WARNING-001',
            deviceName: '二号压缩机',
            shopName: '尿素车间',
            deviceNameWithShop: '二号压缩机（尿素车间）',
            status: 'warning',
            statusText: '预警',
            time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            measurementPoints: buildMockMeasurementPoints('warning')
        },
        {
            id: 'MOCK-ALARM-001',
            deviceName: '三号泵',
            shopName: '动力车间',
            deviceNameWithShop: '三号泵（动力车间）',
            status: 'alarm',
            statusText: '报警',
            time: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
            measurementPoints: buildMockMeasurementPoints('alarm')
        }
    ];
}

/**
 * 预警总览 websocket 新返回结构（你提供的字段）
 * - 不解析 rawDataJson，直接使用同级字段与 data 内字段
 */
interface AlarmWsPayload {
    alarmId?: string
    tenantId?: string
    deviceId?: string
    deviceName?: string
    workshopId?: string | null
    workshopName?: string | null
    alarmTime?: number
    alarmTypeCode?: string
    alarmTypeName?: string
    statusCode?: string
    probability?: number
    judgeFlag?: boolean
    data?: {
        channelNo?: string | number
        value?: number
        threshold?: number
        level?: string
        unit?: string
        pointName?: string
        amplitude?: number
    }
    rawDataJson?: string
    [k: string]: unknown
}

interface DeviceItem {
    id: string | number;
    name: string; 
    deviceName: string;
    workshopName: string;
}

const extractDevicesFromTree = (nodes: DeviceNode[]): DeviceItem[] => {
    const devices: DeviceItem[] = [];

    nodes.forEach(factory => {
        factory.children?.forEach(workshop => {
            workshop.children?.forEach(device => {
                if (device.type === 'device') {
                    devices.push({
                        id: device.id,
                        name: `${device.name}（${workshop.name}）`,
                        deviceName: device.name,
                        workshopName: workshop.name
                    });
                }
            });
        });
    });

    return devices;
};

const deviceSearch = ref('');
const dateRange = ref<[string, string]>(['', '']);
const showDropdown = ref(false);
const currentPage = ref(1);

const containerWidth = ref(window.innerWidth);
const containerHeight = ref(window.innerHeight);

// 预警总览：固定一行四个
const responsivePageSize = computed(() => {
    return { pageSize: 4, columns: 4, rows: 1 };
});

const rowsCount = computed(() => {
    const { pageSize, columns } = responsivePageSize.value;
    return Math.ceil(pageSize / columns);
});

const pageSize = ref(responsivePageSize.value.pageSize);

const sortOrder = ref<'asc' | 'desc'>("desc");

const alarms = ref<AlarmItem[]>([])

function findDeviceInfo(deviceId: string): { deviceName: string; shopName: string } {
    const walk = (nodes: DeviceNode[], currentWorkshopName = ''): { deviceName: string; shopName: string } | null => {
        for (const node of nodes) {
            if (node.type === 'workshop') {
                const res = walk(node.children ?? [], node.name)
                if (res) return res
            } else if (node.type === 'device') {
                if (node.id === deviceId || node.customerDeviceId === deviceId) {
                    return { deviceName: node.name, shopName: node.workshopName ?? currentWorkshopName }
                }
                const res = walk(node.children ?? [], currentWorkshopName)
                if (res) return res
            } else if (node.children?.length) {
                const res = walk(node.children, currentWorkshopName)
                if (res) return res
            }
        }
        return null
    }
    return walk(deviceTreeStore.deviceTreeData) ?? { deviceName: deviceId, shopName: '' }
}

function mapLevelToStatus(level: string | undefined): MeasurementPoint['status'] {
    const v = String(level ?? '').toUpperCase()
    if (v === 'ALARM') return 'alarm'
    if (v === 'WARNING' || v === 'WARN') return 'warning'
    return 'healthy'
}

function safeParseJson(input: any): any {
    if (!input) return undefined
    if (typeof input === 'object') return input
    if (typeof input !== 'string') return undefined
    try {
        return JSON.parse(input)
    } catch {
        return undefined
    }
}

function isAlarmWsPayload(x: any): x is AlarmWsPayload {
    return !!x && typeof x === 'object' && ('alarmTypeCode' in x || 'alarmTime' in x || 'alarmId' in x) && 'data' in x
}

type OverviewNormalized = {
    deviceId: string
    deviceName?: string
    shopName?: string
    time: number
    alarmTypeCode?: string
    statusCode?: string
    point: {
        channelNo?: string | number
        level?: string
        pointName?: string
    }
}

function normalizeToOverviewEvent(input: any): OverviewNormalized | null {
    // 新 websocket：按你给的结构
    if (isAlarmWsPayload(input)) {
        const deviceId = String(input.deviceId ?? '')
        const t = Number(input.alarmTime ?? 0)
        if (!deviceId || !Number.isFinite(t) || t <= 0) return null
        return {
            deviceId,
            deviceName: input.deviceName ? String(input.deviceName) : undefined,
            shopName: input.workshopName ? String(input.workshopName) : undefined,
            time: t,
            alarmTypeCode: input.alarmTypeCode ? String(input.alarmTypeCode) : undefined,
            statusCode: input.statusCode ? String(input.statusCode) : undefined,
            point: {
                channelNo: input.data?.channelNo,
                level: input.data?.level ? String(input.data.level) : undefined,
                pointName: input.data?.pointName ? String(input.data.pointName) : undefined
            }
        }
    }

    // 旧 vibration 事件：兼容已有初始化接口与 mock
    const evt = input as Partial<VibrationEventPayload>
    if (!evt || typeof evt !== 'object') return null
    const deviceId = String(evt.deviceId ?? '')
    const t = Number(evt.time ?? 0)
    if (!deviceId || !Number.isFinite(t) || t <= 0) return null

    const parsed = safeParseJson(evt.dataJson)
    return {
        deviceId,
        time: t,
        alarmTypeCode: evt.eventTypeCode ? String(evt.eventTypeCode) : undefined,
        statusCode: evt.statusCode ? String(evt.statusCode) : undefined,
        shopName: parsed?.shopName ? String(parsed.shopName) : undefined,
        point: {
            channelNo: parsed?.channelNo,
            level: parsed?.level ? String(parsed.level) : undefined,
            pointName: parsed?.pointName ? String(parsed.pointName) : undefined
        }
    }
}

function buildMeasurementPointsFromPoint(point: OverviewNormalized['point']): MeasurementPoint[] {
    const channelNo = point?.channelNo != null ? Number(point.channelNo) : NaN
    const pointStatus = mapLevelToStatus(point?.level)
    const pointName = point?.pointName ? String(point.pointName) : ''

    // 预警总览 UI 目前固定展示「点号」(1..N)，这里用 channelNo 映射到对应点位高亮
    const total = 10
    const list: MeasurementPoint[] = Array.from({ length: total }).map((_, i) => ({
        name: i === 0 && pointName ? pointName : `测点${i + 1}`,
        status: 'healthy'
    }))

    if (!isNaN(channelNo) && channelNo >= 1 && channelNo <= total) {
        const existing = list[channelNo - 1]
        list[channelNo - 1] = {
            name: pointName || existing?.name || `测点${channelNo}`,
            status: pointStatus
        }
    }
    return list
}

function upsertAlarmFromEvent(input: any) {
    const evt = normalizeToOverviewEvent(input)
    if (!evt) return

    // 仅展示未处理：VALID
    if (evt.statusCode && String(evt.statusCode).toUpperCase() !== 'VALID') return

    // 你要求：右上角“设备状态圆点”按 alarmTypeCode 判定
    // - MACHINE_VIBRATION：故障报警（显示报警）
    // - 趋势预警：后续另一个 websocket 接入后，再扩展映射规则
    const isFaultAlarm = String(evt.alarmTypeCode ?? '').toUpperCase() === 'MACHINE_VIBRATION'

    const deviceId = evt.deviceId
    const fromTree = findDeviceInfo(deviceId)
    const deviceName = evt.deviceName || fromTree.deviceName
    const shopName = (evt.shopName && evt.shopName !== '未知车间') ? evt.shopName : fromTree.shopName

    const d = new Date(evt.time)
    const timeStr = isNaN(d.getTime()) ? '' : d.toISOString()

    const measurementPoints = buildMeasurementPointsFromPoint(evt.point)
    // 当前只接入“故障报警”一类 websocket；趋势预警未接入前，这里不会产生 warning
    const deviceStatus: AlarmItem['status'] = isFaultAlarm ? 'alarm' : 'healthy'

    const statusText = deviceStatus === 'alarm' ? '报警' : '健康'

    const item: AlarmItem = {
        id: deviceId,
        deviceName,
        shopName,
        deviceNameWithShop: `${deviceName}（${shopName || ''}）`,
        status: deviceStatus,
        statusText,
        time: timeStr,
        measurementPoints
    }

    const idx = alarms.value.findIndex(a => a.id === deviceId)
    if (idx >= 0) alarms.value.splice(idx, 1, item)
    else alarms.value.unshift(item)
}

let wsClient: VibrationWsClient | null = null

const allDevices = computed(() => {
    return extractDevicesFromTree(deviceTreeStore.deviceTreeData);
});

const filteredDevices = computed(() => {
    if (!deviceSearch.value) {
        return allDevices.value;
    }
    const search = deviceSearch.value.toLowerCase();
    return allDevices.value.filter(device =>
        device.deviceName.toLowerCase().includes(search) ||
        device.workshopName.toLowerCase().includes(search) ||
        device.name.toLowerCase().includes(search)
    );
});

const filteredAlarms = computed(() => {
    let result = [...alarms.value];

    if (deviceSearch.value) {
        const searchMatch = deviceSearch.value.match(/^(.+)\((.+)\)$/);
        if (searchMatch && searchMatch[1] && searchMatch[2]) {
            const searchDeviceName = searchMatch[1];
            const searchWorkshopName = searchMatch[2];
            result = result.filter(alarm =>
                alarm.deviceName.includes(searchDeviceName) &&
                alarm.shopName.includes(searchWorkshopName)
            );
        } else {
            result = result.filter(alarm =>
                alarm.deviceName.toLowerCase().includes(deviceSearch.value.toLowerCase()) ||
                alarm.shopName.toLowerCase().includes(deviceSearch.value.toLowerCase()) ||
                alarm.deviceNameWithShop.toLowerCase().includes(deviceSearch.value.toLowerCase())
            );
        }
    }

    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
        const startDate = new Date(dateRange.value[0]);
        let endDate = new Date(dateRange.value[1]);

        startDate.setHours(0, 0, 0, 0);

        const now = new Date();
        const endDay = new Date(endDate);
        endDay.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (endDay.getTime() === today.getTime()) {
            endDate = now;
        } else {
            endDate.setHours(23, 59, 59, 999);
        }

        result = result.filter(alarm => {
            if (!alarm.time) return false; 
            const alarmDateTime = new Date(alarm.time);
            return alarmDateTime >= startDate && alarmDateTime <= endDate;
        });
    }

    // 仅按时间排序（纯时间顺序），不再按状态分组
    result.sort((a, b) => {
        const timeA = a.time ? new Date(a.time).getTime() : NaN;
        const timeB = b.time ? new Date(b.time).getTime() : NaN;

        const aHasTime = !isNaN(timeA);
        const bHasTime = !isNaN(timeB);

        // 有时间的排在前面，无时间的排在后面
        if (aHasTime && !bHasTime) return -1;
        if (!aHasTime && bHasTime) return 1;
        if (!aHasTime && !bHasTime) return 0;

        // 都有时间时，按 sortOrder 升降序
        if (sortOrder.value === 'desc') {
            return timeB - timeA;
        } else {
            return timeA - timeB;
        }
    });

    return result;
});

const displayedAlarms = computed(() => {
    const startIndex = (currentPage.value - 1) * pageSize.value;
    const endIndex = startIndex + pageSize.value;
    return filteredAlarms.value.slice(startIndex, endIndex);
});

const showDeviceDropdown = () => {
    showDropdown.value = true;
};

let hideDropdownTimerId: number | null = null;

const hideDeviceDropdown = () => {
    if (hideDropdownTimerId) {
        clearTimeout(hideDropdownTimerId);
    }
    hideDropdownTimerId = window.setTimeout(() => {
        showDropdown.value = false;
    }, 200);
};

const selectDevice = (device: DeviceItem) => {
    const match = device.name.match(/^(.+)\((.+)\)$/);
    if (match) {
        const deviceName = match[1];
        const workshopName = match[2];
        deviceSearch.value = device.name;
    } else {
        deviceSearch.value = device.name;
    }

    showDropdown.value = false;
    currentPage.value = 1;
};

const handleSearch = () => {
    currentPage.value = 1;
};

const handleClear = () => {
    deviceSearch.value = '';
    currentPage.value = 1;
};

const toggleSortOrder = () => {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
    currentPage.value = 1;
};
const handleCurrentChange = (val: number) => {
    currentPage.value = val;
};

const sortIcon = Sort;

const updateContainerSize = () => {
    containerWidth.value = window.innerWidth;
    containerHeight.value = window.innerHeight;
    pageSize.value = responsivePageSize.value.pageSize;
    if (currentPage.value > Math.ceil(filteredAlarms.value.length / pageSize.value)) {
        currentPage.value = 1;
    }
};

onMounted(() => {
    window.addEventListener('resize', updateContainerSize);

    // 初始化：先用 HTTP 拿一批（如果接口返回），再订阅 websocket 实时更新
    const tenantId = localStorage.getItem('tenantId') ?? ''
    void (async () => {
        try {
            // 优先：你提供的“故障报警”接口（只返回 MACHINE_VIBRATION 的报警，不含趋势预警）
            const alarmItems = await fetchVibrationAlarmsForOverview({ tenantId, pageIndex: 0, pageSize: 50 })
            for (const it of alarmItems) upsertAlarmFromEvent(it)

            // 兜底：若新接口为空/异常，再尝试旧的 event/find 列表（项目历史兼容）
            if (alarmItems.length === 0) {
                const initEvents = await fetchVibrationEventsForOverview({ tenantId })
                for (const evt of initEvents) upsertAlarmFromEvent(evt)
            }
        } catch (e) {
            // 接口可能并非列表型，失败也不影响 websocket 实时
            console.warn('预警总览初始化接口获取失败:', e)
            // 接口不通时：不再注入 mock 假数据，直接等待后续 websocket 实时事件
        }
    })()

    if (tenantId) {
        wsClient = new VibrationWsClient({ token: localStorage.getItem('token') ?? undefined })
        void (async () => {
            try {
                await wsClient?.connect()
                wsClient?.subscribeVibrationTopic(tenantId, (payload) => {
                    upsertAlarmFromEvent(payload)
                })
            } catch (e) {
                console.error('订阅振动 websocket 失败:', e)
            }
        })()

        // 弹窗首次打开时的表格加载：预热一页数据到 store 缓存里。
        // 通过“可让出主线程”的解析方式预热，避免用户点击时被抢占（按钮不卡顿），同时尽量让弹窗首屏直接命中缓存。
        void (async () => {
            try {
                if (alarmBatchStore.realtimeVisible || alarmBatchStore.historyVisible) return
                // 只预热 realtime：避免同时解析 realtime+history 在用户点击时抢占主线程导致按钮延迟。
                void alarmBatchStore.prefetchRealtimeListForDefault()

                // history 预热延后一点点；不影响你点击实时按钮的首响应
                window.setTimeout(() => {
                    void alarmBatchStore.prefetchHistoryListForDefault()
                }, 3500)
            } catch {
                // 预热失败不影响主流程
            }
        })()
    }

    // 本地开发/演示兜底：无真实数据时注入 3 条假数据（健康/预警/报警各一条）
    if (alarms.value.length === 0) {
        alarms.value = createMockOverviewAlarms()
    }
});

onUnmounted(() => {
    window.removeEventListener('resize', updateContainerSize);

    wsClient?.disconnect()
    wsClient = null

    if (hideDropdownTimerId) {
        clearTimeout(hideDropdownTimerId);
        hideDropdownTimerId = null;
    }
});

const isValidDevice = (deviceId: string): boolean => {
    const findDeviceInTree = (nodes: DeviceNode[]): boolean => {
        for (const node of nodes) {
            if (node.id === deviceId && node.type === 'device') {
                return true;
            }
            if (node.children && node.children.length > 0) {
                if (findDeviceInTree(node.children)) {
                    return true;
                }
            }
        }
        return false;
    };

    return findDeviceInTree(deviceTreeStore.deviceTreeData);
};

/**
 * 设备右侧状态圆点的展示逻辑（当报警与预警同时存在时）：
 * 根据该设备下所有测点取最高等级：报警 > 预警 > 健康。
 * 即：存在任一测点为「报警」则显示报警；否则存在任一测点为「预警」则显示预警；否则显示健康。
 */
function getDeviceDisplayStatus(alarm: AlarmItem): 'alarm' | 'warning' | 'healthy' {
    const points = alarm.measurementPoints ?? [];
    const hasAlarm = points.some(p => p.status === 'alarm');
    const hasWarning = points.some(p => p.status === 'warning');
    if (hasAlarm) return 'alarm';
    if (hasWarning) return 'warning';
    return 'healthy';
}

function getPointStyleClass(
    pointStatus: MeasurementPoint['status'],
    deviceStatus: 'alarm' | 'warning' | 'healthy'
): string {
    if (deviceStatus === 'healthy') return 'healthy';
    if (deviceStatus === 'alarm') return pointStatus === 'alarm' ? 'alarm' : 'alarm-device';
    if (deviceStatus === 'warning') return pointStatus === 'warning' ? 'warning' : 'warning-device';
    return 'healthy';
}

/** 获取用于展示的测点：报警/预警按点号排前（如 8 号报警则 8 号最前），最多 8 个，不足则全部显示 */
function getDisplayPoints(points: MeasurementPoint[]): { point: MeasurementPoint; pointNum: number }[] {
    const list = points ?? [];
    const withNum = list.map((p, i) => ({ point: p, pointNum: i + 1 }));
    const order = { alarm: 0, warning: 1, healthy: 2 };
    const sorted = withNum.sort((a, b) => {
        const statusDiff = order[a.point.status] - order[b.point.status];
        if (statusDiff !== 0) return statusDiff;
        return a.pointNum - b.pointNum;
    });
    return sorted.slice(0, 8);
}

/** 报警时间显示「月日 时分」，如 01-15 10:32 */
function formatAlarmTime(time: string | undefined): string {
    if (!time) return '暂无';
    const d = new Date(time);
    if (isNaN(d.getTime())) return '暂无';
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours();
    const m = d.getMinutes();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(month)}-${pad(day)} ${pad(h)}:${pad(m)}`;
}

const goToDeviceDetail = (alarm: AlarmItem) => {
    const deviceId = alarm.id;
    if (!deviceId) {
        console.warn('缺少设备ID，无法跳转:', alarm);
        return;
    }

    // 直接按设备ID跳转设备详情页，并同步选中设备
    deviceTreeStore.setSelectedDeviceId(deviceId);
    router.push({
        name: 'DeviceDetail',
        params: { id: deviceId }
    }).catch(err => {
        console.error('路由跳转失败:', err);
    });
};
</script>

<style lang="scss" scoped>
.alarm-overview {
    height: 100%;
    min-height: 0;
    padding: 10px 20px 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background: url('@/assets/images/background/首页-Top5背景.png') no-repeat center center;
    background-size: 100% 100%;

    .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;

        .title-with-legend {
            display: flex;
            align-items: center;
            gap: 16px;
            flex: 0 0 auto;
            min-width: 0;
        }

        h3 {
            margin: 0;
            /* 标题字号使用 rem，随根字号变化 */
            // font-size: 1.6rem;
            font-weight: 500;
            white-space: nowrap;
        }

        .status-legend {
            display: flex;
            align-items: center;
            flex-shrink: 0;
            margin-left: auto;
            align-self: flex-end;
        }

        .batch-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;

            .batch-btn {
                font-size: 0.8rem;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.18);
                color: rgba(255, 255, 255)!important;
            }
        }

        .search-section {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: flex-end;
            gap: 10px;
            flex: 0 0 auto;

            .device-search-wrapper {
                position: relative;
                right: 1vw;
            }

            .time-section {
                display: flex;
                align-items: center;
                gap: 12px;
                padding-right: 1vw;

                .time-search-input {
                    :deep(.el-input__wrapper) {
                        background-size: 100% 100%;
                        border-radius: 4px;
                        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
                        border: none;

                        .el-input__inner {
                            color: white;
                            background: transparent;
                        }

                        .el-input__prefix {
                            color: white;
                        }
                    }
                }

                .sort-btn {
                    width: 14px;
                    height: 14px;
                    background: transparent;
                    border: none;
                    padding: 0;
                    color: #fff;

                    :deep(.el-icon) {
                        color: #fff;
                    }
                }
            }
        }
    }

    // status-legend 已经挪到了 header-section 外面，这里需要单独定义样式以保证生效
    .status-legend {
        padding: 10px 0 0;
        display: flex;
        align-items: center;
        flex-shrink: 0;
        align-self: flex-end; // 靠右
    }

    .status-legend__img {
        display: block;
        height: 0.8rem; // 统一高度
        width: auto;
        object-fit: contain;
    }

    .alarm-empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.9rem;
    }

    .alarm-grid {
        display: grid;
        gap: 10px;
        flex: 1;
        overflow-y: auto;
        padding-top: 10px;
        width: 100%;
        box-sizing: border-box;
        -ms-overflow-style: none;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }

        .alarm-card {
            width: 16vw;
            height: 20vh;
            padding: 12px;
            display: flex;
            flex-direction: column;
            transition: all 0.3s ease;
            max-height: 170px;
            min-height: 0;
            overflow: hidden;
            cursor: pointer;
            background-repeat: no-repeat;
            background-position: center center;
            background-size: 100% 100%;

            &.alarm-card--healthy {
                background-image: url('@/assets/images/background/首页-预警总览-健康设备背景.png');
            }

            &.alarm-card--alarm {
                background-image: url('@/assets/images/background/首页-预警总览-报警设备背景.png');
            }

            &.alarm-card--warning {
                background-image: url('@/assets/images/background/首页-预警总览-预警设备背景.png');
            }

            &:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

                .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                padding: 2px 8px;
                background-repeat: no-repeat;
                background-position: center center;
                background-size: 100% 100%;

                .device-name {
                    /* 设备名（车间名）文字样式 */
                    font-weight: 600;
                    letter-spacing: 1px;
                    color: rgba(255, 255, 255, 1);
                    font-size: 1rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    flex: 1;
                    min-width: 0;
                }

                .status-dot {
                    width: 2.2vw;
                    height: 0.6vh;
                    display: inline-block;
                    vertical-align: middle;
                    margin-left: 8px;
                    background-repeat: no-repeat;
                    background-position: center center;
                    background-size: contain;

                    &.alarm {
                        background-image: url('@/assets/images/background/首页-预警总览-报警.png');
                        // animation: status-dot-blink 1.5s ease-in-out infinite;
                    }

                    &.warning {
                        background-image: url('@/assets/images/background/首页-预警总览-预警.png');
                    }

                    &.healthy {
                        background-image: url('@/assets/images/background/首页-预警总览-健康.png');
                    }
                }
            }

            &.alarm-card--healthy .card-header {
                background-image: url('@/assets/images/background/首页-预警总览-健康标题.png');
            }

            &.alarm-card--alarm .card-header {
                background-image: url('@/assets/images/background/首页-预警总览-报警标题.png');
            }

            &.alarm-card--warning .card-header {
                background-image: url('@/assets/images/background/首页-预警总览-预警标题.png');
            }

            .alarm-time {
                /* 时间文字样式 */
                font-size: 0.9rem;
                font-weight: 400;
                letter-spacing: 0.78px;
                color: rgba(255, 255, 255, 1);
                white-space: nowrap;
                margin-bottom: 8px;
                text-align: left;
            }

                .measurement-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 5px;
                flex: 1;
                min-height: 0;
                
                .point-item {
                    width: 3.3vw;
                    height: 3.5vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    max-height: 35px;
                    font-size: 0.75rem;
                    white-space: nowrap;
                    text-align: center;
                    border-radius: 4px;
                    padding: 1px;
                    word-break: break-word;
                    overflow: hidden;
                    color: white;

                    &.healthy {
                        background: url('@/assets/images/background/首页-预警总览-健康点位.png') no-repeat center center;
                        background-size: 100% 100%;
                    }

                    &.warning {
                        background: url('@/assets/images/background/首页-预警总览-预警点位.png') no-repeat center center;
                        background-size: 100% 100%;
                    }

                    &.alarm {
                        background: url('@/assets/images/background/首页-预警总览-报警点位.png') no-repeat center center;
                        background-size: 100% 100%;
                    }

                    &.alarm-device {
                        background: url('@/assets/images/background/首页-预警总览-报警设备.png') no-repeat center center;
                        background-size: 100% 100%;
                    }

                    &.warning-device {
                        background: url('@/assets/images/background/首页-预警总览-预警设备.png') no-repeat center center;
                        background-size: 100% 100%;
                    }
                }
            }
        }
    }

    .pagination-wrapper {
        display: flex;
        justify-content: center;
        width: 100%;
        overflow: hidden;
        padding-top: 10px;
    }

    @keyframes status-dot-blink {

        0%,
        100% {
            opacity: 1;
        }

        50% {
            opacity: 0.35;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .status-dot.alarm {
            animation: none;
        }
    }

    /* 预警总览大盒子始终单行，列数由内联 style 根据宽度控制，此处不再覆盖 */
    @media (max-width: 768px) {
        .header-section {
            flex-direction: column;
            align-items: stretch;
        }
    }

    :deep(.el-pagination) {
        font-size: 0.9rem;

        .el-pagination__jump {
            color: white;
        }

        .el-pager li {
            background-color: transparent;
            color: white;
            border: 1px solid transparent;

            &.is-active {
                font-size: 1rem;
                color: rgba(153, 240, 255, 0.7);
                background-color: transparent;
                border: 1px solid transparent;
            }

            &:hover {
                background-color: transparent;
            }
        }

        .btn-prev,
        .btn-next {
            background-color: transparent !important;
            color: white !important;

            &:hover {
                color: rgba(153, 240, 255, 0.7) !important;
            }

            &.is-disabled {
                color: #a8abb4 !important;
            }
        }

        .el-pagination__sizes .el-input__inner,
        .el-pagination__jump .el-input__inner {
            height: 18px;
            background-color: transparent;
            color: #111 !important;
            font-size: 0.8rem;
        }
    }
}
</style>