<template>
    <div class="metrics-area">
        <div v-for="(metric, index) in metrics" :key="index" class="chart-container">
            <h3 class="metric-title">{{ metric.title }}</h3>
            <div v-if="metric.unit" class="metric-unit">{{ metric.unit }}</div>
            <div class="rankings">
                <div v-for="(rank, rankIndex) in getRankings(index)" :key="rankIndex" class="ranking-item"
                    @click="goToDeviceDetail(rank)" style="cursor: pointer;">
                    <span class="rank-device">
                        {{ rankIndex + 1 }}.&nbsp;
                        {{ rank.deviceName }}
                        （{{ rank.workshopName }}）
                        &nbsp;50</span>
                </div>
            </div>
            <slot :name="'metric-' + index"></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import type { MetricItem } from '@/types/device'
import type { DeviceNode } from '@/types/device'

interface RankingItem {
    deviceName: string;
    workshopName: string;
    deviceId?: string; // 设备ID，用于跳转
}

interface Props {
    metrics: MetricItem[];
    rankings?: RankingItem[][];
}

const props = defineProps<Props>();

const router = useRouter()
const deviceTreeStore = useDeviceTreeStore()

// 从设备树中获取所有设备信息，构建设备名称到ID的映射表
const deviceNameToIdMap: Record<string, string> = {};

// 遍历设备树以填充映射表
const buildDeviceNameToIdMap = (nodes: DeviceNode[]) => {
    nodes.forEach(node => {
        if (node.type === 'device') {
            // 提取设备名称（去除车间信息）
            const deviceName = node.name;
            deviceNameToIdMap[deviceName] = node.id;
        }
        if (node.children) {
            buildDeviceNameToIdMap(node.children);
        }
    });
};

// 构建设备名称到ID的映射表
buildDeviceNameToIdMap(deviceTreeStore.deviceTreeData);

// 验证设备是否存在
const isValidDevice = (deviceId: string): boolean => {
    // 遍历设备树数据，检查设备是否存在
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

    // 从设备树store获取数据
    const deviceTreeStoreInstance = useDeviceTreeStore();
    return findDeviceInTree(deviceTreeStoreInstance.deviceTreeData);
};

// 方法：跳转到设备详情页
const goToDeviceDetail = (rank: RankingItem) => {
    // console.log('点击了设备:', rank);

    let deviceId = rank.deviceId;

    if (!deviceId) {
        // 如果没有直接的设备ID，通过设备名称查找
        deviceId = deviceNameToIdMap[rank.deviceName];
        if (deviceId) {
            // console.log('通过设备名称找到了ID:', rank.deviceName, '->', deviceId);
        } else {
            console.warn('无法通过设备名称找到ID:', rank.deviceName);
        }
    }

    if (deviceId && isValidDevice(deviceId)) {
        // console.log('准备跳转到设备详情页，设备ID:', deviceId);
        // 在跳转前设置选中的设备ID
        deviceTreeStore.setSelectedDeviceId(deviceId);
        router.push({
            name: 'DeviceDetail',
            params: { id: deviceId },
            query: { deviceName: rank.deviceName, workshopName: rank.workshopName }
        }).then(() => {
            // console.log('路由跳转成功');
        }).catch(err => {
            console.error('路由跳转失败:', err);
        });
    } else {
        console.warn('设备不存在或无法确定设备ID，无法跳转:', rank, deviceId);
    }
}

// 从设备树中获取排名数据 - 如果未提供则使用设备树中的真实设备数据
const rankingData = props.rankings || [
    [], // Top 3 devices for metric 1 - will be populated from device tree
    [], // Top 3 devices for metric 2 - will be populated from device tree
    []  // Top 3 devices for metric 3 - will be populated from device tree
];

// 获取指定指标的排名数据
const getRankings = (index: number): RankingItem[] => {
    // 如果提供了排名数据，则使用提供的数据
    if (rankingData[index] && rankingData[index].length > 0) {
        return rankingData[index];
    }

    // 否则从设备树中提取设备数据
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
            if (node.children) {
                traverse(node.children);
            }
        });
    };

    traverse(deviceTreeStore.deviceTreeData);

    // 返回前3个设备作为排名
    return devices.slice(0, 3);
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
    padding: 10px 0 0;
    // background-color: pink;

    >div {
        flex: 1;
        padding: 10px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-sizing: border-box;
        // background-color: blueviolet;

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

        .rankings {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-bottom: 10px;
            flex: 1;
            min-height: 0;
            overflow: hidden;

            .ranking-item {
                display: flex;
                align-items: center;
                justify-content: center;
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
                    text-align: center;
                    margin-right: 8px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .rank-value {
                    font-weight: bold;
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
        /* 响应式字体大小，以20px为基准 */
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
</style>