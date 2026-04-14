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
                        <template v-if="row.showEquipmentName">
                            <span v-if="row.equipmentId" class="link-cell" @click.stop="goToDeviceDetail(row)">{{
                                row.equipmentName }}</span>
                            <span v-else>{{ row.equipmentName }}</span>
                        </template>
                        <span v-else class="equipment-empty-cell"></span>
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
                <el-table-column label="报警时间" min-width="180">
                    <template #default="{ row }">
                        <span>{{ formatLocalDateTime(row.alarmTime) }}</span>
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
    alarmTime?: string | number;
    receiverId?: string;
    showEquipmentName?: boolean;
}

function mapToRow(x: any): TableRow {
    return {
        equipmentId: x.equipmentId,
        equipmentName: x.equipmentName ?? '—',
        receiverId: x.receiverId,
        pointName: x.pointName ?? '—',
        value: x.metricValue ?? x.triggerValue ?? '—',
        alarmTime: x.alarmTime
    }
}

function formatLocalDateTime(input: unknown): string {
    if (input == null || input === '') return '—'
    const raw = String(input).trim()
    if (!raw) return '—'

    const numeric = Number(raw)
    const date = Number.isFinite(numeric)
        ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
        : new Date(raw)

    if (Number.isNaN(date.getTime())) return '—'
    const pad = (v: number) => String(v).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function normalizeDeviceKey(row: TableRow): string {
    const idKey = String(row.equipmentId ?? '').trim().toLowerCase()
    const nameKey = String(row.equipmentName ?? '').trim().toLowerCase()
    // 兼容后端异常：不同设备可能复用了同一个 equipmentId，这里追加名称避免误合并
    if (idKey) return `${idKey}__${nameKey || '__empty_name__'}`
    return `__empty_equipment_id__${nameKey || '__empty_name__'}`
}

const tableData = computed(() => {
    const list = props.mode === 'trend' ? store.sound : store.vibration
    const rows = (list ?? []).map(mapToRow)
    const renderedDeviceKeys = new Set<string>()
    return rows.map((row) => {
        const currentKey = normalizeDeviceKey(row)
        const showEquipmentName = !renderedDeviceKeys.has(currentKey)
        renderedDeviceKeys.add(currentKey)
        return {
            ...row,
            showEquipmentName
        }
    })
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
    void store.fetch(props.mode, true)
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
        color: #606266 !important;
        cursor: pointer;

        &:hover {
            text-decoration: underline;
        }
    }

    .equipment-empty-cell {
        display: inline-block;
        width: 100%;
        min-height: 1em;
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
