<template>
    <div class="api-usage-example">
        <h2>API 使用示例</h2>
        <div class="controls">
            <el-button @click="fetchDeviceList" type="primary">获取设备列表</el-button>
            <el-button @click="refreshData">刷新数据</el-button>
        </div>
        <div class="content">
            <el-table :data="deviceList" style="width: 100%" v-loading="loading">
                <el-table-column prop="id" label="ID" width="180" />
                <el-table-column prop="name" label="设备名称" width="180" />
                <el-table-column prop="type" label="类型" width="120" />
                <el-table-column prop="status" label="状态">
                    <template #default="{ row }">
                        <el-tag :type="getStatusTagType(row.status)">
                            {{ getStatusText(row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="workshopName" label="车间" width="120" />
                <el-table-column prop="pointCount" label="点位数" width="100" />
                <el-table-column prop="lastUpdateTime" label="更新时间" width="180" />
            </el-table>
            <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange" @current-change="handleCurrentChange"
                style="margin-top: 20px; justify-content: center;" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { deviceApi } from '@/api'
import type { Device, DeviceListData } from '@/api/modules/device'

// 响应式数据
const deviceList = ref<Device[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 获取设备列表
const fetchDeviceList = async () => {
    loading.value = true
    try {
        const response = await deviceApi.getDeviceList({
            page: currentPage.value,
            pageSize: pageSize.value
        })

        if (response.code === 200) {
            const data = response.data as DeviceListData
            deviceList.value = data.list
            total.value = data.total
        }
    } catch (error) {
        console.error('获取设备列表失败:', error)
    } finally {
        loading.value = false
    }
}

// 刷新数据
const refreshData = () => {
    fetchDeviceList()
}

// 分页大小变化
const handleSizeChange = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
    fetchDeviceList()
}

// 页码变化
const handleCurrentChange = (page: number) => {
    currentPage.value = page
    fetchDeviceList()
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
    switch (status) {
        case 'normal': return 'success'
        case 'warning': return 'warning'
        case 'alarm': return 'danger'
        default: return 'info'
    }
}

// 获取状态文本
const getStatusText = (status: string) => {
    switch (status) {
        case 'normal': return '正常'
        case 'warning': return '警告'
        case 'alarm': return '报警'
        default: return '未知'
    }
}

// 组件挂载时获取数据
onMounted(() => {
    fetchDeviceList()
})
</script>

<style scoped>
.api-usage-example {
    padding: 20px;
}

.controls {
    margin-bottom: 20px;
}

.content {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
}
</style>