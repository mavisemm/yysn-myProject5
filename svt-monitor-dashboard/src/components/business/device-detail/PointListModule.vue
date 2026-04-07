<template>
    <div class="point-list-module">
        <div class="module-header">
            <h3 class="module-title app-section-title">点位列表</h3>
        </div>
        <div class="point-table-container">
            <div v-if="!pointList.length" class="point-empty-wrapper">
                <CommonEmptyState text="暂无数据" size="small" />
            </div>
            <el-table v-else ref="pointTableRef" :data="pointList" height="100%" :fit="true"
                :header-cell-style="{ background: 'transparent', color: 'var(--special-font-color)', 'text-align': 'center' }"
                :cell-style="{ background: 'transparent', color: '#fff', 'text-align': 'center' }"
                @row-click="onRowClick" highlight-current-row>
                <el-table-column prop="id" label="点位编号" width="15%" />
                <el-table-column prop="name" label="点位名称" width="20%" />
                <el-table-column prop="lastAlarmTime" label="预警时间" width="20%" />
                <el-table-column prop="alarmType" label="预警类型" width="15%">
                    <template #default="{ row }">
                        <span :class="getAlarmTypeTag(row.alarmType)">
                            {{ row.alarmType }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="alarmValue" label="预警值" width="15%">
                    <template #default="{ row }">
                        {{ row.alarmValue === '无' ? '无' : row.alarmValue + getAlarmValueUnit(row.alarmType) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="18%" align="center">
                    <template #default="{ row }">
                        <el-button :type="row.hasAlarm ? 'danger' : 'primary'" size="small"
                            style="min-width: auto; width: fit-c ontent; padding-left: 10px; padding-right: 10px; white-space: nowrap; overflow: visible;"
                            @click.stop="handleUnprocessedClick(row)">
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
import { ref } from 'vue'
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue'
import { useAlarmBatchStore } from '@/stores/alarmBatch'

interface PointInfo {
    id: string
    deviceId?: string
    name: string
    lastAlarmTime: string
    alarmType: string
    alarmValue: string
    hasAlarm: boolean
}

interface PointListModuleProps {
    pointList: PointInfo[]
    selectedPointId?: string
}

const props = defineProps<PointListModuleProps>()

const emit = defineEmits<{
    'point-selected': [receiverId: string]
}>()

const getAlarmTypeTag = (type: string) => {
    switch (type) {
        case '温度': return 'danger'
        case '振动': return 'warning'
        case '声音': return 'primary'
        default: return 'info'
    }
}

const getAlarmValueUnit = (type: string) => {
    switch (type) {
        case '振动': return ''
        case '温度': return ''
        case '声音': return ''
        default: return ''
    }
}

const pointTableRef = ref<any>(null)
const alarmBatchStore = useAlarmBatchStore()

const onRowClick = (row: PointInfo) => {
    emit('point-selected', row.id)
}


const handleUnprocessedClick = (row: PointInfo) => {
    if (!row.hasAlarm) return

    const deviceId = row.deviceId ? String(row.deviceId) : ''
    alarmBatchStore.resetRealtime()
    if (deviceId) alarmBatchStore.realtimeQuery.deviceId = deviceId
    void alarmBatchStore.openRealtime()
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
    setCurrentRow
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
        padding: 10px 20px 0 20px;

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

        padding: 10px 20px 20px 20px;
        display: flex;
        align-items: stretch;
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
            color: #4E89FF !important;
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
}
</style>