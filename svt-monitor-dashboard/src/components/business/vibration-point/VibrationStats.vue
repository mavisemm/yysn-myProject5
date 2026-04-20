<template>
  <div class="card-item stats-card">
    <div class="card-header">
      <div class="card-title app-section-title">基本指标</div>
      <div class="collect-time">采集时间：{{ vibrationCollectTime || '--' }}</div>
    </div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">
          速度有效值
          <div class="stat-unit">（单位：mm/s）</div>
        </div>
        <div class="stat-axes">
          <div class="axis-row">
            <span class="axis-name">x轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.xvelocityRms) }}</span>
          </div>
          <div class="axis-row">
            <span class="axis-name">y轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.yvelocityRms) }}</span>
          </div>
          <div class="axis-row">
            <span class="axis-name">z轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.zvelocityRms) }}</span>
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
            <span class="axis-name">x轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.xvelocityMax) }}</span>
          </div>
          <div class="axis-row">
            <span class="axis-name">y轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.yvelocityMax) }}</span>
          </div>
          <div class="axis-row">
            <span class="axis-name">z轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.zvelocityMax) }}</span>
          </div>
        </div>
      </div>
      <div class="stat-box">
        <div class="stat-label">
          加速度有效值
          <div class="stat-unit">（单位：m/s²）</div>
        </div>
        <div class="stat-axes">
          <div class="axis-row">
            <span class="axis-name">x轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.xaccelerationRms) }}</span>
          </div>
          <div class="axis-row">
            <span class="axis-name">y轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.yaccelerationRms) }}</span>
          </div>
          <div class="axis-row">
            <span class="axis-name">z轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.zaccelerationRms) }}</span>
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
            <span class="axis-name">x轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.xaccelerationMax) }}</span>
          </div>
          <div class="axis-row">
            <span class="axis-name">y轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.yaccelerationMax) }}</span>
          </div>
          <div class="axis-row">
            <span class="axis-name">z轴：</span
            ><span class="stat-value">{{ formatValue(vibrationData.zaccelerationMax) }}</span>
          </div>
        </div>
      </div>
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
    justify-content: space-between;
    align-items: center;
    padding: 10px 10px 0 20px;

    .card-title {
      color: #fff;
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
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
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
</style>
