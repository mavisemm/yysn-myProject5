const fs = require('fs')
const path = require('path')

const D = 'div'
const file = path.join(__dirname, '../src/components/alarm/AlarmBatchDialogTable.vue')

const content = `<template>
  <${D} class="table-wrapper" v-loading="loading">
    <el-table
      :data="rows"
      row-key="id"
      border
      height="100%"
      virtualized
      :row-height="32"
      @selection-change="(list) => $emit('selection-change', list)"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column label="设备名称" min-width="180">
        <template #default="{ row }">
          <${D} class="device-cell">
            <${D} class="device-name">{{ rowLabels.getDeviceMainName(row) || '-' }}</${D}>
            <${D} v-if="rowLabels.getDeviceSubName(row)" class="device-sub">
              ({{ rowLabels.getDeviceSubName(row) }})
            </${D}>
          </${D}>
        </template>
      </el-table-column>
      <el-table-column label="点位名称" min-width="160">
        <template #default="{ row }">{{ rowLabels.getPointName(row) || '-' }}</template>
      </el-table-column>
      <el-table-column label="听筒名称" min-width="80">
        <template #default="{ row }">{{ rowLabels.getReceiverName(row) || '-' }}</template>
      </el-table-column>
      <el-table-column :label="\`\${eventKindLabel}类型\`" min-width="160">
        <template #default="{ row }">{{ row?.eventType?.name || '-' }}</template>
      </el-table-column>
      <el-table-column v-if="showWarningAxis" prop="warningAxis" label="报警轴向" min-width="100" />
      <el-table-column prop="statusText" label="状态" min-width="120" />
      <el-table-column :label="\`\${eventKindLabel}时间\`" min-width="180">
        <template #default="{ row }">{{ row._timeText || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <${D} class="operation-cell">
            <el-button link type="primary" class="operation-link" @click="$emit('view', row)">
              查看
            </el-button>
          </${D}>
        </template>
      </el-table-column>
    </el-table>
  </${D}>
</template>

<script setup lang="ts">
import type { useAlarmBatchRowLabels } from './alarmBatchDialogUtils'

defineProps<{
  rows: Record<string, unknown>[]
  loading: boolean
  eventKindLabel: string
  showWarningAxis?: boolean
  rowLabels: ReturnType<typeof useAlarmBatchRowLabels>
}>()

defineEmits<{ 'selection-change': [rows: Record<string, unknown>[]]; view: [row: Record<string, unknown>] }>()
</script>
`

fs.writeFileSync(file, content)
console.log('ok', file)
