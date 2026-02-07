<!-- 排名指标展示区域：显示各类设备指标排名 -->
<template>
    <div class="metrics-area">
        <div v-for="(metric, index) in metrics" :key="index" class="chart-container">
            <h3 class="metric-title">{{ metric.title }}</h3>
            <div v-if="metric.unit" class="metric-unit">{{ metric.unit }}</div>
            <!-- 排名列表：仅显示前 3 条 -->
            <div class="rankings">
                <div v-if="getRankings(index).length === 0" class="no-data">暂无数据</div>
                <template v-else>
                    <div v-for="(rank, rankIndex) in displayRankings(index)" :key="rankIndex" class="ranking-item"
                        @click="goToDeviceDetail(rank)" style="cursor: pointer;">
                        <span class="rank-device">
                            {{ rankIndex + 1 }}.&nbsp;
                            {{ rank.deviceName }}
                            <span v-if="rank.workshopName" class="workshop-info">（{{ rank.workshopName }}）</span>
                        </span>
                        <span v-if="rank.value !== undefined" class="rank-value">{{ rank.value }}</span>
                    </div>
                </template>
            </div>
            <div v-if="getRankings(index).length > 0" class="more-wrap">
                <span class="more-btn" @click="openRankDialog(index)">更多</span>
            </div>
            <slot :name="'metric-' + index"></slot>
        </div>

        <el-dialog v-model="rankDialogVisible" width="480px" class="rank-dialog" destroy-on-close
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
                    <span class="rank-num">{{ rankIndex + 1 }}.</span>
                    <span class="rank-device">{{ rank.deviceName }}
                        <span v-if="rank.workshopName" class="workshop-info">（{{ rank.workshopName }}）</span>
                    </span>
                    <span v-if="rank.value !== undefined" class="rank-value">{{ rank.value }}</span>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import type { MetricItem } from '@/types/device'
import type { DeviceNode } from '@/types/device'

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
 * 跳转到设备详情页
 */
const goToDeviceDetail = (rank: RankingItem) => {

    let deviceId = rank.deviceId;

    if (!deviceId) {
        deviceId = deviceNameToIdMap[rank.deviceName];
        if (deviceId) {
        } else {
        }
    }

    if (deviceId && isValidDevice(deviceId)) {
        deviceTreeStore.setSelectedDeviceId(deviceId);
        router.push({
            name: 'DeviceDetail',
            params: { id: deviceId },
            query: { deviceName: rank.deviceName, workshopName: rank.workshopName }
        }).then(() => {
        }).catch(err => {
        });
    } else {
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

/** 列表只显示前 3 条 */
const displayRankings = (index: number): RankingItem[] => {
    return getRankings(index).slice(0, 3);
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
</script>

<style lang="scss" scoped>
.metrics-area {
    height: 100%;
    display: flex;
    gap: 15px;
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

        .chart-container h3.metric-title {
            padding: 0 0 5px 0 !important;
            margin: 0 auto !important;
            text-align: center !important;
            font-size: clamp(18px, 2.5vw, 24px);
            display: block !important;
            width: 100% !important;
        }

        .chart-container .metric-unit {
            text-align: center !important;
            font-size: clamp(12px, 2vw, 16px) !important;
            margin-bottom: 5px !important;
            display: block !important;
        }

        .more-wrap {
            flex-shrink: 0;
            text-align: center;
            padding: 4px 0 2px;

            .more-btn {
                font-size: clamp(12px, 1.5vw, 14px);
                color: #fff;
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
            margin-bottom: 4px;
            flex: 1;
            min-height: 0;
            overflow: hidden;

            .no-data {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: clamp(14px, 2vw, 16px);
            }

            .ranking-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 14px;
                padding: 6px 15px;
                font-size: clamp(14px, 1.8vw, 16px);
                flex: 1;
                min-height: 0;
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
                    font-weight: bold;
                    text-align: right;
                }
            }
        }

        @media (max-width: 768px) {
            .rankings {
                .ranking-item {
                    font-size: clamp(10px, 1.2vw, 12px);
                    padding: 6px 10px;
                }
            }
        }

        @media (max-height: 800px) {
            .ranking-item {
                margin: 2px 10px;
                padding: 6px 15px;
            }
        }

        @media (max-height: 656px) {
            .ranking-item {
                padding: 5px 12px;
                font-size: clamp(11px, 1.3vw, 13px);
                margin: 1px 10px;
            }
        }

        @media (max-height: 600px) {
            .ranking-item {
                margin: 1px 10px;
                padding: 4px 12px;
                font-size: clamp(10px, 1.2vw, 12px);
            }
        }
    }
}

:deep() {
    .chart-container h3.metric-title {
        padding: 0 0 8px 0 !important;
        margin: 0 auto !important;
        text-align: center !important;
        font-size: clamp(18px, 2.5vw, 24px);
        display: block !important;
        width: 100% !important;
    }

    .chart-container .metric-unit {
        text-align: center !important;
        font-size: clamp(12px, 2vw, 16px) !important;
        margin-bottom: 5px !important;
        display: block !important;
    }
}

.rank-dialog :deep(.el-dialog__header) {
    color: #606266;
}

.dialog-header-inner {
    display: flex;
    align-items: baseline;
    gap: 8px;
    color: #606266;

    .dialog-unit-inline {
        font-size: 12px;
        color: #909399;
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
            font-weight: bold;
            color: #409eff;
        }

        .rank-device {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .rank-value {
            flex-shrink: 0;
            font-weight: bold;
            margin-left: 8px;
        }
    }
}
</style>