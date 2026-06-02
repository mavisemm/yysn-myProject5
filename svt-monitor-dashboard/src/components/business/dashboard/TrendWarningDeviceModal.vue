<template>
  <el-dialog v-model="visible" :title="props.title" :width="dialogWidth" :close-on-click-modal="true"
    :draggable="!isNarrowScreen" align-center append-to-body class="trend-warning-modal" @close="handleClose">
    <div class="modal-body">
      <div ref="tableScrollAreaRef" class="table-scroll-wrap">
        <DeviceWaringDetailTreeTable
          v-loading="store.loading"
          :rows="treeRows"
          :mode="props.mode"
          :max-height="tableMaxHeight"
          @equipment-click="goToDeviceDetail"
          @point-click="goToSoundPoint"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceWaringDetailStore } from '@/stores/deviceWaringDetail'
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import { openRealtimeBatchForPoint } from './dashboardViewUtils'
import DeviceWaringDetailTreeTable from './DeviceWaringDetailTreeTable.vue'
import { buildDeviceWaringDetailTreeRows } from '@/utils/deviceWaringDetailTree'
import type { AlarmBatchTreeRow } from '@/utils/alarmBatchTree'

const router = useRouter()
const alarmBatchStore = useAlarmBatchStore()
const deviceTreeStore = useDeviceTreeStore()

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    mode?: 'trend' | 'fault'
    count?: number
  }>(),
  {
    title: '预警设备详情',
    mode: 'trend',
    count: 0,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visible = ref(props.modelValue)
const store = useDeviceWaringDetailStore()
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const isNarrowScreen = computed(() => windowWidth.value <= 800)
const dialogWidth = computed(() => (isNarrowScreen.value ? '100vw' : '960px'))

const tableScrollAreaRef = ref<HTMLElement | null>(null)
const tableMaxHeight = ref(400)
let tableAreaResizeObserver: ResizeObserver | null = null

const treeRows = computed(() => {
  const list = props.mode === 'trend' ? store.sound : store.vibration
  return buildDeviceWaringDetailTreeRows(list ?? [])
})

function measureTableScrollAreaHeight() {
  const el = tableScrollAreaRef.value
  if (!el) return
  const h = Math.floor(el.getBoundingClientRect().height)
  if (h >= 48) tableMaxHeight.value = h
}

function disconnectTableAreaObserver() {
  if (tableAreaResizeObserver && tableScrollAreaRef.value) {
    tableAreaResizeObserver.unobserve(tableScrollAreaRef.value)
  }
  tableAreaResizeObserver?.disconnect()
  tableAreaResizeObserver = null
}

function bindTableAreaResizeObserver() {
  disconnectTableAreaObserver()
  const el = tableScrollAreaRef.value
  if (!el || typeof ResizeObserver === 'undefined') return
  tableAreaResizeObserver = new ResizeObserver(() => measureTableScrollAreaHeight())
  tableAreaResizeObserver.observe(el)
  measureTableScrollAreaHeight()
}

async function syncTableLayoutForViewport() {
  if (!visible.value) return
  if (isNarrowScreen.value) {
    await nextTick()
    await nextTick()
    bindTableAreaResizeObserver()
  } else {
    disconnectTableAreaObserver()
    tableMaxHeight.value = 400
  }
}

let windowWidthResizeListener: (() => void) | null = null

onMounted(() => {
  windowWidthResizeListener = () => {
    windowWidth.value = window.innerWidth
  }
  window.addEventListener('resize', windowWidthResizeListener)
})

onUnmounted(() => {
  if (windowWidthResizeListener) {
    window.removeEventListener('resize', windowWidthResizeListener)
    windowWidthResizeListener = null
  }
  disconnectTableAreaObserver()
})

const goToDeviceDetail = (row: AlarmBatchTreeRow) => {
  const equipmentId = row.equipmentId ? String(row.equipmentId) : ''
  if (!equipmentId) return
  handleClose()
  router.push({ name: 'DeviceDetail', params: { id: equipmentId } })
}

const goToSoundPoint = (row: AlarmBatchTreeRow) => {
  const receiverId = row.receiverId ? String(row.receiverId) : ''
  const equipmentId = row.equipmentId ? String(row.equipmentId) : ''
  if (!receiverId || !equipmentId) return
  const match = String(row.pointName ?? '').match(/(\d+)/)
  const pointNum = match ? Number(match[1]) : 0
  void openRealtimeBatchForPoint({
    alarmBatchStore,
    deviceTreeData: deviceTreeStore.deviceTreeData ?? [],
    deviceId: equipmentId,
    pointNum,
    pointName: String(row.pointName ?? ''),
    mode: props.mode === 'trend' ? 'sound-warning' : 'vibration-alarm',
  })
  handleClose()
}

const handleClose = () => {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
  },
)

watch(visible, async (val) => {
  if (!val) {
    disconnectTableAreaObserver()
    emit('update:modelValue', false)
    return
  }
  void store.fetch(props.mode, true)
  await syncTableLayoutForViewport()
})

watch(isNarrowScreen, () => {
  void syncTableLayoutForViewport()
})
</script>

<style lang="scss" scoped>
.trend-warning-modal {
  :deep(.el-dialog__header .el-dialog__title) {
    color: #606266 !important;
  }
}

.modal-body {
  min-height: 120px;
}

.table-scroll-wrap {
  min-width: 0;
}

@media (max-width: 800px) {
  .modal-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .table-scroll-wrap {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow-x: auto;
    overflow-y: hidden;
  }
}
</style>

<style lang="scss">
.trend-warning-modal .el-dialog__body {
  padding: 12px 20px;
  box-sizing: border-box;
  max-height: 480px;
  overflow-y: auto;
}

.trend-warning-modal {
  .el-dialog__header .el-dialog__title {
    color: #606266 !important;
  }
}

@media (max-width: 800px) {
  .trend-warning-modal.el-dialog {
    width: 100vw !important;
    max-width: 100vw !important;
    max-height: 60vh;
    margin: 0 !important;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    overflow-x: hidden;
  }

  .trend-warning-modal .el-dialog__header {
    flex-shrink: 0;
  }

  .trend-warning-modal .el-dialog__body {
    flex: 1;
    min-height: 0;
    max-height: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 12px;
    max-width: 100%;
  }

  .trend-warning-modal .modal-body {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .trend-warning-modal .table-scroll-wrap {
    width: 100%;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }

  .trend-warning-modal .device-waring-detail-tree-table {
    width: 680px !important;
    min-width: 680px;
    max-width: none;
  }
}
</style>
