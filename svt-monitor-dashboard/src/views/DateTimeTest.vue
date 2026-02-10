<template>
    <div style="padding: 20px;">
        <h2>时间选择器默认时间测试</h2>

        <div style="margin-bottom: 20px;">
            <h3>时间选择器</h3>
            <CommonDateTimePicker v-model="dateRange1" width="320px"
                @update:modelValue="onDateRange1Change" />
            <p>选择的值: {{ dateRange1 }}</p>
            <button @click="setTodayRange1">设置今天范围</button>
            <button @click="setYesterdayRange1">设置昨天范围</button>
        </div>

        <div style="margin-bottom: 20px;">
            <h3>时间选择器 2</h3>
            <CommonDateTimePicker v-model="dateRange2" width="320px"
                @update:modelValue="onDateRange2Change" />
            <p>选择的值: {{ dateRange2 }}</p>
            <button @click="setTodayRange2">设置今天范围</button>
            <button @click="setYesterdayRange2">设置昨天范围</button>
        </div>

        <div style="margin-top: 30px;">
            <h3>工具函数测试</h3>
            <button @click="testUtils">测试时间工具函数</button>
            <div v-if="testResults">
                <pre>{{ testResults }}</pre>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'
import { isToday, formatDateTime } from '@/utils/datetime'

const dateRange1 = ref<[string, string] | null>(null)
const dateRange2 = ref<[string, string] | null>(null)
const testResults = ref<string>('')

const onDateRange1Change = (value: [string, string] | null) => {
    console.log('启用默认时间 - 新值:', value)
}

const onDateRange2Change = (value: [string, string] | null) => {
    console.log('禁用默认时间 - 新值:', value)
}

const testUtils = () => {
    const results = []

    const today = new Date()
    results.push(`今天日期: ${formatDateTime(today)}`)
    results.push(`今天是否为当日: ${isToday(today)}`)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    results.push(`\n昨天日期: ${formatDateTime(yesterday)}`)
    results.push(`昨天是否为当日: ${isToday(yesterday)}`)

    testResults.value = results.join('\n')
}

// 测试方法
const setTodayRange1 = () => {
    const today = new Date()
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    dateRange1.value = [formatDateTime(start), formatDateTime(today)]
}

const setYesterdayRange1 = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const start = new Date(yesterday)
    start.setHours(0, 0, 0, 0)
    const end = new Date(yesterday)
    end.setHours(23, 59, 59, 999)
    dateRange1.value = [formatDateTime(start), formatDateTime(end)]
}

const setTodayRange2 = () => {
    const today = new Date()
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    dateRange2.value = [
        formatDateTime(start),
        formatDateTime(today)
    ]
}

const setYesterdayRange2 = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const start = new Date(yesterday)
    start.setHours(0, 0, 0, 0)
    const end = new Date(yesterday)
    end.setHours(23, 59, 59, 999)
    dateRange2.value = [
        formatDateTime(start),
        formatDateTime(end)
    ]
}
</script>