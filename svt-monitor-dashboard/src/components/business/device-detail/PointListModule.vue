<template>
    <div class="point-list-module">
        <div class="module-header">
            <h3 class="module-title">点位列表</h3>
        </div>
        <div class="point-table-container">
            <el-table ref="pointTableRef" :data="pointList" height="100%" :fit="true"
                :header-cell-style="{ background: 'transparent', color: 'white', 'text-align': 'center' }"
                :cell-style="{ background: 'transparent', color: 'white', 'text-align': 'center' }"
                @row-click="onRowClick" highlight-current-row>
                <el-table-column prop="id" label="点位" width="15%" />
                <el-table-column prop="name" label="点位名称" width="20%" />
                <el-table-column prop="lastAlarmTime" label="预警时间" width="20%" />
                <el-table-column prop="alarmType" label="预警类型" width="15%">
                    <template #default="{ row }">
                        <span :class="getAlarmTypeTag(row.alarmType)">
                            {{ row.alarmType }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="alarmValue" label="预警值" width="15%" />
                <el-table-column label="操作" width="18%" align="center">
                    <template #default="{ row }">
                        <el-button :type="row.hasAlarm ? 'danger' : 'primary'" size="small" :disabled="true"
                            style="min-width: auto; width: fit-content; padding-left: 10px; padding-right: 10px; white-space: nowrap; overflow: visible;">
                            {{ row.hasAlarm ? '未处理' : '已处理' }}
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ElTable, ElTableColumn, ElButton } from 'element-plus'
import { onMounted, ref, computed, watch, nextTick } from 'vue'

interface PointInfo {
    id: string
    name: string
    lastAlarmTime: string
    alarmType: string
    alarmValue: string
    hasAlarm: boolean
}

interface PointListModuleProps {
    pointList: PointInfo[]
    selectedPointId?: string // 可选，表示父组件控制选中项
}

const props = defineProps<PointListModuleProps>()

const emit = defineEmits<{
    'point-selected': [pointId: string]
}>()

// 处理外部传入的选中状态
const currentSelectedId = computed(() => {
    return props.selectedPointId
})

const getAlarmTypeTag = (type: string) => {
    switch (type) {
        case '温度': return 'danger'
        case '振动': return 'warning'
        case '声音': return 'primary'
        default: return 'info'
    }
}

const pointTableRef = ref<any>(null)

const onRowClick = (row: PointInfo) => {
    emit('point-selected', row.id)
}

// 设置默认选中第一行
const setCurrentRow = (rowIndex: number = 0) => {
    if (pointTableRef.value && props.pointList && props.pointList.length > rowIndex) {
        const selectedRow = props.pointList[rowIndex]
        if (selectedRow) {
            pointTableRef.value.setCurrentRow(selectedRow)
            // 触发选中事件以更新父组件的状态
            emit('point-selected', selectedRow.id)
        }
    }
}

// 暴露方法给父组件调用
defineExpose({
    setCurrentRow
})


</script>

<style lang="scss" scoped>
.point-list-module {
    width: 100%;
    display: flex;
    flex-direction: column;
    height: 50%;
    background: url('@/assets/images/background/设备详情页-点位列表背景.png') no-repeat center center;
    background-size: 100% 100%;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    min-width: 0;

    .module-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 0 20px;

        .module-title {
            margin: 0;
            font-size: clamp(18px, 2.5vw, 22px);
            /* 更小的字体范围以适应小屏幕 */
            font-weight: 600;
        }
    }

    .point-table-container {
        flex: 1;
        /* 占据剩余空间 */
        overflow: hidden;
        background: none !important;
        min-width: 0;
        /* 允许flex子项收缩 */
        padding: 20px;
        display: flex;
        align-items: stretch;
    }

    :deep(.el-table) {
        background: transparent !important;
        --el-table-border-color: none !important;

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
            background: rgba(255, 255, 255, 0.3) !important;
        }

        tr {
            background: transparent !important;
        }

        tbody tr {
            background: transparent !important;

            &:hover {
                background: rgba(255, 255, 255, 0.2) !important;
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
            color: white !important;
            font-size: clamp(10px, 1.5vw, 12px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        td {
            background: transparent !important;
            color: white !important;
            font-size: clamp(10px, 1.5vw, 12px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* 为操作列取消ellipsis效果 */
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
            background-color: rgb(103, 157, 215) !important;
        }
    }
}
</style>