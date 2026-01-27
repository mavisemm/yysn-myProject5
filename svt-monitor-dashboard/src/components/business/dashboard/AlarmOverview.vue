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
                            {{ device.name }}
                        </div>
                    </div>
                </div>

                <div class="time-section">
                    <el-date-picker v-model="dateRange" type="datetimerange" range-separator="-"
                        start-placeholder="开始日期" end-placeholder="结束日期" format="YYYY-MM-DD HH:mm:ss"
                        value-format="YYYY-MM-DD HH:mm:ss" size="small" style="width: 320px;" class="time-search-input"
                        popper-class="custom-datepicker-popper"
                        :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
                        :disabled-date="disabledDate" :picker-options="pickerOptions" :locale="zhCn" />
                    <el-button @click="toggleSortOrder" class="sort-btn" :icon="sortIcon">
                    </el-button>
                </div>
            </div>
        </div>

        <!-- 主内容区域 - 响应式大方块 -->
        <div class="alarm-grid" :style="{
            'grid-template-columns': `repeat(${responsivePageSize.columns}, 1fr)`,
            'grid-auto-rows': '1fr'
        }">
            <div v-for="(alarm, index) in displayedAlarms" :key="index" class="alarm-card"
                @click="goToDeviceDetail(alarm)">
                <!-- 第一部分：设备名和状态 -->
                <div class="card-header">
                    <span class="device-name">{{ alarm.deviceNameWithShop }}</span>
                    <span :class="['status-dot', alarm.status]"></span>
                </div>

                <!-- 第二部分：报警时间 -->
                <div class="alarm-time">{{ alarm.time || '暂无' }}</div>

                <!-- 第三部分：测点网格 -->
                <div class="measurement-grid">
                    <div v-for="(point, pointIndex) in alarm.measurementPoints" :key="pointIndex"
                        :class="['point-item', point.status]">
                        {{ pointIndex + 1 }} <!-- 显示数字 1-10，而不是"测点1" -->
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDeviceTreeStore } from '@/stores/deviceTree';
import { Search, Sort } from '@element-plus/icons-vue';
import { ElInput, ElButton, ElDatePicker, ElPagination } from 'element-plus';
import { useLocale } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';

// 设置Element Plus组件库语言为中文
const { t } = useLocale();

// 初始化路由
const router = useRouter()
const deviceTreeStore = useDeviceTreeStore();

// 日期选择器相关功能
const disabledDate = (time: Date) => {
    // 禁用未来日期
    return time.getTime() > Date.now();
};

const pickerOptions = {
    shortcuts: [
        {
            text: '今天',
            onClick(picker: any) {
                const start = new Date();
                const end = new Date();
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
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
                end.setHours(23, 59, 59, 999);
                picker.$emit('pick', [start, end]);
            }
        }
    ]
};

// interface Props {
//     title: string;
// }

// defineProps<Props>();

// 定义类型
interface MeasurementPoint {
    name: string;
    status: 'healthy' | 'warning';
}

interface AlarmItem {
    id: string;  // 使用字符串类型的ID，与设备树中的ID格式一致
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
    name: string;
}

// 从设备树获取真实设备数据
const extractDevicesFromTree = (nodes: any[]): DeviceItem[] => {
    const devices: DeviceItem[] = [];

    const traverse = (nodeList: any[]) => {
        nodeList.forEach(node => {
            if (node.type === 'device') {
                devices.push({
                    id: node.id,
                    name: `${node.name}（${node.workshopName}）`
                });
            }
            if (node.children) {
                traverse(node.children);
            }
        });
    };

    traverse(nodes);
    return devices;
};

// 数据状态
const deviceSearch = ref('');
const dateRange = ref<[string, string]>(['', '']);
const showDropdown = ref(false);
const currentPage = ref(1);

// 响应式分页大小 - 根据容器宽度和高度动态调整
const containerWidth = ref(window.innerWidth);
const containerHeight = ref(window.innerHeight);

// 根据容器宽度和高度计算每页显示的数量和列数
const responsivePageSize = computed(() => {
    const width = containerWidth.value;
    const height = containerHeight.value;

    if (width >= 1200) {
        // 最宽的情况：2行3列
        if (height >= 800) {
            return { pageSize: 6, columns: 3, rows: 2 }; // 2行×3列
        } else {
            return { pageSize: 3, columns: 3, rows: 1 }; // 1行×3列
        }
    } else if (width >= 768) {
        // 中等宽度：2行2列
        if (height >= 800) {
            return { pageSize: 4, columns: 2, rows: 2 }; // 2行×2列
        } else {
            return { pageSize: 2, columns: 2, rows: 1 }; // 1行×2列
        }
    } else {
        // 最窄的情况：2行1列
        if (height >= 600) {
            return { pageSize: 2, columns: 1, rows: 2 }; // 2行×1列
        } else {
            return { pageSize: 1, columns: 1, rows: 1 }; // 1行×1列
        }
    }
});

// 计算每页显示的行数
const rowsCount = computed(() => {
    const { pageSize, columns } = responsivePageSize.value;
    return Math.ceil(pageSize / columns);
});

// 动态获取当前的页面大小
const pageSize = ref(responsivePageSize.value.pageSize);

const sortOrder = ref<'asc' | 'desc'>("desc"); // desc 表示最新的在前

// 获取设备树数据以供搜索使用
// 从父组件传入或通过API获取设备数据
// 这里我们创建一个方法来获取设备列表

// 模拟告警数据
const alarms = ref<AlarmItem[]>([
    {
        id: 'device_001',
        deviceName: '设备a',
        shopName: '车间A',
        deviceNameWithShop: '设备a（车间A）',
        status: 'warning',
        statusText: '预警',
        time: '2026-01-02 16:53:26',
        measurementPoints: [
            { name: '测点1', status: 'healthy' },
            { name: '测点2', status: 'warning' },
            { name: '测点3', status: 'healthy' },
            { name: '测点4', status: 'healthy' },
            { name: '测点5', status: 'warning' },
            { name: '测点6', status: 'healthy' },
            { name: '测点7', status: 'healthy' },
            { name: '测点8', status: 'warning' },
            { name: '测点9', status: 'healthy' },
            { name: '测点10', status: 'healthy' },
        ]
    },
    {
        id: 'device_002',
        deviceName: '设备b',
        shopName: '车间A',
        deviceNameWithShop: '设备b（车间A）',
        status: 'healthy',
        statusText: '健康',
        time: '', // 健康设备没有预警时间
        measurementPoints: [
            { name: '测点1', status: 'healthy' },
            { name: '测点2', status: 'healthy' },
            { name: '测点3', status: 'healthy' },
            { name: '测点4', status: 'healthy' },
            { name: '测点5', status: 'healthy' },
            { name: '测点6', status: 'healthy' },
            { name: '测点7', status: 'healthy' },
            { name: '测点8', status: 'healthy' },
            { name: '测点9', status: 'healthy' },
            { name: '测点10', status: 'healthy' },
        ]
    },
    {
        id: 'device_003',
        deviceName: '设备c',
        shopName: '车间B',
        deviceNameWithShop: '设备c（车间B）',
        status: 'warning',
        statusText: '预警',
        time: '2026-01-02 14:20:33',
        measurementPoints: [
            { name: '测点1', status: 'warning' },
            { name: '测点2', status: 'healthy' },
            { name: '测点3', status: 'warning' },
            { name: '测点4', status: 'healthy' },
            { name: '测点5', status: 'healthy' },
            { name: '测点6', status: 'warning' },
            { name: '测点7', status: 'healthy' },
            { name: '测点8', status: 'healthy' },
            { name: '测点9', status: 'warning' },
            { name: '测点10', status: 'healthy' },
        ]
    },
    {
        id: 'device_004',
        deviceName: '设备a',
        shopName: '车间B',
        deviceNameWithShop: '设备a（车间B）',
        status: 'healthy',
        statusText: '健康',
        time: '', // 健康设备没有预警时间
        measurementPoints: [
            { name: '测点1', status: 'healthy' },
            { name: '测点2', status: 'healthy' },
            { name: '测点3', status: 'healthy' },
            { name: '测点4', status: 'healthy' },
            { name: '测点5', status: 'healthy' },
            { name: '测点6', status: 'healthy' },
            { name: '测点7', status: 'healthy' },
            { name: '测点8', status: 'healthy' },
            { name: '测点9', status: 'healthy' },
            { name: '测点10', status: 'healthy' },
        ]
    },
    {
        id: 'device_005',
        deviceName: '设备a',
        shopName: '车间A',
        deviceNameWithShop: '设备a（车间A）',
        status: 'warning',
        statusText: '预警',
        time: '2026-01-02 12:05:21',
        measurementPoints: [
            { name: '测点1', status: 'healthy' },
            { name: '测点2', status: 'warning' },
            { name: '测点3', status: 'healthy' },
            { name: '测点4', status: 'warning' },
            { name: '测点5', status: 'healthy' },
            { name: '测点6', status: 'healthy' },
            { name: '测点7', status: 'warning' },
            { name: '测点8', status: 'healthy' },
            { name: '测点9', status: 'healthy' },
            { name: '测点10', status: 'warning' },
        ]
    },
    {
        id: 'device_006',
        deviceName: '设备e',
        shopName: '车间AB',
        deviceNameWithShop: '设备e（车间AB）',
        status: 'healthy',
        statusText: '健康',
        time: '', // 健康设备没有预警时间
        measurementPoints: [
            { name: '测点1', status: 'healthy' },
            { name: '测点2', status: 'healthy' },
            { name: '测点3', status: 'healthy' },
            { name: '测点4', status: 'healthy' },
            { name: '测点5', status: 'healthy' },
            { name: '测点6', status: 'healthy' },
            { name: '测点7', status: 'healthy' },
            { name: '测点8', status: 'healthy' },
            { name: '测点9', status: 'healthy' },
            { name: '测点10', status: 'healthy' },
        ]
    },
    // 添加更多模拟数据
    {
        id: 'device_007',
        deviceName: '设备a',
        shopName: '车间A',
        deviceNameWithShop: '设备a（车间A）',
        status: 'warning',
        statusText: '预警',
        time: '2026-01-01 10:15:30',
        measurementPoints: [
            { name: '测点1', status: 'warning' },
            { name: '测点2', status: 'healthy' },
            { name: '测点3', status: 'warning' },
            { name: '测点4', status: 'healthy' },
            { name: '测点5', status: 'healthy' },
            { name: '测点6', status: 'warning' },
            { name: '测点7', status: 'healthy' },
            { name: '测点8', status: 'healthy' },
            { name: '测点9', status: 'warning' },
            { name: '测点10', status: 'healthy' },
        ]
    },
    {
        id: 'device_008',
        deviceName: '设备c',
        shopName: '车间B',
        deviceNameWithShop: '设备c（车间B）',
        status: 'healthy',
        statusText: '健康',
        time: '', // 健康设备没有预警时间
        measurementPoints: [
            { name: '测点1', status: 'healthy' },
            { name: '测点2', status: 'healthy' },
            { name: '测点3', status: 'healthy' },
            { name: '测点4', status: 'healthy' },
            { name: '测点5', status: 'healthy' },
            { name: '测点6', status: 'healthy' },
            { name: '测点7', status: 'healthy' },
            { name: '测点8', status: 'healthy' },
            { name: '测点9', status: 'healthy' },
            { name: '测点10', status: 'healthy' },
        ]
    }
]);

// 计算属性：获取所有设备列表
const allDevices = computed(() => {
    // 从设备树中提取设备信息，构造"设备名称（车间名称）"格式的列表
    return extractDevicesFromTree(deviceTreeStore.deviceTreeData);
});

// 计算属性：过滤后的设备列表
const filteredDevices = computed(() => {
    if (!deviceSearch.value) {
        return allDevices.value;
    }
    return allDevices.value.filter(device =>
        device.name.toLowerCase().includes(deviceSearch.value.toLowerCase())
    );
});

// 计算属性：根据条件过滤和排序的告警数据
const filteredAlarms = computed(() => {
    let result = [...alarms.value];

    // 按设备名称过滤 - 支持"设备名称（车间名称）"格式的过滤
    if (deviceSearch.value) {
        // 检查搜索文本是否符合"设备名（车间名）"格式
        const searchMatch = deviceSearch.value.match(/^(.+)\((.+)\)$/);
        if (searchMatch && searchMatch[1] && searchMatch[2]) {
            // 如果是完整格式，精确匹配设备名和车间名
            const searchDeviceName = searchMatch[1];
            const searchWorkshopName = searchMatch[2];
            result = result.filter(alarm =>
                alarm.deviceName.includes(searchDeviceName) &&
                alarm.shopName.includes(searchWorkshopName)
            );
        } else {
            // 否则模糊匹配设备名或车间名
            result = result.filter(alarm =>
                alarm.deviceName.toLowerCase().includes(deviceSearch.value.toLowerCase()) ||
                alarm.shopName.toLowerCase().includes(deviceSearch.value.toLowerCase()) ||
                alarm.deviceNameWithShop.toLowerCase().includes(deviceSearch.value.toLowerCase())
            );
        }
    }

    // 按时间范围过滤
    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
        let startDate = new Date(dateRange.value[0]);
        let endDate = new Date(dateRange.value[1]);

        // 设置开始时间为当天00:00:00
        startDate.setHours(0, 0, 0, 0);

        // 设置结束时间为当天23:59:59，但如果结束日期是今天，则设为当前时间
        const now = new Date();
        const endDay = new Date(endDate);
        endDay.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (endDay.getTime() === today.getTime()) {
            // 如果结束日期是今天，则使用当前时间
            endDate = now;
        } else {
            // 否则设置为当天23:59:59
            endDate.setHours(23, 59, 59, 999);
        }

        result = result.filter(alarm => {
            if (!alarm.time) return true; // 健康设备（无时间）也显示
            const alarmDateTime = new Date(alarm.time);
            return alarmDateTime >= startDate && alarmDateTime <= endDate;
        });
    }

    // 按时间排序 - 预警设备优先，然后是时间排序
    result.sort((a, b) => {
        // 首先按状态排序：预警设备优先于健康设备
        if (a.status === 'warning' && b.status === 'healthy') return -1;
        if (a.status === 'healthy' && b.status === 'warning') return 1;

        // 对于相同状态的设备，按时间排序
        if (!a.time && !b.time) return 0; // 两个都没有时间则不改变顺序
        if (!a.time) return 1; // a没有时间，排在后面
        if (!b.time) return -1; // b没有时间，排在后面

        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();

        if (sortOrder.value === 'desc') {
            return timeB - timeA; // 最新的在前
        } else {
            return timeA - timeB; // 最早的在前
        }
    });

    return result;
});

// 计算属性：当前页显示的告警数据
const displayedAlarms = computed(() => {
    const startIndex = (currentPage.value - 1) * pageSize.value;
    const endIndex = startIndex + pageSize.value;
    return filteredAlarms.value.slice(startIndex, endIndex);
});

// 方法：显示设备下拉框
const showDeviceDropdown = () => {
    showDropdown.value = true;
};

// 方法：隐藏设备下拉框
const hideDeviceDropdown = () => {
    setTimeout(() => {
        showDropdown.value = false;
    }, 200); // 延迟隐藏，允许点击选项
};

// 方法：选择设备
const selectDevice = (device: DeviceItem) => {
    // 从设备名称中提取设备名和车间名（格式：设备名（车间名））
    const match = device.name.match(/^(.+)\((.+)\)$/);
    if (match) {
        const deviceName = match[1];
        const workshopName = match[2];

        // 更新搜索框显示完整格式
        deviceSearch.value = device.name;

        // 过滤告警数据以匹配所选设备
        // 这将在computed属性filteredAlarms中自动生效
    } else {
        // 如果格式不符合预期，直接使用设备名
        deviceSearch.value = device.name;
    }

    showDropdown.value = false;
    currentPage.value = 1; // 重置到第一页
};

// 方法：处理搜索
const handleSearch = () => {
    currentPage.value = 1; // 重置到第一页
};

// 方法：处理清除
const handleClear = () => {
    deviceSearch.value = '';
    currentPage.value = 1; // 重置到第一页
};

// 方法：切换排序顺序
const toggleSortOrder = () => {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
    currentPage.value = 1; // 重置到第一页
};

// 方法：处理页面大小变化
// （已移除，因为分页组件不包含修改每页展示个数的选项）

// 方法：处理当前页变化
const handleCurrentChange = (val: number) => {
    currentPage.value = val;
};

// 图标引用
const sortIcon = Sort;

// 监听窗口大小变化
const updateContainerSize = () => {
    containerWidth.value = window.innerWidth;
    containerHeight.value = window.innerHeight;
    // 根据新的容器尺寸更新页面大小
    pageSize.value = responsivePageSize.value.pageSize;
    // 重置到第一页以避免超出范围的页码
    if (currentPage.value > Math.ceil(filteredAlarms.value.length / pageSize.value)) {
        currentPage.value = 1;
    }
};

// 在组件挂载后添加事件监听器
onMounted(() => {
    window.addEventListener('resize', updateContainerSize);
});

// 在组件卸载前移除事件监听器
onUnmounted(() => {
    window.removeEventListener('resize', updateContainerSize);
});

// 验证设备是否存在
const isValidDevice = (deviceId: string): boolean => {
    // 遍历设备树数据，检查设备是否存在
    const findDeviceInTree = (nodes: any[]): boolean => {
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

// 方法：跳转到设备详情页
const goToDeviceDetail = (alarm: AlarmItem) => {
    // 根据设备ID跳转到设备详情页
    console.log('跳转到设备详情页，设备ID:', alarm.id);

    if (isValidDevice(alarm.id)) {
        // 在跳转前设置选中的设备ID
        deviceTreeStore.setSelectedDeviceId(alarm.id);
        router.push({
            name: 'DeviceDetail',
            params: { id: alarm.id },  // alarm.id 现在已经是字符串类型
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
        gap: 16px;

        h3 {
            margin: 0;
            font-size: clamp(22px, 3vw, 26px);
            font-weight: 600;
        }

        .search-section {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: flex-end;
            gap: 16px;
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

                        // 修改输入框内部文字颜色，使其在浅色背景上更易读
                        .el-input__inner {
                            color: white;
                            background: transparent;
                        }

                        // 搜索图标颜色
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
                        /* 响应式字体大小 */
                        display: flex;
                        align-items: center;
                        color: white;

                        &:hover {
                            background-color: #1a5fb4;
                        }

                        .workshop-name {
                            font-size: clamp(8px, 1vw, 10px);
                            /* 响应式字体大小 */
                            margin-left: 4px;
                            flex-shrink: 0;
                        }
                    }

                    .dropdown-empty {
                        padding: 12px;
                        text-align: center;
                        font-size: clamp(10px, 1.2vw, 12px);
                        /* 响应式字体大小 */
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

                        // 修改输入框内部文字颜色，使其在浅色背景上更易读
                        .el-input__inner {
                            color: white;
                            background: transparent;
                        }

                        // 搜索图标颜色
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
        gap: 16px;
        flex: 1;
        overflow: auto;
        padding: 8px 0;
        width: 100%;
        box-sizing: border-box;
        /* 防止在响应式转换期间出现滚动条 */
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
            /* 响应式卡片高度 */
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
                        background-color: #f56c6c; // fallback color
                    }

                    &.healthy {
                        background: url('@/assets/images/background/首页-健康设备.png') no-repeat center center;
                        background-size: contain;
                        background-color: #67c23a; // fallback color
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

                    &.healthy {
                        background-color: #e1f3d8;
                        color: #67c23a;
                        border: 1px solid #c2e7b0;
                    }

                    &.warning {
                        background-color: #fde2e2;
                        color: #f56c6c;
                        border: 1px solid #fbc4c4;
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

        // 页码按钮样式
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

        // 输入框样式
        .el-pagination__sizes .el-input__inner,
        .el-pagination__jump .el-input__inner {
            height: 18px;
            background-color: transparent;
            color: #111;
            font-size: clamp(10px, 1vw, 12px);
            /* 响应式字体大小 */
        }
    }
}
</style>
<style lang="scss">
/* === 精细化调整 Element Plus 日期范围选择器 === */
.el-picker-panel.el-date-range-picker {
    width: 440px !important;
    font-size: 12px !important;

    .el-input__wrapper {
        width: 90px !important;
    }

    .el-date-range-picker__time-header {
        width: 400px !important;
    }

    /* --- 1. 压缩顶部“开始/结束 时间输入区域” --- */
    .el-date-range-picker__time-header {
        display: flex;
        justify-content: space-between;
        padding: 8px 10px !important;
        gap: 6px;
        /* 控制左右两组之间的间隙 */

        /* 每组：日期 + 时间 */
        >.el-scrollbar {
            width: calc(50% - 3px) !important;
            /* 两等分，减去 gap 的一半 */
        }

        /* 日期输入框 */
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

    /* --- 2. 缩小日历顶部“2026年1月”标题 --- */
    .el-date-range-picker__header {
        font-size: 12px !important;
        /* 原为 14px+ */
        font-weight: normal !important;
        padding: 4px 0 !important;
        line-height: 1.2 !important;
        // 防止文字过长换行或溢出
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
    }

    /* 左右切换箭头也缩小 */
    .el-picker-panel__icon-btn {
        width: 14px !important;
        height: 14px !important;
        line-height: 14px !important;
        font-size: 11px !important;
    }

    /* --- 3. 日历内容区继续紧凑 --- */
    .el-date-range-picker__content {
        width: 180px !important;
        /* 每个日历 180px */
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

    /* --- 4. 时间选择器（如果展开）--- */
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

    /* --- 5. Footer 按钮 --- */
    .el-picker-panel__footer {
        padding: 6px 10px !important;

        .el-button--text {
            font-size: 11px !important;
            padding: 2px 6px !important;
        }
    }
}
</style>