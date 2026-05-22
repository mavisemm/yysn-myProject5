<template>
  <el-dialog v-model="store.historyAlarmVisible" title="历史报警批量操作" :width="dialogWidth" align-center
    class="alarm-batch-dialog alarm-batch-dialog--history-alarm" @close="store.closeHistoryAlarm">
    <div class="filter-bar">
      <el-form :inline="true" label-width="90px" class="filter-form">
        <el-form-item label="开始时间：">
          <el-date-picker v-model="store.historyAlarmQuery.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="开始时间" clearable size="small" class="alarm-filter-control" :show-now="false"
            :show-confirm="false" :disabled-date="disableFutureDate" :disabled-hours="getDisabledStartHours"
            :disabled-minutes="getDisabledStartMinutes" :disabled-seconds="getDisabledStartSeconds"
            popper-class="alarm-batch-datetime-popper" />
        </el-form-item>
        <el-form-item label="结束时间：">
          <el-date-picker v-model="store.historyAlarmQuery.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="结束时间" clearable size="small" class="alarm-filter-control" :show-now="false"
            :show-confirm="false" :disabled-date="disableFutureDate" :disabled-hours="getDisabledEndHours"
            :disabled-minutes="getDisabledEndMinutes" :disabled-seconds="getDisabledEndSeconds"
            popper-class="alarm-batch-datetime-popper" @update:model-value="onEndModelValue" @change="onEndTimeChange"
            @panel-change="onEndPanelChange" @calendar-change="onEndCalendarChange" />
        </el-form-item>
        <el-form-item label="听音器名称：">
          <el-select-v2 v-model="store.historyAlarmQuery.deviceId" :options="deviceOptions" filterable clearable
            size="small" class="alarm-filter-control" popper-class="alarm-batch-popper"
            :popper-options="sameWidthPopperOptions" :loading="store.dropdownsLoading" :item-height="28" :height="280"
            style="width: 220px" placeholder="请选择" />
        </el-form-item>
        <el-form-item label="报警类型：">
          <el-select-v2 v-model="store.historyAlarmQuery.eventTypeCode" :options="typeOptions" filterable clearable
            size="small" class="alarm-filter-control" popper-class="alarm-batch-popper"
            :popper-options="sameWidthPopperOptions" :loading="store.dropdownsLoading" :item-height="28" :height="280"
            style="width: 220px" placeholder="请选择" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" @click="store.fetchHistoryAlarmList(0, true)">查询</el-button>
          <el-button size="small" @click="onReset">清空</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="actions-bar">
      <div class="all-actions">
        <el-button type="success" size="small" @click="confirmAll('yes')">全部确认警报</el-button>
        <el-button type="warning" size="small" @click="confirmAll('not')">全部确认误报</el-button>
        <el-button type="danger" size="small" @click="confirmAll('delete')">全部删除</el-button>
        <el-button type="success" size="small" :disabled="!store.historyAlarmSelectedRowKeys.length"
          @click="confirmBatch('yes')">
          批量确认警报
        </el-button>
        <el-button type="warning" size="small" :disabled="!store.historyAlarmSelectedRowKeys.length"
          @click="confirmBatch('not')">
          批量确认误报
        </el-button>
        <el-button type="danger" size="small" :disabled="!store.historyAlarmSelectedRowKeys.length"
          @click="confirmBatch('delete')">
          批量确认删除
        </el-button>
      </div>
    </div>

    <div class="table-wrapper" v-loading="store.historyAlarmLoading">
      <el-table :data="store.historyAlarmRows" row-key="id" border height="100%" virtualized :row-height="32"
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
        <el-table-column label="报警类型" min-width="160">
          <template #default="{ row }">{{ row?.eventType?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="warningAxis" label="报警轴向" min-width="100" />
        <el-table-column prop="statusText" label="状态" min-width="120" />
        <el-table-column label="报警时间" min-width="180">
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
      <el-pagination v-model:current-page="pageForUi" :page-size="store.historyAlarmPageSize"
        layout="total, prev, pager, next" :total="store.historyAlarmTotal" @current-change="onPageChange" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  SAME_WIDTH_POPPER_OPTIONS,
  confirmBatchAction,
  confirmVibrationDeleteAll,
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
  () => store.historyAlarmVisible,
  () => {
    void store.ensureDropdowns()
    void store.fetchHistoryAlarmList(0)
  },
)

const pageForUi = useUiPageIndex(
  () => store.historyAlarmPageIndex,
  (v) => {
    store.historyAlarmPageIndex = v as any
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
  () => store.historyAlarmQuery.startTime,
  () => store.historyAlarmQuery.endTime,
  (v) => {
    store.historyAlarmQuery.endTime = v
  },
)

const { getDeviceMainName, getDeviceSubName, getPointName, getReceiverName } =
  useAlarmBatchRowLabels({ parseDataJson: false })



const onSelectionChange = (rows: any[]) => {
  store.historyAlarmSelectedRowKeys = rows.map((r) => String(r.id)) as any
}

const onPageChange = (page: number) => {
  store.fetchHistoryAlarmList(page - 1)
}

const onReset = () => {
  store.resetHistoryAlarm()
  store.fetchHistoryAlarmList(0, true)
}

const confirmBatch = (type: BatchConfirmType) =>
  confirmBatchAction(type, {
    yes: () => store.batchYesHistoryAlarm(),
    not: () => store.batchNotHistoryAlarm(),
    delete: () => store.batchDeleteHistoryAlarm(),
  })

const confirmAll = (type: BatchConfirmType) => {
  if (type === 'delete') {
    return confirmVibrationDeleteAll(
      store.historyAlarmQuery,
      deviceOptions.value,
      typeOptions.value,
      () => store.allDeleteHistoryAlarm(),
    )
  }
  return confirmBatchAction(
    type,
    {
      yes: () => store.allYesHistoryAlarm(),
      not: () => store.allNotHistoryAlarm(),
      delete: () => store.allDeleteHistoryAlarm(),
    },
    'all',
  )
}


</script>

<style scoped lang="scss">
@use './alarm-batch-dialog.local.scss' as *;
</style>

<style lang="scss">
@use './alarm-batch-dialog.scss' as *;
</style>
