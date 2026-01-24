<template>
    <div class="alarm-area">
        <h3>{{ title }}</h3>
        <div class="alarm-grid">
            <slot name="alarms"></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    title: string;
}

defineProps<Props>();
</script>

<style lang="scss" scoped>
.alarm-area {
    flex: 0 0 60%;
    padding: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background: url('@/assets/images/background/预警总览背景.png') no-repeat center center;
    background-size: 100% 100%;

    h3 {
        margin-top: 0;
        margin-bottom: 16px;
    }

    .alarm-grid {
        flex: 1;
        overflow: hidden;
        box-sizing: border-box;
    }
}
</style>