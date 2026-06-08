<template>
  <div class="charts-analysis-module">
    <div class="charts-analysis-toolbar" @mousedown.stop @wheel.stop>
      <div class="charts-analysis-toolbar__actions">
        <CommonDateTimePicker v-model="dateRange" class="charts-analysis-date-picker" width="400px" enable-presets />
        <el-tooltip v-for="item in viewToolItems" :key="item.key" :content="item.label" placement="bottom">
          <button type="button" class="charts-analysis-tool-btn"
            :class="{ 'charts-analysis-tool-btn--active': activeViewKey === item.key }" :aria-label="item.label"
            @click="openView(item.key)">
            <el-icon :size="20">
              <component :is="item.icon" />
            </el-icon>
          </button>
        </el-tooltip>
      </div>
    </div>

    <div v-if="openTabs.length" class="charts-analysis-subtabs">
      <button v-for="tab in openTabs" :key="tab.id" type="button" class="charts-analysis-subtab"
        :class="{ 'charts-analysis-subtab--active': tab.id === activeTabId }" @click="activeTabId = tab.id">
        <span class="charts-analysis-subtab__label">{{ tab.label }}</span>
        <el-icon class="charts-analysis-subtab__close" aria-label="关闭" @click.stop="closeTab(tab.id)">
          <Close />
        </el-icon>
      </button>
      <button v-if="openTabs.length > 3" type="button" class="charts-analysis-close-all" @click="closeAllTabs">
        关闭所有标签
      </button>
    </div>

    <div class="charts-analysis-body">
      <template v-if="activeTab">
        <DeviceSvtTrendPanel v-if="activeTab.viewKey === 'svt-trend'" :key="`svt-${activeTab.receiverId}`"
          :receiver-id="activeTab.receiverId" :date-range="dateRange" />
        <DeviceSpectrumPanel v-else-if="activeTab.viewKey === 'spectrum'" :key="`spectrum-${activeTab.receiverId}`"
          :receiver-id="activeTab.receiverId" :date-range="dateRange" />
        <DeviceSoundTrendEmbed v-else-if="activeTab.viewKey === 'sound-trend'"
          :key="`sound-trend-${activeTab.receiverId}`" :receiver-id="activeTab.receiverId"
          :point-name="activeTab.pointName" />
        <DeviceVibrationAnalysisEmbed v-else-if="activeTab.viewKey === 'vibration-analysis'"
          :key="`vibration-${equipmentId}`" :equipment-id="equipmentId" />
        <DeviceWaterfallEmbed v-else-if="activeTab.viewKey === 'waterfall'" :key="`waterfall-${activeTab.receiverId}`"
          :receiver-id="activeTab.receiverId" :equipment-id="equipmentId" :date-range="dateRange" />
      </template>
      <div v-else class="charts-analysis-empty">
        请点击上方图标打开分析视图
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElIcon, ElTooltip } from 'element-plus'
import {
  Close,
  DataLine,
  Histogram,
  TrendCharts,
  Odometer,
  Grid,
} from '@element-plus/icons-vue'
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue'
import type { DeviceDetailPointInfo } from './deviceDetailTypes'
import DeviceSvtTrendPanel from './DeviceSvtTrendPanel.vue'
import DeviceSpectrumPanel from './DeviceSpectrumPanel.vue'
import DeviceSoundTrendEmbed from './DeviceSoundTrendEmbed.vue'
import DeviceVibrationAnalysisEmbed from './DeviceVibrationAnalysisEmbed.vue'
import DeviceWaterfallEmbed from './DeviceWaterfallEmbed.vue'
import {
  type ChartsAnalysisViewKey,
  type ChartsAnalysisTab,
  type ChartsAnalysisSessionPayload,
  CHARTS_ANALYSIS_VIEW_META,
  buildChartsAnalysisTabId,
} from './chartsAnalysisTypes'

const props = defineProps<{
  pointList: DeviceDetailPointInfo[]
  selectedPointId?: string
  equipmentId?: string | null
}>()

const emit = defineEmits<{
  'update:selectedPointId': [pointId: string]
  'session-change': [payload: ChartsAnalysisSessionPayload]
}>()

const dateRange = ref<[string, string] | null>(null)
const openTabs = ref<ChartsAnalysisTab[]>([])
const activeTabId = ref('')

const equipmentId = computed(() => props.equipmentId?.trim() || '')

const resolveReceiverId = (receiverId?: string) => {
  const explicit = receiverId?.trim()
  if (explicit) return explicit
  return props.selectedPointId?.trim() || props.pointList?.[0]?.id?.trim() || ''
}

const resolvePointName = (receiverId: string) => {
  const found = props.pointList.find((p) => p.id === receiverId)
  return found?.name?.trim() || receiverId
}

const viewToolItems: { key: ChartsAnalysisViewKey; label: string; icon: typeof DataLine }[] = [
  { key: 'svt-trend', label: CHARTS_ANALYSIS_VIEW_META['svt-trend'].label, icon: DataLine },
  { key: 'spectrum', label: CHARTS_ANALYSIS_VIEW_META.spectrum.label, icon: Histogram },
  { key: 'sound-trend', label: CHARTS_ANALYSIS_VIEW_META['sound-trend'].label, icon: TrendCharts },
  {
    key: 'vibration-analysis',
    label: CHARTS_ANALYSIS_VIEW_META['vibration-analysis'].label,
    icon: Odometer,
  },
  { key: 'waterfall', label: CHARTS_ANALYSIS_VIEW_META.waterfall.label, icon: Grid },
]

const activeTab = computed(() => openTabs.value.find((t) => t.id === activeTabId.value) ?? null)

const activeViewKey = computed<ChartsAnalysisViewKey | null>(
  () => activeTab.value?.viewKey ?? null,
)

const buildTabLabel = (viewKey: ChartsAnalysisViewKey, pointName: string) => {
  const meta = CHARTS_ANALYSIS_VIEW_META[viewKey]
  return `${meta.label} · ${pointName}`
}

const syncSelectedPoint = (receiverId: string) => {
  if (!receiverId) return
  emit('update:selectedPointId', receiverId)
}

const emitSessionChange = () => {
  const tab = activeTab.value
  if (!tab?.receiverId || !tab.viewKey) return
  emit('session-change', { receiverId: tab.receiverId, viewKey: tab.viewKey })
}

const getActiveSession = () => {
  const tab = activeTab.value
  return {
    receiverId: tab?.receiverId ?? '',
    viewKey: tab?.viewKey ?? null,
    activeTabId: activeTabId.value,
    hasTabs: openTabs.value.length > 0,
  }
}

const openView = (viewKey: ChartsAnalysisViewKey, receiverId?: string) => {
  const rid = resolveReceiverId(receiverId)
  if (!rid) return
  const pointName = resolvePointName(rid)
  const id = buildChartsAnalysisTabId(viewKey, rid)
  const existing = openTabs.value.find((t) => t.id === id)
  if (existing) {
    activeTabId.value = existing.id
    syncSelectedPoint(rid)
    emitSessionChange()
    return
  }
  const tab: ChartsAnalysisTab = {
    id,
    viewKey,
    receiverId: rid,
    pointName,
    label: buildTabLabel(viewKey, pointName),
  }
  openTabs.value.push(tab)
  activeTabId.value = tab.id
  syncSelectedPoint(rid)
  emitSessionChange()
}

watch(activeTabId, () => {
  const tab = activeTab.value
  if (tab?.receiverId) {
    syncSelectedPoint(tab.receiverId)
    emitSessionChange()
  }
})

const closeTab = (tabId: string) => {
  const index = openTabs.value.findIndex((t) => t.id === tabId)
  if (index < 0) return
  openTabs.value.splice(index, 1)
  if (activeTabId.value === tabId) {
    const next = openTabs.value[index] ?? openTabs.value[index - 1]
    activeTabId.value = next?.id ?? ''
    emitSessionChange()
  }
}

const closeAllTabs = () => {
  openTabs.value = []
  activeTabId.value = ''
}

defineExpose({
  openView,
  getActiveSession,
})
</script>

<style lang="scss" scoped>
.charts-analysis-module {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  gap: 8px;
}

.charts-analysis-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 4px 2px;

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.charts-analysis-tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;

  &:hover {
    border-color: rgba(153, 240, 255, 0.6);
    color: #fff;
  }

  &--active {
    border-color: var(--special-font-color, #99f0ff);
    background: rgba(153, 240, 255, 0.15);
    color: var(--special-font-color, #99f0ff);
  }
}

.charts-analysis-subtabs {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-height: 32px;
  padding: 0 2px;
}

.charts-analysis-close-all {
  flex: 0 0 auto;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid rgba(255, 120, 120, 0.45);
  background: rgba(255, 80, 80, 0.12);
  color: rgba(255, 200, 200, 0.95);
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;

  &:hover {
    border-color: rgba(255, 140, 140, 0.8);
    background: rgba(255, 80, 80, 0.22);
    color: #fff;
  }
}

.charts-analysis-subtab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: min(360px, 100%);
  padding: 4px 8px 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.15);
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;

  &--active {
    border-color: var(--special-font-color, #99f0ff);
    background: rgba(153, 240, 255, 0.12);
    color: var(--special-font-color, #99f0ff);
  }

  &__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__close {
    flex: 0 0 auto;
    font-size: 14px;
    opacity: 0.75;

    &:hover {
      opacity: 1;
    }
  }
}

.charts-analysis-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.charts-analysis-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.25);
  border-radius: 8px;
}

.charts-analysis-date-picker {
  flex: 0 0 auto;
}

@media (max-width: 800px) {
  .charts-analysis-toolbar__actions {
    justify-content: flex-start;
  }
}
</style>
