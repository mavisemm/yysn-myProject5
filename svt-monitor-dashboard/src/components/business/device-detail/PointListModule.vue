<template>
    <div class="point-list-module">
        <div class="module-header">
            <h3 class="module-title">点位列表</h3>
        </div>
        <div class="point-table-container">
            <el-table ref="pointTableRef" :data="pointList" height="100%" style="width: 100%"
                :header-cell-style="{ background: 'transparent', color: 'white' }"
                :cell-style="{ background: 'transparent', color: 'white' }" @row-click="onRowClick"
                highlight-current-row>
                <el-table-column prop="id" label="点位" width="80" />
                <el-table-column prop="name" label="点位名称" />
                <el-table-column prop="lastAlarmTime" label="预警时间" width="150" />
                <el-table-column prop="alarmType" label="预警类型" width="100">
                    <template #default="{ row }">
                        <span :class="getAlarmTypeTag(row.alarmType)">
                            {{ row.alarmType }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="alarmValue" label="预警值" width="120" />
                <el-table-column label="操作" width="100">
                    <template #default="{ row }">
                        <el-button :type="row.hasAlarm ? 'danger' : 'primary'" size="small" :disabled="true">
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
    display: flex;
    flex-direction: column;
    height: 40%;
    background: url('@/assets/images/background/设备详情页-点位列表背景.png') no-repeat center center;
    background-size: 100% 100%;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    .module-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;

        .module-title {
            margin: 0;
            font-size: clamp(22px, 3vw, 26px);
            font-weight: 600;
        }
    }

    .point-table-container {
        flex: 1;
        /* 占据剩余空间 */
        overflow: hidden;
        background: none !important;
    }

    :deep(.el-table) {
        background: transparent !important;
        --el-table-border-color: none !important;

        .el-table__body-wrapper {
            background: transparent !important;
        }

        .el-table__header-wrapper {
            background: rgba(255, 255, 255, 0.3) !important;
            background-size: 100% 100% !important;
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
        }

        td {
            background: transparent !important;
            color: white !important;
        }

        .el-table__body tr.current-row>td {
            background-color: rgb(103, 157, 215) !important;
        }
    }
}
</style>