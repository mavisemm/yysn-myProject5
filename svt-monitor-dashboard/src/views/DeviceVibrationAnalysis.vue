<template>
  <div class="vibration-analysis-page">
    <div class="va-container">
      <header class="dashboard-header">
        <h1>设备振动分析</h1>
      </header>

      <section class="load-data-section">
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

      <section class="card">
        <div class="card-header">{{ rmsTableTitle }}</div>
        <div class="card-body data-table">
          <el-table v-if="rmsRows.length" :data="rmsRows" border stripe style="width: 100%">
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
          <div v-else class="va-empty-block">暂无点位数据</div>
        </div>
      </section>

      <section class="card">
        <div class="card-header">各点位振动速度频域 / 时域图</div>
        <div class="card-body">
          <template v-if="analysisPoints.length">
            <div
              v-for="p in analysisPoints"
              :id="pointAnchorId(p.receiverId)"
              :key="`${queryGeneration}:${p.receiverId}`"
              class="va-point-anchor"
            >
              <DeviceVibrationPointChartsLazy
                :receiver-id="p.receiverId"
                :point-device-id="p.pointDeviceId"
                :point-name="p.pointName"
                :query-generation="queryGeneration"
              />
            </div>
          </template>
          <div v-else class="va-empty-block">暂无点位，请先查询设备数据</div>
        </div>
      </section>
    </div>

    <aside
      v-if="pointMenuItems.length"
      class="va-point-float-menu"
      :class="{ 'is-collapsed': pointMenuCollapsed }"
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
        <div class="va-point-float-menu__title">点位目录</div>
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

    <button v-show="showBackToTop" type="button" class="va-back-to-top" aria-label="回到顶部" @click="scrollToTop">
      <el-icon class="va-back-to-top__icon">
        <ArrowUp />
      </el-icon>
      <span class="va-back-to-top__text">回到顶部</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, ArrowUp } from '@element-plus/icons-vue'
import { getTenantId } from '@/api/tenant'
import {
  getCheckPointsByEquipmentId,
  getProductionEquipmentList,
} from '@/api/modules/hardware'
import { fetchEquipmentImageUrls } from '@/components/business/device-detail/deviceImageUtils'
import type { AnalysisPointItem, EquipmentOption } from '@/utils/vibrationAnalysisTree'
import { buildMockPointRmsRows, type PointRmsRow } from '@/utils/vibrationAnalysisMock'
import DeviceVibrationPointChartsLazy from '@/components/business/vibration-analysis/DeviceVibrationPointChartsLazy.vue'
import EquipmentImageGallery from '@/components/business/device-detail/EquipmentImageGallery.vue'

const route = useRoute()

/** 分析页不在 PageLayout 内，需自行 provide，避免 CommonEcharts inject 告警 */
const backgroundMode = ref<'image' | 'navy' | 'solid'>('solid')
provide('backgroundMode', backgroundMode)

const initialEquipmentId = computed(() => {
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
const pointMenuCollapsed = ref(false)

const equipmentLoading = ref(false)
const equipmentOptions = ref<EquipmentOption[]>([])

const equipmentOptionsById = computed<Record<string, EquipmentOption>>(() => {
  const map: Record<string, EquipmentOption> = {}
  for (const o of equipmentOptions.value) map[o.equipmentId] = o
  return map
})
const pointMenuItems = computed(() =>
  analysisPoints.value.map((p) => ({
    receiverId: p.receiverId,
    label: String(p.pointName || p.receiverId || '').trim() || p.receiverId,
  })),
)

const queriedEquipmentLabel = computed(() => {
  if (queriedEquipmentName.value) return queriedEquipmentName.value
  return equipmentOptionsById.value[queriedEquipmentId.value]?.equipmentName ?? queriedEquipmentId.value
})

const rmsTableTitle = computed(() => {
  const name = String(queriedEquipmentLabel.value || '').trim()
  if (!name) return '设备所有点位速度有效值'
  return name.endsWith('设备') ? `${name}所有点位速度有效值` : `${name}设备所有点位速度有效值`
})

const loadDeviceImageSection = async (equipmentId: string) => {
  deviceImageUrls.value = []
  queriedEquipmentName.value = equipmentOptionsById.value[equipmentId]?.equipmentName ?? ''
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
      rmsRows.value = []
      deviceImageUrls.value = []
      queriedEquipmentId.value = equipmentId
      queryGeneration.value += 1
      ElMessage.warning('缺少 tenantId，无法查询点位')
      return
    }

    const pointRes = await getCheckPointsByEquipmentId({ tenantId, equipmentId })
    const rawPoints = Array.isArray(pointRes.ret) ? pointRes.ret : []
    const points: AnalysisPointItem[] = sortAnalysisPoints(
      rawPoints
      .map((p) => {
        const receiverId = String(p.receiverId ?? '').trim()
        if (!receiverId) return null
        return {
          receiverId,
          pointName: String(p.pointName ?? receiverId).trim() || receiverId,
          // 你确认 receiverId 就是 pointDeviceId
          pointDeviceId: receiverId,
        } satisfies AnalysisPointItem
      })
      .filter((p): p is AnalysisPointItem => Boolean(p))
    )

    analysisPoints.value = points
    rmsRows.value = buildMockPointRmsRows(points)
    await loadDeviceImageSection(equipmentId)
    queriedEquipmentId.value = equipmentId
    queryGeneration.value += 1
  } catch {
    ElMessage.error('加载设备振动分析数据失败')
    analysisPoints.value = []
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

const scrollToPoint = (receiverId: string) => {
  const el = document.getElementById(pointAnchorId(receiverId))
  if (!el) return
  const top = window.scrollY + el.getBoundingClientRect().top - 76
  const targetTop = Math.max(0, top)
  const distance = Math.abs((window.scrollY || 0) - targetTop)
  // 远距离跳转用 auto，避免 smooth 经过中间区域触发大量懒加载
  const behavior: ScrollBehavior = distance > 900 ? 'auto' : 'smooth'
  window.scrollTo({ top: targetTop, behavior })
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

onMounted(async () => {
  document.documentElement.classList.add(VA_PAGE_ROOT_CLASS)
  document.body.classList.add(VA_PAGE_ROOT_CLASS)
  updateBackToTopVisible()
  window.addEventListener('scroll', updateBackToTopVisible, { passive: true })

  await loadEquipmentOptions()
  const defaultId =
    initialEquipmentId.value ||
    equipmentOptions.value[0]?.equipmentId ||
    ''
  draftEquipmentId.value = defaultId
  if (defaultId) {
    await runQuery(defaultId)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateBackToTopVisible)
  document.documentElement.classList.remove(VA_PAGE_ROOT_CLASS)
  document.body.classList.remove(VA_PAGE_ROOT_CLASS)
})
</script>

<style lang="scss">
@use '@/assets/styles/vibration-analysis-trend.scss';
</style>
