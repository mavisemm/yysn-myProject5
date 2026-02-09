<template>
    <div class="table-section-left">
        <div class="section-title app-section-title">声音数据分析</div>
        <div class="voiceDetail-table-container">
            <el-table :data="deviationList" height="100%" @row-click="handleRowClick"
                :header-cell-style="{ background: 'rgba(255, 255, 255, 0.3)', color: 'white', textAlign: 'center' }"
                :cell-style="{ background: 'transparent', color: 'white', textAlign: 'center' }">
                <!-- 自定义勾选列 -->
                <el-table-column width="10%" align="center">
                    <template #header>
                        <el-checkbox :model-value="isAllSelected" :indeterminate="isIndeterminate"
                            @change="handleSelectAll" />
                    </template>
                    <template #default="{ row, $index }">
                        <el-checkbox v-model="row.visible" @change="toggleVisible" @click.stop />
                    </template>
                </el-table-column>

                <el-table-column label="上传时间" width="25%" align="center">
                    <template #default="{ row }">
                        {{ row.time }}
                    </template>
                </el-table-column>

                <el-table-column prop="deviationValue" label="偏差值" width="15%" align="center" />

                <el-table-column label="操作栏" width="40%" align="center">
                    <template #default="{ row }">
                        <div class="operate-btns" @click.stop>
                            <el-button link type="primary" @click.stop="viewDetails(row)">查看曲线</el-button>
                            <el-button link type="primary" @click.stop="downloadFile(row.id)">下载文件</el-button>
                            <el-button link type="primary" @click.stop="playAudio(row)">播放</el-button>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="色块" width="10%" align="center">
                    <template #default="{ row }">
                        <div v-if="row.color"
                            :style="{ width: '12px', height: '12px', background: row.color, margin: '0 auto' }">
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>
        <div class="hint-text">提示：偏差值为与上一次的偏差值作比较</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElTable, ElTableColumn, ElButton, ElMessage, ElCheckbox } from 'element-plus';

const emit = defineEmits(['select-change', 'view-details', 'download-file', 'play-audio', 'row-click']);
const props = defineProps<{
    deviationList: any[];
}>();

const isAllSelected = computed(() => {
    return props.deviationList.length > 0 && props.deviationList.every(item => item.visible);
});

const isIndeterminate = computed(() => {
    const selectedCount = props.deviationList.filter(item => item.visible).length;
    return selectedCount > 0 && selectedCount < props.deviationList.length;
});

const handleSelectAll = () => {
    const allSelected = isAllSelected.value;
    if (allSelected) {
        props.deviationList.forEach((item, index) => {
            item.visible = index === 0;
        });
        ElMessage.info('已为您保留最新的一条数据');
    } else {
        props.deviationList.forEach(item => {
            item.visible = true;
        });
    }
    emit('select-change');
};

const toggleVisible = () => {
    const selectedCount = props.deviationList.filter(item => item.visible).length;

    if (selectedCount === 0) {
        ElMessage.error('至少选择一条数据，已为您选择最新的一条');
        const firstItem = props.deviationList[0];
        if (firstItem) firstItem.visible = true;
    }
    emit('select-change');
};

const handleRowClick = (row: any) => {
    row.visible = !row.visible;
    emit('row-click', row);
    toggleVisible();
};

const viewDetails = (row: any) => {
    emit('view-details', row);
};

const downloadFile = (id: string) => {
    emit('download-file', id);
};

const playAudio = (row: any) => {
    emit('play-audio', row);
};
</script>

<style lang="scss" scoped>
.table-section-left {
    background: url('@/assets/images/background/设备详情页-点位列表背景.png') no-repeat center center;
    background-size: 100% 100%;
    flex: 2;
    border-radius: 8px;
    display: flex;
    flex-direction: column;

    .section-title {
        font-size: clamp(18px, 2.5vw, 24px);
        padding: 20px 20px 0 20px;
    }

    .voiceDetail-table-container {
        flex: 1;
        overflow: hidden;
        padding: 20px 20px 0 20px;
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
                background: rgba(150, 150, 150, 0.2) !important;
            }
        }

        :deep(thead) tr {
            background: transparent !important;

            &:hover {
                background: transparent !important;
            }
        }

        th {
            background: transparent !important;
            color: white !important;
            font-size: clamp(12px, 1.8vw, 14px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        td {
            background: transparent !important;
            color: white !important;
            font-size: clamp(12px, 1.8vw, 14px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }

    .hint-text {
        color: #f56c6c;
        text-align: center;
        font-size: clamp(12px, 1.5vw, 14px);
        padding: 20px;
    }

    .operate-btns {
        display: flex;
        justify-content: center;
        gap: 5px;
    }
}
</style>