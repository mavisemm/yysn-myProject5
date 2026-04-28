<template>
  <div class="info-section-right">
    <div class="section-title app-section-title">详细信息</div>
    <div class="info-scroll-area">
      <div class="info-item">
        <span class="info-content">
          <span class="info-label mobile-font-title">聚类名称：</span>
          <span class="info-value mobile-font-title">{{ clusterName }}</span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-content">
          <span class="info-label mobile-font-title">生产设备：</span>
          <span class="info-value mobile-font-title">{{ productionEquipment }}</span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-content">
          <span class="info-label mobile-font-title">子部件：</span>
          <span class="info-value mobile-font-title">{{ subComponent }}</span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-content">
          <span class="info-label mobile-font-title">检测设备：</span>
          <span class="info-value mobile-font-title">{{ detectionEquipment }}</span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-content">
          <span class="info-label mobile-font-title">听筒：</span>
          <span class="info-value mobile-font-title">{{ microphone }}</span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-content">
          <span class="info-label mobile-font-title">点位名称：</span>
          <span class="info-value mobile-font-title">{{ pointName }}</span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-content">
          <span class="info-label mobile-font-title">偏差值：</span>
          <span class="info-value mobile-font-title">{{ deviationValue }}</span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-content">
          <span class="info-label mobile-font-title">上传时间：</span>
          <span class="info-value mobile-font-title">{{ uploadTimeText }}</span>
        </span>
      </div>
    </div>
    <div class="audio-player">
      <audio ref="audioRef" :src="audioPath" controls preload="auto"></audio>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  pointName: string
  deviceName: string
  currentDataTime: string
  audioPath: string
  clusterName?: string
  productionEquipment?: string
  subComponent?: string
  detectionEquipment?: string
  microphone?: string
  deviationValue?: string | number
  uploadTime?: string
}>()

const audioRef = ref<HTMLAudioElement | null>(null)

const productionEquipment = computed(() => props.productionEquipment || props.deviceName || '')
const clusterName = computed(() => props.clusterName || '')
const subComponent = computed(() => props.subComponent || '')
const detectionEquipment = computed(() => props.detectionEquipment || '')
const microphone = computed(() => props.microphone || '')
const deviationValue = computed(() =>
  props.deviationValue !== undefined && props.deviationValue !== '' ? props.deviationValue : '',
)
const uploadTimeText = computed(() => props.uploadTime || props.currentDataTime || '')

watch(
  () => props.audioPath,
  (newPath) => {
    if (newPath && audioRef.value) {
      setTimeout(() => {
        audioRef.value?.play().catch(() => {
          console.info('音频播放受阻，请手动点击')
        })
      }, 100)
    }
  },
)
</script>

<style lang="scss" scoped>
.info-section-right {
  flex: 1;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-width: 0;

  .section-title {
    padding: 10px 10px 0 10px;
  }

  .info-scroll-area {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 10px 0 10px;

    .info-item {
      padding: 8px 0;
      min-height: 28px;
      display: flex;
      align-items: center;

      .info-content {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-height: 28px;

        .info-label {
          font-size: 0.9rem;
          color: #ccc;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .info-value {
          font-size: 0.9rem;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-height: 1.2em;
        }
      }
    }
  }

  .audio-player {
    padding: 10px 10px 20px 10px;

    audio {
      width: 100%;
      height: 34px;
    }
  }
}

@media (max-width: 800px) {
  .info-section-right {
    flex: none;
  }

  .info-section-right .section-title,
  .info-section-right .info-scroll-area,
  .info-section-right .audio-player {
    padding-left: 12px;
    padding-right: 12px;
  }

  .info-section-right .info-scroll-area {
    overflow: visible;
  }

  .info-section-right .info-scroll-area .info-item .info-content {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 4px 8px;
  }

  .info-section-right .info-scroll-area .info-item .info-content .info-value {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    word-break: break-all;
  }
}
</style>
