<!-- 排名指标展示区域：显示各类设备指标排名 -->
<template>
    <div class="metrics-area">
        <div v-for="(metric, index) in metrics" :key="index" class="chart-container">
            <div class="metric-header">
                <div class="metric-title-row home-title home-title--ranking">
                    <img class="metric-title-row__icon home-title__icon" src="@/assets/images/background/小图标.png" alt="" />
                    <h3 class="metric-title app-section-title">{{ metric.title }}</h3>
                    <span v-if="getRankings(index).length > 0" class="more-btn" @click="openRankDialog(index)">更多</span>
                </div>

                <div class="metric-columns-header">
                    <span class="metric-col metric-col--seq">序号</span>
                    <span class="metric-col metric-col--device">设备名称</span>
                    <span class="metric-col metric-col--value">单位：{{ getUnitShort(metric.unit) }}</span>
                </div>
            </div>
            <!-- 排名列表：根据可用高度动态显示前 N 条 -->
            <div class="rankings" :ref="(el) => setRankingsEl(el, index)">
                <div v-if="getRankings(index).length === 0" class="no-data">
                    <CommonEmptyState size="small" />
                </div>
                <template v-else>
                    <div v-for="(rank, rankIndex) in displayRankings(index)" :key="rankIndex"
                        class="ranking-item" :class="{ 'ranking-item--with-bg': rankIndex % 2 === 0 }"
                        @click="goToDeviceDetail(rank)" style="cursor: pointer;">
                        <span class="col-seq">
                            <img class="seq-icon" src="@/assets/images/background/首页-排名序标.png"
                                alt="" />
                            <span class="seq-num">{{ rankIndex + 1 }}</span>
                        </span>
                        <span class="col-device special-font-color" :title="getRankDeviceTooltip(rank)">
                            {{ rank.equipmentName }}
                            <span v-if="rank.workshopName" class="workshop-info">（{{ rank.workshopName }}）</span>
                        </span>
                        <span v-if="rank.value !== undefined" class="col-value special-font-color">{{ rank.value }}</span>
                    </div>
                </template>
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
                    <span class="rank-device special-font-color">{{ rank.equipmentName }}
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
    equipmentName: string;
    workshopName: string;
    equipmentId?: string;
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
    let equipmentId = rank.equipmentId;
    if (!equipmentId) {
        equipmentId = deviceNameToIdMap[rank.equipmentName];
    }
    if (equipmentId && isValidDevice(equipmentId)) {
        rankDialogVisible.value = false;
        deviceTreeStore.setSelectedDeviceId(equipmentId);
        router.push({
            name: 'DeviceDetail',
            query: {
                equipmentId: equipmentId,
                equipmentName: rank.equipmentName,
                workshopName: rank.workshopName || ''
            }
        }).catch(() => { });
    }
}


/**
 * 排名数据：
 * - 只有在“完全未提供 rankings（undefined）”时，才回退到设备树生成列表
 * - 当 rankings 已传入但为空（例如 top5 接口返回空），严格返回空，显示 Empty 状态
 */
const rankingData = props.rankings;

/**
 * 获取指定指标的排名数据（完整列表）
 */
const getRankings = (index: number): RankingItem[] => {
    if (rankingData?.[index]?.length) {
        return rankingData[index];
    }

    // 未提供 rankings（完全不传）时，才用设备树“生成一个列表”兜底
    if (!rankingData) {
        const devices: RankingItem[] = [];
        const traverse = (nodes: DeviceNode[]) => {
            nodes.forEach(node => {
                if (node.type === 'device') {
                    devices.push({
                        equipmentName: node.name,
                        workshopName: node.workshopName || '',
                        equipmentId: node.id
                    });
                }
                if (node.children) traverse(node.children);
            });
        };
        traverse(deviceTreeStore.deviceTreeData);
        return devices;
    }

    // rankings 已传入但该 index 为空：不再回退，避免展示“伪排名”
    return [];
};

const rankingsElRefs = ref<(HTMLDivElement | null)[]>([null, null, null]);
const visibleRowsByMetric = ref<number[]>([2, 2, 2]);

let resizeObserver: ResizeObserver | null = null;
let resizeListener: (() => void) | null = null;

const setRankingsEl = (el: unknown, index: number) => {
    const target = el instanceof Element ? (el as HTMLDivElement) : null
    rankingsElRefs.value[index] = target
    if (target && resizeObserver) resizeObserver.observe(target)
}

const getUnitShort = (unit?: string) => {
    if (!unit) return ''
    const match = unit.match(/单位[:：]\s*([^)）]+)\s*[)）]/)
    return (match?.[1] ?? unit).trim()
};

const getRankDeviceTooltip = (rank: RankingItem): string => {
    if (rank.workshopName) return `${rank.equipmentName}（${rank.workshopName}）`
    return rank.equipmentName
};

const measureAndUpdateVisibleRows = () => {
    const indices = props.metrics.map((_m, i) => i)

    for (const index of indices) {
        const el = rankingsElRefs.value[index]
        if (!el) continue

        const styles = window.getComputedStyle(el)
        const firstItem = el.querySelector<HTMLElement>('.ranking-item')
        const rowHeightCss = parseFloat(styles.getPropertyValue('--ranking-row-height') || '')
        const rowHeight = Number.isFinite(rowHeightCss) && rowHeightCss > 0
            ? rowHeightCss
            : (firstItem?.getBoundingClientRect().height ?? 28)

        const gapValue = parseFloat(styles.gap || '0')
        const gap = Number.isFinite(gapValue) ? gapValue : 5

        const height = el.clientHeight
        const count = Math.floor((height + gap) / (rowHeight + gap))

        // 保底：至少展示 2 行
        visibleRowsByMetric.value[index] = Math.max(2, count)
    }
};

const scheduleMeasure = () => {
    // 等待一次布局/字体计算完成，避免读取到旧高度
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => measureAndUpdateVisibleRows())
    })
}

const displayRankings = (index: number): RankingItem[] => {
    const list = getRankings(index);
    const maxRows = visibleRowsByMetric.value[index] ?? 2
    return list.slice(0, Math.min(maxRows, list.length))
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

    scheduleMeasure()

    resizeListener = () => measureAndUpdateVisibleRows()
    window.addEventListener('resize', resizeListener)

    // 当容器尺寸因字体/布局变化而变化时，也能重新测算
    if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => measureAndUpdateVisibleRows())
        rankingsElRefs.value.forEach(el => {
            if (el) resizeObserver?.observe(el)
        })
    }
});

onBeforeUnmount(() => {
    if (resizeListener) window.removeEventListener('resize', resizeListener)
    resizeObserver?.disconnect()
});

watch(
    () => props.rankings,
    async () => {
        await nextTick();
        scheduleMeasure()
    },
    { deep: true }
);

watch(
    () => props.metrics,
    () => {
        scheduleMeasure()
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
    padding: 10px 20px 0 20px;

    /* 直接作用到三个排名卡片根节点，避免嵌套选择器导致不命中 */
    >.chart-container {
        flex: 1;
        background: url('@/assets/images/background/首页-排名背景.png') no-repeat center center;
        background-size: 100% 100%;
        border-radius: 12px;
        overflow: hidden;
    }

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
            background: transparent;
        }

        .metric-header {
            position: relative;
            flex-shrink: 0;
            padding-bottom: 0;

            .metric-title-row {
                position: relative;
                padding-left: 15px;
                padding-top: 2px;
                padding-bottom: 2px;
            }

            .metric-title-row__icon {
                display: block;
                flex-shrink: 0;
            }

            .more-btn {
                position: absolute;
                top: 50%;
                right: 16px;
                transform: translateY(-50%);
                font-size: 0.9rem;
                cursor: pointer;
                user-select: none;
                color: rgba(255, 255, 255, 0.45);
                font-weight: 500;

                &:hover {
                    text-decoration: underline;
                }
            }

            .metric-columns-header {
                gap: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 6px;
                height: 30px;
                flex: 0 0 auto;
                color: #4E89FF;
                font-size: 0.9rem;
                letter-spacing: 0.3px;
                box-sizing: border-box;
                white-space: nowrap;
            }

            .metric-col {
                min-width: 0;
            }

            .metric-col--seq {
                width: 44px;
                text-align: center;
                flex: 0 0 auto;
            }

            .metric-col--device {
                flex: 1;
                text-align: left;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                padding-right: 6px;
            }

            .metric-col--value {
                // 表头展示内容为“单位：xx”，文字宽度可能大于 84px
                // 父容器有 overflow: hidden 时会导致右侧被裁剪，因此适当增大并做省略
                width: 110px;
                flex: 0 0 auto;
                text-align: right;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 0 0 auto;
                line-height: 1;
            }
        }

        .rankings {
            display: flex;
            flex-direction: column;
            --ranking-row-height: 30px;
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
                box-sizing: border-box;
                padding: 0 8px;
                font-size: 0.9rem;
                height: var(--ranking-row-height);
                flex: 0 0 auto;
                cursor: pointer;
                transition: all 0.3s ease;
                background-color: transparent;

                &.ranking-item--with-bg {
                    background-image: url('@/assets/images/background/排名行背景.png');
                    background-repeat: no-repeat;
                    background-size: 100% 100%;
                    background-color: transparent;
                }

                &:hover {
                    background-color: rgba(255, 255, 255, 0.15);
                }

                .col-seq {
                    width: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    padding-left: 2px;
                    gap: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    flex: 0 0 auto;
                    color: #ffffff;
                }

                .seq-icon {
                    width: 6px;
                    height: 9px;
                    object-fit: contain;
                    flex: 0 0 auto;
                    margin-left: -2px;
                    margin-right: 5px;
                }

                .seq-num {
                    display: inline-block;
                    line-height: 1;
                    flex: 0 0 auto;
                }

                .col-device {
                    flex: 1;
                    min-width: 0;
                    text-align: left;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                padding-right: 6px;
                    color: #ffffff;
                }

                .col-value {
                    flex-shrink: 0;
                    width: 84px;
                    text-align: right;
                    color: #ffffff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            }
        }

        @media (max-width: 768px) {
            .rankings {
                --ranking-row-height: 26px;
                .ranking-item {
                    font-size: 0.8rem;
                    padding: 0 10px;
                }
            }
        }
    }
}

:deep() {
    .chart-container h3.metric-title {
        font-weight: 500;
        letter-spacing: 1.22px;
        color: rgba(255, 255, 255, 1);
        margin: 0 !important;
        text-align: left !important;
        /* 使用 rem，相对根字号自适应 */
        font-size: 1.2rem!important;
        display: block !important;
        width: auto !important;
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