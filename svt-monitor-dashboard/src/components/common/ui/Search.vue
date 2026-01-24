<template>
    <div class="common-search">
        <el-form :model="searchModel" :inline="true" class="search-form">
            <el-row :gutter="10" class="search-row">
                <el-col v-for="field in visibleFields" :key="field.key" :span="field.span || 6" class="search-item">
                    <el-form-item :label="field.label">
                        <template v-if="field.type === 'input'">
                            <el-input v-model="searchModel[field.key]"
                                :placeholder="field.placeholder || `请输入${field.label}`"
                                :clearable="field.clearable !== false" @keyup.enter="handleSearch" />
                        </template>

                        <template v-else-if="field.type === 'select'">
                            <el-select v-model="searchModel[field.key]"
                                :placeholder="field.placeholder || `请选择${field.label}`"
                                :clearable="field.clearable !== false" :multiple="field.multiple"
                                :filterable="field.filterable">
                                <el-option v-for="option in field.options || []" :key="option.value"
                                    :label="option.label" :value="option.value" />
                            </el-select>
                        </template>

                        <template v-else-if="field.type === 'date'">
                            <el-date-picker v-model="searchModel[field.key]" :type="field.dateType || 'date'"
                                :placeholder="field.placeholder || `请选择${field.label}`"
                                :format="field.format || 'YYYY-MM-DD'" :value-format="field.valueFormat || 'YYYY-MM-DD'"
                                :clearable="field.clearable !== false" />
                        </template>

                        <template v-else-if="field.type === 'daterange'">
                            <el-date-picker v-model="searchModel[field.key]" type="daterange"
                                :range-separator="field.rangeSeparator || '至'"
                                :start-placeholder="field.startPlaceholder || '开始日期'"
                                :end-placeholder="field.endPlaceholder || '结束日期'" :format="field.format || 'YYYY-MM-DD'"
                                :value-format="field.valueFormat || 'YYYY-MM-DD'"
                                :clearable="field.clearable !== false" />
                        </template>

                        <template v-else>
                            <el-input v-model="searchModel[field.key]"
                                :placeholder="field.placeholder || `请输入${field.label}`"
                                :clearable="field.clearable !== false" @keyup.enter="handleSearch" />
                        </template>
                    </el-form-item>
                </el-col>

                <!-- 操作按钮 -->
                <el-col :span="6" class="search-actions">
                    <el-form-item>
                        <el-button type="primary" @click="handleSearch">搜索</el-button>
                        <el-button @click="handleReset">重置</el-button>

                        <el-button v-if="showAdvancedBtn" link type="primary" @click="toggleAdvanced">
                            {{ advancedVisible ? '收起' : '展开' }}
                            <el-icon>
                                <ArrowDown v-if="!advancedVisible" />
                                <ArrowUp v-else />
                            </el-icon>
                        </el-button>
                    </el-form-item>
                </el-col>
            </el-row>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'

// 定义字段类型
interface OptionItem {
    label: string
    value: any
}

interface SearchField {
    key: string
    label: string
    type?: 'input' | 'select' | 'date' | 'daterange'
    placeholder?: string
    span?: number
    clearable?: boolean
    // Select 特有属性
    multiple?: boolean
    filterable?: boolean
    options?: OptionItem[]
    // Date 特有属性
    dateType?: 'year' | 'month' | 'date' | 'dates' | 'week' | 'datetime' | 'datetimerange' | 'daterange' | 'monthrange'
    format?: string
    valueFormat?: string
    // DateRange 特有属性
    rangeSeparator?: string
    startPlaceholder?: string
    endPlaceholder?: string
}

interface Props {
    fields: SearchField[]
    modelValue: Record<string, any>
    showAdvanced?: boolean
    defaultExpandNum?: number
}

const props = withDefaults(defineProps<Props>(), {
    showAdvanced: false,
    defaultExpandNum: 3
})

const emit = defineEmits<{
    'update:modelValue': [value: Record<string, any>]
    'search': [value: Record<string, any>]
    'reset': []
}>()

const advancedVisible = ref(false)
const searchModel = ref<Record<string, any>>({ ...props.modelValue })

// 计算可见字段
const visibleFields = computed(() => {
    if (!props.showAdvanced || advancedVisible.value) {
        return props.fields
    }
    return props.fields.slice(0, props.defaultExpandNum)
})

// 是否显示展开/收起按钮
const showAdvancedBtn = computed(() => {
    return props.showAdvanced && props.fields.length > props.defaultExpandNum
})

// 监听外部值的变化
watch(() => props.modelValue, (newVal) => {
    searchModel.value = { ...newVal }
}, { deep: true })

// 监听内部值的变化并同步到外部
watch(searchModel, (newVal) => {
    emit('update:modelValue', { ...newVal })
}, { deep: true })

const handleSearch = () => {
    emit('search', { ...searchModel.value })
}

const handleReset = () => {
    // 重置为初始值
    const resetValues: Record<string, any> = {}
    props.fields.forEach(field => {
        resetValues[field.key] = undefined
    })
    searchModel.value = resetValues
    emit('reset')
    emit('search', { ...resetValues })
}

const toggleAdvanced = () => {
    advancedVisible.value = !advancedVisible.value
}
</script>

<style scoped>
.common-search {
    background: #fafafa;
    padding: 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    border: 1px solid #ebeef5;
}

.search-form {
    :deep(.el-form-item) {
        margin-bottom: 12px;
    }
}

.search-row {
    width: 100%;
}

.search-item {
    min-width: 240px;
}

.search-actions {
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    min-height: 56px;
}
</style>