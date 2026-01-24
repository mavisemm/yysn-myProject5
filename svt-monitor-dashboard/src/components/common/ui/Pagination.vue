<template>
    <div class="common-pagination">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="pageSizes"
            :layout="layout" :total="total" :small="small" :background="background" @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
    currentPage?: number
    pageSize?: number
    total: number
    pageSizes?: number[]
    layout?: string
    small?: boolean
    background?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    currentPage: 1,
    pageSize: 10,
    pageSizes: () => [10, 20, 30, 40, 50],
    layout: 'total, sizes, prev, pager, next, jumper',
    small: false,
    background: true
})

const emit = defineEmits<{
    'update:currentPage': [page: number]
    'update:pageSize': [size: number]
    'change': [page: number, size: number]
}>()

const currentPage = ref(props.currentPage)
const pageSize = ref(props.pageSize)

// 监听外部传入的页码变化
watch(() => props.currentPage, (newVal) => {
    currentPage.value = newVal
})

// 监听外部传入的页大小变化
watch(() => props.pageSize, (newVal) => {
    pageSize.value = newVal
})

const handleSizeChange = (size: number) => {
    pageSize.value = size
    emit('update:pageSize', size)
    emit('change', currentPage.value, size)
}

const handleCurrentChange = (page: number) => {
    currentPage.value = page
    emit('update:currentPage', page)
    emit('change', page, pageSize.value)
}
</script>

<style scoped>
.common-pagination {
    display: flex;
    justify-content: center;
    padding: 20px 0;
}
</style>