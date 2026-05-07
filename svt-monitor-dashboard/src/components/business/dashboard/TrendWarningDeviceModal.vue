<template>
  <el-dialog v-model="visible" :title="props.title" :width="dialogWidth" :close-on-click-modal="true"
    :draggable="!isNarrowScreen" align-center append-to-body class="trend-warning-modal" @close="handleClose">
    <div class="modal-body">
      <div ref="tableScrollAreaRef" class="table-scroll-wrap">
        <el-table :data="tableData" stripe class="warning-table" :max-height="tableMaxHeight"
          v-loading="store.loading">
          <template #empty>
            <div class="table-empty">暂无数据</div>
          </template>
          <el-table-column prop="equipmentName" label="设备名称" min-width="120">
            <template #default="{ row }">
              <template v-if="row.showEquipmentName">
                <span v-if="row.equipmentId" class="link-cell" @click.stop="goToDeviceDetail(row)">{{
                  row.equipmentName
                }}</span>
                <span v-else>{{ row.equipmentName }}</span>
              </template>
              <span v-else class="equipment-empty-cell"></span>
            </template>
          </el-table-column>
          <el-table-column prop="pointName" label="点位名称" min-width="120">
            <template #default="{ row }">
              <span v-if="row.receiverId && row.equipmentId" class="link-cell" @click.stop="goToSoundPoint(row)">
                {{ row.pointName }}
              </span>
              <span v-else>{{ row.pointName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="value" :label="props.mode === 'trend' ? '预警值' : '报警值'" min-width="100">
            <template #default="{ row }">
              <span>{{ row.value ?? '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="报警时间" min-width="180">
            <template #default="{ row }">
              <span>{{ formatLocalDateTime(row.alarmTime) }}</span>
            </template>
          </el-table-column>
        </el-table>
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
import { resolveRealtimeDeviceKey } from '@/utils/realtimeAlarmNavigator'

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
const dialogWidth = computed(() => (isNarrowScreen.value ? '100vw' : '900px'))

/** 仅窄屏：弹窗 60vh + flex 后，用 ResizeObserver 把表格 max-height 对齐滚动区 */
const tableScrollAreaRef = ref<HTMLElement | null>(null)
const tableMaxHeight = ref(400)
let tableAreaResizeObserver: ResizeObserver | null = null

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

interface TableRow {
  equipmentName: string
  pointName: string
  equipmentId?: string
  value?: string | number
  alarmTime?: string | number
  receiverId?: string
  showEquipmentName?: boolean
}

function mapToRow(x: any): TableRow {
  return {
    equipmentId: x.equipmentId,
    equipmentName: x.equipmentName ?? '—',
    receiverId: x.receiverId,
    pointName: x.pointName ?? '—',
    value: x.metricValue ?? x.triggerValue ?? '—',
    alarmTime: x.alarmTime,
  }
}

function formatLocalDateTime(input: unknown): string {
  if (input == null || input === '') return '—'
  const raw = String(input).trim()
  if (!raw) return '—'

  const numeric = Number(raw)
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(raw)

  if (Number.isNaN(date.getTime())) return '—'
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function normalizeDeviceKey(row: TableRow): string {
  const idKey = String(row.equipmentId ?? '')
    .trim()
    .toLowerCase()
  const nameKey = String(row.equipmentName ?? '')
    .trim()
    .toLowerCase()
  // 兼容后端异常：不同设备可能复用了同一个 equipmentId，这里追加名称避免误合并
  if (idKey) return `${idKey}__${nameKey || '__empty_name__'}`
  return `__empty_equipment_id__${nameKey || '__empty_name__'}`
}

const tableData = computed(() => {
  const list = props.mode === 'trend' ? store.sound : store.vibration
  const rows = (list ?? []).map(mapToRow)
  const renderedDeviceKeys = new Set<string>()
  return rows.map((row) => {
    const currentKey = normalizeDeviceKey(row)
    const showEquipmentName = !renderedDeviceKeys.has(currentKey)
    renderedDeviceKeys.add(currentKey)
    return {
      ...row,
      showEquipmentName,
    }
  })
})

const goToDeviceDetail = (row: TableRow) => {
  if (!row.equipmentId) return
  handleClose()
  router.push({ name: 'DeviceDetail', params: { id: row.equipmentId } })
}

const goToSoundPoint = (row: TableRow) => {
  if (!row.receiverId || !row.equipmentId) return
  const match = String(row.pointName ?? '').match(/(\d+)/)
  const pointNum = match ? Number(match[1]) : 0
  void alarmBatchStore.ensureDropdowns().then(() => {
    const deviceId = resolveRealtimeDeviceKey({
      alarmId: String(row.equipmentId ?? ''),
      pointNum,
      pointName: String(row.pointName ?? ''),
      deviceTreeData: deviceTreeStore.deviceTreeData ?? [],
      deviceOptions: (alarmBatchStore.deviceNameList ?? []) as any[],
    })

    if (props.mode === 'trend') {
      alarmBatchStore.resetRealtime()
      if (deviceId) {
        alarmBatchStore.realtimeQuery.deviceId = deviceId
      }
      void alarmBatchStore.openRealtime()
    } else {
      alarmBatchStore.resetRealtimeAlarm()
      if (deviceId) {
        alarmBatchStore.realtimeAlarmQuery.deviceId = deviceId
      }
      void alarmBatchStore.openRealtimeAlarm()
    }
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

/* 网页端：保持原先块级布局，不受手机端 flex 影响 */
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

.warning-table {
  width: 100%;

  .table-empty {
    padding: 18px 0;
    color: #909399;
  }

  .link-cell {
    color: #606266 !important;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .equipment-empty-cell {
    display: inline-block;
    width: 100%;
    min-height: 1em;
  }

  :deep(.el-table__header th) {
    color: #606266 !important;
  }

  :deep(.el-table__body td) {
    color: #606266 !important;
  }
}
</style>

<style lang="scss">
/* 仅本组件 .el-dialog 根带 class，不污染全局；网页端与原先一致 */
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

  .warning-table {

    .el-table__header th,
    .el-table__body td {
      color: #606266 !important;
    }
  }
}

/* 手机端：100vw、整体 ≤60vh、内部表格占满剩余高度 + 横向滚动 */
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

  .trend-warning-modal .warning-table {
    width: 620px !important;
    min-width: 620px;
    max-width: none;
  }
}
</style>
