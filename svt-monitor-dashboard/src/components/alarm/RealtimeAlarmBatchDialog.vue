<template>
  <el-dialog v-model="store.realtimeAlarmVisible" title="实时报警批量操作" :width="dialogWidth" align-center
    class="alarm-batch-dialog alarm-batch-dialog--realtime-alarm" @close="store.closeRealtimeAlarm">
    <div class="filter-bar">
      <el-form :inline="true" label-width="90px" class="filter-form">
        <el-form-item label="开始时间：">
          <el-date-picker v-model="store.realtimeAlarmQuery.startTime" type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始时间" clearable size="small" class="alarm-filter-control"
            :show-now="false" :show-confirm="false" :disabled-date="disableFutureDate"
            :disabled-hours="getDisabledStartHours" :disabled-minutes="getDisabledStartMinutes"
            :disabled-seconds="getDisabledStartSeconds" popper-class="alarm-batch-datetime-popper" />
        </el-form-item>
        <el-form-item label="结束时间：">
          <el-date-picker v-model="store.realtimeAlarmQuery.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="结束时间" clearable size="small" class="alarm-filter-control" :show-now="false"
            :show-confirm="false" :disabled-date="disableFutureDate" :disabled-hours="getDisabledEndHours"
            :disabled-minutes="getDisabledEndMinutes" :disabled-seconds="getDisabledEndSeconds"
            popper-class="alarm-batch-datetime-popper" @update:model-value="onEndModelValue" @change="onEndTimeChange"
            @panel-change="onEndPanelChange" @calendar-change="onEndCalendarChange" />
        </el-form-item>
        <el-form-item label="设备名称：">
          <el-select-v2 v-model="store.realtimeAlarmQuery.deviceId" :options="deviceOptions" filterable clearable
            size="small" class="alarm-filter-control" popper-class="alarm-batch-popper"
            :popper-options="sameWidthPopperOptions" :loading="store.dropdownsLoading" :item-height="28" :height="280"
            style="width: 220px" placeholder="请选择" />
        </el-form-item>
        <el-form-item label="报警类型：">
          <el-select-v2 v-model="store.realtimeAlarmQuery.eventTypeCode" :options="typeOptions" filterable clearable
            size="small" class="alarm-filter-control" popper-class="alarm-batch-popper"
            :popper-options="sameWidthPopperOptions" :loading="store.dropdownsLoading" :item-height="28" :height="280"
            style="width: 220px" placeholder="请选择" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" @click="store.fetchRealtimeAlarmList(0, true)">查询</el-button>
          <el-button size="small" @click="onReset">清空</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="actions-bar">
      <div class="all-actions">
        <el-button type="success" size="small" @click="confirmAll('yes')">全部确认警报</el-button>
        <el-button type="warning" size="small" @click="confirmAll('not')">全部确认误报</el-button>
        <el-button type="danger" size="small" @click="confirmAll('delete')">全部删除</el-button>
        <el-button type="success" size="small" :disabled="!store.realtimeAlarmSelectedRowKeys.length"
          @click="confirmBatch('yes')">
          批量确认警报
        </el-button>
        <el-button type="warning" size="small" :disabled="!store.realtimeAlarmSelectedRowKeys.length"
          @click="confirmBatch('not')">
          批量确认误报
        </el-button>
        <el-button type="danger" size="small" :disabled="!store.realtimeAlarmSelectedRowKeys.length"
          @click="confirmBatch('delete')">
          批量确认删除
        </el-button>
      </div>
    </div>

    <div class="table-wrapper" v-loading="store.realtimeAlarmLoading">
      <VibrationAlarmBatchTreeTable
        :rows="store.realtimeAlarmRows"
        @selection-change="onSelectionChange"
        @view="$emit('view', $event)"
      />
    </div>

    <div class="pager">
      <el-pagination v-model:current-page="pageForUi" :page-size="store.realtimeAlarmPageSize"
        layout="total, prev, pager, next" :total="store.realtimeAlarmTotal" @current-change="onPageChange" />
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
  useDialogOpenEffect,
  useResponsiveDialogWidth,
  useUiPageIndex,
  type BatchConfirmType,
} from './alarmBatchDialogUtils'
import VibrationAlarmBatchTreeTable from './VibrationAlarmBatchTreeTable.vue'

defineEmits<{ (e: 'view', row: any): void }>()

const { store, deviceOptions, typeOptions } = useAlarmBatchDropdownOptions()
const { dialogWidth } = useResponsiveDialogWidth()
const sameWidthPopperOptions = SAME_WIDTH_POPPER_OPTIONS

useDialogOpenEffect(
  () => store.realtimeAlarmVisible,
  () => {
    void store.ensureDropdowns()
    void store.fetchRealtimeAlarmList(0)
  },
)

const pageForUi = useUiPageIndex(
  () => store.realtimeAlarmPageIndex,
  (v) => {
    store.realtimeAlarmPageIndex = v as any
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
  () => store.realtimeAlarmQuery.startTime,
  () => store.realtimeAlarmQuery.endTime,
  (v) => {
    store.realtimeAlarmQuery.endTime = v
  },
)

const onSelectionChange = (eventIds: string[]) => {
  store.realtimeAlarmSelectedRowKeys = eventIds as any
}

const onPageChange = (page: number) => {
  store.fetchRealtimeAlarmList(page - 1)
}

const onReset = () => {
  store.resetRealtimeAlarm()
  store.fetchRealtimeAlarmList(0, true)
}

const confirmBatch = (type: BatchConfirmType) =>
  confirmBatchAction(type, {
    yes: () => store.batchYesRealtimeAlarm(),
    not: () => store.batchNotRealtimeAlarm(),
    delete: () => store.batchDeleteRealtimeAlarm(),
  })

const confirmAll = (type: BatchConfirmType) => {
  if (type === 'delete') {
    return confirmVibrationDeleteAll(
      store.realtimeAlarmQuery,
      deviceOptions.value,
      typeOptions.value,
      () => store.allDeleteRealtimeAlarm(),
    )
  }
  return confirmBatchAction(
    type,
    {
      yes: () => store.allYesRealtimeAlarm(),
      not: () => store.allNotRealtimeAlarm(),
      delete: () => store.allDeleteRealtimeAlarm(),
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
