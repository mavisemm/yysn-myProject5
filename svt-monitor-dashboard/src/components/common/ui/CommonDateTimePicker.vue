<template>
    <el-date-picker v-model="localDateRange" type="datetimerange" range-separator="-" start-placeholder="开始日期"
        end-placeholder="结束日期" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" size="small"
        :style="{ width: width }" class="common-datetime-picker" popper-class="custom-datepicker-popper"
        :disabled-date="disabledFutureDate" :locale="zhCn" :teleported="true" :unlink-panels="true"
        @change="handleChange" @visible-change="handleVisibleChange" />
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElDatePicker } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { disabledFutureDate, formatDateTime, isToday, initializeDateRange } from '@/utils/datetime'


const props = withDefaults(defineProps<{
    modelValue: [string, string] | null
    width?: string
    enableDefaultTime?: boolean  
}>(), {
    width: '320px',
    enableDefaultTime: true  
})


const emit = defineEmits<{
    (e: 'update:modelValue', value: [string, string] | null): void
}>()


const localDateRange = ref<[string, string] | null>(props.modelValue)

const lastUpdateFromUser = ref(false)

const isTimeAllZero = (d: Date) =>
    d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0


const handleChange = (val: [Date, Date] | null) => {
    if (!val || val.length !== 2 || !val[0] || !val[1]) {
        localDateRange.value = null
        lastUpdateFromUser.value = true
        emit('update:modelValue', null)
        return
    }

    const [startDate, endDate] = val

    
    
    const shouldApplyDefaultTime = props.enableDefaultTime && isTimeAllZero(startDate) && isTimeAllZero(endDate)
    const processedDates: [Date, Date] = shouldApplyDefaultTime
        ? applyDefaultTimeLogic(startDate, endDate)
        : [startDate, endDate]
    const result: [string, string] = [
        formatDateTime(processedDates[0]),
        formatDateTime(processedDates[1])
    ]

    localDateRange.value = result
    lastUpdateFromUser.value = true
    emit('update:modelValue', result)
}


const applyDefaultTimeLogic = (startDate: Date, endDate: Date): [Date, Date] => {
    if (!props.enableDefaultTime) {
        return [startDate, endDate]
    }
    return initializeDateRange(startDate, endDate)
}


watch(
    () => props.modelValue,
    (newVal) => {
        
        if (lastUpdateFromUser.value) {
            lastUpdateFromUser.value = false
            localDateRange.value = newVal
            return
        }
        
        if (props.enableDefaultTime && newVal && newVal.length === 2) {
            const [startStr, endStr] = newVal
            if (startStr && endStr) {
                const startDate = new Date(startStr)
                const endDate = new Date(endStr)

                
                const endDateTime = new Date(endStr)
                if (endDateTime.getHours() === 0 && endDateTime.getMinutes() === 0 && endDateTime.getSeconds() === 0) {
                    const processedDates = applyDefaultTimeLogic(startDate, endDate)
                    localDateRange.value = [
                        formatDateTime(processedDates[0]),
                        formatDateTime(processedDates[1])
                    ]
                    return
                }
            }
        }
        localDateRange.value = newVal
    },
    { immediate: true }
)


watch(
    localDateRange,
    (newVal) => {
        if (newVal !== props.modelValue) {
            emit('update:modelValue', newVal)
        }
    }
)


const handleVisibleChange = (visible: boolean) => {
    if (visible) {
        nextTick(() => {
            adjustTimePanelPosition()
        })
    }
}


const adjustTimePanelPosition = () => {
    
    const timePanels = document.querySelectorAll('.custom-datepicker-popper .el-time-panel')

    timePanels.forEach((panel, index) => {
        const panelElement = panel as HTMLElement
        if (panelElement) {
            
            const rect = panelElement.getBoundingClientRect()
            const viewportWidth = window.innerWidth

            
            if (index === 1) {
                
                panelElement.style.left = 'auto'
                panelElement.style.right = '0'
                panelElement.style.transform = 'translateX(-30px)'
            }

            
            if (rect.right > viewportWidth) {
                const overflow = rect.right - viewportWidth
                if (index === 1) {
                    
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