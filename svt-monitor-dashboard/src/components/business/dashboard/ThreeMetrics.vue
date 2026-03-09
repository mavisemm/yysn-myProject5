<!-- 排名指标展示区域：显示各类设备指标排名 -->
<template>
    <div class="metrics-area">
        <div v-for="(metric, index) in metrics" :key="index" class="chart-container">
            <h3 class="metric-title">{{ metric.title }}</h3>
            <div v-if="metric.unit" class="metric-unit special-font-color">{{ metric.unit }}</div>
            <!-- 排名列表：根据可用高度动态显示前 N 条 -->
            <div class="rankings" :ref="(el) => setRankingsEl(el, index)">
                <div v-if="getRankings(index).length === 0" class="no-data">
                    <CommonEmptyState size="small" />
                </div>
                <template v-else>
                    <div v-for="(rank, rankIndex) in displayRankings(index)" :key="rankIndex" class="ranking-item"
                        @click="goToDeviceDetail(rank)" style="cursor: pointer;">
                        <span class="rank-device special-font-color">
                            {{ rankIndex + 1 }}.&nbsp;
                            {{ rank.deviceName }}
                            <span v-if="rank.workshopName" class="workshop-info">（{{ rank.workshopName }}）</span>
                        </span>
                        <span v-if="rank.value !== undefined" class="rank-value special-font-color">{{ rank.value
                            }}</span>
                    </div>
                </template>
            </div>
            <div v-if="getRankings(index).length > 0" class="more-wrap">
                <span class="more-btn" @click="openRankDialog(index)">更多</span>
            </div>
            <slot :name="'metric-' + index"></slot>
        </div>

        <el-dialog v-model="rankDialogVisible" width="480px" class="rank-dialog" destroy-on-close
            append-to-body
            @close="rankDialogMetricIndex = -1">
            <template #header>
                <span class="dialog-header-inner">
                    <span>{{ rankDialogTitle }}</span>
                    <span v-if="rankDialogMetricIndex >= 0 && metrics[rankDialogMetricIndex]?.unit"
                        class="dialog-unit-inline">{{ metrics[rankDialogMetricIndex]?.unit }}</span>
                </span>
            </template>
            <div class="dialog-rankings">
                <div v-for="(rank, rankIndex) in dialogRankings" :key="rankIndex" class="dialog-ranking-item"
                    @click="goToDeviceDetail(rank)">
                    <span class="rank-num special-font-color">{{ rankIndex + 1 }}.</span>
                    <span class="rank-device special-font-color">{{ rank.deviceName }}
                        <span v-if="rank.workshopName" class="workshop-info">（{{ rank.workshopName }}）</span>
                    </span>
                    <span v-if="rank.value !== undefined" class="rank-value special-font-color">{{ rank.value }}</span>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import type { MetricItem } from '@/types/device'
import type { DeviceNode } from '@/types/device'
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue'

interface RankingItem {
    deviceName: string;
    workshopName: string;
    deviceId?: string;
    value?: number;
}

interface Props {
    metrics: MetricItem[];
    rankings?: RankingItem[][];
}

const props = defineProps<Props>();

const router = useRouter()
const deviceTreeStore = useDeviceTreeStore()


/**
 * 设备名称到ID的映射表
 */
const deviceNameToIdMap: Record<string, string> = {};

/**
 * 遍历设备树以构建设备名称到ID的映射表
 */
const buildDeviceNameToIdMap = (nodes: DeviceNode[]) => {
    nodes.forEach(node => {
        if (node.type === 'device') {
            const deviceName = node.name;
            deviceNameToIdMap[deviceName] = node.id;
        }
        if (node.children) {
            buildDeviceNameToIdMap(node.children);
        }
    });
};

buildDeviceNameToIdMap(deviceTreeStore.deviceTreeData);


/**
 * 验证设备是否存在
 */
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

    const deviceTreeStoreInstance = useDeviceTreeStore();
    return findDeviceInTree(deviceTreeStoreInstance.deviceTreeData);
};


/**
 * 跳转到设备详情页（Top3 列表与「更多」弹窗内点击设备均会调用）
 */
const goToDeviceDetail = (rank: RankingItem) => {
    let deviceId = rank.deviceId;
    if (!deviceId) {
        deviceId = deviceNameToIdMap[rank.deviceName];
    }
    if (deviceId && isValidDevice(deviceId)) {
        rankDialogVisible.value = false;
        deviceTreeStore.setSelectedDeviceId(deviceId);
        router.push({
            name: 'DeviceDetail',
            params: { id: deviceId },
            query: { deviceName: rank.deviceName, workshopName: rank.workshopName || '' }
        }).catch(() => { });
    }
}


/**
 * 排名数据：如果未提供则使用设备树中的真实设备数据
 */
const rankingData = props.rankings || [
    [],
    [],
    []
];

/**
 * 获取指定指标的排名数据（完整列表）
 */
const getRankings = (index: number): RankingItem[] => {
    if (rankingData[index] && rankingData[index].length > 0) {
        return rankingData[index];
    }

    const devices: RankingItem[] = [];
    const traverse = (nodes: DeviceNode[]) => {
        nodes.forEach(node => {
            if (node.type === 'device') {
                devices.push({
                    deviceName: node.name,
                    workshopName: node.workshopName || '',
                    deviceId: node.id
                });
            }
            if (node.children) traverse(node.children);
        });
    };
    traverse(deviceTreeStore.deviceTreeData);
    return devices;
};

/**
 * 列表显示条数：参照「预警总览」的做法，按窗口高度自适应
 * - 不再按容器高度做精确计算，避免各种 margin/padding 导致裁切
 * - 高度越高，可见行数越多；始终最少显示 2 行
 */
const windowHeight = ref(window.innerHeight || 0);

const updateWindowSize = () => {
    windowHeight.value = window.innerHeight || 0;
};

const maxVisibleRows = computed(() => {
    const h = windowHeight.value;
    if (h >= 920) return 4;
    if (h >= 780) return 3;
    if (h >= 650) return 2;
    return 1;
});

// 兼容模板上的 ref 绑定（不再使用具体元素）
const setRankingsEl = (_el: unknown, _index: number) => { };

const displayRankings = (index: number): RankingItem[] => {
    const list = getRankings(index);
    return list.slice(0, Math.min(maxVisibleRows.value, list.length));
};

const rankDialogVisible = ref(false);
const rankDialogMetricIndex = ref(-1);

const rankDialogTitle = computed(() => {
    const m = props.metrics[rankDialogMetricIndex.value];
    if (rankDialogMetricIndex.value < 0 || !m) return '全部排名';
    return m.title.replace('Top3', '') + '全部排名';
});

const dialogRankings = computed(() => {
    if (rankDialogMetricIndex.value < 0) return [];
    return getRankings(rankDialogMetricIndex.value);
});

const openRankDialog = (index: number) => {
    rankDialogMetricIndex.value = index;
    rankDialogVisible.value = true;
};

onMounted(async () => {
    await nextTick();
    window.addEventListener('resize', updateWindowSize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateWindowSize);
});

watch(
    () => props.rankings,
    async () => {
        await nextTick();
    },
    { deep: true }
);
</script>

<style lang="scss" scoped>
.metrics-area {
    height: 100%;
    display: flex;
    gap: 10px;
    overflow: hidden;
    box-sizing: border-box;
    background: url('@/assets/images/background/首页-Top5背景.png') no-repeat center center;
    background-size: 100% 100%;
    padding: 10px;

    >div {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-sizing: border-box;

        .chart-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
            background-color: lightblue;
        }

        .chart-container .metric-unit {
            text-align: center !important;
            font-size: 1rem !important;
            margin-bottom: 5px !important;
            display: block !important;
        }

        .more-wrap {
            flex-shrink: 0;
            text-align: center;

            .more-btn {
                font-size: 0.9rem;
                cursor: pointer;
                user-select: none;

                &:hover {
                    text-decoration: underline;
                }
            }
        }

        .rankings {
            display: flex;
            flex-direction: column;
            gap: 5px;
            --ranking-row-height: 22px;
            margin-bottom: 4px;
            flex: 1;
            min-height: 0;
            overflow: hidden;

            .no-data {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
            }

            .ranking-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 14px;
                box-sizing: border-box;
                padding: 6px 10px;
                /* 排名行字体，稍小于标题 */
                font-size: 0.9rem;
                height: var(--ranking-row-height);
                flex: 0 0 auto;
                cursor: pointer;
                transition: all 0.3s ease;

                &:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .rank-device {
                    flex: 1;
                    min-width: 0;
                    text-align: left;
                    margin-right: 8px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .rank-value {
                    flex-shrink: 0;
                    //font-weight: bold;
                    text-align: right;
                }
            }
        }

        @media (max-width: 768px) {
            .rankings {
                .ranking-item {
                    font-size: 0.8rem;
                    padding: 6px 10px;
                }
            }
        }

        /* 根据窗口高度与 maxVisibleRows 断点保持一致的样式收缩 */
        @media (max-height: 920px) {
            .ranking-item {
                margin: 2px 10px;
                padding: 6px 10px;
            }
        }

        @media (max-height: 780px) {
            .ranking-item { 
                padding: 5px 12px;
                font-size: 0.85rem;
                margin: 1px 10px;
            }
        }

        @media (max-height: 650px) {
            .ranking-item {
                margin: 1px 10px;
                padding: 4px 12px;
                font-size: 0.8rem;
            }
        }
    }
}

:deep() {
    .chart-container h3.metric-title {
        font-weight: 500;
        letter-spacing: 1.22px;
        color: rgba(255, 255, 255, 1);
        margin: 0 auto !important;
        text-align: center !important;
        /* 使用 rem，相对根字号自适应 */
        font-size: 1.2rem!important;
        display: block !important;
        width: 100% !important;
    }

        .chart-container .metric-unit {
            text-align: center !important;
            font-size: 1rem !important;
            margin-bottom: 5px !important;
            display: block !important;
        }
}

.rank-dialog :deep(.el-dialog__header) {
    color: #606266 !important;
}

.dialog-header-inner {
    display: flex;
    align-items: baseline;
    gap: 8px;
    color: #606266 !important;

    .dialog-unit-inline {
        color: #606266 !important;
        font-weight: normal;
    }
}

.dialog-rankings {
    max-height: 60vh;
    overflow-y: auto;

    .dialog-ranking-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 6px;
        background: #f5f7fa;
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
            background: #ecf5ff;
        }

        .rank-num {
            flex-shrink: 0;
            width: 28px;
            //font-weight: bold;
            color: #606266 !important;
        }

        .rank-device {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #606266 !important;
        }

        .rank-value {
            flex-shrink: 0;
            //font-weight: bold;
            margin-left: 8px;
            color: #606266 !important;
        }
    }
}
</style>