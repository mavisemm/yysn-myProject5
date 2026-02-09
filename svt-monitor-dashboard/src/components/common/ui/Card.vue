<template>
    <div class="common-card" :class="{ 'collapsed': isCollapsed, 'shadow-hover': shadow === 'hover' }">
        <div class="card-header" @click="handleHeaderClick" v-if="showHeader">
            <div class="header-left">
                <slot name="title">
                    <h3 class="title">{{ title }}</h3>
                </slot>
            </div>
            <div class="header-right">
                <slot name="extra">
                    <el-button v-if="collapsible" link type="primary" size="small" @click.stop="toggleCollapse">
                        <el-icon>
                            <ArrowDown v-if="!isCollapsed" />
                            <ArrowUp v-else />
                        </el-icon>
                    </el-button>
                </slot>
            </div>
        </div>
        <div class="card-content" :style="{ maxHeight: contentMaxHeight }">
            <slot />
        </div>
        <div class="card-footer" v-if="$slots.footer">
            <slot name="footer" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'

interface Props {
    title?: string
    collapsible?: boolean
    collapsed?: boolean
    shadow?: 'always' | 'hover' | 'never'
    headerClick?: boolean
    height?: string | number
    showHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    collapsible: false,
    collapsed: false,
    shadow: 'always',
    headerClick: false,
    height: 'auto',
    showHeader: true
})

const emit = defineEmits<{
    'collapse-change': [collapsed: boolean]
}>()

const isCollapsed = ref(props.collapsed)

const contentMaxHeight = computed(() => {
    if (isCollapsed.value) {
        return '0px'
    }
    return props.height === 'auto' ? 'none' : `${props.height}px`
})

const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value
    emit('collapse-change', isCollapsed.value)
}

const handleHeaderClick = () => {
    if (props.headerClick && props.collapsible) {
        toggleCollapse()
    }
}

const shadowStyle = computed(() => {
    switch (props.shadow) {
        case 'always':
            return '0 2px 12px 0 rgba(0, 0, 0, 0.1)';
        case 'hover':
            return 'none';
        case 'never':
            return 'none';
        default:
            return '0 2px 12px 0 rgba(0, 0, 0, 0.1)';
    }
})

const headerCursor = computed(() => {
    return props.headerClick && props.collapsible ? 'pointer' : 'default';
})
</script>

<style scoped>
.common-card {
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: v-bind('shadowStyle');
    transition: all 0.3s ease;
}

.common-card.shadow-hover:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.common-card.collapsed {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #ebeef5;
    cursor: v-bind('headerCursor');
}

.card-header:hover {
    background-color: #f5f7fa;
}

.header-left {
    display: flex;
    align-items: center;
    flex: 1;
}

.title {
    margin: 0;
    font-size: clamp(14px, 2.5vw, 16px);
    /* 响应式字体大小 */
    font-weight: 500;
    color: #303133;
}

.header-right {
    display: flex;
    align-items: center;
}

.card-content {
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.card-footer {
    padding: 16px 20px;
    border-top: 1px solid #ebeef5;
    background-color: #fafafa;
}
</style>