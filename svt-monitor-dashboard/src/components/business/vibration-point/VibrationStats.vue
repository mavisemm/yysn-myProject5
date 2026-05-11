<template>
  <div class="card-item stats-card">
    <div class="card-header">
      <div class="card-header-row card-header-row--top">
        <div class="card-title app-section-title">基本指标</div>
        <div class="collect-time">数据采集时间：{{ vibrationCollectTime || '--' }}</div>
      </div>
      <div class="card-header-row card-header-row--toggle">
        <div class="metric-toggle" role="group" aria-label="速度或加速度指标">
          <button type="button" class="metric-toggle__btn"
            :class="{ 'metric-toggle__btn--active': metricKind === 'velocity' }" @click="metricKind = 'velocity'">
            速度
          </button>
          <span class="metric-toggle__divider" aria-hidden="true" />
          <button type="button" class="metric-toggle__btn"
            :class="{ 'metric-toggle__btn--active': metricKind === 'acceleration' }"
            @click="metricKind = 'acceleration'">
            加速度
          </button>
        </div>
      </div>
    </div>
    <div class="stats-grid">
      <template v-if="metricKind === 'velocity'">
        <div class="stat-box">
          <div class="stat-label">
            速度有效值
            <div class="stat-unit">（单位：mm/s）</div>
          </div>
          <div class="stat-axes">
            <div class="axis-row">
              <span class="axis-name">X轴：</span><span class="stat-value">{{ formatValue(vibrationData.xvelocityRms)
              }}</span>
            </div>
            <div class="axis-row">
              <span class="axis-name">Y轴：</span><span class="stat-value">{{ formatValue(vibrationData.yvelocityRms)
              }}</span>
            </div>
            <div class="axis-row">
              <span class="axis-name">Z轴：</span><span class="stat-value">{{ formatValue(vibrationData.zvelocityRms)
              }}</span>
            </div>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">
            速度最大值
            <div class="stat-unit">（单位：mm/s）</div>
          </div>
          <div class="stat-axes">
            <div class="axis-row">
              <span class="axis-name">X轴：</span><span class="stat-value">{{ formatValue(vibrationData.xvelocityMax)
              }}</span>
            </div>
            <div class="axis-row">
              <span class="axis-name">Y轴：</span><span class="stat-value">{{ formatValue(vibrationData.yvelocityMax)
              }}</span>
            </div>
            <div class="axis-row">
              <span class="axis-name">Z轴：</span><span class="stat-value">{{ formatValue(vibrationData.zvelocityMax)
              }}</span>
            </div>
          </div>
        </div>
      </template>
      <template v-if="metricKind === 'acceleration'">
        <div class="stat-box">
          <div class="stat-label">
            加速度有效值
            <div class="stat-unit">（单位：m/s²）</div>
          </div>
          <div class="stat-axes">
            <div class="axis-row">
              <span class="axis-name">X轴：</span><span class="stat-value">{{ formatValue(vibrationData.xaccelerationRms)
              }}</span>
            </div>
            <div class="axis-row">
              <span class="axis-name">Y轴：</span><span class="stat-value">{{ formatValue(vibrationData.yaccelerationRms)
              }}</span>
            </div>
            <div class="axis-row">
              <span class="axis-name">Z轴：</span><span class="stat-value">{{ formatValue(vibrationData.zaccelerationRms)
              }}</span>
            </div>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">
            加速度最大值
            <div class="stat-unit">（单位：m/s²）</div>
          </div>
          <div class="stat-axes">
            <div class="axis-row">
              <span class="axis-name">X轴：</span><span class="stat-value">{{ formatValue(vibrationData.xaccelerationMax)
              }}</span>
            </div>
            <div class="axis-row">
              <span class="axis-name">Y轴：</span><span class="stat-value">{{ formatValue(vibrationData.yaccelerationMax)
              }}</span>
            </div>
            <div class="axis-row">
              <span class="axis-name">Z轴：</span><span class="stat-value">{{ formatValue(vibrationData.zaccelerationMax)
              }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getVibrationMetricData, type VibrationMetricData } from '@/api/modules/device'
import { ElMessage } from 'element-plus'
import { useDeviceTreeStore } from '@/stores/deviceTree'

const route = useRoute()
const deviceTreeStore = useDeviceTreeStore()

const resolvePointDeviceId = (rid: string): string => {
  if (!rid) return ''
  for (const factory of deviceTreeStore.deviceTreeData) {
    for (const workshop of factory.children ?? []) {
      for (const device of workshop.children ?? []) {
        if (device.type !== 'device') continue
        const hit = (device.children ?? []).find((p) => p.type === 'point' && p.id === rid)
        if (hit?.deviceId) return hit.deviceId
      }
    }
  }
  return ''
}

const receiverIdFromParams = computed(() => {
  const rid = route.params.receiverId
  const resolved = Array.isArray(rid) ? rid[0] : rid
  return (typeof resolved === 'string' ? resolved : '') || ''
})

const pointDeviceId = computed(() => resolvePointDeviceId(receiverIdFromParams.value))

const emptyMetric = (): VibrationMetricData => ({
  xvelocityRms: 0,
  yvelocityRms: 0,
  zvelocityRms: 0,
  xvelocityMax: 0,
  yvelocityMax: 0,
  zvelocityMax: 0,
  xaccelerationRms: 0,
  yaccelerationRms: 0,
  zaccelerationRms: 0,
  xaccelerationMax: 0,
  yaccelerationMax: 0,
  zaccelerationMax: 0,
})

const vibrationData = ref<VibrationMetricData>(emptyMetric())
const vibrationCollectTime = ref('')

/** 基本指标默认仅展示速度；标题下方可切换查看加速度 */
const metricKind = ref<'velocity' | 'acceleration'>('velocity')

const formatValue = (value: number | undefined): string => (value ?? 0).toFixed(2)

const loadVibrationData = async () => {
  if (!pointDeviceId.value || !receiverIdFromParams.value) {
    ElMessage.warning('缺少设备或点位信息')
    return
  }
  try {
    const response = await getVibrationMetricData(pointDeviceId.value, receiverIdFromParams.value)
    if (response.rc === 0 && response.ret) {
      const r = response.ret
      vibrationCollectTime.value = r.collectTime ?? ''
      vibrationData.value = {
        ...emptyMetric(),
        xvelocityRms: r.xvelocityRms ?? 0,
        yvelocityRms: r.yvelocityRms ?? 0,
        zvelocityRms: r.zvelocityRms ?? 0,
        xvelocityMax: r.xvelocityMax ?? 0,
        yvelocityMax: r.yvelocityMax ?? 0,
        zvelocityMax: r.zvelocityMax ?? 0,
        xaccelerationRms: r.xaccelerationRms ?? 0,
        yaccelerationRms: r.yaccelerationRms ?? 0,
        zaccelerationRms: r.zaccelerationRms ?? 0,
        xaccelerationMax: r.xaccelerationMax ?? 0,
        yaccelerationMax: r.yaccelerationMax ?? 0,
        zaccelerationMax: r.zaccelerationMax ?? 0,
      }
    } else {
      vibrationCollectTime.value = ''
      ElMessage.warning('暂无振动数据')
    }
  } catch (error) {
    vibrationCollectTime.value = ''
    ElMessage.error('获取振动数据失败')
  }
}

watch(
  [receiverIdFromParams, pointDeviceId],
  ([rid, pid]) => {
    if (!rid || !pid) return
    void loadVibrationData()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.card-item {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .card-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px 10px 0 20px;

    .card-header-row--top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 12px;
    }

    .card-header-row--toggle {
      display: flex;
      align-items: center;
    }

    .card-title {
      color: #fff;
    }

    .metric-toggle {
      display: inline-flex;
      align-items: stretch;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(0, 0, 0, 0.2);
    }

    .metric-toggle__divider {
      align-self: stretch;
      width: 1px;
      margin: 6px 0;
      background: rgba(255, 255, 255, 0.22);
      flex-shrink: 0;
    }

    .metric-toggle__btn {
      margin: 0;
      padding: 6px 12px;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      color: #ffffff;
      border: none;
      background: transparent;
      transition: background 0.2s, color 0.2s, box-shadow 0.2s;

      &:hover {
        background: rgba(150, 150, 150, 0.2);
      }

      &--active {
        background: rgba(80, 140, 255, 0.28);
        box-shadow: inset 0 0 0 1px rgba(190, 220, 255, 0.45);
        color: #00f2fe;
      }
    }

    .collect-time {
      color: rgba(255, 255, 255, 0.75);
      font-size: 13px;
      line-height: 1;
    }
  }
}

.stats-card {
  width: 33.33%;

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
    gap: 10px;
    flex: 1;
    padding: 10px 10px 20px 20px;

    .stat-box {
      font-size: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(150, 150, 150, 0.1);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: stretch;
      padding: 8px 10px;

      .stat-label {
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 8px;
        text-align: center;
      }

      .stat-unit {
        margin-top: 2px;
        font-size: 0.8rem;
        line-height: 1.2;
        color: rgba(255, 255, 255, 0.5);
        font-weight: normal;
      }

      .stat-axes {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
        align-items: center;
      }

      .axis-row {
        display: flex;
        align-items: baseline;
        justify-content: center;
        width: auto;
        font-size: 0.8rem;
      }

      .axis-name {
        color: rgba(255, 255, 255, 0.55);
        flex-shrink: 0;
        margin-right: 4px;
      }

      .stat-value {
        color: #00f2fe;
        font-size: 0.8rem;

        .unit {
          font-weight: normal;
          color: rgba(255, 255, 255, 0.5);
          margin-left: 4px;
          font-size: 0.85rem;
        }
      }
    }
  }
}

@media (max-width: 800px) {
  .stats-card {
    width: 100%;
  }
}
</style>
