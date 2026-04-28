<template>
  <div class="point-list-module">
    <div class="module-header">
      <h3 class="module-title app-section-title">点位列表</h3>
    </div>
    <div class="point-table-container">
      <div v-if="!pointList.length" class="point-empty-wrapper">
        <CommonEmptyState text="暂无数据" size="small" />
      </div>
      <el-table v-else ref="pointTableRef" :data="pointList" height="100%" :fit="true" :header-cell-style="{
        background: 'transparent',
        color: 'var(--special-font-color)',
        'text-align': 'center',
      }" :cell-style="{ background: 'transparent', color: '#fff', 'text-align': 'center' }" @row-click="onRowClick"
        highlight-current-row>
        <el-table-column prop="name" label="点位名称" width="25%" />
        <el-table-column prop="id" label="点位编号" width="30%" />
        <el-table-column label="声音偏差值阈值" width="25%">
          <template #default="{ row }">
            {{ row.matchMesureValue ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="振动阈值" width="20%">
          <template #default="{ row }">
            {{ row.thresholdValue ?? '-' }}
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="pagination-wrapper">
      <span class="pagination-page-meta">共 {{ totalPages }} 页，第 {{ currentPage }} 页</span>
      <el-pagination layout="prev, pager, next" :current-page="currentPage" :page-size="pageSize" :total="total"
        @current-change="onCurrentChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElTable, ElTableColumn, ElPagination } from 'element-plus'
import { ref, computed } from 'vue'
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue'

interface PointInfo {
  id: string
  deviceId?: string
  name: string
  lastAlarmTime: string
  alarmType: string
  alarmValue: string
  matchMesureValue?: string | number
  thresholdValue?: string | number
  hasAlarm: boolean
}

interface PointListModuleProps {
  pointList: PointInfo[]
  selectedPointId?: string
  currentPage: number
  pageSize: number
  total: number
}

const props = defineProps<PointListModuleProps>()

const totalPages = computed(() =>
  Math.max(1, Math.ceil((props.total || 0) / props.pageSize)),
)

const emit = defineEmits<{
  'point-selected': [receiverId: string]
  'page-change': [pageNum: number]
}>()

const pointTableRef = ref<any>(null)

const onRowClick = (row: PointInfo) => {
  emit('point-selected', row.id)
}

const onCurrentChange = (pageNum: number) => {
  emit('page-change', pageNum)
}

const setCurrentRow = (rowIndex: number = 0) => {
  if (pointTableRef.value && props.pointList && props.pointList.length > rowIndex) {
    const selectedRow = props.pointList[rowIndex]
    if (selectedRow) {
      pointTableRef.value.setCurrentRow(selectedRow)

      emit('point-selected', selectedRow.id)
    }
  }
}

defineExpose({
  setCurrentRow,
})
</script>

<style lang="scss" scoped>
.point-list-module {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 50%;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-width: 0;

  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 10px 0 10px;

    .module-title {
      margin: 0;
      color: #fff !important;
    }
  }

  .point-table-container {
    flex: 1;

    overflow: hidden;
    background: none !important;
    min-width: 0;

    padding: 10px 10px 0 10px;
    display: flex;
    align-items: stretch;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    width: 100%;
    overflow: hidden;
    padding: 10px 10px 0 10px;
  }

  .pagination-page-meta {
    color: #fff;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .point-empty-wrapper {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 66px;
  }

  :deep(.el-table__empty-block) {
    height: auto !important;
    min-height: 66px !important;
  }

  :deep(.el-table) {
    background: transparent !important;
    --el-table-border-color: none !important;
    font-size: 0.8rem;

    .el-table__header {
      width: 100% !important;
    }

    .el-table__body {
      width: 100% !important;
    }

    .el-scrollbar {
      width: 100% !important;
    }

    .el-scrollbar__wrap {
      width: 100% !important;
    }

    .el-scrollbar__view {
      width: 100% !important;
    }

    .el-table__body-wrapper {
      background: transparent !important;
    }

    .el-table__header-wrapper {
      background: rgba(150, 150, 150, 0.2) !important;
      border-radius: 6px 6px 0 0 !important;
      overflow: hidden;
    }

    tr {
      background-color: transparent !important;
    }

    tbody tr {
      background-color: transparent !important;

      &:hover:not(.current-row) {
        background-color: rgba(150, 150, 150, 0.1) !important;
      }
    }

    :deep(thead) tr {
      background: transparent !important;

      &:hover {
        background: transparent !important; // 禁用表头悬停效果
      }
    }

    th {
      background: transparent !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      font-weight: 400;
      letter-spacing: 0px;
      color: #4e89ff !important;
      text-align: center;
      vertical-align: top;
    }

    td {
      background: transparent !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      font-weight: 400;
      letter-spacing: 0px;
      color: #fff !important;
      text-align: center;
      vertical-align: top;
    }

    .el-table__body tbody tr {
      background-image: linear-gradient(90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.25) 50%,
          rgba(255, 255, 255, 0) 100%);
      background-repeat: no-repeat;
      background-size: 100% 1px;
      background-position: bottom left;
    }

    .el-table__body tbody tr:last-child {
      background-image: none;
    }

    .el-table__body tr td:last-child {
      overflow: visible !important;
      text-overflow: clip !important;
    }

    .el-table__body tr td:last-child .cell {
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
    }

    .el-table__body tr.current-row>td {
      background-color: rgb(150, 150, 150, 0.2) !important;
    }

    .el-table__header-wrapper {
      border-radius: 6px !important;
      overflow: hidden;
    }

    .el-table__body-wrapper {
      border-radius: 0 0 6px 6px;
      overflow: hidden;
    }

    .el-table__body tr td:first-child {
      border-top-left-radius: 6px;
      border-bottom-left-radius: 6px;
    }

    .el-table__body tr td:last-child {
      border-top-right-radius: 6px;
      border-bottom-right-radius: 6px;
    }

    .el-table__body tr.current-row td:first-child {
      border-top-left-radius: 6px;
      border-bottom-left-radius: 6px;
    }

    .el-table__body tr.current-row td:last-child {
      border-top-right-radius: 6px;
      border-bottom-right-radius: 6px;
    }
  }

  :deep(.el-pagination) {
    font-size: 0.9rem;
    color: #fff;

    .el-pager li {
      background-color: transparent;
      color: white;
      border: 1px solid transparent;

      &.is-active {
        font-size: 1rem;
        color: rgba(153, 240, 255, 0.7);
        background-color: transparent;
        border: 1px solid transparent;
      }

      &:hover {
        background-color: transparent;
      }
    }

    .btn-prev,
    .btn-next {
      background-color: transparent !important;
      color: white !important;

      &:hover {
        color: rgba(153, 240, 255, 0.7) !important;
      }

      &.is-disabled {
        color: #a8abb4 !important;
      }
    }

    .el-pagination__sizes .el-input__inner {
      height: 18px;
      background-color: transparent;
      color: #111 !important;
      font-size: 0.8rem;
    }
  }
}

@media (max-width: 800px) {
  .point-list-module {
    height: auto;
    min-height: 0;

    .point-table-container {
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
    }

    .pagination-wrapper {
      justify-content: space-between;
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
    }

    .pagination-page-meta {
      font-size: var(--mobile-font-size-title);
    }

    :deep(.el-table) {
      min-width: 760px;
      font-size: var(--mobile-font-size-body);
    }

    :deep(.el-table th),
    :deep(.el-table td) {
      font-size: var(--mobile-font-size-body);
    }

    :deep(.el-pagination) {
      font-size: var(--mobile-font-size-title);
    }

    :deep(.el-pagination .el-pager li.is-active) {
      font-size: var(--mobile-font-size-title);
    }
  }
}
</style>
