<template>
    <div class="info-section-right">
        <div class="section-title app-section-title">详细信息</div>
        <div class="info-scroll-area">
            <div class="info-item">
                <span class="info-content">
                    <span class="info-label">聚类名称：</span>
                    <span class="info-value">{{ clusterName }}</span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-content">
                    <span class="info-label">生产设备：</span>
                    <span class="info-value">{{ productionEquipment }}</span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-content">
                    <span class="info-label">子部件：</span>
                    <span class="info-value">{{ subComponent }}</span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-content">
                    <span class="info-label">检测设备：</span>
                    <span class="info-value">{{ detectionEquipment }}</span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-content">
                    <span class="info-label">听筒：</span>
                    <span class="info-value">{{ microphone }}</span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-content">
                    <span class="info-label">点位名称：</span>
                    <span class="info-value">{{ pointName }}</span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-content">
                    <span class="info-label">偏差值：</span>
                    <span class="info-value">{{ deviationValue }}</span>
                </span>
            </div>
        </div>
        <div class="audio-player">
            <audio ref="audioRef" :src="audioPath" controls preload="auto"></audio>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const props = defineProps<{
    pointName: string;
    deviceName: string;
    currentDataTime: string;
    audioPath: string;
    clusterName?: string;
    productionEquipment?: string;
    subComponent?: string;
    detectionEquipment?: string;
    microphone?: string;
    deviationValue?: string | number;
    uploadTime?: string;
}>();

const audioRef = ref<HTMLAudioElement | null>(null);

// 无值就空着，不填占位符（保持每行固定高度由 CSS 控制，下一行不会挤上来）
const productionEquipment = computed(() => props.productionEquipment || props.deviceName || '');
const clusterName = computed(() => props.clusterName || '');
const subComponent = computed(() => props.subComponent || '');
const detectionEquipment = computed(() => props.detectionEquipment || '');
const microphone = computed(() => props.microphone || '');
const deviationValue = computed(() => (props.deviationValue !== undefined && props.deviationValue !== '') ? props.deviationValue : '');

// 当音频路径变化时自动播放
watch(() => props.audioPath, (newPath) => {
    if (newPath && audioRef.value) {
        setTimeout(() => {
            audioRef.value?.play().catch(() => {
                console.info('音频播放受阻，请手动点击');
            });
        }, 100);
    }
});
</script>

<style lang="scss" scoped>
.info-section-right {
    background: url('@/assets/images/background/首页-数据统计背景.png') no-repeat center center;
    background-size: 100% 100%;
    flex: 1;
    border-radius: 8px;
    display: flex;
    flex-direction: column;

    .section-title {
        padding: 20px 20px 0 20px;
        font-size: clamp(18px, 2.5vw, 24px);
    }

    .info-scroll-area {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 20px 20px 0 20px;

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
                    //font-weight: bold;
                    font-size: clamp(12px, 1.5vw, 16px);
                    color: #ccc;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .info-value {
                    font-size: clamp(14px, 2vw, 16px);
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
        padding: 20px;

        audio {
            width: 100%;
            height: 34px;
        }
    }
}
</style>