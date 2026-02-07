<!-- 预警总览组件：显示设备告警信息 -->
<template>
    <div class="alarm-overview">
        <!-- 顶部区域：标题和搜索栏 -->
        <div class="header-section">
            <h3>预警总览</h3>
            <div class="search-section">
                <div class="device-search-wrapper">
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
                </div>

                <div class="time-section">
                    <el-date-picker v-model="dateRange" type="datetimerange" range-separator="-"
                        start-placeholder="开始日期" end-placeholder="结束日期" format="YYYY-MM-DD HH:mm:ss"
                        value-format="YYYY-MM-DD HH:mm:ss" size="small" style="width: 320px;" class="time-search-input"
                        popper-class="custom-datepicker-popper" :default-time="defaultTime"
                        :disabled-date="disabledDate" :picker-options="pickerOptions" :locale="zhCn"
                        @calendar-change="handleCalendarChange" />
                    <el-button @click="toggleSortOrder" class="sort-btn" :icon="sortIcon">
                    </el-button>
                </div>
            </div>
        </div>

        <!-- 主内容区域 -->
        <div class="alarm-grid" :style="{
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
        <div class="pagination-wrapper">
            <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="filteredAlarms.length"
                layout="prev, pager, next, jumper" @current-change="handleCurrentChange" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useDeviceTreeStore } from '@/stores/deviceTree';
import { Search, Sort } from '@element-plus/icons-vue';
import { ElInput, ElButton, ElDatePicker, ElPagination } from 'element-plus';
import { useLocale } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import type { DeviceNode } from '@/types/device';

const { t } = useLocale();

const router = useRouter()
const deviceTreeStore = useDeviceTreeStore();

const disabledDate = (time: Date) => {
    return time.getTime() > Date.now();
};

/**
 * 日期选择器快捷选项
 */
const pickerOptions = {
    shortcuts: [
        {
            text: '今天',
            onClick(picker: any) {
                const start = new Date();
                const end = new Date();
                start.setHours(0, 0, 0, 0);
                picker.$emit('pick', [start, end]);
            }
        },
        {
            text: '昨天',
            onClick(picker: any) {
                const start = new Date(Date.now() - 86400000);
                const end = new Date(Date.now() - 86400000);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                picker.$emit('pick', [start, end]);
            }
        },
        {
            text: '一周前',
            onClick(picker: any) {
                const start = new Date(Date.now() - 7 * 86400000);
                const end = new Date();
                start.setHours(0, 0, 0, 0);
                picker.$emit('pick', [start, end]);
            }
        }
    ]
};

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

const defaultTime = computed(() => {
    const now = new Date();
    return [new Date(2000, 1, 1, 0, 0, 0), now] as [Date, Date];
});

const handleCalendarChange = (val: [Date, Date]) => {
    if (val && val.length === 2) {
        const [start, end] = val;
        if (end) {
            const now = new Date();
            const endDay = new Date(end);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            endDay.setHours(0, 0, 0, 0);
            if (endDay.getTime() === today.getTime()) {
                dateRange.value = [formatDate(start), formatDate(now)];
            }
        }
    }
};

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

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

// 模拟告警数据 - 基于真实设备树结构
const alarms = computed<AlarmItem[]>(() => {
    // 使用真实的设备树数据
    const realDeviceTree = [
        {
            "factoryId": "FAC001",
            "factoryName": "Main Factory",
            "children": [
                {
                    "workshopId": "WSH001",
                    "workshopName": "Workshop A",
                    "children": [
                        {
                            "equipmentId": "ff8081819a4cd984019a4d524e0d0000",
                            "equipmentName": "五线三路风机",
                            "children": [
                                { "pointName": "3", "pointId": "lfpznaj5u6RsUgMzQH4" },
                                { "pointName": "2", "pointId": "ofC6mcZeoOhmtZOcdnL" },
                                { "pointName": "1", "pointId": "9sXGsnoV80oz7uB7AMv" },
                                { "pointName": "8", "pointId": "afuBOPygDME90Ocf4Nl" },
                                { "pointName": "7", "pointId": "3kZpxW0Ti67uYxy04Wd" },
                                { "pointName": "6", "pointId": "AiWdaUEqTCYa6CF4mYr" },
                                { "pointName": "5", "pointId": "2jSWm5mguSklnzJLXQ3" },
                                { "pointName": "4", "pointId": "ymnelvApbJkig1714Jh" },
                                { "pointName": "JXA24F5308", "pointId": "CHl6tUtNe5C7pHLTkJK" },
                                { "pointName": "JXA24F5307", "pointId": "9lzwOputwMwgnLChIpG" }
                            ]
                        },
                        {
                            "equipmentId": "ff8081819a623bff019a71fbec550018",
                            "equipmentName": "往复式压缩机",
                            "children": [
                                { "pointName": "JS32F21", "pointId": "Y9zzIRfcHLOihs9w8c8" },
                                { "pointName": "JS32F20", "pointId": "0T1dvp6P17FTM5QcpaX" },
                                { "pointName": "JS32F19", "pointId": "01wL5Y4luluaWHUur00" },
                                { "pointName": "JS32F18", "pointId": "GrVcQ9rPRT7qNBcjtZf" },
                                { "pointName": "JS32F17", "pointId": "jxF3AMdUlheGf374F4Q" },
                                { "pointName": "JS32F16", "pointId": "x56tm1lmnVgg2jrHAmz" },
                                { "pointName": "JS32F15", "pointId": "Tm9gTzgmKD4wRA8abmD" },
                                { "pointName": "JS32F14", "pointId": "iiT3Jj5OVkoNDV0673J" },
                                { "pointName": "JS32F13", "pointId": "syjlTFYJqVbxPvIGkbn" },
                                { "pointName": "JS32F12", "pointId": "aDRI7krlKWE1kQhLGF3" }
                            ]
                        }
                    ]
                },
                {
                    "workshopId": "WSH002",
                    "workshopName": "Workshop B",
                    "children": [
                        {
                            "equipmentId": "ff8081819a623bff019a71ee6a950000",
                            "equipmentName": "五线一路风机",
                            "children": [
                                { "pointName": "JXA29F6106", "pointId": "kHXkZgnoUDglfey75DG" },
                                { "pointName": "JXA29F6105", "pointId": "mEE2HiiLmrlOtbtzrlW" },
                                { "pointName": "JXA29F6104", "pointId": "RJYERBkadHWRg3HL6aF" },
                                { "pointName": "JXA29F6103", "pointId": "xvAd4v5aXEQE6HmQIdm" },
                                { "pointName": "JXA29F6102", "pointId": "RhaSNWozeQpsbL39IhD" },
                                { "pointName": "JXA29F6101", "pointId": "a5nIlFdxnIGqiWFu3Mc" },
                                { "pointName": "JXA29F6107", "pointId": "cVwuOHYFy0pUttJNLrV" },
                                { "pointName": "JXA29F6108", "pointId": "tCrBMi4H9a0g80Yqqgn" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "factoryId": "FAC002",
            "factoryName": "East Branch Factory",
            "children": [
                {
                    "workshopId": "WSH003",
                    "workshopName": "Workshop C",
                    "children": [
                        {
                            "equipmentId": "ff8081819a623bff019a71f434130009",
                            "equipmentName": "七线一路风机",
                            "children": [
                                { "pointName": "JXA29F8108", "pointId": "yoH4519rucZJWLvznRF" },
                                { "pointName": "JXA29F8107", "pointId": "tQ3by7SBR7jv2sSc6e9" },
                                { "pointName": "JXA29F8106", "pointId": "CCW9gAmMTcJjCd8ZNM5" },
                                { "pointName": "JXA29F8105", "pointId": "wCfB2K6IzUOJZiLDwvI" },
                                { "pointName": "JXA29F8102", "pointId": "Rxe4UwGmf8uQs7zB9KT" },
                                { "pointName": "JXA29F8101", "pointId": "oRxw9NT9Uid0zJDAI2e" },
                                { "pointName": "JXA29F8104", "pointId": "gtrCHbhSmXYOkqh03Hr" },
                                { "pointName": "JXA29F8103", "pointId": "mWp4H5tOt7SsAT52n6b" }
                            ]
                        }
                    ]
                },
                {
                    "workshopId": "WSH004",
                    "workshopName": "Workshop D",
                    "children": [
                        {
                            "equipmentId": "ff8081819a909f21019a918dcbf00000",
                            "equipmentName": "旋压机",
                            "children": [
                                { "pointName": "尾顶电磁阀1号点位", "pointId": "gFlE5Ph0jNKHDUtOhcc" },
                                { "pointName": "SHJY-XYJ1号点位", "pointId": "TUQ4qCulrC0Hw7ODkhZ" }
                            ]
                        }
                    ]
                }
            ]
        }
    ];

    // 将设备树数据转换为告警数据格式
    const alarmItems: AlarmItem[] = [];

    realDeviceTree.forEach(factory => {
        factory.children.forEach(workshop => {
            workshop.children.forEach(equipment => {
                // 随机生成设备状态（健康或预警）
                const isWarning = Math.random() > 0.7; // 30%概率为预警
                const status = isWarning ? 'warning' : 'healthy';
                const statusText = isWarning ? '预警' : '健康';

                // 生成随机的时间（如果是预警状态）
                let time = '';
                if (isWarning) {
                    const now = new Date();
                    const randomHours = Math.floor(Math.random() * 48); // 48小时内随机时间
                    const alarmTime = new Date(now.getTime() - randomHours * 60 * 60 * 1000);
                    time = formatDate(alarmTime);
                }

                // 生成测点数据（最多10个测点用于展示）
                const measurementPoints: MeasurementPoint[] = [];
                const pointCount = Math.min(10, equipment.children.length); // 最多显示10个测点

                for (let i = 0; i < pointCount; i++) {
                    const isPointWarning = isWarning && Math.random() > 0.6; // 如果设备预警，测点有40%概率预警
                    const point = equipment.children[i];
                    if (point) {
                        measurementPoints.push({
                            name: point.pointName,
                            status: isPointWarning ? 'warning' : 'healthy'
                        });
                    }
                }

                // 如果测点少于10个，补充虚拟测点
                while (measurementPoints.length < 10) {
                    const isPointWarning = isWarning && Math.random() > 0.6;
                    measurementPoints.push({
                        name: `测点${measurementPoints.length + 1}`,
                        status: isPointWarning ? 'warning' : 'healthy'
                    });
                }

                alarmItems.push({
                    id: equipment.equipmentId,
                    deviceName: equipment.equipmentName,
                    shopName: workshop.workshopName,
                    deviceNameWithShop: `${equipment.equipmentName}（${workshop.workshopName}）`,
                    status,
                    statusText,
                    time,
                    measurementPoints
                });
            });
        });
    });

    return alarmItems;
});

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
            if (!alarm.time) return true;
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
    padding: 10px;
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
            font-weight: 600;
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

                .sort-btn {
                    width: 14px;
                    height: 14px;
                    background: transparent;
                    border: none;
                    padding: 0;
                }
            }
        }
    }

    .alarm-grid {
        display: grid;
        gap: 15px;
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
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
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;

                .device-name {
                    font-weight: bold;
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
                font-size: clamp(12px, 1.4vw, 16px);
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
                color: #409EFF;
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
                color: #409EFF !important;
            }

            &.is-disabled {
                color: #a8abb4 !important;
            }
        }

        .el-pagination__sizes .el-input__inner,
        .el-pagination__jump .el-input__inner {
            height: 18px;
            background-color: transparent;
            color: #111;
            font-size: clamp(10px, 1vw, 12px);
        }
    }
}
</style>
<style lang="scss">
.el-picker-panel.el-date-range-picker {
    width: 440px !important;
    font-size: 12px !important;

    .el-input__wrapper {
        width: 90px !important;
    }

    .el-date-range-picker__time-header {
        width: 400px !important;
    }

    .el-date-range-picker__time-header {
        display: flex;
        justify-content: space-between;
        padding: 8px 10px !important;
        gap: 6px;

        >.el-scrollbar {
            width: calc(50% - 3px) !important;
        }

        .el-date-editor {
            width: 100% !important;

            :deep(.el-input__wrapper) {
                height: 26px !important;
                padding: 0 6px !important;
                background: rgba(255, 255, 255, 0.1) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                box-shadow: none !important;
                border-radius: 3px !important;
            }

            :deep(.el-input__inner) {
                height: 26px !important;
                line-height: 26px !important;
                font-size: 11px !important;
                padding: 0 4px !important;
                color: white !important;
                background: transparent !important;
            }
        }
    }

    .el-date-range-picker__header {
        font-size: 12px !important;
        font-weight: normal !important;
        padding: 4px 0 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
    }

    .el-picker-panel__icon-btn {
        width: 14px !important;
        height: 14px !important;
        line-height: 14px !important;
        font-size: 11px !important;
    }

    .el-date-range-picker__content {
        width: 180px !important;
        padding: 6px !important;

        .el-date-table {
            font-size: 10.5px !important;

            th,
            td {
                padding: 2px 0 !important;
                height: 22px !important;
                line-height: 22px !important;
            }
        }
    }

    .el-time-panel {
        padding: 6px !important;

        .el-time-spinner__wrapper {
            padding: 0 3px !important;
        }

        .el-time-spinner__input {
            :deep(.el-input__inner) {
                height: 22px !important;
                line-height: 22px !important;
                font-size: 11px !important;
                padding: 0 3px !important;
            }
        }
    }

    .el-picker-panel__footer {
        padding: 6px 10px !important;

        .el-button--text {
            font-size: 11px !important;
            padding: 2px 6px !important;
        }
    }
}
</style>