<!-- 预警设备详情弹窗：两条死数据来自设备树（两个不同设备），表格展示设备名称、点位名称、听筒名称 -->
<template>
    <el-dialog v-model="visible" title="预警设备详情" width="900px" :close-on-click-modal="true"
        class="trend-warning-modal" @close="handleClose">
        <div class="modal-body">
            <el-table :data="tableData" stripe class="warning-table" max-height="400"
                @row-click="handleRowClick">
                <el-table-column prop="deviceName" label="设备名称" min-width="120" />
                <el-table-column prop="pointName" label="点位名称" min-width="120" />
                <el-table-column prop="receiverName" label="听筒名称" min-width="120" />
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

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
}>();

const visible = ref(props.modelValue);
const deviceTreeStore = useDeviceTreeStore();

interface TableRow {
    deviceName: string;
    pointName: string;
    receiverName: string;
    pointId?: string;
    deviceId?: string;
}

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
                    pointId: firstPoint.id,
                    deviceId: device.id
                });
            });
        });
    });
    return rows;
}

/** 两条死数据：取设备树中两个不同设备各一条，不足时用占位 */
const tableData = computed(() => {
    const fromTree = getOneRowPerDevice(deviceTreeStore.deviceTreeData);
    const need = 2;
    if (fromTree.length >= need) {
        return fromTree.slice(0, need);
    }
    const placeholder: TableRow = { deviceName: '—', pointName: '—', receiverName: '—' };
    return [...fromTree, ...Array(need - fromTree.length).fill(null).map(() => ({ ...placeholder }))];
});

/** 点击点位行跳转声音点位页，传参使用当前行的 pointId、deviceId，不写死 */
const handleRowClick = (row: TableRow) => {
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
}

.modal-body {
    min-height: 120px;
}

.warning-table {
    width: 100%;
    :deep(.el-table__row) {
        cursor: pointer;
    }
}
</style>
