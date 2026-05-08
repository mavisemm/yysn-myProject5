<template>
  <div class="sound-vib-segment" :class="[variant === 'mobile' ? 'mobile-font-nav' : '', `sound-vib-segment--${variant}`]"
    role="tablist" aria-label="监测类型切换">
    <button type="button" role="tab" :aria-selected="active === 'sound'" class="segment-item"
      :class="{ 'segment-item--active': active === 'sound' }" @click="goSound">
      <el-icon :size="iconSize" class="segment-icon">
        <Microphone />
      </el-icon>
      <span>声音</span>
    </button>
    <span class="segment-divider" aria-hidden="true" />
    <button type="button" role="tab" :aria-selected="active === 'vibration'" class="segment-item"
      :class="{ 'segment-item--active': active === 'vibration' }" @click="goVibration">
      <el-icon :size="iconSize" class="segment-icon">
        <Lightning />
      </el-icon>
      <span>振动</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Microphone, Lightning } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    variant?: 'header' | 'mobile'
  }>(),
  { variant: 'header' },
)

const route = useRoute()
const router = useRouter()

const iconSize = computed(() => (props.variant === 'mobile' ? 20 : 24))

const receiverId = computed(() => {
  const p = route.params.receiverId
  const raw = Array.isArray(p) ? p[0] : p
  return typeof raw === 'string' ? raw : ''
})

const active = computed<'sound' | 'vibration'>(() => {
  if (route.name === 'VibrationPoint') return 'vibration'
  return 'sound'
})

const goSound = () => {
  if (route.name === 'SoundPoint') return
  const id = receiverId.value
  if (!id) return
  void router.push({ name: 'SoundPoint', params: { receiverId: id }, query: { ...route.query } })
}

const goVibration = () => {
  if (route.name === 'VibrationPoint') return
  const id = receiverId.value
  if (!id) return
  void router.push({ name: 'VibrationPoint', params: { receiverId: id }, query: { ...route.query } })
}
</script>

<style lang="scss" scoped>
.sound-vib-segment {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;

  &:not(.sound-vib-segment--mobile) .segment-item:first-of-type {
    border-radius: 8px 0 0 8px;
  }

  &:not(.sound-vib-segment--mobile) .segment-item:last-of-type {
    border-radius: 0 8px 8px 0;
  }
}

.segment-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, color 0.2s;
  color: #ffffff;
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  background: transparent;
  border-radius: 0;

  &:hover {
    background: rgba(150, 150, 150, 0.2);
    color: #ffffff;
  }

  .segment-icon {
    color: #cfe4ff;
    flex-shrink: 0;
    transition: color 0.2s ease;
  }

  span {
    background: linear-gradient(177.37deg, #ffffff 2.19%, #7ea8ff 160.82%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transition: color 0.2s ease, -webkit-text-fill-color 0.2s ease;
  }

  &--active {
    background: rgba(80, 140, 255, 0.28);
    box-shadow: inset 0 0 0 1px rgba(190, 220, 255, 0.45);

    .segment-icon {
      color: #00f2fe;
    }

    span {
      background: none;
      background-clip: border-box;
      -webkit-background-clip: border-box;
      color: #00f2fe;
      -webkit-text-fill-color: #00f2fe;
    }

    &:hover {
      background: rgba(90, 150, 255, 0.34);
    }
  }
}

.segment-divider {
  align-self: stretch;
  width: 1px;
  min-height: 1.2em;
  margin: 8px 0;
  background: rgba(255, 255, 255, 0.22);
  flex-shrink: 0;
}

.sound-vib-segment--mobile {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.2);

  .segment-item {
    padding: 8px 10px;
    min-height: 36px;
    font-size: inherit;

    &--active {
      background: rgba(80, 140, 255, 0.32);
      box-shadow: inset 0 0 0 1px rgba(200, 225, 255, 0.4);
    }
  }

  .segment-divider {
    margin: 6px 0;
  }
}
</style>
