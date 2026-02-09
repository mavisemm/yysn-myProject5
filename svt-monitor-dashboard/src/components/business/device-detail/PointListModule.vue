<template>
    <div class="point-list-module">
        <div class="module-header">
            <h3 class="module-title app-section-title">点位列表</h3>
        </div>
        <div class="point-table-container">
            <el-table ref="pointTableRef" :data="pointList" height="100%" :fit="true"
                :header-cell-style="{ background: 'transparent', color: 'var(--special-font-color)', 'text-align': 'center' }"
                :cell-style="{ background: 'transparent', color: 'var(--special-font-color)', 'text-align': 'center' }"
                @row-click="onRowClick" highlight-current-row>
                <template #empty>
                    <div class="empty-text">暂无数据</div>
                </template>
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
                <el-table-column prop="alarmValue" label="预警值" width="15%">
                    <template #default="{ row }">
                        {{ row.alarmValue === '无' ? '无' : row.alarmValue + getAlarmValueUnit(row.alarmType) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="18%" align="center">
                    <template #default="{ row }">
                        <el-button :type="row.hasAlarm ? 'danger' : 'primary'" size="small"
                            style="min-width: auto; width: fit-content; padding-left: 10px; padding-right: 10px; white-space: nowrap; overflow: visible;"
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
import { onMounted, ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'

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

/** 根据预警类型返回单位：振动 m/s²，温度 ℃，声音 dB */
const getAlarmValueUnit = (type: string) => {
    switch (type) {
        case '振动': return ' m/s²'
        case '温度': return ' ℃'
        case '声音': return ' dB'
        default: return ''
    }
}

const pointTableRef = ref<any>(null)
const router = useRouter()
const route = useRoute()

const onRowClick = (row: PointInfo) => {
    emit('point-selected', row.id)
}

// 处理未处理按钮点击事件
const handleUnprocessedClick = (row: PointInfo) => {
    if (!row.hasAlarm) return // 如果是已处理状态，不执行跳转

    // 获取当前设备ID用于返回时识别
    const currentDeviceId = route.params.id as string || ''

    switch (row.alarmType) {
        case '声音':
            // 跳转到声音点位页，同时传递设备ID
            router.push({
                name: 'SoundPoint',
                query: {
                    pointId: row.id,
                    deviceId: currentDeviceId
                }
            })
            break
        case '振动':
            // 跳转到振动点位页，同时传递设备ID
            router.push({
                name: 'VibrationPoint',
                query: {
                    pointId: row.id,
                    deviceId: currentDeviceId
                }
            })
            break
        case '温度':
        default:
            // 温度类型保持在当前页面，只选中该行
            emit('point-selected', row.id)
            break
    }
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

    .empty-text {
        color: rgba(255, 255, 255, 0.6);
        padding: 20px;
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
            background: rgba(150, 150, 150, 0.2) !important;
            border-radius: 6px 6px 0 0 !important;
            overflow: hidden;
        }

        tr {
            background: transparent !important;
        }

        tbody tr {
            background: transparent !important;

            &:hover:not(.current-row) {
                background: rgba(150, 150, 150, 0.1) !important;
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
            font-size: clamp(10px, 1.5vw, 12px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;


            font-weight: 400;
            letter-spacing: 0px;
            color: rgba(153, 240, 255, 0.7) !important;
            text-align: center;
            vertical-align: top;

        }

        td {
            background: transparent !important;
            font-size: clamp(10px, 1.5vw, 12px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;


            font-weight: 400;
            letter-spacing: 0px;
            color: rgba(153, 240, 255, 0.7) !important;
            text-align: center;
            vertical-align: top;

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
            background-color: rgb(150, 150, 150, 0.2) !important;
        }

        // 表头圆角效果
        .el-table__header-wrapper {
            border-radius: 6px !important;
            overflow: hidden;
        }

        // 表体圆角效果
        .el-table__body-wrapper {
            border-radius: 0 0 6px 6px;
            overflow: hidden;
        }

        // 整行圆角效果
        .el-table__body tr td:first-child {
            border-top-left-radius: 6px;
            border-bottom-left-radius: 6px;
        }

        .el-table__body tr td:last-child {
            border-top-right-radius: 6px;
            border-bottom-right-radius: 6px;
        }

        // 选中行的圆角效果
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