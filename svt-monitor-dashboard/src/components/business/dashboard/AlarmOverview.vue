<!-- 预警总览组件：显示设备告警信息 -->
<template>
    <div class="alarm-overview">
        <!-- 顶部区域：标题和搜索栏 -->
        <div class="header-section">
            <h3 class="app-section-title">预警总览</h3>
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

        <!-- 主内容区域 -->
        <div v-if="filteredAlarms.length === 0" class="alarm-empty">暂无数据</div>
        <div v-else class="alarm-grid" :style="{
            'grid-template-columns': `repeat(${responsivePageSize.columns}, 1fr)`,
            'grid-auto-rows': '1fr'
        }">
            <div v-for="(alarm, index) in displayedAlarms" :key="index" class="alarm-card"
                @click="goToDeviceDetail(alarm)">
                <!-- 第一部分：设备名和状态 -->
                <div class="card-header">
                    <span class="device-name" :title="alarm.deviceNameWithShop">{{ alarm.deviceNameWithShop }}</span>
                    <span :class="['status-dot', alarm.status]"></span>
                </div>

                <!-- 第二部分：报警时间 -->
                <div class="alarm-time">{{ alarm.time || '暂无' }}</div>

                <!-- 第三部分：测点网格 -->
                <div class="measurement-grid">
                    <div v-for="(point, pointIndex) in alarm.measurementPoints" :key="pointIndex"
                        :class="['point-item', point.status]">
                        {{ pointIndex + 1 }}
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
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDeviceTreeStore } from '@/stores/deviceTree';
import { Search, Sort } from '@element-plus/icons-vue';
import { ElInput, ElButton, ElDatePicker, ElPagination } from 'element-plus';
import { useLocale } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import type { DeviceNode } from '@/types/device';
import { formatDateTime, disabledFutureDate, getDefaultDateRange } from '@/utils/datetime';
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue';

const { t } = useLocale();

const router = useRouter()
const deviceTreeStore = useDeviceTreeStore();

// 定义类型
interface MeasurementPoint {
    name: string;
    status: 'healthy' | 'warning';
}

interface AlarmItem {
    id: string;
    deviceName: string;
    shopName: string;
    deviceNameWithShop: string;
    status: 'warning' | 'healthy';
    statusText: string;
    time: string;
    measurementPoints: MeasurementPoint[];
}

interface DeviceItem {
    id: string | number;
    name: string; // 完整显示用：设备名（车间名）
    deviceName: string;
    workshopName: string;
}

const extractDevicesFromTree = (nodes: DeviceNode[]): DeviceItem[] => {
    const devices: DeviceItem[] = [];

    // 与 DeviceSidebar 一致：按 factory -> workshop -> device 结构遍历，从父级 workshop 获取车间名
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

const responsivePageSize = computed(() => {
    const width = containerWidth.value;
    const height = containerHeight.value;

    if (width >= 1200) {
        if (height >= 800) {
            return { pageSize: 6, columns: 3, rows: 2 };
        } else {
            return { pageSize: 3, columns: 3, rows: 1 };
        }
    } else if (width >= 768) {
        if (height >= 800) {
            return { pageSize: 4, columns: 2, rows: 2 };
        } else {
            return { pageSize: 2, columns: 2, rows: 1 };
        }
    } else {
        if (height >= 600) {
            return { pageSize: 2, columns: 1, rows: 2 };
        } else {
            return { pageSize: 1, columns: 1, rows: 1 };
        }
    }
});

const rowsCount = computed(() => {
    const { pageSize, columns } = responsivePageSize.value;
    return Math.ceil(pageSize / columns);
});

const pageSize = ref(responsivePageSize.value.pageSize);

const sortOrder = ref<'asc' | 'desc'>("desc");

// 预警总览写死数据（用户指定用死数据）
const alarms = ref<AlarmItem[]>([
    { id: 'ff8081819a4cd984019a4d524e0d0000', deviceName: '五线三路风机', shopName: '车间A', deviceNameWithShop: '五线三路风机（车间A）', status: 'warning', statusText: '预警', time: '2026-01-15 10:32:00', measurementPoints: [{ name: '3', status: 'warning' }, { name: '2', status: 'healthy' }, { name: '1', status: 'healthy' }, { name: '8', status: 'healthy' }, { name: '7', status: 'warning' }, { name: '6', status: 'healthy' }, { name: '5', status: 'healthy' }, { name: '4', status: 'healthy' }, { name: 'JXA24F5308', status: 'healthy' }, { name: 'JXA24F5307', status: 'healthy' }] },
    { id: 'ff8081819a623bff019a71fbec550018', deviceName: '往复式压缩机', shopName: '车间A', deviceNameWithShop: '往复式压缩机（车间A）', status: 'healthy', statusText: '健康', time: '', measurementPoints: [{ name: 'JS32F21', status: 'healthy' }, { name: 'JS32F20', status: 'healthy' }, { name: 'JS32F19', status: 'healthy' }, { name: 'JS32F18', status: 'healthy' }, { name: 'JS32F17', status: 'healthy' }, { name: 'JS32F16', status: 'healthy' }, { name: 'JS32F15', status: 'healthy' }, { name: 'JS32F14', status: 'healthy' }, { name: 'JS32F13', status: 'healthy' }, { name: 'JS32F12', status: 'healthy' }] },
    { id: 'ff8081819a623bff019a71ee6a950000', deviceName: '五线一路风机', shopName: '车间B', deviceNameWithShop: '五线一路风机（车间B）', status: 'warning', statusText: '预警', time: '2026-01-14 16:20:00', measurementPoints: [{ name: 'JXA29F6106', status: 'healthy' }, { name: 'JXA29F6105', status: 'warning' }, { name: 'JXA29F6104', status: 'healthy' }, { name: 'JXA29F6103', status: 'healthy' }, { name: 'JXA29F6102', status: 'healthy' }, { name: 'JXA29F6101', status: 'healthy' }, { name: 'JXA29F6107', status: 'healthy' }, { name: 'JXA29F6108', status: 'healthy' }, { name: '测点9', status: 'healthy' }, { name: '测点10', status: 'healthy' }] },
    { id: 'ff8081819a623bff019a71f434130009', deviceName: '七线一路风机', shopName: '车间C', deviceNameWithShop: '七线一路风机（车间C）', status: 'healthy', statusText: '健康', time: '', measurementPoints: [{ name: 'JXA29F8108', status: 'healthy' }, { name: 'JXA29F8107', status: 'healthy' }, { name: 'JXA29F8106', status: 'healthy' }, { name: 'JXA29F8105', status: 'healthy' }, { name: 'JXA29F8102', status: 'healthy' }, { name: 'JXA29F8101', status: 'healthy' }, { name: 'JXA29F8104', status: 'healthy' }, { name: 'JXA29F8103', status: 'healthy' }, { name: '测点9', status: 'healthy' }, { name: '测点10', status: 'healthy' }] },
    { id: 'ff8081819a909f21019a918dcbf00000', deviceName: '旋压机', shopName: '车间D', deviceNameWithShop: '旋压机（车间D）', status: 'warning', statusText: '预警', time: '2026-01-13 08:15:00', measurementPoints: [{ name: '尾顶电磁阀1号点位', status: 'warning' }, { name: 'SHJY-XYJ1号点位', status: 'healthy' }, { name: '测点3', status: 'healthy' }, { name: '测点4', status: 'healthy' }, { name: '测点5', status: 'healthy' }, { name: '测点6', status: 'healthy' }, { name: '测点7', status: 'healthy' }, { name: '测点8', status: 'healthy' }, { name: '测点9', status: 'healthy' }, { name: '测点10', status: 'healthy' }] }
]);

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
        let startDate = new Date(dateRange.value[0]);
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
            if (!alarm.time) return false; // 筛选时间范围内不显示无预警时间的设备
            const alarmDateTime = new Date(alarm.time);
            return alarmDateTime >= startDate && alarmDateTime <= endDate;
        });
    }

    result.sort((a, b) => {
        if (a.status === 'warning' && b.status === 'healthy') return -1;
        if (a.status === 'healthy' && b.status === 'warning') return 1;

        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;

        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();

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
});

onUnmounted(() => {
    window.removeEventListener('resize', updateContainerSize);

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

const goToDeviceDetail = (alarm: AlarmItem) => {

    if (isValidDevice(alarm.id)) {
        deviceTreeStore.setSelectedDeviceId(alarm.id);
        router.push({
            name: 'DeviceDetail',
            params: { id: alarm.id },
            query: { deviceName: alarm.deviceName, workshopName: alarm.shopName }
        }).catch(err => {
            console.error('路由跳转失败:', err);
        });
    } else {
        console.warn('设备不存在，无法跳转:', alarm.id);
    }
};
</script>

<style lang="scss" scoped>
.alarm-overview {
    flex: 0 0 60%;
    padding: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: 100%;
    background: url('@/assets/images/background/首页-预警总览背景.png') no-repeat center center;
    background-size: 100% 100%;

    .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;

        h3 {
            margin: 0;
            font-size: clamp(22px, 3vw, 26px);
            font-weight: 500;
            white-space: nowrap;
        }

        .search-section {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: flex-end;
            gap: 15px;
            flex: 0 0 auto;

            .device-search-wrapper {
                position: relative;
                right: 1vw;

                .custom-search-input {
                    :deep(.el-input__wrapper) {
                        height: 30px;
                        background: url('@/assets/images/background/首页-搜索框背景.png') no-repeat center center;
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

                .dropdown-list {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background-color: #0b44a3;
                    border: 1px solid #0558a8;
                    border-top: none;
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
                    z-index: 2000;
                    margin-top: 4px;
                    max-height: 300px;
                    overflow-y: auto;

                    .dropdown-item {
                        padding: 8px 12px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                        font-size: clamp(10px, 1.2vw, 12px);
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        line-height: 1;
                        text-align: left;
                        color: white;

                        &:hover {
                            background-color: #1a5fb4;
                        }

                        .device-name {
                            display: block;
                        }

                        .workshop-name {
                            display: block;
                            font-size: clamp(8px, 1vw, 10px);
                            margin-top: 2px;
                        }
                    }

                    .dropdown-empty {
                        padding: 12px;
                        text-align: center;
                        font-size: clamp(10px, 1.2vw, 12px);
                        color: white;
                    }
                }
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

    .alarm-empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
    }

    .alarm-grid {
        display: grid;
        gap: 15px;
        flex: 1;
        overflow-y: auto;
        padding-top: 20px;
        width: 100%;
        box-sizing: border-box;
        -ms-overflow-style: none;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }

        .alarm-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            border-radius: 14px;
            transition: all 0.3s ease;
            max-height: 150px;
            min-height: 0;
            overflow: hidden;
            height: 100%;
            cursor: pointer;

            &:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;

                .device-name {
                    /* 设备名（车间名）文字样式 */
                    font-weight: 600;
                    letter-spacing: 1px;
                    color: rgba(255, 255, 255, 1);
                    font-size: clamp(12px, 1.5vw, 16px);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    flex: 1;
                    min-width: 0;
                }

                .status-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    display: inline-block;
                    vertical-align: middle;
                    margin-left: 8px;

                    &.warning {
                        background: url('@/assets/images/background/首页-预警设备.png') no-repeat center center;
                        background-size: contain;
                        background-color: #f56c6c;
                    }

                    &.healthy {
                        background: url('@/assets/images/background/首页-健康设备.png') no-repeat center center;
                        background-size: contain;
                        background-color: #67c23a;
                    }
                }
            }

            .alarm-time {
                /* 时间文字样式 */
                font-size: clamp(12px, 1.4vw, 16px);
                font-weight: 400;
                letter-spacing: 0.78px;
                color: rgba(255, 255, 255, 1);
                white-space: nowrap;
                margin-bottom: 12px;
                text-align: left;
            }

            .measurement-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 6px;
                flex: 1;
                min-height: 0;

                .point-item {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: clamp(8px, 1vw, 12px);
                    white-space: nowrap;
                    text-align: center;
                    border-radius: 4px;
                    padding: 1px;
                    word-break: break-word;
                    overflow: hidden;
                    color: white;

                    &.healthy {
                        background: url('@/assets/images/background/首页-健康测点.png') no-repeat center center;
                        background-size: 100% 100%;
                    }

                    &.warning {
                        background: url('@/assets/images/background/首页-预警测点.png') no-repeat center center;
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
    }

    /* 响应式设计 */
    @media (max-width: 1200px) {
        .alarm-grid {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
    }

    @media (max-width: 768px) {
        .alarm-grid {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }

        .header-section {
            flex-direction: column;
            align-items: stretch;
        }
    }

    @media (max-width: 480px) {
        .alarm-grid {
            grid-template-columns: 1fr;
        }
    }

    :deep(.el-pagination) {
        font-size: clamp(12px, 1.2vw, 14px);

        .el-pagination__jump {
            color: white;
        }

        .el-pager li {
            background-color: transparent;
            color: white;
            border: 1px solid transparent;

            &.is-active {
                font-size: clamp(14px, 1.4vw, 16px);
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
            /* “前往 X 页” 数字输入框字体颜色改为黑色（提升优先级防止被全局样式覆盖） */
            color: #111 !important;
            font-size: clamp(10px, 1vw, 12px);
        }
    }
}
</style>