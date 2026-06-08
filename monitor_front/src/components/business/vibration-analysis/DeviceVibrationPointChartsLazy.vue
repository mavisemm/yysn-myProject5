<template>
  <section ref="sectionRef" class="va-point-section">
    <h3 class="va-point-title">{{ pointName || receiverId }}</h3>
    <template v-if="visible">
      <div
        :id="freqAnchorId"
        v-show="!tripleFsDialogVisible"
        class="va-point-charts-row va-point-charts-row--triple va-point-freq-anchor"
      >
        <VibrationVelocityFreqChart
          v-for="axis in VIBRATION_AXES"
          :key="`freq-${chartKey}-${axis}`"
          :receiver-id="receiverId"
          :point-device-id="pointDeviceIdResolved"
          :fixed-axis="axis"
          :chart-title="chartTitle(pointName, axis, 'freq')"
          :fullscreen-title="tripleFreqFullscreenTitle"
          :y-axis-tick-decimals="2"
          inline-chart-theme="light"
          analysis-triple-fullscreen
        />
      </div>
      <div
        v-show="!tripleFsDialogVisible"
        class="va-point-charts-row va-point-charts-row--triple"
      >
        <VibrationVelocityTimeChart
          v-for="axis in VIBRATION_AXES"
          :key="`time-${chartKey}-${axis}`"
          :receiver-id="receiverId"
          :point-device-id="pointDeviceIdResolved"
          :fixed-axis="axis"
          :chart-title="chartTitle(pointName, axis, 'time')"
          :fullscreen-title="tripleTimeFullscreenTitle"
          :y-axis-tick-decimals="2"
          inline-chart-theme="light"
          analysis-triple-fullscreen
        />
      </div>
    </template>
    <div v-else class="va-chart-placeholder">滚动到此处后加载图表…</div>

    <el-dialog
      v-model="tripleFsDialogVisible"
      :title="tripleFsTitle"
      fullscreen
      :destroy-on-close="false"
      append-to-body
      :modal-append-to-body="true"
      class="va-triple-axis-fullscreen-dialog"
      modal-class="common-echarts-fullscreen-modal va-triple-axis-fullscreen-modal"
      :style="{ '--ce-fullscreen-bg': '#142060' }"
      @opened="onTripleFullscreenOpened"
      @closed="onTripleFullscreenClosed"
    >
      <div class="va-triple-fs-body">
        <div
          ref="tripleFsToolbarRef"
          class="va-triple-fs-toolbar common-echarts-fullscreen-body-top"
        />
        <div class="va-triple-fs-stack">
          <div
            v-for="axis in VIBRATION_AXES"
            :key="`triple-${tripleFsKind}-${axis}`"
            class="va-triple-fs-pane"
          >
            <div class="va-triple-fs-pane-label">{{ vibrationAxisLabel(axis) }}</div>
            <div
              :ref="(el) => setTripleMountRef(axis, el)"
              class="va-triple-fs-chart-host"
            />
          </div>
        </div>
      </div>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, shallowRef, onMounted, onUnmounted } from 'vue'
import type { ComponentPublicInstance, ShallowRef } from 'vue'
import type { VibrationAxis } from '@/api/modules/device'
import { useVaPointChartLoadScheduler } from '@/composables/useVaPointChartLoadScheduler'
import { provideVaTripleAxisFullscreen } from '@/composables/useVaTripleAxisFullscreen'
import {
  vibrationAnalysisChartTitle,
  vibrationAxisLabel,
} from '@/components/business/vibration-point/vibrationPointUtils'
import VibrationVelocityFreqChart from '@/components/business/vibration-point/VibrationVelocityFreqChart.vue'
import VibrationVelocityTimeChart from '@/components/business/vibration-point/VibrationVelocityTimeChart.vue'

const VIBRATION_AXES: VibrationAxis[] = ['X', 'Y', 'Z']
const VA_TRIPLE_FS_PAGE_LOCK_CLASS = 'va-triple-fs-open'

const props = defineProps<{
  receiverId: string
  pointDeviceId: string
  pointName: string
  queryGeneration: number
  /** 嵌入设备分析 Tab 且勾选较少点位时可立即加载 */
  eager?: boolean
  /** 频域图锚点 id，供右侧悬浮菜单定位 */
  freqAnchorId?: string
  /** 全选/多点位时缩小预加载视口，降低同时触发的接口数 */
  lazyRootMargin?: string
}>()

const sectionRef = ref<HTMLElement | null>(null)
const loadScheduler = useVaPointChartLoadScheduler()
const eagerVisible = ref(Boolean(props.eager))
const lazyReady = ref(false)
const visible = computed(() => eagerVisible.value || lazyReady.value)

const freqAnchorId = computed(
  () =>
    props.freqAnchorId ||
    `va-point-${String(props.receiverId || '').replace(/[^\w-]/g, '_')}-freq`,
)

let intersectionObserver: IntersectionObserver | null = null
let loadSlotHeld = false

const releaseLoadSlot = () => {
  if (!loadSlotHeld || !loadScheduler) return
  loadSlotHeld = false
  loadScheduler.release()
}

const activateLazySection = async () => {
  if (lazyReady.value || eagerVisible.value) return
  if (loadScheduler) {
    await loadScheduler.acquire()
    loadSlotHeld = true
  }
  lazyReady.value = true
}

const disconnectObserver = () => {
  intersectionObserver?.disconnect()
  intersectionObserver = null
}

const observeSection = async () => {
  await nextTick()
  disconnectObserver()
  if (lazyReady.value || eagerVisible.value) return
  const el = sectionRef.value
  if (!el) return
  intersectionObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        disconnectObserver()
        void activateLazySection()
      }
    },
    {
      root: null,
      rootMargin: props.lazyRootMargin ?? '120px 0px',
      threshold: 0.01,
    },
  )
  intersectionObserver.observe(el)
}

watch(
  () => props.eager,
  (v) => {
    if (v) {
      disconnectObserver()
      releaseLoadSlot()
      eagerVisible.value = true
    } else {
      eagerVisible.value = false
      if (!lazyReady.value) void observeSection()
    }
  },
  { immediate: true },
)

watch(
  () => props.lazyRootMargin,
  () => {
    if (!eagerVisible.value && !lazyReady.value) void observeSection()
  },
)

onMounted(() => {
  if (!props.eager) void observeSection()
})

onUnmounted(() => {
  disconnectObserver()
  releaseLoadSlot()
})

const tripleFs = provideVaTripleAxisFullscreen()
const tripleFsToolbarRef = ref<HTMLElement | null>(null)

const tripleMountRefs: Record<VibrationAxis, ShallowRef<HTMLElement | null>> = {
  X: shallowRef(null),
  Y: shallowRef(null),
  Z: shallowRef(null),
}

const resolveTripleMountEl = (el: Element | ComponentPublicInstance | null): HTMLElement | null => {
  if (el instanceof HTMLElement) return el
  const root = (el as ComponentPublicInstance | null)?.$el
  return root instanceof HTMLElement ? root : null
}

/** 仅在挂载点引用变化时写入；弹窗打开后再同步到 mountMap，避免 render 阶段递归更新 */
const setTripleMountRef = (axis: VibrationAxis, el: Element | ComponentPublicInstance | null) => {
  const host = resolveTripleMountEl(el)
  if (tripleMountRefs[axis].value === host) return
  tripleMountRefs[axis].value = host
  const kind = tripleFs.kind.value
  if (!tripleFs.visible.value || !kind) return
  tripleFs.registerMount(kind, axis, host)
}

const syncTripleMountsToContext = () => {
  const kind = tripleFs.kind.value
  if (!kind) return
  VIBRATION_AXES.forEach((axis) => {
    tripleFs.registerMount(kind, axis, tripleMountRefs[axis].value)
  })
}

const tripleFsDialogVisible = computed({
  get: () => tripleFs.visible.value,
  set: (v: boolean) => {
    if (v) tripleFs.visible.value = true
    else tripleFs.close()
  },
})
const tripleFsTitle = computed(() => tripleFs.title.value)
const tripleFsKind = computed(() => tripleFs.kind.value)

const pointDeviceIdResolved = computed(() => props.pointDeviceId)

const chartKey = computed(
  () => `${props.queryGeneration}:${props.receiverId}:${pointDeviceIdResolved.value}`,
)

const chartTitle = (pointName: string, axis: VibrationAxis, kind: 'freq' | 'time') =>
  vibrationAnalysisChartTitle(pointName, axis, kind)

const tripleFreqFullscreenTitle = computed(() => {
  const name = String(props.pointName || props.receiverId || '').trim()
  return name ? `${name} - 振动速度频域图` : '振动速度频域图'
})

const tripleTimeFullscreenTitle = computed(() => {
  const name = String(props.pointName || props.receiverId || '').trim()
  return name ? `${name} - 振动速度时域图` : '振动速度时域图'
})

const onTripleFullscreenOpened = async () => {
  await nextTick()
  tripleFs.registerToolbarTarget(tripleFsToolbarRef.value)
  syncTripleMountsToContext()
  schedulePointChartResize()
}

const onTripleFullscreenClosed = () => {
  tripleFs.registerToolbarTarget(null)
}

watch(
  () => tripleFsDialogVisible.value,
  (open) => {
    document.documentElement.classList.toggle(VA_TRIPLE_FS_PAGE_LOCK_CLASS, open)
    if (open) return
    tripleFs.registerToolbarTarget(null)
    VIBRATION_AXES.forEach((axis) => {
      tripleMountRefs[axis].value = null
    })
  },
)

onUnmounted(() => {
  document.documentElement.classList.remove(VA_TRIPLE_FS_PAGE_LOCK_CLASS)
})

/** 仅通知本点位图表 resize，避免 window.resize 触发全页所有 ECharts 重排 */
const schedulePointChartResize = () => {
  requestAnimationFrame(() => tripleFs.requestResize())
}

watch(visible, async (v) => {
  if (!v) return
  await nextTick()
  schedulePointChartResize()
})

watch(
  () => [tripleFsDialogVisible.value, tripleFsKind.value] as const,
  async ([open]) => {
    if (!open) return
    await nextTick()
    schedulePointChartResize()
  },
)

watch(tripleFsDialogVisible, (open, wasOpen) => {
  if (wasOpen && !open) {
    nextTick(() => schedulePointChartResize())
  }
})
</script>

<style lang="scss" scoped>
:deep(.freq-card--inline-light),
:deep(.time-card--inline-light) {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);

  .card-header {
    border-bottom: 1px solid #e9ecef;
    padding: 10px;
    flex-shrink: 0;
  }

  .chart-container {
    padding: 10px;
  }

  .app-section-title {
    color: #212529 !important;
    font-size: 0.85rem;
  }
}
</style>
