<template>
  <el-dialog
    v-model="store.realtimeVisible"
    title="实时预警批量操作"
    width="1100px"
    align-center
    class="alarm-batch-dialog"
    @close="store.closeRealtime"
  >
    <div class="filter-bar">
      <el-form :inline="true" label-width="90px" class="filter-form">
        <el-form-item label="开始时间：">
          <el-date-picker
            v-model="store.realtimeQuery.startTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="开始时间"
            clearable
            size="small"
            class="alarm-filter-control"
            :show-now="false"
            :show-confirm="false"
            :disabled-date="disableFutureDate"
            :disabled-hours="getDisabledStartHours"
            :disabled-minutes="getDisabledStartMinutes"
            :disabled-seconds="getDisabledStartSeconds"
            popper-class="alarm-batch-datetime-popper"
          />
        </el-form-item>
        <el-form-item label="结束时间：">
          <el-date-picker
            v-model="store.realtimeQuery.endTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="结束时间"
            clearable
            size="small"
            class="alarm-filter-control"
            :show-now="false"
            :show-confirm="false"
            :disabled-date="disableFutureDate"
            :disabled-hours="getDisabledEndHours"
            :disabled-minutes="getDisabledEndMinutes"
            :disabled-seconds="getDisabledEndSeconds"
            popper-class="alarm-batch-datetime-popper"
            @update:model-value="onEndModelValue"
            @change="onEndTimeChange"
            @panel-change="onEndPanelChange"
            @calendar-change="onEndCalendarChange"
          />
        </el-form-item>
        <el-form-item label="听音器名称：">
          <el-select-v2
            v-model="store.realtimeQuery.deviceId"
            :options="deviceOptions"
            filterable
            clearable
            size="small"
            class="alarm-filter-control"
            popper-class="alarm-batch-popper"
            :popper-options="sameWidthPopperOptions"
            :loading="store.dropdownsLoading"
            :item-height="28"
            :height="280"
            style="width: 220px"
            placeholder="请选择"
          />
        </el-form-item>
        <el-form-item label="预警类型：">
          <el-select-v2
            v-model="store.realtimeQuery.eventTypeCode"
            :options="typeOptions"
            filterable
            clearable
            size="small"
            class="alarm-filter-control"
            popper-class="alarm-batch-popper"
            :popper-options="sameWidthPopperOptions"
            :loading="store.dropdownsLoading"
            :item-height="28"
            :height="280"
            style="width: 220px"
            placeholder="请选择"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="small" @click="store.fetchRealtimeList(0, true)"
            >查询</el-button
          >
          <el-button size="small" @click="onReset">清空</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="actions-bar">
      <el-button
        type="success"
        size="small"
        :disabled="!store.realtimeSelectedRowKeys.length"
        @click="confirmBatch('yes')"
      >
        批量确认警报
      </el-button>
      <el-button
        type="warning"
        size="small"
        :disabled="!store.realtimeSelectedRowKeys.length"
        @click="confirmBatch('not')"
      >
        批量确认误报
      </el-button>
      <el-button
        type="danger"
        size="small"
        :disabled="!store.realtimeSelectedRowKeys.length"
        @click="confirmBatch('delete')"
      >
        批量确认删除
      </el-button>
    </div>

    <div class="table-wrapper" v-loading="store.realtimeLoading">
      <el-table
        :data="store.realtimeRows"
        row-key="id"
        border
        height="100%"
        virtualized
        :row-height="32"
        @selection-change="onSelectionChange"
      >
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
      <el-pagination
        v-model:current-page="pageForUi"
        :page-size="store.realtimePageSize"
        layout="total, prev, pager, next"
        :total="store.realtimeTotal"
        @current-change="onPageChange"
      />
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
  () => store.realtimeVisible,
  (visible) => {
    if (!visible) return

    nextTick(() => {
      void store.ensureDropdowns()
      void store.fetchRealtimeList(0)
    })
  },
)

const pageForUi = computed({
  get: () => store.realtimePageIndex + 1,
  set: (v: number) => {
    store.realtimePageIndex = Math.max(0, v - 1) as any
  },
})

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

const onSelectionChange = (rows: any[]) => {
  store.realtimeSelectedRowKeys = rows.map((r) => String(r.id)) as any
}

const onPageChange = (page: number) => {
  store.fetchRealtimeList(page - 1)
}

const onReset = () => {
  store.resetRealtime()
  store.fetchRealtimeList(0, true)
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
  if (finalValue !== rawValue) store.realtimeQuery.endTime = finalValue
  endDatePart.value = getDatePart(store.realtimeQuery.endTime)
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
  const prevDatePart = endDatePart.value || getDatePart(store.realtimeQuery.endTime)
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

const getDisabledStartHours = () => getDisabledHoursByRaw(store.realtimeQuery.startTime)
const getDisabledStartMinutes = (hour: number) =>
  getDisabledMinutesByRaw(store.realtimeQuery.startTime, hour)
const getDisabledStartSeconds = (hour: number, minute: number) =>
  getDisabledSecondsByRaw(store.realtimeQuery.startTime, hour, minute)

const getDisabledEndHours = () => getDisabledHoursByRaw(store.realtimeQuery.endTime)
const getDisabledEndMinutes = (hour: number) =>
  getDisabledMinutesByRaw(store.realtimeQuery.endTime, hour)
const getDisabledEndSeconds = (hour: number, minute: number) =>
  getDisabledSecondsByRaw(store.realtimeQuery.endTime, hour, minute)

const confirmBatch = async (type: 'yes' | 'not' | 'delete') => {
  const actionText =
    type === 'yes' ? '批量确认警报' : type === 'not' ? '批量确认误报' : '批量确认删除'
  await ElMessageBox.confirm(`确认要执行【${actionText}】吗？`, '提示', { type: 'warning' })
  if (type === 'yes') await store.batchYesRealtime()
  if (type === 'not') await store.batchNotRealtime()
  if (type === 'delete') await store.batchDeleteRealtime()
}

function safeParseJson(input: any): any {
  if (!input) return undefined
  if (typeof input === 'object') return input
  if (typeof input !== 'string') return undefined
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
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

const parsedRowCache = new Map<string, any>()
const MAX_PARSED_ROW_CACHE = 300
const clearParsedRowCache = () => parsedRowCache.clear()
function ensureRowParsed(row: any): any {
  if (!row) return undefined
  const rowId = row.id != null ? String(row.id) : ''
  if (!rowId) return undefined

  const canUseParsed = parsedRowCache.has(rowId)
  if (canUseParsed) {
    const cached = parsedRowCache.get(rowId)
    return cached
  }

  if (!row.dataJson) {
    parsedRowCache.set(rowId, undefined)
    return undefined
  }

  const raw = row.dataJson
  const parsed = safeParseJson(raw)
  parsedRowCache.set(rowId, parsed)
  if (parsedRowCache.size > MAX_PARSED_ROW_CACHE) {
    const firstKey = parsedRowCache.keys().next().value
    if (firstKey != null) parsedRowCache.delete(firstKey)
  }
  return parsed
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
  const parsed = ensureRowParsed(row)
  const pointName = parsed?.pointName ?? row?.pointName
  return pointName ? String(pointName) : ''
}

const getReceiverName = (row: any): string => {
  const parsed = ensureRowParsed(row)
  const receiverName = parsed?.receiverName ?? row?.receiverName
  return receiverName ? String(receiverName) : ''
}

watch(
  () => store.realtimeVisible,
  (visible) => {
    if (!visible) clearParsedRowCache()
  },
)

watch(
  () => store.realtimeRows.map((row: any) => String(row?.id ?? '')),
  () => {
    clearParsedRowCache()
  },
)
</script>

<style scoped lang="scss">
:deep(.el-dialog__body) {
  color: var(--alarm-dialog-text);
  font-size: var(--alarm-dialog-font);
}

:deep(.el-form-item__label) {
  color: var(--alarm-dialog-muted);
  font-size: var(--alarm-dialog-font);
  white-space: nowrap;
}

:deep(.el-table) {
  color: var(--alarm-dialog-text);
  font-size: var(--alarm-dialog-font);
}

:deep(.el-table__header-wrapper th) {
  color: var(--alarm-dialog-muted);
  font-weight: 600;
}

:deep(.el-pagination) {
  color: var(--alarm-dialog-muted);
  font-size: var(--alarm-dialog-font);
}

.filter-form {
  :deep(.el-form-item) {
    margin-bottom: 10px;
    margin-right: 14px;
  }

  :deep(.el-form-item:last-child) {
    margin-right: 0;
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
  font-size: var(--alarm-dialog-font);
}
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
.alarm-batch-dialog .el-table__body-wrapper td .el-button.is-link > span,
.alarm-batch-dialog .el-table__body-wrapper td .operation-link,
.alarm-batch-dialog .el-table__body-wrapper td .operation-link > span {
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
</style>
