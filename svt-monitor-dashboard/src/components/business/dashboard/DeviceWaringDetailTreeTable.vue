<template>
  <el-table
    class="device-waring-detail-tree-table warning-table"
    :data="rows"
    row-key="id"
    border
    :height="height"
    :max-height="maxHeight"
    :tree-props="{ children: 'children' }"
    :row-class-name="rowClassName"
    :default-expand-all="defaultExpandAll"
  >
    <template #empty>
      <div class="table-empty">暂无数据</div>
    </template>
    <el-table-column label="设备名称" min-width="200">
      <template #default="{ row }">
        <span
          v-if="row.rowType === 'equipment' && row.equipmentId"
          class="link-cell tree-group-label"
          @click.stop="emit('equipment-click', row)"
        >
          {{ row.equipmentName || row.deviceName || '—' }}
        </span>
        <span v-else-if="row.rowType === 'equipment'" class="tree-group-label">
          {{ row.equipmentName || row.deviceName || '—' }}
        </span>
        <span v-else class="tree-group-placeholder">—</span>
      </template>
    </el-table-column>
    <el-table-column label="点位名称" min-width="160">
      <template #default="{ row }">
        <template v-if="row.rowType === 'event'">
          <span
            v-if="row.receiverId && row.equipmentId"
            class="link-cell"
            @click.stop="emit('point-click', row)"
          >
            {{ row.pointName || '—' }}
          </span>
          <span v-else>{{ row.pointName || '—' }}</span>
        </template>
        <span v-else class="tree-group-placeholder">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="valueColumnLabel" min-width="100">
      <template #default="{ row }">
        <template v-if="row.rowType === 'event'">{{ formatMetricValue(row) }}</template>
        <span v-else class="tree-group-placeholder">—</span>
      </template>
    </el-table-column>
    <el-table-column v-if="mode === 'fault'" label="报警轴向" min-width="100">
      <template #default="{ row }">
        <template v-if="row.rowType === 'event'">{{ row.warningAxis || '—' }}</template>
        <span v-else class="tree-group-placeholder">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="timeColumnLabel" min-width="180">
      <template #default="{ row }">
        <template v-if="row.rowType === 'event'">
          {{ formatTimestampDisplay(row.alarmTime) }}
        </template>
        <span v-else class="tree-group-placeholder">—</span>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElTable, ElTableColumn } from 'element-plus'
import { formatTimestampDisplay } from './alarmOverviewView'
import type { AlarmBatchTreeRow } from '@/utils/alarmBatchTree'

const props = withDefaults(
  defineProps<{
    rows: AlarmBatchTreeRow[]
    mode?: 'trend' | 'fault'
    height?: string | number
    maxHeight?: string | number
    defaultExpandAll?: boolean
  }>(),
  {
    rows: () => [],
    mode: 'trend',
    height: undefined,
    maxHeight: 400,
    defaultExpandAll: false,
  },
)

const emit = defineEmits<{
  'equipment-click': [row: AlarmBatchTreeRow]
  'point-click': [row: AlarmBatchTreeRow]
}>()

const valueColumnLabel = computed(() => (props.mode === 'trend' ? '预警值' : '报警值'))
const timeColumnLabel = computed(() => (props.mode === 'trend' ? '预警时间' : '报警时间'))

const rowClassName = ({ row }: { row: AlarmBatchTreeRow }) =>
  row.rowType === 'equipment'
    ? 'device-waring-tree-row--equipment'
    : 'device-waring-tree-row--event'

const formatMetricValue = (row: AlarmBatchTreeRow) => {
  const raw = row.metricValue ?? row.triggerValue
  if (raw == null || raw === '') return '—'
  return String(raw)
}
</script>

<style lang="scss" scoped>
.tree-group-label {
  font-weight: 600;
  color: #606266;
}

.tree-group-placeholder {
  color: #909399;
}

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

:deep(.device-waring-tree-row--equipment) {
  font-weight: 600;
}

.warning-table {
  width: 100%;

  :deep(.el-table__header th) {
    color: #606266 !important;
  }

  :deep(.el-table__body td) {
    color: #606266 !important;
  }
}
</style>
