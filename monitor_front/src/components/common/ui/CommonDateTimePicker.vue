<template>
  <el-date-picker
    v-model="localDateRange"
    type="datetimerange"
    range-separator="-"
    start-placeholder="开始日期"
    end-placeholder="结束日期"
    format="YYYY-MM-DD HH:mm:ss"
    value-format="YYYY-MM-DD HH:mm:ss"
    size="small"
    :style="{ width: width }"
    class="common-datetime-picker"
    :popper-class="popperClassComputed"
    :disabled-date="disabledFutureDate"
    :locale="zhCn"
    :teleported="teleported"
    :unlink-panels="true"
    :shortcuts="dateShortcuts"
    @change="handleChange"
    @visible-change="handleVisibleChange"
  />
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { ElDatePicker } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import {
  disabledFutureDate,
  formatDateTime,
  isToday,
  initializeDateRange,
  getDateRangeByPreset,
  type DateRangePresetKey,
} from '@/utils/datetime'

const props = withDefaults(
  defineProps<{
    modelValue: [string, string] | null
    width?: string
    enableDefaultTime?: boolean
    /** 是否展示「今天 / 昨天 / 最近三天…」快捷项 */
    enablePresets?: boolean
    /** 为 false 时面板挂在组件内，适合放在 Popover 等浮层里，避免点击面板被判定为外部点击 */
    teleported?: boolean
  }>(),
  {
    width: '320px',
    enableDefaultTime: true,
    enablePresets: false,
    teleported: true,
  },
)

const presetEntries: { text: string; key: DateRangePresetKey }[] = [
  { text: '今天', key: 'today' },
  { text: '昨天', key: 'yesterday' },
  { text: '近三天', key: 'last3' },
  { text: '近七天', key: 'last7' },
  { text: '近一个月', key: 'lastMonth' },
]

const dateShortcuts = computed(() => {
  if (!props.enablePresets) return []
  return presetEntries.map(({ text, key }) => ({
    text,
    value: () => {
      const [startStr, endStr] = getDateRangeByPreset(key)
      return [new Date(startStr), new Date(endStr)] as [Date, Date]
    },
  }))
})

const PRESETS_FOOTER_POPPER_CLASS = 'custom-datepicker-popper--presets-footer'

const popperClassComputed = computed(() => {
  const base = 'custom-datepicker-popper'
  return props.enablePresets ? `${base} ${PRESETS_FOOTER_POPPER_CLASS}` : base
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

  const shouldApplyDefaultTime =
    props.enableDefaultTime && isTimeAllZero(startDate) && isTimeAllZero(endDate)
  const processedDates: [Date, Date] = shouldApplyDefaultTime
    ? applyDefaultTimeLogic(startDate, endDate)
    : [startDate, endDate]
  const result: [string, string] = [
    formatDateTime(processedDates[0]),
    formatDateTime(processedDates[1]),
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
        if (
          endDateTime.getHours() === 0 &&
          endDateTime.getMinutes() === 0 &&
          endDateTime.getSeconds() === 0
        ) {
          const processedDates = applyDefaultTimeLogic(startDate, endDate)
          localDateRange.value = [
            formatDateTime(processedDates[0]),
            formatDateTime(processedDates[1]),
          ]
          return
        }
      }
    }
    localDateRange.value = newVal
  },
  { immediate: true },
)

watch(localDateRange, (newVal) => {
  if (newVal !== props.modelValue) {
    emit('update:modelValue', newVal)
  }
})

/** 将 Element Plus 侧栏快捷项移入 footer，与「清空」「确定」同一行 */
const relocatePresetsToFooter = () => {
  document.querySelectorAll(`.${PRESETS_FOOTER_POPPER_CLASS}`).forEach((popper) => {
    const panel = popper.querySelector('.el-picker-panel') ?? popper
    const footer = panel.querySelector('.el-picker-panel__footer')
    if (!footer) return

    let sidebar = panel.querySelector<HTMLElement>(
      '.el-picker-panel__sidebar.el-picker-panel__sidebar--in-footer',
    )
    if (!sidebar) {
      sidebar = panel.querySelector<HTMLElement>(
        '.el-picker-panel__body-wrapper .el-picker-panel__sidebar',
      )
      if (!sidebar) {
        sidebar = panel.querySelector<HTMLElement>('.el-picker-panel__sidebar')
      }
    }
    if (!sidebar) {
      injectPresetButtonsToFooter(footer)
      return
    }
    if (sidebar.parentElement !== footer) {
      footer.insertBefore(sidebar, footer.firstChild)
    }
    sidebar.classList.add('el-picker-panel__sidebar--in-footer')
    groupFooterActions(footer)
  })
}

/** 将「清空」「确定」收拢到右侧操作区 */
const groupFooterActions = (footer: Element) => {
  if (footer.querySelector('.common-datetime-picker__footer-actions')) return

  const actionNodes: Element[] = []
  Array.from(footer.children).forEach((child) => {
    if (
      child.classList.contains('el-picker-panel__sidebar') ||
      child.classList.contains('el-picker-panel__sidebar--in-footer') ||
      child.classList.contains('common-datetime-picker__presets')
    ) {
      return
    }
    if (
      child.classList.contains('el-picker-panel__link-btn') ||
      child.classList.contains('el-button') ||
      child.tagName === 'BUTTON'
    ) {
      actionNodes.push(child)
    }
  })

  if (!actionNodes.length) return

  const actionsWrap = document.createElement('div')
  actionsWrap.className = 'common-datetime-picker__footer-actions'
  actionNodes.forEach((node) => actionsWrap.appendChild(node))
  footer.appendChild(actionsWrap)
}

const injectPresetButtonsToFooter = (footer: Element) => {
  if (footer.querySelector('.common-datetime-picker__presets')) return

  const wrap = document.createElement('div')
  wrap.className =
    'common-datetime-picker__presets el-picker-panel__sidebar el-picker-panel__sidebar--in-footer'

  presetEntries.forEach(({ text, key }) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'el-picker-panel__shortcut'
    btn.textContent = text
    btn.addEventListener('click', () => {
      const [startStr, endStr] = getDateRangeByPreset(key)
      const range: [string, string] = [startStr, endStr]
      localDateRange.value = range
      lastUpdateFromUser.value = true
      emit('update:modelValue', range)
    })
    wrap.appendChild(btn)
  })

  footer.insertBefore(wrap, footer.firstChild)
  groupFooterActions(footer)
}

const handleVisibleChange = (visible: boolean) => {
  if (visible) {
    nextTick(() => {
      if (props.enablePresets) {
        relocatePresetsToFooter()
        // 面板异步渲染时再尝试一次
        nextTick(relocatePresetsToFooter)
      }
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
