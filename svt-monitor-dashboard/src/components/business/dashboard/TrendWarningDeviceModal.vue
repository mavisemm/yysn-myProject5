<template>
    <el-dialog v-model="visible" :title="props.title" width="900px" :close-on-click-modal="true" draggable
        class="trend-warning-modal" @close="handleClose">
        <div class="modal-body">
            <el-table :data="tableData" stripe class="warning-table" max-height="400" v-loading="store.loading">
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
                <el-table-column prop="pointName" label="点位名称" min-width="120">
                    <template #default="{ row }">
                        <span v-if="row.receiverId && row.equipmentId" class="link-cell"
                            @click.stop="goToSoundPoint(row)">
                            {{ row.pointName }}
                        </span>
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
import { useDeviceWaringDetailStore } from '@/stores/deviceWaringDetail'

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
const store = useDeviceWaringDetailStore()

interface TableRow {
    equipmentName: string;
    pointName: string;
    equipmentId?: string;
    value?: string | number;
    receiverId?: string;
}

function mapToRow(x: any): TableRow {
    return {
        equipmentId: x.equipmentId,
        equipmentName: x.equipmentName ?? '—',
        receiverId: x.receiverId,
        pointName: x.pointName ?? '—',
        value: x.triggerValue ?? '—'
    }
}

const tableData = computed(() => {
    const list = props.mode === 'trend' ? store.sound : store.vibration
    return (list ?? []).map(mapToRow)
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
    if (!val) {
        emit('update:modelValue', false);
        return
    }
    void store.fetch(true)
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
