<template>
    <div class="info-section-right">
        <div class="section-title">详细信息</div>
        <div class="info-scroll-area">
            <div class="info-item">
                <span class="info-label">点位名称:</span>
                <span class="info-value">{{ pointName }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">设备名称:</span>
                <span class="info-value">{{ deviceName }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">上传时间:</span>
                <span class="info-value">{{ currentDataTime }}</span>
            </div>
        </div>
        <div class="audio-player">
            <audio ref="audioRef" :src="audioPath" controls preload="auto"></audio>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
    pointName: string;
    deviceName: string;
    currentDataTime: string;
    audioPath: string;
}>();

const audioRef = ref<HTMLAudioElement | null>(null);

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
        font-weight: bold;
    }

    .info-scroll-area {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 20px 20px 0 20px;

        .info-item {
            display: flex;
            flex-direction: column;

            .info-label {
                font-weight: bold;
                margin-bottom: 5px;
                font-size: clamp(12px, 1.5vw, 16px);
            }

            .info-value {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: clamp(14px, 2vw, 16px);
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