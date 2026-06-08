<template>
  <div class="vibration-analysis-page" :class="{ 'vibration-analysis-page--embedded': embedded }">
    <div class="va-container">
      <header v-if="!embedded" class="dashboard-header">
        <h1>设备振动分析</h1>
      </header>

      <section v-if="!embedded" class="load-data-section">
        <div class="va-filter-row">
          <div class="va-filter-item">
            <label for="va-equipment-select">选择设备</label>
            <el-select id="va-equipment-select" v-model="draftEquipmentId" class="va-equipment-select"
              popper-class="va-equipment-select-popper" filterable placeholder="请选择设备"
              :loading="equipmentLoading">
              <el-option v-for="opt in equipmentOptions" :key="opt.equipmentId" :label="opt.equipmentName"
                :value="opt.equipmentId" />
            </el-select>
          </div>
          <el-button type="primary" class="va-query-btn" :loading="queryLoading" @click="handleQueryClick">
            查询数据
          </el-button>
        </div>
      </section>

      <section v-loading="queryLoading" class="card">
        <div class="card-header">设备图片</div>
        <div class="card-body">
          <EquipmentImageGallery
            v-if="deviceImageUrls.length"
            variant="analysis"
            :urls="deviceImageUrls"
            :alt="queriedEquipmentLabel || '设备图片'"
            :caption="queriedEquipmentLabel || '设备实物图'"
          />
          <div v-else class="va-empty-block">暂无设备图片</div>
        </div>
      </section>

      <section v-if="analysisPoints.length" class="card va-point-select-card">
        <div class="card-header">点位勾选</div>
        <div class="card-body va-point-select-body">
          <el-select
            v-model="selectedPointIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            :max-collapse-tags="3"
            placeholder="请选择要展示的点位"
            class="va-point-select"
            popper-class="va-point-select-popper"
            clearable
          >
            <el-option
              v-for="p in analysisPoints"
              :key="p.receiverId"
              :label="formatPointOptionLabel(p)"
              :value="p.receiverId"
            >
              <div class="va-point-option">
                <el-checkbox
                  :model-value="selectedPointIdSet.has(p.receiverId)"
                  @click.stop.prevent="
                    togglePointSelection(p.receiverId, !selectedPointIdSet.has(p.receiverId))
                  "
                />
                <span class="va-point-option__label">{{ formatPointOptionLabel(p) }}</span>
              </div>
            </el-option>
          </el-select>
          <div class="va-point-select-actions">
            <el-button size="small" @click="selectAllPoints">全选</el-button>
            <el-button size="small" @click="clearSelectedPoints">清空</el-button>
            <span v-if="selectedPointIds.length" class="va-point-select-hint">
              已选 {{ selectedPointIds.length }} / {{ analysisPoints.length }} 个点位
            </span>
          </div>
        </div>
      </section>

      <section v-if="analysisPoints.length" class="card">
        <div class="card-header">{{ rmsTableTitle }}</div>
        <div class="card-body data-table">
          <el-table v-if="visibleRmsRows.length" :data="visibleRmsRows" border stripe style="width: 100%">
            <el-table-column prop="pointName" label="点位名称" min-width="140" />
            <el-table-column prop="receiverId" label="点位编号" min-width="160" />
            <el-table-column label="X轴(A)速度有效值 (mm/s)" min-width="160" align="center">
              <template #default="{ row }">{{ row.xRms.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="Y轴(H)速度有效值 (mm/s)" min-width="160" align="center">
              <template #default="{ row }">{{ row.yRms.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="Z轴(V)速度有效值 (mm/s)" min-width="160" align="center">
              <template #default="{ row }">{{ row.zRms.toFixed(2) }}</template>
            </el-table-column>
          </el-table>
          <div v-else class="va-empty-block">
            {{ selectedPointIds.length ? '暂无点位数据' : '请在上方勾选要展示的点位' }}
          </div>
        </div>
      </section>

      <section v-if="analysisPoints.length" class="card">
        <div class="card-header">各点位振动速度频域 / 时域图</div>
        <div class="card-body">
          <template v-if="visibleAnalysisPoints.length">
            <div
              v-for="p in visibleAnalysisPoints"
              :id="pointAnchorId(p.receiverId)"
              :key="`${queryGeneration}:${p.receiverId}`"
              class="va-point-anchor"
            >
              <DeviceVibrationPointChartsLazy
                :receiver-id="p.receiverId"
                :point-device-id="p.pointDeviceId"
                :point-name="p.pointName"
                :query-generation="queryGeneration"
                :freq-anchor-id="pointFreqAnchorId(p.receiverId)"
                :eager="chartsEager"
                :lazy-root-margin="chartsLazyRootMargin"
              />
            </div>
          </template>
          <div v-else class="va-empty-block">请在上方勾选要展示的点位</div>
        </div>
      </section>
    </div>

    <Teleport to="body">
    <aside
      v-if="showPointFloatMenu"
      class="va-point-float-menu"
      :class="{
        'is-collapsed': pointMenuCollapsed,
        'va-point-float-menu--embedded': embedded,
      }"
      aria-label="点位悬浮菜单"
    >
      <button
        type="button"
        class="va-point-float-menu__toggle"
        :aria-expanded="!pointMenuCollapsed"
        :aria-label="pointMenuCollapsed ? '展开点位菜单' : '收起点位菜单'"
        @click="pointMenuCollapsed = !pointMenuCollapsed"
      >
        <el-icon class="va-point-float-menu__toggle-icon" aria-hidden="true">
          <ArrowRight v-if="!pointMenuCollapsed" />
          <ArrowLeft v-else />
        </el-icon>
        <span class="va-point-float-menu__toggle-text">
          {{ pointMenuCollapsed ? '展开' : '收起' }}
        </span>
      </button>
      <div v-show="!pointMenuCollapsed" class="va-point-float-menu__body">
        <div class="va-point-float-menu__title">振动速度频域图</div>
        <button
          v-for="item in pointMenuItems"
          :key="item.receiverId"
          type="button"
          class="va-point-float-menu__item"
          @click="scrollToPoint(item.receiverId)"
        >
          {{ item.label }}
        </button>
      </div>
    </aside>
    </Teleport>

    <button
      v-show="!embedded && showBackToTop"
      type="button"
      class="va-back-to-top"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <el-icon class="va-back-to-top__icon">
        <ArrowUp />
      </el-icon>
      <span class="va-back-to-top__text">回到顶部</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted, watch } from 'vue'
import { provideVaPointChartLoadScheduler } from '@/composables/useVaPointChartLoadScheduler'
import { useRoute } from 'vue-router'
import { useDeviceTreeStore } from '@/stores/deviceTree'
import {
  resolvePointDeviceIdFromTree,
  resolveEquipmentNameFromTree,
  resolvePointDisplayNameFromTree,
  resolveEquipmentIdFromPointReceiver,
} from '@/utils/deviceTreePoint'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, ArrowUp } from '@element-plus/icons-vue'
import { getTenantId } from '@/api/tenant'
import {
  getCheckPointsByEquipmentId,
  getProductionEquipmentList,
  normalizeEquipmentCheckPointList,
} from '@/api/modules/hardware'
import {
  getCheckPointDisplayName,
  getCheckPointReceiverId,
} from '@/components/business/device-detail/devicePointMetrics'
import { fetchEquipmentImageUrls } from '@/components/business/device-detail/deviceImageUtils'
import type { AnalysisPointItem, EquipmentOption } from '@/utils/vibrationAnalysisTree'
import { buildMockPointRmsRows, type PointRmsRow } from '@/utils/vibrationAnalysisMock'
import DeviceVibrationPointChartsLazy from '@/components/business/vibration-analysis/DeviceVibrationPointChartsLazy.vue'
import EquipmentImageGallery from '@/components/business/device-detail/EquipmentImageGallery.vue'

/** 超过该数量显示右侧悬浮目录；全选时也启用图表懒加载节流 */
const VA_POINT_FLOAT_MENU_MIN = 3
/** 嵌入页勾选不超过该数量时可立即加载图表 */
const VA_POINT_EAGER_MAX = 3

const props = withDefaults(
  defineProps<{
    embedded?: boolean
    equipmentId?: string
  }>(),
  {
    embedded: false,
    equipmentId: '',
  },
)

const route = useRoute()
const deviceTreeStore = useDeviceTreeStore()

/** 分析页不在 PageLayout 内，需自行 provide，避免 CommonEcharts inject 告警 */
const backgroundMode = ref<'image' | 'navy' | 'solid'>('solid')
provide('backgroundMode', backgroundMode)

const initialEquipmentId = computed(() => {
  const fromProp = props.equipmentId?.trim()
  if (fromProp) return fromProp
  const q = route.query.equipmentId
  const fromQuery = Array.isArray(q) ? q[0] : q
  if (typeof fromQuery === 'string' && fromQuery.trim()) return fromQuery.trim()
  return ''
})

const draftEquipmentId = ref('')
const queriedEquipmentId = ref('')
const queryLoading = ref(false)
const queryGeneration = ref(0)
const deviceImageUrls = ref<string[]>([])
const queriedEquipmentName = ref('')
const rmsRows = ref<PointRmsRow[]>([])
const analysisPoints = ref<AnalysisPointItem[]>([])
/** 用户勾选的点位 receiverId，仅展示已选点位 */
const selectedPointIds = ref<string[]>([])
const pointMenuCollapsed = ref(false)
const selectedBySelectAll = ref(false)

const equipmentLoading = ref(false)
const equipmentOptions = ref<EquipmentOption[]>([])

const equipmentOptionsById = computed<Record<string, EquipmentOption>>(() => {
  const map: Record<string, EquipmentOption> = {}
  for (const o of equipmentOptions.value) map[o.equipmentId] = o
  return map
})
const selectedPointIdSet = computed(() => new Set(selectedPointIds.value))

const visibleAnalysisPoints = computed(() =>
  analysisPoints.value.filter((p) => selectedPointIdSet.value.has(p.receiverId)),
)

const visibleRmsRows = computed(() =>
  rmsRows.value.filter((r) => selectedPointIdSet.value.has(r.receiverId)),
)

const isAllPointsSelected = computed(
  () =>
    analysisPoints.value.length > 0 &&
    selectedPointIds.value.length === analysisPoints.value.length,
)

const shouldThrottleChartLoads = computed(
  () => isAllPointsSelected.value || selectedPointIds.value.length > VA_POINT_FLOAT_MENU_MIN,
)

provideVaPointChartLoadScheduler(() => shouldThrottleChartLoads.value)

const chartsEager = computed(() => {
  if (!props.embedded) return false
  if (isAllPointsSelected.value || selectedBySelectAll.value) return false
  const count = selectedPointIds.value.length
  return count > 0 && count <= VA_POINT_EAGER_MAX
})

const chartsLazyRootMargin = computed(() =>
  shouldThrottleChartLoads.value ? '48px 0px' : '120px 0px',
)

const showPointFloatMenu = computed(
  () => selectedPointIds.value.length > VA_POINT_FLOAT_MENU_MIN,
)

const pointMenuItems = computed(() =>
  visibleAnalysisPoints.value.map((p) => ({
    receiverId: p.receiverId,
    label: formatPointOptionLabel(p),
  })),
)

const formatPointOptionLabel = (p: AnalysisPointItem) => {
  const name = String(p.pointName || '').trim()
  return name || p.receiverId
}

const selectAllPoints = () => {
  selectedBySelectAll.value = true
  selectedPointIds.value = analysisPoints.value.map((p) => p.receiverId)
}

const clearSelectedPoints = () => {
  selectedBySelectAll.value = false
  selectedPointIds.value = []
}

const togglePointSelection = (receiverId: string, checked: string | number | boolean) => {
  selectedBySelectAll.value = false
  const id = String(receiverId ?? '').trim()
  if (!id) return
  const next = new Set(selectedPointIds.value)
  if (checked === true) next.add(id)
  else next.delete(id)
  selectedPointIds.value = Array.from(next)
}

watch(selectedPointIds, (ids) => {
  const total = analysisPoints.value.length
  if (total > 0 && ids.length === total) return
  if (ids.length < total) selectedBySelectAll.value = false
})

const resolveEquipmentDisplayName = (equipmentId: string): string => {
  const id = String(equipmentId ?? '').trim()
  if (!id) return ''

  const fromOptions = equipmentOptionsById.value[id]?.equipmentName?.trim()
  if (fromOptions) return fromOptions

  const tree = deviceTreeStore.deviceTreeData
  const fromTree = resolveEquipmentNameFromTree(tree, id)
  if (fromTree) return fromTree

  const firstPoint = analysisPoints.value[0]
  if (firstPoint) {
    const equipFromPoint = resolveEquipmentIdFromPointReceiver(tree, firstPoint.receiverId)
    if (equipFromPoint) {
      const name = resolveEquipmentNameFromTree(tree, equipFromPoint)
      if (name) return name
    }
  }

  return ''
}

const queriedEquipmentLabel = computed(() => {
  const cached = queriedEquipmentName.value?.trim()
  if (cached) return cached
  const resolved = resolveEquipmentDisplayName(queriedEquipmentId.value)
  if (resolved) return resolved
  const id = String(queriedEquipmentId.value ?? '').trim()
  return id || '当前设备'
})

const rmsTableTitle = computed(() => {
  const name = String(queriedEquipmentLabel.value || '').trim()
  if (!name) return '设备所有点位速度有效值'
  return name.endsWith('设备') ? `${name}所有点位速度有效值` : `${name}设备所有点位速度有效值`
})

const loadDeviceImageSection = async (equipmentId: string) => {
  deviceImageUrls.value = []
  queriedEquipmentName.value = resolveEquipmentDisplayName(equipmentId)
  if (!equipmentId) return

  const [imageUrls] = await Promise.allSettled([fetchEquipmentImageUrls(equipmentId)])

  if (imageUrls.status === 'fulfilled') {
    deviceImageUrls.value = imageUrls.value
  }
}

const loadEquipmentOptions = async () => {
  equipmentLoading.value = true
  try {
    const tenantId = getTenantId()
    if (!tenantId) {
      equipmentOptions.value = []
      return
    }
    const res = await getProductionEquipmentList({ tenantId, type: 1 })
    const list = Array.isArray(res.ret) ? res.ret : []
    equipmentOptions.value = list
      .map((it) => ({
        equipmentId: String(it.id ?? '').trim(),
        equipmentName: String(it.name ?? it.id ?? '').trim() || String(it.id ?? '').trim(),
      }))
      .filter((it) => it.equipmentId)
  } catch {
    equipmentOptions.value = []
  } finally {
    equipmentLoading.value = false
  }
}

const extractSortNumber = (value: string): number => {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

const sortAnalysisPoints = (points: AnalysisPointItem[]): AnalysisPointItem[] =>
  points
    .map((point, index) => ({ point, index }))
    .sort((a, b) => {
      const aNum = extractSortNumber(a.point.pointName || a.point.receiverId)
      const bNum = extractSortNumber(b.point.pointName || b.point.receiverId)
      if (aNum !== bNum) return aNum - bNum

      const byName = String(a.point.pointName || '').localeCompare(String(b.point.pointName || ''), 'zh-CN', {
        numeric: true,
        sensitivity: 'base',
      })
      if (byName !== 0) return byName

      const byReceiverId = String(a.point.receiverId || '').localeCompare(String(b.point.receiverId || ''), 'zh-CN', {
        numeric: true,
        sensitivity: 'base',
      })
      if (byReceiverId !== 0) return byReceiverId
      return a.index - b.index
    })
    .map((item) => item.point)

const runQuery = async (equipmentId: string) => {
  if (!equipmentId) {
    ElMessage.warning('请选择设备')
    return
  }
  queryLoading.value = true
  try {
    const tenantId = getTenantId()
    if (!tenantId) {
      analysisPoints.value = []
      selectedPointIds.value = []
      rmsRows.value = []
      deviceImageUrls.value = []
      queriedEquipmentId.value = equipmentId
      queryGeneration.value += 1
      ElMessage.warning('缺少 tenantId，无法查询点位')
      return
    }

    const tree = deviceTreeStore.deviceTreeData
    const pointRes = await getCheckPointsByEquipmentId({ tenantId, equipmentId })
    const rawPoints =
      pointRes?.rc === 0 ? normalizeEquipmentCheckPointList(pointRes.ret) : []
    const points: AnalysisPointItem[] = sortAnalysisPoints(
      rawPoints
      .map((p) => {
        const receiverId = getCheckPointReceiverId(p)
        if (!receiverId) return null
        const pointDeviceId = resolvePointDeviceIdFromTree(tree, receiverId) || receiverId
        const treePointName = resolvePointDisplayNameFromTree(tree, receiverId)
        const apiName = getCheckPointDisplayName(p)
        return {
          receiverId,
          pointName: treePointName || apiName || receiverId,
          pointDeviceId,
        } satisfies AnalysisPointItem
      })
      .filter((p): p is AnalysisPointItem => Boolean(p))
    )

    analysisPoints.value = points
    queriedEquipmentName.value = resolveEquipmentDisplayName(equipmentId)
    selectedPointIds.value = []
    selectedBySelectAll.value = false
    rmsRows.value = buildMockPointRmsRows(points)
    await loadDeviceImageSection(equipmentId)
    queriedEquipmentId.value = equipmentId
    queryGeneration.value += 1
  } catch {
    ElMessage.error('加载设备振动分析数据失败')
    analysisPoints.value = []
    selectedPointIds.value = []
    rmsRows.value = []
    deviceImageUrls.value = []
  } finally {
    queryLoading.value = false
  }
}

const handleQueryClick = () => {
  void runQuery(draftEquipmentId.value)
}

const pointAnchorId = (receiverId: string) => `va-point-${String(receiverId || '').replace(/[^\w-]/g, '_')}`

const pointFreqAnchorId = (receiverId: string) => `${pointAnchorId(receiverId)}-freq`

const scrollToPoint = (receiverId: string) => {
  const el =
    document.getElementById(pointFreqAnchorId(receiverId)) ||
    document.getElementById(pointAnchorId(receiverId))
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const VA_PAGE_ROOT_CLASS = 'va-page-active'
const BACK_TO_TOP_THRESHOLD = 320

const showBackToTop = ref(false)

const updateBackToTopVisible = () => {
  const top = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
  showBackToTop.value = top > BACK_TO_TOP_THRESHOLD
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const bootstrapEmbeddedQuery = async () => {
  const defaultId = initialEquipmentId.value
  if (!defaultId) return
  draftEquipmentId.value = defaultId
  if (!deviceTreeStore.deviceTreeData.length) {
    await deviceTreeStore.loadDeviceTreeData()
  }
  await runQuery(defaultId)
}

watch(
  () => props.equipmentId,
  (id) => {
    if (!props.embedded) return
    const next = id?.trim()
    if (!next || next === queriedEquipmentId.value) return
    void bootstrapEmbeddedQuery()
  },
)

onMounted(async () => {
  if (!props.embedded) {
    document.documentElement.classList.add(VA_PAGE_ROOT_CLASS)
    document.body.classList.add(VA_PAGE_ROOT_CLASS)
    updateBackToTopVisible()
    window.addEventListener('scroll', updateBackToTopVisible, { passive: true })
  }

  if (props.embedded) {
    await bootstrapEmbeddedQuery()
    return
  }

  await loadEquipmentOptions()
  const defaultId =
    initialEquipmentId.value ||
    equipmentOptions.value[0]?.equipmentId ||
    ''
  draftEquipmentId.value = defaultId
  if (defaultId) {
    if (!deviceTreeStore.deviceTreeData.length) {
      await deviceTreeStore.loadDeviceTreeData()
    }
    await runQuery(defaultId)
  }
})

onUnmounted(() => {
  if (!props.embedded) {
    window.removeEventListener('scroll', updateBackToTopVisible)
    document.documentElement.classList.remove(VA_PAGE_ROOT_CLASS)
    document.body.classList.remove(VA_PAGE_ROOT_CLASS)
  }
})
</script>

<style lang="scss">
@use '@/assets/styles/vibration-analysis-trend.scss';
</style>
