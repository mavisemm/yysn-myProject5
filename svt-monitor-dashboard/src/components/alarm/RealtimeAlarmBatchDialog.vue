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
        <el-form-item label="听音器名称：">
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

    <div class="table-wrapper" v-loading="store.realtimeAlarmLoading">
      <el-table :data="store.realtimeAlarmRows" row-key="id" border height="100%" virtualized :row-height="32"
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
      <el-pagination v-model:current-page="pageForUi" :page-size="store.realtimeAlarmPageSize"
        layout="total, prev, pager, next" :total="store.realtimeAlarmTotal" @current-change="onPageChange" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { formatDateTime, normalizeEndDateTimeBySelectedDay } from '@/utils/datetime'

defineEmits<{ (e: 'view', row: any): void }>()

const store = useAlarmBatchStore()
const isMobile = computed(() => window.innerWidth <= 800)
const dialogWidth = computed(() => (isMobile.value ? '100vw' : '70vw'))
const sameWidthPopperOptions = {
  modifiers: [
    {
      name: 'sameWidth',
      enabled: true,
      phase: 'beforeWrite',
      requires: ['computeStyles'],
      fn: ({ state }: any) => {
        state.styles.popper.width = `${state.rects.reference.width}px`
      },
    },
  ],
} as any

watch(
  () => store.realtimeAlarmVisible,
  (visible) => {
    if (!visible) return
    nextTick(() => {
      void store.ensureDropdowns()
      void store.fetchRealtimeAlarmList(0)
    })
  },
)

const pageForUi = computed({
  get: () => store.realtimeAlarmPageIndex + 1,
  set: (v: number) => {
    store.realtimeAlarmPageIndex = Math.max(0, v - 1) as any
  },
})

const onSelectionChange = (rows: any[]) => {
  store.realtimeAlarmSelectedRowKeys = rows.map((r) => String(r.id)) as any
}

const deviceOptions = computed(() => {
  return (store.deviceNameList ?? []).map((x: any) => ({
    value: x.key,
    label: String(x.text ?? ''),
  }))
})

const typeOptions = computed(() => {
  return (store.typeList ?? []).map((x: any) => ({
    value: x.key,
    label: String(x.text ?? ''),
  }))
})

const onPageChange = (page: number) => {
  store.fetchRealtimeAlarmList(page - 1)
}

const onReset = () => {
  store.resetRealtimeAlarm()
  store.fetchRealtimeAlarmList(0, true)
}

const endDatePart = ref<string>('')

const getDatePart = (value?: string) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return raw.split(' ')[0] ?? ''
}

const normalizeAndApplyEndTime = (rawValue?: string, forceApplyRule: boolean = false) => {
  const normalized = normalizeEndDateTimeBySelectedDay(rawValue, forceApplyRule)
  const picked = normalized ? new Date(normalized.replace(' ', 'T')) : null
  const now = new Date()
  const finalValue =
    picked && !Number.isNaN(picked.getTime()) && picked.getTime() > now.getTime()
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      : normalized
  if (finalValue !== rawValue) store.realtimeAlarmQuery.endTime = finalValue
  endDatePart.value = getDatePart(store.realtimeAlarmQuery.endTime)
}

const toDateTimeText = (value: unknown): string | undefined => {
  if (value == null || value === '') return undefined
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? undefined : formatDateTime(value)
  return String(value)
}

const onEndTimeChange = (value?: string) => {
  normalizeAndApplyEndTime(value)
}

const onEndModelValue = (value?: string) => {
  const nextDatePart = getDatePart(value)
  const prevDatePart = endDatePart.value || getDatePart(store.realtimeAlarmQuery.endTime)
  const forceApplyRule = !!nextDatePart && !!prevDatePart && nextDatePart !== prevDatePart
  normalizeAndApplyEndTime(value, forceApplyRule)
}

const onEndPanelChange = (value: unknown) => {
  normalizeAndApplyEndTime(toDateTimeText(value))
}

const onEndCalendarChange = (value: unknown) => {
  const picked = Array.isArray(value) ? value[value.length - 1] : value
  normalizeAndApplyEndTime(toDateTimeText(picked))
}

const disableFutureDate = (time: Date) => time.getTime() > Date.now()

const isTodayByValue = (rawValue?: string) => {
  const raw = String(rawValue ?? '').trim()
  if (!raw) return false
  const selected = new Date(raw.replace(' ', 'T'))
  if (Number.isNaN(selected.getTime())) return false
  const now = new Date()
  return (
    selected.getFullYear() === now.getFullYear() &&
    selected.getMonth() === now.getMonth() &&
    selected.getDate() === now.getDate()
  )
}

const getDisabledHoursByRaw = (rawValue?: string) => {
  if (!isTodayByValue(rawValue)) return []
  const h = new Date().getHours()
  return Array.from({ length: 24 - (h + 1) }, (_, i) => h + 1 + i)
}

const getDisabledMinutesByRaw = (rawValue: string | undefined, hour: number) => {
  if (!isTodayByValue(rawValue)) return []
  const now = new Date()
  if (hour !== now.getHours()) return []
  const m = now.getMinutes()
  return Array.from({ length: 60 - (m + 1) }, (_, i) => m + 1 + i)
}

const getDisabledSecondsByRaw = (rawValue: string | undefined, hour: number, minute: number) => {
  if (!isTodayByValue(rawValue)) return []
  const now = new Date()
  if (hour !== now.getHours() || minute !== now.getMinutes()) return []
  const s = now.getSeconds()
  return Array.from({ length: 60 - (s + 1) }, (_, i) => s + 1 + i)
}

const getDisabledStartHours = () => getDisabledHoursByRaw(store.realtimeAlarmQuery.startTime)
const getDisabledStartMinutes = (hour: number) =>
  getDisabledMinutesByRaw(store.realtimeAlarmQuery.startTime, hour)
const getDisabledStartSeconds = (hour: number, minute: number) =>
  getDisabledSecondsByRaw(store.realtimeAlarmQuery.startTime, hour, minute)

const getDisabledEndHours = () => getDisabledHoursByRaw(store.realtimeAlarmQuery.endTime)
const getDisabledEndMinutes = (hour: number) =>
  getDisabledMinutesByRaw(store.realtimeAlarmQuery.endTime, hour)
const getDisabledEndSeconds = (hour: number, minute: number) =>
  getDisabledSecondsByRaw(store.realtimeAlarmQuery.endTime, hour, minute)

const confirmBatch = async (type: 'yes' | 'not' | 'delete') => {
  const actionText =
    type === 'yes' ? '批量确认警报' : type === 'not' ? '批量确认误报' : '批量确认删除'
  await ElMessageBox.confirm(`确认要执行【${actionText}】吗？`, '提示', { type: 'warning' })
  if (type === 'yes') await store.batchYesRealtimeAlarm()
  if (type === 'not') await store.batchNotRealtimeAlarm()
  if (type === 'delete') await store.batchDeleteRealtimeAlarm()
}

function splitDeviceName(rawName: any): { main: string; sub: string } {
  const raw = String(rawName || '-')
  const idxCn = raw.indexOf('（')
  const idxEn = raw.indexOf('(')
  const idx = idxCn !== -1 ? idxCn : idxEn
  if (idx <= 0) return { main: raw, sub: '' }
  const main = raw.slice(0, idx).trim()
  const sub = raw
    .slice(idx)
    .replace(/^（|^\(/, '')
    .replace(/）$|\)$/, '')
    .trim()
  return { main, sub }
}

const getDeviceMainName = (row: any): string => {
  const deviceName = row?.deviceName
  const main = deviceName ? splitDeviceName(deviceName).main : ''
  return row?._deviceMainName || main || String(deviceName ?? '')
}

const getDeviceSubName = (row: any): string => {
  const deviceName = row?.deviceName
  const shopName = row?.shopName
  if (shopName) return String(shopName)
  if (!deviceName) return row?._deviceSubName || ''
  return splitDeviceName(deviceName).sub || row?._deviceSubName || ''
}

const getPointName = (row: any): string => {
  return row?.pointName ? String(row.pointName) : ''
}

const getReceiverName = (row: any): string => {
  return row?.receiverName ? String(row.receiverName) : ''
}
</script>

<style scoped lang="scss">
.filter-form {
  :deep(.el-form-item) {
    margin-bottom: 10px;
    margin-right: 14px;
  }
}

.actions-bar {
  display: flex;
  gap: 10px;
  row-gap: 10px;
  margin: 2px 0 12px;
  align-items: center;
  flex-wrap: wrap;
}

.device-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.device-sub {
  opacity: 0.75;
}

.pager {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
}

.operation-cell :deep(.operation-link) {
  font-size: 12px;
}

@media (max-width: 800px) {
  .table-wrapper {
    overflow-x: auto;
  }

  .table-wrapper :deep(.el-table) {
    min-width: 980px;
  }

}
</style>

<style lang="scss">
@media (max-width: 800px) {
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

  .alarm-batch-dialog--realtime-alarm .actions-bar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .alarm-batch-dialog--realtime-alarm .actions-bar .el-button {
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
