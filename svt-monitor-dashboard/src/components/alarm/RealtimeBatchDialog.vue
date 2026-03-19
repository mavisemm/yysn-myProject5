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
      <el-form :inline="true" label-width="80px" class="filter-form">
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
            popper-class="alarm-batch-datetime-popper"
          />
        </el-form-item>
        <el-form-item label="设备名称：">
          <el-select
            v-model="store.realtimeQuery.deviceId"
            filterable
            clearable
            size="small"
            class="alarm-filter-control"
            popper-class="alarm-batch-popper"
            :popper-options="sameWidthPopperOptions"
            style="width: 220px"
            placeholder="请选择"
          >
            <el-option
              v-for="d in deviceOptions"
              :key="String(d.value)"
              :label="String(d.label)"
              :value="String(d.value)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="预警类型：">
          <el-select
            v-model="store.realtimeQuery.eventTypeCode"
            filterable
            clearable
            size="small"
            class="alarm-filter-control"
            popper-class="alarm-batch-popper"
            :popper-options="sameWidthPopperOptions"
            style="width: 220px"
            placeholder="请选择"
          >
            <el-option
              v-for="t in typeOptions"
              :key="String(t.value)"
              :label="String(t.label)"
              :value="String(t.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="small" @click="store.fetchRealtimeList(0)">查询</el-button>
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
              <div class="device-name">{{ row._deviceMainName || row.deviceName || '-' }}</div>
              <div v-if="row._deviceSubName" class="device-sub">({{ row._deviceSubName }})</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="点位名称" min-width="160">
          <template #default="{ row }">{{ row.pointName || row?.dataJson?.pointName || '-' }}</template>
        </el-table-column>
        <el-table-column label="听筒名称" min-width="80">
          <template #default="{ row }">{{ row.receiverName || row?.dataJson?.receiverName || '-' }}</template>
        </el-table-column>
        <el-table-column label="预警类型" min-width="160">
          <template #default="{ row }">{{ row?.eventType?.name || row.eventTypeCode || '-' }}</template>
        </el-table-column>
        <el-table-column prop="statusText" label="状态" min-width="120" />
        <el-table-column label="预警时间" min-width="180">
          <template #default="{ row }">{{ row._timeText || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <div class="operation-cell">
              <el-button
                link
                type="primary"
                class="operation-link"
                @click="$emit('view', row)"
              >
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
        :page-size="10"
        layout="total, prev, pager, next"
        :total="store.realtimeTotal"
        @current-change="onPageChange"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useAlarmBatchStore } from '@/stores/alarmBatch'

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
      }
    }
  ]
} as any

watch(
  () => store.realtimeVisible,
  (visible) => {
    if (!visible) return
    // 让弹窗先渲染出来，再并行拉下拉/列表，避免“打开瞬间卡住”
    nextTick(() => {
      void Promise.all([store.ensureDropdowns(), store.fetchRealtimeList(0)])
    })
  }
)

const pageForUi = computed({
  get: () => store.realtimePageIndex + 1,
  set: (v: number) => {
    store.realtimePageIndex = Math.max(0, v - 1) as any
  }
})

const deviceOptions = computed(() => {
  return (store.deviceNameList ?? []).map((x: any) => ({
    value: x.key ?? x.deviceId ?? x.id ?? x.value,
    label: x.text ?? x.deviceName ?? x.name ?? x.label ?? String(x.key ?? x.deviceId ?? x.id ?? x.value ?? '')
  }))
})

const typeOptions = computed(() => {
  return (store.typeList ?? []).map((x: any) => ({
    value: x.key ?? x.code ?? x.id ?? x.value,
    label: x.text ?? x.name ?? x.label ?? String(x.key ?? x.code ?? x.id ?? x.value ?? '')
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
  store.fetchRealtimeList(0)
}

const confirmBatch = async (type: 'yes' | 'not' | 'delete') => {
  const actionText = type === 'yes' ? '批量确认警报' : type === 'not' ? '批量确认误报' : '批量确认删除'
  await ElMessageBox.confirm(`确认要执行【${actionText}】吗？`, '提示', { type: 'warning' })
  if (type === 'yes') await store.batchYesRealtime()
  if (type === 'not') await store.batchNotRealtime()
  if (type === 'delete') await store.batchDeleteRealtime()
}
</script>

<style scoped lang="scss">
:deep(.el-dialog__body) {
  color: var(--alarm-dialog-text);
  font-size: var(--alarm-dialog-font);
}

:deep(.el-form-item__label) {
  color: var(--alarm-dialog-muted);
  font-size: var(--alarm-dialog-font);
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
/* 垂直居中 + 高度固定 90vh（全局作用，兼容 teleport 到 body 的 el-dialog） */
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

/* 表格单元格更紧凑：8px 0 -> 5px 0 */
.alarm-batch-dialog .el-table__cell {
  padding: 5px 0 !important;
}

/* 查询区表单控件：覆盖全局“白字”规则，和项目其他输入控件风格对齐 */
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

/* 下拉面板是 teleport 到 body，单独兜底字体颜色 */
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

/* 兜底：隐藏 datetime 面板「此刻」按钮（部分版本不支持 show-now） */
.alarm-batch-datetime-popper .el-picker-panel__footer .el-picker-panel__link-btn {
  display: none !important;
}
</style>

