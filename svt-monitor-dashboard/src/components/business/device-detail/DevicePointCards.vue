<template>
  <div class="device-point-cards">
    <div v-if="pointsLoading && !sortedPoints.length" class="device-point-cards__empty">
      <AsyncStatusText text="加载中" size="small" />
    </div>
    <div v-else-if="!sortedPoints.length" class="device-point-cards__empty">
      <CommonEmptyState text="暂无数据" size="small" />
    </div>
    <template v-else>
      <div class="device-point-cards__content">
        <div class="device-summary-card">
          <div class="device-summary-card__title">设备汇总</div>
          <div class="device-summary-card__row">
            <span class="device-summary-card__label">点位总数</span>
            <span class="device-summary-card__value">{{ pointSummary.totalPoints }}</span>
          </div>
          <div class="device-summary-card__row">
            <span class="device-summary-card__label">预警点位</span>
            <span class="device-summary-card__value device-summary-card__value--warning">
              {{ pointSummary.warningPoints }}
            </span>
          </div>
          <div class="device-summary-card__row">
            <span class="device-summary-card__label">报警点位</span>
            <span class="device-summary-card__value device-summary-card__value--alarm">
              {{ pointSummary.alarmPoints }}
            </span>
          </div>
        </div>
        <div class="device-point-cards__main">
          <div class="device-point-cards__grid-wrap">
            <div
              class="device-point-cards__grid"
              :class="{ 'device-point-cards__grid--loading': pointsLoading === true }"
            >
              <div
                v-for="point in pagedPoints"
                :key="point.id"
                class="point-card"
                :class="{ 'point-card--active': point.id === selectedPointId }"
                @click="emit('select', point.id)"
              >
                <div class="point-card__title" :title="point.name">{{ point.name }}</div>
                <div class="point-card__metrics">
                  <div class="metric-row">
                    <span class="metric-label">声音偏差值：</span>
                    <span class="metric-value">{{ metricOf(point.id).soundDeviation }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-label">X轴(A)速度有效值：</span>
                    <span class="metric-value">{{ metricOf(point.id).xVelocityRms }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-label">Y轴(H)速度有效值：</span>
                    <span class="metric-value">{{ metricOf(point.id).yVelocityRms }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-label">Z轴(V)速度有效值：</span>
                    <span class="metric-value">{{ metricOf(point.id).zVelocityRms }}</span>
                  </div>
                  <div class="metric-row">
                    <span class="metric-label">温度：</span>
                    <span class="metric-value">{{ metricOf(point.id).temperature }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="pointsLoading" class="device-point-cards__loading-mask">
              <AsyncStatusText text="加载中" size="small" />
            </div>
          </div>
          <div v-if="totalPages > 1" class="device-point-cards__pagination">
            <span class="pagination-page-meta">共 {{ totalPages }} 页，第 {{ currentPage }} 页</span>
            <el-pagination
              layout="prev, pager, next"
              :current-page="currentPage"
              :page-size="pageSize"
              :total="sortedPoints.length"
              @current-change="onPageChange"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElPagination } from 'element-plus'
import CommonEmptyState from '@/components/common/ui/CommonEmptyState.vue'
import AsyncStatusText from '@/components/common/ui/AsyncStatusText.vue'
import { sortPointsByPointOrder } from './deviceDetailPoints'
import type { DeviceDetailPointInfo } from './deviceDetailTypes'
import { EMPTY_POINT_CARD_METRICS, type PointCardMetrics } from './devicePointMetrics'
import type { DevicePointSummary } from '@/stores/devicePointData'

const COLUMNS_PER_ROW = 4
const ROWS_PER_PAGE = 2
const PAGE_SIZE = COLUMNS_PER_ROW * ROWS_PER_PAGE

const props = defineProps<{
  points: DeviceDetailPointInfo[]
  selectedPointId?: string
  pointMetricsMap?: Record<string, PointCardMetrics>
  pointSummary?: DevicePointSummary
  /** 点位列表/指标接口请求中 */
  pointsLoading?: boolean
}>()

const emit = defineEmits<{
  select: [pointId: string]
}>()

const currentPage = ref(1)
const pageSize = PAGE_SIZE

const sortedPoints = computed(() => sortPointsByPointOrder(props.points))

const totalPages = computed(() =>
  Math.max(1, Math.ceil(sortedPoints.value.length / pageSize)),
)

const pagedPoints = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return sortedPoints.value.slice(start, start + pageSize)
})

const metricOf = (pointId: string): PointCardMetrics =>
  props.pointMetricsMap?.[pointId] ?? EMPTY_POINT_CARD_METRICS
const pointSummary = computed<DevicePointSummary>(() => {
  const raw = props.pointSummary
  return {
    totalPoints: Number(raw?.totalPoints ?? sortedPoints.value.length),
    warningPoints: Number(raw?.warningPoints ?? 0),
    alarmPoints: Number(raw?.alarmPoints ?? 0),
  }
})

const onPageChange = (page: number) => {
  if (page === currentPage.value) return
  currentPage.value = page
}

watch(
  () => sortedPoints.value.map((p) => p.id).join(','),
  () => {
    if (currentPage.value !== 1) {
      currentPage.value = 1
    }
  },
)

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})
</script>

<style lang="scss" scoped>
.device-point-cards {
  &__content {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 8px;
  }

  &__main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__grid-wrap {
    flex: 1;
    min-height: 0;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  &__loading-mask {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 25, 45, 0.55);
    border-radius: 8px;
    pointer-events: none;
  }

  &__grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 8px;
    align-content: stretch;
    overflow: hidden;
    padding: 2px;
    transition: opacity 0.15s ease;

    &--loading {
      opacity: 0.72;
      pointer-events: none;
    }
  }

  &__pagination {
    flex: 0 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 6px 4px 0;
  }
}

.device-summary-card {
  width: 150px;
  flex: 0 0 150px;
  align-self: flex-start;
  height: calc((100% - 8px) / 2);
  border-radius: 8px;
  border: 1px solid rgba(100, 180, 255, 0.25);
  background: rgba(15, 40, 70, 0.65);
  padding: 10px 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__title {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--special-font-color, #99f0ff);
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.82rem;
  }

  &__label {
    color: rgba(255, 255, 255, 0.7);
  }

  &__value {
    color: #fff;
    font-weight: 600;
  }

  &__value--warning {
    color: #ffd35a;
  }

  &__value--alarm {
    color: #ff7a7a;
  }
}

.pagination-page-meta {
  color: #fff;
  font-size: 0.9rem;
  white-space: nowrap;
}

.point-card {
  container-type: size;
  container-name: point-card;
  min-height: 0;
  height: 100%;
  padding: clamp(4px, 6%, 10px) clamp(5px, 5%, 10px);
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: rgba(15, 40, 70, 0.65);
  border: 1px solid rgba(100, 180, 255, 0.25);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: rgba(100, 200, 255, 0.55);
  }

  &--active {
    border-color: rgba(100, 220, 255, 0.85);
    box-shadow: 0 0 8px rgba(80, 180, 255, 0.35);
  }

  &__title {
    flex: 0 0 auto;
    /* fallback：避免部分浏览器不支持 cqh 导致 font-size 失效回退到 16px（进而挤出底部“温度”行） */
    font-size: clamp(0.68rem, 1.2vh, 0.95rem);
    font-weight: 600;
    margin-bottom: clamp(2px, 4%, 8px);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--special-font-color, #99f0ff);
  }

  &__metrics {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    gap: clamp(0px, 2%, 4px);
  }
}

.metric-row {
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  min-height: 0;
  /* fallback：同上，优先保证内容“能放下” */
  font-size: clamp(0.6rem, 1vh, 0.78rem);
  line-height: 1.15;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;

  .metric-label {
    flex: 0 0 auto;
    color: rgba(255, 255, 255, 0.65);
    white-space: nowrap;
  }

  .metric-value {
    flex: 1 1 auto;
    min-width: 0;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* 当浏览器支持容器查询单位时，再启用 cqh 精细自适应 */
@supports (font-size: 1cqh) {
  .point-card__title {
    font-size: clamp(0.65rem, 11cqh, 0.95rem);
  }

  .metric-row {
    font-size: clamp(0.58rem, 8.5cqh, 0.78rem);
  }
}

:deep(.el-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-button-disabled-bg-color: transparent;
}

:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next),
:deep(.el-pagination .el-pager li) {
  background: rgba(15, 40, 70, 0.5) !important;
  color: #fff !important;
}

:deep(.el-pagination .el-pager li.is-active) {
  color: var(--special-font-color, #99f0ff) !important;
}

/* 卡片高度不足时逐级缩小字号与间距（按单卡容器高度，非整页视口） */
@container point-card (max-height: 132px) {
  .point-card__title {
    font-size: 0.82rem;
    margin-bottom: 3px;
  }

  .point-card__metrics {
    gap: 2px;
  }

  .metric-row {
    font-size: 0.7rem;
    line-height: 1.12;
  }
}

@container point-card (max-height: 112px) {
  .point-card {
    padding: 5px 7px;
  }

  .point-card__title {
    font-size: 0.74rem;
    margin-bottom: 2px;
  }

  .point-card__metrics {
    gap: 1px;
  }

  .metric-row {
    font-size: 0.64rem;
    line-height: 1.1;
  }
}

@container point-card (max-height: 96px) {
  .point-card {
    padding: 4px 5px;
  }

  .point-card__title {
    font-size: 0.68rem;
    margin-bottom: 1px;
  }

  .metric-row {
    font-size: 0.58rem;
    line-height: 1.05;
  }
}

@container point-card (max-height: 82px) {
  .point-card__title {
    font-size: 0.62rem;
  }

  .metric-row {
    font-size: 0.54rem;
    line-height: 1;
  }
}
</style>
