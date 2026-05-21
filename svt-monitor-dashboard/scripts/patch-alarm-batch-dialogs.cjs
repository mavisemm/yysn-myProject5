const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '../src/components/alarm')

const configs = [
  {
    file: 'RealtimeAlarmBatchDialog.vue',
    visible: 'realtimeAlarmVisible',
    query: 'realtimeAlarmQuery',
    fetch: 'fetchRealtimeAlarmList',
    reset: 'resetRealtimeAlarm',
    pageIndex: 'realtimeAlarmPageIndex',
    selectedKeys: 'realtimeAlarmSelectedRowKeys',
    batch: { yes: 'batchYesRealtimeAlarm', not: 'batchNotRealtimeAlarm', delete: 'batchDeleteRealtimeAlarm' },
    parseDataJson: false,
  },
  {
    file: 'HistoryAlarmBatchDialog.vue',
    visible: 'historyAlarmVisible',
    query: 'historyAlarmQuery',
    fetch: 'fetchHistoryAlarmList',
    reset: 'resetHistoryAlarm',
    pageIndex: 'historyAlarmPageIndex',
    selectedKeys: 'historyAlarmSelectedRowKeys',
    batch: { yes: 'batchYesHistoryAlarm', not: 'batchNotHistoryAlarm', delete: 'batchDeleteHistoryAlarm' },
    all: { yes: 'allYesHistoryAlarm', not: 'allNotHistoryAlarm', delete: 'allDeleteHistoryAlarm' },
    parseDataJson: false,
  },
  {
    file: 'RealtimeBatchDialog.vue',
    visible: 'realtimeVisible',
    query: 'realtimeQuery',
    fetch: 'fetchRealtimeList',
    reset: 'resetRealtime',
    pageIndex: 'realtimePageIndex',
    selectedKeys: 'realtimeSelectedRowKeys',
    rows: 'realtimeRows',
    batch: { yes: 'batchYesRealtime', not: 'batchNotRealtime', delete: 'batchDeleteRealtime' },
    parseDataJson: true,
  },
  {
    file: 'HistoryBatchDialog.vue',
    visible: 'historyVisible',
    query: 'historyQuery',
    fetch: 'fetchHistoryList',
    reset: 'resetHistory',
    pageIndex: 'historyPageIndex',
    selectedKeys: 'historySelectedRowKeys',
    rows: 'historyRows',
    batch: { yes: 'batchYesHistory', not: 'batchNotHistory', delete: 'batchDeleteHistory' },
    all: { yes: 'allYesHistory', not: 'allNotHistory', delete: 'allDeleteHistory' },
    parseDataJson: true,
  },
]

const newScript = (c) => `import { watch } from 'vue'
import {
  SAME_WIDTH_POPPER_OPTIONS,
  confirmBatchAction,
  useAlarmBatchDropdownOptions,
  useAlarmBatchEndTimePicker,
  useAlarmBatchRowLabels,
  useDialogOpenEffect,
  useResponsiveDialogWidth,
  useUiPageIndex,
  type BatchConfirmType,
} from './alarmBatchDialogUtils'

defineEmits<{ (e: 'view', row: any): void }>()

const { store, deviceOptions, typeOptions } = useAlarmBatchDropdownOptions()
const { dialogWidth } = useResponsiveDialogWidth()
const sameWidthPopperOptions = SAME_WIDTH_POPPER_OPTIONS

useDialogOpenEffect(
  () => store.${c.visible},
  () => {
    void store.ensureDropdowns()
    void store.${c.fetch}(0)
  },
)

const pageForUi = useUiPageIndex(
  () => store.${c.pageIndex},
  (v) => {
    store.${c.pageIndex} = v as any
  },
)

const {
  onEndTimeChange,
  onEndModelValue,
  onEndPanelChange,
  onEndCalendarChange,
  disableFutureDate,
  getDisabledStartHours,
  getDisabledStartMinutes,
  getDisabledStartSeconds,
  getDisabledEndHours,
  getDisabledEndMinutes,
  getDisabledEndSeconds,
} = useAlarmBatchEndTimePicker(
  () => store.${c.query}.startTime,
  () => store.${c.query}.endTime,
  (v) => {
    store.${c.query}.endTime = v
  },
)

const { getDeviceMainName, getDeviceSubName, getPointName, getReceiverName, clearParsedRowCache } =
  useAlarmBatchRowLabels({ parseDataJson: ${c.parseDataJson} })

${
  c.parseDataJson
    ? `watch(
  () => store.${c.visible},
  (visible) => {
    if (!visible) clearParsedRowCache()
  },
)

watch(
  () => store.${c.rows}.map((row: any) => String(row?.id ?? '')),
  () => clearParsedRowCache(),
)
`
    : ''
}

const onSelectionChange = (rows: any[]) => {
  store.${c.selectedKeys} = rows.map((r) => String(r.id)) as any
}

const onPageChange = (page: number) => {
  store.${c.fetch}(page - 1)
}

const onReset = () => {
  store.${c.reset}()
  store.${c.fetch}(0, true)
}

const confirmBatch = (type: BatchConfirmType) =>
  confirmBatchAction(type, {
    yes: () => store.${c.batch.yes}(),
    not: () => store.${c.batch.not}(),
    delete: () => store.${c.batch.delete}(),
  })

${
  c.all
    ? `const confirmAll = (type: BatchConfirmType) =>
  confirmBatchAction(
    type,
    {
      yes: () => store.${c.all.yes}(),
      not: () => store.${c.all.not}(),
      delete: () => store.${c.all.delete}(),
    },
    'all',
  )
`
    : ''
}
`

for (const c of configs) {
  const filePath = path.join(dir, c.file)
  let content = fs.readFileSync(filePath, 'utf8')
  content = content.replace(
    /<script setup lang="ts">[\s\S]*?<\/script>/,
    `<script setup lang="ts">\n${newScript(c)}\n</script>`,
  )
  content = content.replace(
    /<style lang="scss">\s*@media \(max-width: 800px\)[\s\S]*?<\/style>\s*$/,
    `<style lang="scss">\n@use './alarm-batch-dialog.scss' as *;\n</style>\n`,
  )
  if (c.file === 'RealtimeBatchDialog.vue') {
    content = content.replace(
      /<style scoped lang="scss">[\s\S]*?<\/style>/,
      `<style scoped lang="scss">\n@use './alarm-batch-dialog.local.scss' as *;\n\n:deep(.el-dialog__body) {\n  color: var(--alarm-dialog-text);\n  font-size: var(--alarm-dialog-font);\n}\n\n:deep(.el-form-item__label) {\n  color: var(--alarm-dialog-muted);\n  font-size: var(--alarm-dialog-font);\n  white-space: nowrap;\n}\n\n:deep(.el-table) {\n  color: var(--alarm-dialog-text);\n  font-size: var(--alarm-dialog-font);\n}\n\n:deep(.el-table__header-wrapper th) {\n  color: var(--alarm-dialog-muted);\n  font-weight: 600;\n}\n\n:deep(.el-pagination) {\n  color: var(--alarm-dialog-muted);\n  font-size: var(--alarm-dialog-font);\n}\n\n.filter-form :deep(.el-form-item:last-child) {\n  margin-right: 0;\n}\n\n.table-wrapper {\n  overflow-x: auto;\n  scrollbar-width: none;\n  -ms-overflow-style: none;\n}\n\n.table-wrapper::-webkit-scrollbar {\n  display: none;\n}\n\n.operation-cell :deep(.operation-link) {\n  font-size: var(--alarm-dialog-font);\n}\n</style>`,
    )
  } else {
    content = content.replace(
      /<style scoped lang="scss">[\s\S]*?<\/style>\s*(?=<style lang="scss">)/,
      `<style scoped lang="scss">\n@use './alarm-batch-dialog.local.scss' as *;\n</style>\n\n`,
    )
  }
  fs.writeFileSync(filePath, content)
  console.log('patched', c.file)
}

// Remove bindQueryEndTime export if unused
const utilsPath = path.join(dir, 'alarmBatchDialogUtils.ts')
let utils = fs.readFileSync(utilsPath, 'utf8')
utils = utils.replace(/\nexport function bindQueryEndTime[\s\S]*?\n}\n/, '\n')
fs.writeFileSync(utilsPath, utils)

// Delete broken partial files
for (const f of ['AlarmBatchDialogFilters.vue', '_test.html']) {
  const p = path.join(dir, f)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

console.log('done')
