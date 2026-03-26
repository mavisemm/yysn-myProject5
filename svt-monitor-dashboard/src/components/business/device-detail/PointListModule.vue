<template>
    <div class="point-list-module">
        <div class="module-header">
            <h3 class="module-title app-section-title">点位列表</h3>
        </div>
        <div class="point-table-container">
            <!-- 无数据时直接用统一空态，不走 el-table 自带 empty 逻辑，避免高度难以控制 -->
            <div v-if="!pointList.length" class="point-empty-wrapper">
                <CommonEmptyState text="暂无数据" size="small" />
            </div>
            <el-table
                v-else
                ref="pointTableRef"
                :data="pointList"
                height="100%"
                :fit="true"
                :header-cell-style="{ background: 'transparent', color: 'var(--special-font-color)', 'text-align': 'center' }"
                :cell-style="{ background: 'transparent', color: '#fff', 'text-align': 'center' }"
                @row-click="onRowClick"
                highlight-current-row
            >
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
                        <el-button
                            :type="row.hasAlarm ? 'danger' : 'primary'"
                            size="small"
                            style="min-width: auto; width: fit-content; padding-left: 10px; padding-right: 10px; white-space: nowrap; overflow: visible;"
                            @click.stop="handleUnprocessedClick(row)"
                        >
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
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue'

interface PointInfo {
    id: string
    /** 点位级 deviceId（用于振动接口入参） */
    deviceId?: string
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
    'point-selected': [receiverId: string]
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

    // SoundPoint/VibrationPoint 页面地址使用 equipmentId（当前 DeviceDetail 的 query）
    const equipmentIdFromQuery = route.query.equipmentId
    const equipmentIdFromQueryResolved = Array.isArray(equipmentIdFromQuery)
        ? equipmentIdFromQuery[0]
        : equipmentIdFromQuery

    const equipmentIdFromLegacy = route.params.id
    const equipmentIdFromLegacyResolved = Array.isArray(equipmentIdFromLegacy)
        ? equipmentIdFromLegacy[0]
        : equipmentIdFromLegacy

    const equipmentId = (equipmentIdFromQueryResolved as string | undefined) || (equipmentIdFromLegacyResolved as string | undefined) || ''

    switch (row.alarmType) {
        case '声音':
            // 跳转到声音点位页，同时传递设备ID
            router.push({
                name: 'SoundPoint',
                query: {
                    // query key 插入顺序：equipmentId -> receiverId
                    equipmentId,
                },
                params: { receiverId: row.id }
            })
            break
        case '振动':
            // 跳转到振动点位页，同时传递设备ID
            router.push({
                name: 'VibrationPoint',
                query: {
                    // query key 插入顺序：equipmentId -> receiverId
                    equipmentId,
                },
                params: { receiverId: row.id }
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
        /* 占据剩余空间 */
        overflow: hidden;
        background: none !important;
        min-width: 0;
        /* 允许flex子项收缩 */
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

    /* 统一空状态高度，让 CommonEmptyState 在表格里和设备树接近 */
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

        // 表体每行之间的渐变分隔线（整行）
        .el-table__body tbody tr {
            background-image: linear-gradient(
                90deg,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.25) 50%,
                rgba(255, 255, 255, 0) 100%
            );
            background-repeat: no-repeat;
            background-size: 100% 1px;
            background-position: bottom left;
        }

        // 最后一行不显示分隔线
        .el-table__body tbody tr:last-child {
            background-image: none;
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