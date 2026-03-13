<!-- 预警设备详情弹窗：两条死数据来自设备树（两个不同设备），表格展示设备名称、点位名称、听筒名称 -->
<template>
    <el-dialog v-model="visible" :title="props.title" width="900px" :close-on-click-modal="true" draggable
        class="trend-warning-modal" @close="handleClose">
        <div class="modal-body">
            <el-table :data="tableData" stripe class="warning-table" max-height="400">
                <template #empty>
                    <div class="table-empty">暂无数据</div>
                </template>
                <el-table-column prop="deviceName" label="设备名称" min-width="120">
                    <template #default="{ row }">
                        <span v-if="row.deviceId" class="link-cell" @click.stop="goToDeviceDetail(row)">{{
                            row.deviceName }}</span>
                        <span v-else>{{ row.deviceName }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="pointName" label="点位名称" min-width="120">
                    <template #default="{ row }">
                        <span v-if="row.pointId && row.deviceId" class="link-cell" @click.stop="goToSoundPoint(row)">{{
                            row.pointName }}</span>
                        <span v-else>{{ row.pointName }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="value" :label="props.mode === 'trend' ? '预警值' : '报警值'" min-width="100">
                    <template #default="{ row }">
                        <span>{{ row.value ?? '—' }}</span>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDeviceTreeStore } from '@/stores/deviceTree';
import type { DeviceNode } from '@/types/device';

const router = useRouter();

const props = withDefaults(defineProps<{
    modelValue: boolean;
    /** 弹窗标题，默认“预警设备详情” */
    title?: string;
    /** 弹窗类型：trend=趋势预警；fault=故障报警（不展示假数据，空列表显示“暂无数据”） */
    mode?: 'trend' | 'fault';
    /**
     * 故障报警设备数量（来自统计接口）
     * - 0：显示空态“暂无数据”
     * - 1/2：生成 1/2 条假数据（从设备树取，不足用占位补齐）
     */
    count?: number;
}>(), {
    title: '预警设备详情',
    mode: 'trend',
    count: 0
});

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
}>();

const visible = ref(props.modelValue);
const deviceTreeStore = useDeviceTreeStore();

interface TableRow {
    deviceName: string;
    pointName: string;
    receiverName: string;
    /** 预警/报警值（根据弹窗模式显示不同列名） */
    value?: string | number;
    pointId?: string;
    deviceId?: string;
}

/** 占位行用的假数据：设备名称、点位名称（按需循环使用） */
const MOCK_DEVICE_NAMES = ['1#循环水泵', '2#循环水泵', '3#引风机', '4#空压机', '5#冷却塔风机', '五线一路风机12', '旋压机', '五线三路风机', '往复式压缩机', '七线一路风机'];
const MOCK_POINT_NAMES = ['JXA29F6105', '尾顶电磁阀1号点位', 'JXA24F5307', 'JS32F21', 'JXA29F8108', 'JXA29F6106', 'SHJY-XYJ1号点位', '3', 'JS32F20', 'JXA29F8107'];

/** 从设备树取「每个设备取第一条点位」的列表，保证每条来自不同设备，带 pointId/deviceId 用于跳转 */
function getOneRowPerDevice(nodes: DeviceNode[]): TableRow[] {
    const rows: TableRow[] = [];
    nodes.forEach(factory => {
        factory.children?.forEach(workshop => {
            workshop.children?.forEach(device => {
                if (device.type !== 'device') return;
                const deviceName = device.name || device.equipmentName || '—';
                const firstPoint = device.children?.find(p => p.type === 'point');
                if (!firstPoint) return;
                const pointName = firstPoint.name || firstPoint.pointName || '—';
                rows.push({
                    deviceName,
                    pointName,
                    receiverName: pointName,
                    value: '—',
                    pointId: firstPoint.id,
                    deviceId: device.id
                });
            });
        });
    });
    return rows;
}

const tableData = computed(() => {
    // 根据传入的 count（首页统计里的趋势预警 / 故障报警数量），
    // 在当前设备树中生成对应数量的“假数据行”，数量不足则用占位补齐，上限 20 条。
    // 同时为每一行生成一个数值型的假“预警值/报警值”，便于前端联调展示。
    const baseRows = getOneRowPerDevice(deviceTreeStore.deviceTreeData);

    // 给每一行补一个数值类型的假 value（不同模式用不同区间）
    const fromTree = baseRows.map((row, index) => {
        const idx = index + 1;
        const trendValue = 10 + idx * 1.3;   // 例如 11.3, 12.6, ...
        const faultValue = 80 + idx * 2.1;   // 例如 82.1, 84.2, ...
        const value = props.mode === 'trend'
            ? Number(trendValue.toFixed(1))
            : Number(faultValue.toFixed(1));
        return {
            ...row,
            value
        };
    });
    const rawNeed = Number(props.count ?? 0);
    const need = Math.min(Math.max(0, Math.floor(rawNeed)), 20);
    if (need <= 0) return [];
    if (fromTree.length >= need) return fromTree.slice(0, need);
    const placeholders: TableRow[] = Array(need - fromTree.length).fill(null).map((_, index) => {
        const idx = fromTree.length + index + 1;
        const trendValue = 10 + idx * 1.3;
        const faultValue = 80 + idx * 2.1;
        const value = props.mode === 'trend'
            ? Number(trendValue.toFixed(1))
            : Number(faultValue.toFixed(1));
        const i = fromTree.length + index;
        const deviceName = MOCK_DEVICE_NAMES[i % MOCK_DEVICE_NAMES.length] ?? '—';
        const pointName = MOCK_POINT_NAMES[i % MOCK_POINT_NAMES.length] ?? '—';
        return { deviceName, pointName, receiverName: pointName, value };
    });
    return [...fromTree, ...placeholders];
});

/** 点击设备名称跳转设备详情页 */
const goToDeviceDetail = (row: TableRow) => {
    if (!row.deviceId) return;
    handleClose();
    router.push({ name: 'DeviceDetail', params: { id: row.deviceId } });
};

/** 点击点位名称跳转声音点位页 */
const goToSoundPoint = (row: TableRow) => {
    if (!row.pointId || !row.deviceId) return;
    handleClose();
    router.push({
        name: 'SoundPoint',
        query: { pointId: row.pointId, deviceId: row.deviceId }
    });
};

const handleClose = () => {
    emit('update:modelValue', false);
};

watch(() => props.modelValue, (val) => {
    visible.value = val;
});

watch(visible, (val) => {
    if (!val) emit('update:modelValue', false);
});
</script>

<style lang="scss" scoped>
.trend-warning-modal {
    :deep(.el-dialog__body) {
        padding: 12px 20px;
        max-height: 480px;
        overflow-y: auto;
    }

    /* 弹窗标题“预警设备详情”文字颜色 */
    :deep(.el-dialog__header .el-dialog__title) {
        color: #606266 !important;
    }
}

.modal-body {
    min-height: 120px;
}

.warning-table {
    width: 100%;

    .table-empty {
        padding: 18px 0;
        color: #909399;
    }

    .link-cell {
        color: var(--el-color-primary);
        cursor: pointer;

        &:hover {
            text-decoration: underline;
        }
    }

    /* 表头与单元格文字颜色改为偏灰，避免过黑 */
    :deep(.el-table__header th) {
        color: #606266 !important;
    }

    :deep(.el-table__body td) {
        color: #606266 !important;
    }
}
</style>

<!-- 额外的全局样式，进一步提高优先级，防止主题样式覆盖 -->
<style lang="scss">
.trend-warning-modal {
    .el-dialog__header .el-dialog__title {
        color: #606266 !important;
    }

    .warning-table {

        .el-table__header th,
        .el-table__body td {
            color: #606266 !important;
        }
    }
}
</style>
