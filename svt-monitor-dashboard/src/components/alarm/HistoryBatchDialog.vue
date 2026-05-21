<template>
  <el-dialog v-model="store.historyVisible" title="历史预警批量操作" :width="dialogWidth" align-center
    class="alarm-batch-dialog alarm-batch-dialog--history-warning" @close="store.closeHistory">
    <div class="filter-bar">
      <el-form :inline="true" label-width="90px" class="filter-form">
        <el-form-item label="开始时间：">
          <el-date-picker v-model="store.historyQuery.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="开始时间" clearable size="small" class="alarm-filter-control" :show-now="false"
            :show-confirm="false" :disabled-date="disableFutureDate" :disabled-hours="getDisabledStartHours"
            :disabled-minutes="getDisabledStartMinutes" :disabled-seconds="getDisabledStartSeconds"
            popper-class="alarm-batch-datetime-popper" />
        </el-form-item>
        <el-form-item label="结束时间：">
          <el-date-picker v-model="store.historyQuery.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="结束时间" clearable size="small" class="alarm-filter-control" :show-now="false"
            :show-confirm="false" :disabled-date="disableFutureDate" :disabled-hours="getDisabledEndHours"
            :disabled-minutes="getDisabledEndMinutes" :disabled-seconds="getDisabledEndSeconds"
            popper-class="alarm-batch-datetime-popper" @update:model-value="onEndModelValue" @change="onEndTimeChange"
            @panel-change="onEndPanelChange" @calendar-change="onEndCalendarChange" />
        </el-form-item>
        <el-form-item label="听音器名称：">
          <el-select-v2 v-model="store.historyQuery.deviceId" :options="deviceOptions" filterable clearable size="small"
            class="alarm-filter-control" popper-class="alarm-batch-popper" :popper-options="sameWidthPopperOptions"
            :loading="store.dropdownsLoading" :item-height="28" :height="280" style="width: 220px" placeholder="请选择" />
        </el-form-item>
        <el-form-item label="预警类型：">
          <el-select-v2 v-model="store.historyQuery.eventTypeCode" :options="typeOptions" filterable clearable
            size="small" class="alarm-filter-control" popper-class="alarm-batch-popper"
            :popper-options="sameWidthPopperOptions" :loading="store.dropdownsLoading" :item-height="28" :height="280"
            style="width: 220px" placeholder="请选择" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="small" @click="store.fetchHistoryList(0, true)">查询</el-button>
          <el-button size="small" @click="onReset">清空</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="actions-bar">
      <div class="all-actions">
        <el-button type="success" size="small" @click="confirmAll('yes')">全部确认警报</el-button>
        <el-button type="warning" size="small" @click="confirmAll('not')">全部确认误报</el-button>
        <el-button type="danger" size="small" @click="confirmAll('delete')">全部删除</el-button>
        <el-button type="success" size="small" :disabled="!store.historySelectedRowKeys.length"
          @click="confirmBatch('yes')">
          批量确认警报
        </el-button>
        <el-button type="warning" size="small" :disabled="!store.historySelectedRowKeys.length"
          @click="confirmBatch('not')">
          批量确认误报
        </el-button>
        <el-button type="danger" size="small" :disabled="!store.historySelectedRowKeys.length"
          @click="confirmBatch('delete')">
          批量确认删除
        </el-button>
      </div>
    </div>

    <div class="table-wrapper" v-loading="store.historyLoading">
      <el-table :data="store.historyRows" row-key="id" border height="100%" virtualized :row-height="32"
        @selection-change="onSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column label="设备名称" min-width="180">
          <template #default="{ row }">
            <div class="device-cell">
              <div class="device-name">{{ getDeviceMainName(row) || '-' }}</div>
              <div v-if="getDeviceSubName(row)" class="device-sub">
                ({{ getDeviceSubName(row) }})
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="点位名称" min-width="160">
          <template #default="{ row }">{{ getPointName(row) || '-' }}</template>
        </el-table-column>
        <el-table-column label="听筒名称" min-width="80">
          <template #default="{ row }">{{ getReceiverName(row) || '-' }}</template>
        </el-table-column>
        <el-table-column label="预警类型" min-width="160">
          <template #default="{ row }">{{ row?.eventType?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="statusText" label="状态" min-width="120" />
        <el-table-column label="预警时间" min-width="180">
          <template #default="{ row }">{{ row._timeText || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <div class="operation-cell">
              <el-button link type="primary" class="operation-link" @click="$emit('view', row)">
                查看
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pager">
      <el-pagination v-model:current-page="pageForUi" :page-size="store.historyPageSize"
        layout="total, prev, pager, next" :total="store.historyTotal" @current-change="onPageChange" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import {
  SAME_WIDTH_POPPER_OPTIONS,
  confirmBatchAction,
  useAlarmBatchDropdownOptions,
  useAlarmBatchEndTimePicker,
  useAlarmBatchRowLabels,
  useDialogOpenEffect,
  useResponsiveDialogWidth,
  useUiPageIndex,
  type BatchConfirmType,
} from './alarmBatchDialogUtils'

defineEmits<{ (e: 'view', row: any): void }>()

const { store, deviceOptions, typeOptions } = useAlarmBatchDropdownOptions()
const { dialogWidth } = useResponsiveDialogWidth()
const sameWidthPopperOptions = SAME_WIDTH_POPPER_OPTIONS

useDialogOpenEffect(
  () => store.historyVisible,
  () => {
    void store.ensureDropdowns()
    void store.fetchHistoryList(0)
  },
)

const pageForUi = useUiPageIndex(
  () => store.historyPageIndex,
  (v) => {
    store.historyPageIndex = v as any
  },
)

const {
  onEndTimeChange,
  onEndModelValue,
  onEndPanelChange,
  onEndCalendarChange,
  disableFutureDate,
  getDisabledStartHours,
  getDisabledStartMinutes,
  getDisabledStartSeconds,
  getDisabledEndHours,
  getDisabledEndMinutes,
  getDisabledEndSeconds,
} = useAlarmBatchEndTimePicker(
  () => store.historyQuery.startTime,
  () => store.historyQuery.endTime,
  (v) => {
    store.historyQuery.endTime = v
  },
)

const { getDeviceMainName, getDeviceSubName, getPointName, getReceiverName, clearParsedRowCache } =
  useAlarmBatchRowLabels({ parseDataJson: true })

watch(
  () => store.historyVisible,
  (visible) => {
    if (!visible) clearParsedRowCache()
  },
)

watch(
  () => store.historyRows.map((row: any) => String(row?.id ?? '')),
  () => clearParsedRowCache(),
)


const onSelectionChange = (rows: any[]) => {
  store.historySelectedRowKeys = rows.map((r) => String(r.id)) as any
}

const onPageChange = (page: number) => {
  store.fetchHistoryList(page - 1)
}

const onReset = () => {
  store.resetHistory()
  store.fetchHistoryList(0, true)
}

const confirmBatch = (type: BatchConfirmType) =>
  confirmBatchAction(type, {
    yes: () => store.batchYesHistory(),
    not: () => store.batchNotHistory(),
    delete: () => store.batchDeleteHistory(),
  })

const confirmAll = (type: BatchConfirmType) =>
  confirmBatchAction(
    type,
    {
      yes: () => store.allYesHistory(),
      not: () => store.allNotHistory(),
      delete: () => store.allDeleteHistory(),
    },
    'all',
  )


</script>

<style scoped lang="scss">
@use './alarm-batch-dialog.local.scss' as *;
</style>

<style lang="scss">
.alarm-batch-dialog {
  height: 90vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  --alarm-dialog-font: 12px;
  --alarm-dialog-text: #303133;
  --alarm-dialog-muted: #606266;
  --alarm-dialog-subtle: #909399;
}

.alarm-batch-dialog .el-dialog__body {
  color: var(--alarm-dialog-text) !important;
  font-size: var(--alarm-dialog-font) !important;
}

.alarm-batch-dialog .el-form-item__label {
  color: var(--alarm-dialog-muted) !important;
  font-size: var(--alarm-dialog-font) !important;
}

.alarm-batch-dialog .el-table {
  color: var(--alarm-dialog-text) !important;
  font-size: var(--alarm-dialog-font) !important;
}

.alarm-batch-dialog .el-table__header-wrapper th,
.alarm-batch-dialog .el-table__header-wrapper th .cell {
  color: var(--alarm-dialog-muted) !important;
  font-weight: 600;
}

.alarm-batch-dialog .el-table__body-wrapper td,
.alarm-batch-dialog .el-table__body-wrapper td .cell {
  color: var(--alarm-dialog-text) !important;
}

.alarm-batch-dialog .el-table__body-wrapper td .el-button.is-link,
.alarm-batch-dialog .el-table__body-wrapper td .el-button.is-link>span,
.alarm-batch-dialog .el-table__body-wrapper td .operation-link,
.alarm-batch-dialog .el-table__body-wrapper td .operation-link>span {
  color: var(--el-color-primary) !important;
}

.alarm-batch-dialog .el-table__body-wrapper td .el-button.is-link:hover,
.alarm-batch-dialog .el-table__body-wrapper td .operation-link:hover {
  color: var(--el-color-primary-dark-2) !important;
}

.alarm-batch-dialog .el-pagination {
  color: var(--alarm-dialog-muted) !important;
  font-size: var(--alarm-dialog-font) !important;
}

.alarm-batch-dialog .el-dialog__title {
  color: var(--alarm-dialog-text);
  font-weight: 500;
}

.alarm-batch-dialog .el-dialog__headerbtn .el-dialog__close {
  color: var(--alarm-dialog-muted);
}

.alarm-batch-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.alarm-batch-dialog .el-table__cell {
  padding: 5px 0 !important;
}

.alarm-batch-dialog .alarm-filter-control {
  --el-text-color-regular: var(--alarm-dialog-text);
  --el-text-color-placeholder: var(--alarm-dialog-subtle);
  --el-border-color: #dcdfe6;
}

.alarm-batch-dialog .alarm-filter-control .el-input__wrapper {
  height: 24px;
  border-radius: 4px;
  background: #fff;
  border: 1px solid #dcdfe6;
  box-shadow: none;
}

.alarm-batch-dialog .alarm-filter-control .el-input__inner {
  color: var(--alarm-dialog-text) !important;
  background: transparent;
  font-size: 12px;
  line-height: 22px;
}

.alarm-batch-dialog .alarm-filter-control .el-input__prefix,
.alarm-batch-dialog .alarm-filter-control .el-input__suffix {
  color: var(--alarm-dialog-muted) !important;
  font-size: 12px;
}

.alarm-batch-dialog .alarm-filter-control .el-select__caret,
.alarm-batch-dialog .alarm-filter-control .el-icon {
  color: var(--alarm-dialog-muted);
}

.alarm-batch-dialog .el-button {
  font-size: var(--alarm-dialog-font);
}

.alarm-batch-dialog .el-button.is-link {
  font-weight: 500;
}

.alarm-batch-popper {
  --el-text-color-regular: #303133;
  --el-text-color-primary: #303133;
  --el-text-color-secondary: #606266;
  font-size: 12px;
}

.alarm-batch-popper .el-select-dropdown__item {
  font-size: 12px !important;
  height: 28px;
  line-height: 28px;
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133 !important;
}

.alarm-batch-popper .el-select-dropdown__item.hover,
.alarm-batch-popper .el-select-dropdown__item:hover {
  color: #303133 !important;
}

.alarm-batch-popper .el-select-dropdown__item.is-selected {
  color: var(--el-color-primary) !important;
  font-weight: 600;
}

.alarm-batch-datetime-popper .el-picker-panel__footer .el-picker-panel__link-btn {
  display: none !important;
}

@media (max-width: 800px) {
  .table-wrapper {
    scrollbar-width: auto;
    -ms-overflow-style: auto;
  }

  .table-wrapper::-webkit-scrollbar {
    display: block;
    height: 6px;
  }

  .table-wrapper :deep(.el-table) {
    min-width: 980px;
  }

  .alarm-batch-dialog.el-dialog {
    width: 100vw !important;
    max-width: 100vw !important;
    margin: 0 !important;
  }

  .alarm-batch-dialog .el-dialog__body {
    padding: 12px;
  }

  .alarm-batch-dialog .filter-form .el-form-item {
    width: 100%;
    margin-right: 0;
    margin-bottom: 8px;
  }

  .alarm-batch-dialog .filter-form .el-form-item .alarm-filter-control {
    width: 100% !important;
  }

  .alarm-batch-dialog .filter-form .el-form-item:last-child .el-form-item__content {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .alarm-batch-dialog--history-warning .actions-bar {
    display: block !important;
    margin-bottom: 10px;
  }

  .alarm-batch-dialog--history-warning .all-actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    grid-column: 1 / -1;
  }

  .alarm-batch-dialog--history-warning .all-actions .el-button {
    width: 100%;
    margin-left: 0 !important;
  }

  .alarm-batch-datetime-popper.el-picker__popper {
    width: calc(100vw - 2px) !important;
    max-width: calc(100vw - 2px) !important;
    left: 0 !important;
    right: 0 !important;
    overflow-x: hidden;
  }
}
</style>
