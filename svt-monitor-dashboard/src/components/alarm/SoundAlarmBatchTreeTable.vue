<template>
  <el-table
    class="sound-alarm-batch-tree-table"
    :data="rows"
    row-key="id"
    border
    height="100%"
    :tree-props="{ children: 'children' }"
    :row-class-name="rowClassName"
    :default-expand-all="defaultExpandAll"
    @selection-change="onSelectionChange"
  >
    <el-table-column type="selection" width="50" :selectable="isSelectableRow" />
    <el-table-column label="设备名称" min-width="200">
      <template #default="{ row }">
        <span v-if="row.rowType === 'equipment'" class="tree-group-label">
          {{ row.equipmentName || row.deviceName || '-' }}
        </span>
        <span v-else class="tree-group-placeholder">-</span>
      </template>
    </el-table-column>
    <el-table-column label="点位名称" min-width="160">
      <template #default="{ row }">
        <template v-if="row.rowType === 'event'">{{ getPointName(row) || '-' }}</template>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column label="听筒名称" min-width="100">
      <template #default="{ row }">
        <template v-if="row.rowType === 'event'">{{ getReceiverName(row) || '-' }}</template>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column label="预警类型" min-width="160">
      <template #default="{ row }">
        <template v-if="row.rowType === 'event'">{{ row?.eventType?.name || '-' }}</template>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column label="状态" min-width="120">
      <template #default="{ row }">
        <template v-if="row.rowType === 'event'">{{ row.statusText || '-' }}</template>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column label="预警时间" min-width="180">
      <template #default="{ row }">
        <template v-if="row.rowType === 'event'">{{ row._timeText || '-' }}</template>
        <span v-else>-</span>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="90" fixed="right">
      <template #default="{ row }">
        <div v-if="row.rowType === 'event'" class="operation-cell">
          <el-button link type="primary" class="operation-link" @click="emit('view', row)">
            查看
          </el-button>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { ElButton, ElTable, ElTableColumn } from 'element-plus'
import { useAlarmBatchRowLabels } from './alarmBatchDialogUtils'
import type { AlarmBatchTreeRow } from '@/utils/alarmBatchTree'

withDefaults(
  defineProps<{
    rows: AlarmBatchTreeRow[]
    defaultExpandAll?: boolean
  }>(),
  {
    rows: () => [],
    defaultExpandAll: false,
  },
)

const emit = defineEmits<{
  'selection-change': [eventIds: string[]]
  view: [row: AlarmBatchTreeRow]
}>()

const { getPointName, getReceiverName } = useAlarmBatchRowLabels()

const isSelectableRow = (row: AlarmBatchTreeRow) => row.rowType === 'event'

const rowClassName = ({ row }: { row: AlarmBatchTreeRow }) =>
  row.rowType === 'equipment' ? 'sound-alarm-tree-row--equipment' : 'sound-alarm-tree-row--event'

const onSelectionChange = (selection: AlarmBatchTreeRow[]) => {
  const eventIds = selection
    .filter((row) => row.rowType === 'event' && row.id)
    .map((row) => String(row.id))
  emit('selection-change', eventIds)
}
</script>

<style scoped lang="scss">
.tree-group-label {
  font-weight: 600;
  color: var(--alarm-dialog-text, #303133);
}

.tree-group-placeholder {
  color: var(--alarm-dialog-subtle, #909399);
}

.operation-cell :deep(.operation-link) {
  font-size: var(--alarm-dialog-font, 12px);
}

:deep(.sound-alarm-tree-row--equipment) {
  font-weight: 600;
}
</style>
