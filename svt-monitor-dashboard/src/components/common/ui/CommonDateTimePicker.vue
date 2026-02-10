<template>
    <el-date-picker v-model="localDateRange" type="datetimerange" range-separator="-" start-placeholder="开始日期"
        end-placeholder="结束日期" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" size="small"
        :style="{ width: width }" class="common-datetime-picker" popper-class="custom-datepicker-popper"
        :disabled-date="disabledFutureDate" :locale="zhCn" :teleported="true"
        :unlink-panels="true" @change="handleChange" @visible-change="handleVisibleChange" />
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElDatePicker } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { disabledFutureDate, formatDateTime } from '@/utils/datetime'

// 定义组件属性
const props = withDefaults(defineProps<{
    modelValue: [string, string] | null
    width?: string
}>(), {
    width: '320px'
})

// 定义事件
const emit = defineEmits<{
    (e: 'update:modelValue', value: [string, string] | null): void
}>()

// 本地响应式数据
const localDateRange = ref<[string, string] | null>(props.modelValue)

// 处理值变化
const handleChange = (val: [Date, Date] | null) => {
    if (!val || val.length !== 2 || !val[0] || !val[1]) {
        localDateRange.value = null
        emit('update:modelValue', null)
        return
    }

    const [startDate, endDate] = val
    const result: [string, string] = [formatDateTime(startDate), formatDateTime(endDate)]

    localDateRange.value = result
    emit('update:modelValue', result)
}

// 监听外部值变化
watch(
    () => props.modelValue,
    (newVal) => {
        localDateRange.value = newVal
    },
    { immediate: true }
)

// 监听内部值变化并同步到外部
watch(
    localDateRange,
    (newVal) => {
        if (newVal !== props.modelValue) {
            emit('update:modelValue', newVal)
        }
    }
)

// 监听日期选择器面板打开事件，调整时间面板位置
const handleVisibleChange = (visible: boolean) => {
    if (visible) {
        nextTick(() => {
            adjustTimePanelPosition()
        })
    }
}

// 调整时间面板位置的函数
const adjustTimePanelPosition = () => {
    // 查找时间面板元素
    const timePanels = document.querySelectorAll('.custom-datepicker-popper .el-time-panel')

    timePanels.forEach((panel, index) => {
        const panelElement = panel as HTMLElement
        if (panelElement) {
            // 获取面板位置信息
            const rect = panelElement.getBoundingClientRect()
            const viewportWidth = window.innerWidth

            // 如果是结束时间面板（第二个面板）
            if (index === 1) {
                // 强制向左移动，确保完全可见
                panelElement.style.left = 'auto'
                panelElement.style.right = '0'
                panelElement.style.transform = 'translateX(-30px)'
            }

            // 如果面板右侧超出视窗，调整位置
            if (rect.right > viewportWidth) {
                const overflow = rect.right - viewportWidth
                if (index === 1) {
                    // 结束时间面板需要更大的左移
                    panelElement.style.transform = `translateX(-${30 + overflow + 15}px)`
                } else {
                    panelElement.style.left = `calc(100% - ${overflow + 10}px)`
                }
            }
        }
    })
}
</script>

<style lang="scss" scoped>
.common-datetime-picker {
    :deep(.el-input__wrapper) {
        background-size: 100% 100%;
        border-radius: 4px;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        border: none;

        .el-input__inner {
            color: white;
            background: transparent;
        }

        .el-input__prefix {
            color: white;
        }
    }
}
</style>