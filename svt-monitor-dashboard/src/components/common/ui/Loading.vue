<template>
    <div v-if="loading" class="common-loading" :class="{ 'fullscreen': fullscreen }">
        <div class="loading-wrapper">
            <div class="loading-spinner">
                <el-icon :size="size" :color="color" class="spinner-icon">
                    <Loading />
                </el-icon>
                <p v-if="text" class="loading-text">{{ text }}</p>
            </div>
        </div>
    </div>
    <slot v-else />
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'

interface Props {
    loading?: boolean
    text?: string
    size?: number | string
    color?: string
    fullscreen?: boolean
    background?: string
    spinnerClass?: string
    textClass?: string
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    size: 28,
    color: '#409eff',
    fullscreen: false,
    background: 'rgba(0, 0, 0, 0.7)'
})
</script>

<style scoped>
.common-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2000;
    background-color: v-bind('props.background');
    display: flex;
    align-items: center;
    justify-content: center;
}

.common-loading.fullscreen {
    position: fixed;
    z-index: 3000;
}

.loading-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.spinner-icon {
    animation: rotate 2s linear infinite;
}

.loading-text {
    margin-top: 10px;
    color: #fff;
    font-size: clamp(12px, 2vw, 14px);
    /* 响应式字体大小 */
    text-align: center;
}

@keyframes rotate {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>