<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="480px"
    align-center
    append-to-body
    :modal-append-to-body="true"
    :z-index="3100"
    :modal-class="dialogClass"
    :close-on-click-modal="true"
    destroy-on-close
    @update:model-value="onVisibleChange"
  >
    <p class="alarm-remind-dialog__message" v-html="messageHtml" />

    <div class="alarm-remind-dialog__snooze">
      <el-checkbox v-model="snoozeOnConfirm" class="alarm-remind-dialog__snooze-check" />
      <span class="alarm-remind-dialog__snooze-text">在</span>
      <el-select
        v-model="snoozeMinutes"
        size="small"
        class="alarm-remind-dialog__snooze-select"
        teleported
        popper-class="alarm-remind-dialog-select-popper"
        :disabled="!snoozeOnConfirm"
      >
        <el-option
          v-for="m in SNOOZE_MINUTE_OPTIONS"
          :key="m"
          :label="`${m} 分钟`"
          :value="m"
        />
      </el-select>
      <span class="alarm-remind-dialog__snooze-text">时间内不再弹窗提醒</span>
    </div>

    <template #footer>
      <el-button @click="handleConfirm">确定</el-button>
      <el-button type="primary" @click="handleView">查看</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  escapeHtml,
  type IncomingAlarmPreview,
} from '@/components/layout/layoutIncomingAlarm'
import {
  SNOOZE_MINUTE_OPTIONS,
  useAlarmReminderStore,
  type SnoozeMinuteOption,
} from '@/stores/alarmReminder'

const props = defineProps<{
  visible: boolean
  item: IncomingAlarmPreview | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  view: []
}>()

const alarmReminderStore = useAlarmReminderStore()
const snoozeMinutes = ref<SnoozeMinuteOption>(10)
/** 勾选后点「确定」：在所选分钟内不再弹窗，并同步为「关闭提醒」 */
const snoozeOnConfirm = ref(false)

watch(
  () => props.visible,
  (open) => {
    if (open) {
      snoozeMinutes.value = 10
      snoozeOnConfirm.value = false
    }
  },
)

const dialogTitle = computed(() =>
  props.item?.status === 'alarm' ? '新报警' : '新预警',
)

const dialogClass = computed(() =>
  props.item?.status === 'alarm'
    ? 'alarm-remind-dialog alarm-remind-dialog--alarm'
    : 'alarm-remind-dialog alarm-remind-dialog--warning',
)

const messageHtml = computed(() => {
  const item = props.item
  if (!item) return ''
  const actionText = item.status === 'alarm' ? '报警' : '预警'
  const emphasisClass =
    item.status === 'alarm'
      ? 'alarm-remind-dialog__emphasis--alarm'
      : 'alarm-remind-dialog__emphasis--warning'
  return [
    item.alarmTimeText
      ? `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(item.alarmTimeText)}</span>`
      : '',
    item.alarmTimeText ? '，' : '',
    `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(item.shopName)}</span>`,
    ' 的 ',
    `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(item.deviceName)}</span>`,
    ' 的 ',
    `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(item.pointName)}</span>`,
    ' 发生 ',
    `<span class="alarm-remind-dialog__emphasis ${emphasisClass}">${escapeHtml(actionText)}</span>`,
  ].join('')
})

function close() {
  emit('update:visible', false)
}

function onVisibleChange(value: boolean) {
  emit('update:visible', value)
}

function handleConfirm() {
  if (snoozeOnConfirm.value) {
    alarmReminderStore.confirmSnoozeAndDisable(snoozeMinutes.value)
  } else {
    alarmReminderStore.setEnabled(true)
  }
  close()
}

function handleView() {
  emit('view')
  close()
}
</script>

<style lang="scss">
.alarm-remind-dialog {
  .el-dialog__header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .alarm-remind-dialog__message {
    margin: 0;
    line-height: 1.6;
    color: var(--el-text-color-primary);
    font-size: 14px;
  }

  .alarm-remind-dialog__snooze {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .alarm-remind-dialog__snooze-check {
    margin-right: 0;
    height: auto;
  }

  .alarm-remind-dialog__snooze-text {
    font-size: 13px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  .alarm-remind-dialog__snooze-select {
    width: 100px;
  }
}

.alarm-remind-dialog--alarm .el-dialog__title::before {
  content: '!';
  display: inline-flex;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #f56c6c;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  margin-right: 8px;
}

.alarm-remind-dialog--warning .el-dialog__title::before {
  content: '!';
  display: inline-flex;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #e6a23c;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  margin-right: 8px;
}

.alarm-remind-dialog__emphasis {
  font-size: 1.1em;
  font-weight: 700;
}

.alarm-remind-dialog__emphasis--alarm {
  color: #f56c6c;
}

.alarm-remind-dialog__emphasis--warning {
  color: #e6a23c;
}

/* 下拉层需高于报警弹窗（z-index: 3100） */
.alarm-remind-dialog-select-popper {
  z-index: 3500 !important;
}
</style>
