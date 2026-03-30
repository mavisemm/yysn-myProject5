<template>
    <el-dialog v-model="visible" :title="props.title" width="900px" :close-on-click-modal="true" draggable
        class="trend-warning-modal" @close="handleClose">
        <div class="modal-body">
            <el-table :data="tableData" stripe class="warning-table" max-height="400">
                <template #empty>
                    <div class="table-empty">暂无数据</div>
                </template>
                <el-table-column prop="equipmentName" label="设备名称" min-width="120">
                    <template #default="{ row }">
                        <span v-if="row.equipmentId" class="link-cell" @click.stop="goToDeviceDetail(row)">{{
                            row.equipmentName }}</span>
                        <span v-else>{{ row.equipmentName }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="receiverName" label="点位名称" min-width="120">
                    <template #default="{ row }">
                        <span v-if="row.receiverId && row.pointDeviceId" class="link-cell" @click.stop="goToSoundPoint(row)">{{
                            row.receiverName }}</span>
                        <span v-else>{{ row.receiverName }}</span>
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
    title?: string;
    mode?: 'trend' | 'fault';
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
    equipmentName: string;
    receiverName: string;
    equipmentId?: string;
    value?: string | number;
    receiverId?: string;
    pointDeviceId?: string;
}

const MOCK_DEVICE_NAMES = ['1#循环水泵', '2#循环水泵', '3#引风机', '4#空压机', '5#冷却塔风机', '五线一路风机12', '旋压机', '五线三路风机', '往复式压缩机', '七线一路风机'];
const MOCK_POINT_NAMES = ['JXA29F6104', '尾顶电磁阀1号点位', 'JXA24F5307', 'JS32F21', 'JXA29F8108', 'JXA29F6106', 'SHJY-XYJ1号点位', '3', 'JS32F20', 'JXA29F8107'];

function getOneRowPerDevice(nodes: DeviceNode[]): TableRow[] {
    const rows: TableRow[] = [];
    nodes.forEach(factory => {
        factory.children?.forEach(workshop => {
            workshop.children?.forEach(device => {
                if (device.type !== 'device') return;
                const equipmentName = device.name || device.equipmentName || '—';
                const points = (device.children ?? []).filter(p => p.type === 'point');
                const targetPointName = 'JXA29F6104'
                
                const specifiedPoint =
                    String(equipmentName).includes('五线一路')
                        ? points.find(p => (p.name || (p as any).pointName) === targetPointName)
                        : undefined

                const firstPoint = specifiedPoint ?? points[0];
                if (!firstPoint) return;
                const receiverName =
                    String(equipmentName).includes('五线一路')
                        ? targetPointName
                        : (firstPoint.name || (firstPoint as any).pointName || '—');
                rows.push({
                    equipmentName,
                    receiverName,
                    value: '—',
                    receiverId: firstPoint.id,
                    equipmentId: device.id,
                    pointDeviceId: firstPoint.deviceId
                });
            });
        });
    });
    return rows;
}

const tableData = computed(() => {
    
    
    
    const baseRows = getOneRowPerDevice(deviceTreeStore.deviceTreeData);

    
    const fromTree = baseRows.map((row, index) => {
        const idx = index + 1;
        const trendValue = 10 + idx * 1.3;   
        const faultValue = 80 + idx * 2.1;   
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
        const equipmentName = MOCK_DEVICE_NAMES[i % MOCK_DEVICE_NAMES.length] ?? '—';
        const receiverName = MOCK_POINT_NAMES[i % MOCK_POINT_NAMES.length] ?? '—';
        return { equipmentName, receiverName, value } as TableRow;
    });
    return [...fromTree, ...placeholders];
});

const goToDeviceDetail = (row: TableRow) => {
    if (!row.equipmentId) return;
    handleClose();
    router.push({ name: 'DeviceDetail', params: { id: row.equipmentId } });
};

const goToSoundPoint = (row: TableRow) => {
    if (!row.receiverId || !row.equipmentId) return;
    handleClose();
    router.push({
        name: 'SoundPoint',
        params: { receiverId: row.receiverId },
        query: { equipmentId: row.equipmentId }
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

    
    :deep(.el-table__header th) {
        color: #606266 !important;
    }

    :deep(.el-table__body td) {
        color: #606266 !important;
    }
}
</style>

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
