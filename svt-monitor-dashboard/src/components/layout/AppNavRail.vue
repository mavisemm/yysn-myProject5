<template>
  <nav
    class="app-nav-rail"
    :class="{
      'app-nav-rail--drawer': inDrawer,
      'app-nav-rail--collapsed': isCollapsed,
    }"
    aria-label="主导航"
  >
    <div class="app-nav-rail__scroll">
      <button
        v-for="item in APP_NAV_MENU_VISIBLE_ITEMS"
        :key="item.key"
        type="button"
        class="app-nav-rail__row"
        :class="{ 'app-nav-rail__row--active': isActive(item.routeName) }"
        :title="isCollapsed && !inDrawer ? item.label : undefined"
        @click="onNavigate(item.routeName)"
      >
        <el-icon class="app-nav-rail__icon" :size="18">
          <component :is="item.icon" />
        </el-icon>
        <span v-show="!isCollapsed" class="app-nav-rail__label">{{ item.label }}</span>
      </button>
    </div>

    <button
      v-if="!inDrawer"
      type="button"
      class="app-nav-rail__collapse-btn"
      :title="isCollapsed ? '展开菜单' : '收起菜单'"
      @click="toggleCollapsed"
    >
      <el-icon :size="14">
        <ArrowRight v-if="isCollapsed" />
        <ArrowLeft v-else />
      </el-icon>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useLayoutNavStore } from '@/stores/layoutNav'
import {
  APP_NAV_MENU_VISIBLE_ITEMS,
  isLayoutNavChildRoute,
  isLayoutNavMenuRoute,
} from './layoutNavMenu'

const props = withDefaults(
  defineProps<{
    inDrawer?: boolean
    collapsed?: boolean
  }>(),
  { inDrawer: false, collapsed: false },
)

const inDrawer = computed(() => props.inDrawer)

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const route = useRoute()
const router = useRouter()
const layoutNavStore = useLayoutNavStore()

const isCollapsed = computed(() => props.collapsed)

const toggleCollapsed = () => {
  emit('update:collapsed', !props.collapsed)
}

watch(
  () => route.name,
  (name) => {
    if (name && isLayoutNavMenuRoute(name)) {
      layoutNavStore.setActiveMenuRouteName(String(name))
    }
  },
  { immediate: true },
)

const isActive = (routeName: string) => {
  if (isLayoutNavChildRoute(route.name)) {
    return layoutNavStore.activeMenuRouteName === routeName
  }
  return route.name === routeName
}

const onNavigate = (routeName: string) => {
  layoutNavStore.setActiveMenuRouteName(routeName)
  if (route.name === routeName) return
  void router.push({ name: routeName, query: route.query })
}
</script>

<style lang="scss" scoped>
.app-nav-rail {
  --nav-bg: transparent;
  --nav-bg-hover: rgba(255, 255, 255, 0.1);
  --nav-bg-active: rgba(255, 255, 255, 0.18);
  --nav-text: rgba(255, 255, 255, 0.92);

  flex-shrink: 0;
  width: 100%;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  margin-top: 2px;
  margin-bottom: 2px;
  border-radius: 4px;
  background: var(--nav-bg);
  box-sizing: border-box;
  overflow: hidden;

  &--collapsed {
    .app-nav-rail__row {
      justify-content: center;
      padding-left: 0;
      padding-right: 0;
    }
  }

  &--drawer {
    width: 200px;
    min-width: 200px;
    margin: 0;
    border-radius: 0;
    height: 100%;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 8px 0 4px;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.25);
      border-radius: 2px;
    }
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 0 14px 0 16px;
    border: none;
    border-radius: 0;
    background: transparent;
    color: var(--nav-text);
    font-size: 14px;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease;
    box-sizing: border-box;

    &:hover {
      background: var(--nav-bg-hover);
    }

    &--active {
      background: var(--nav-bg-active);
      color: #fff;
      font-weight: 500;
    }
  }

  &__icon {
    flex-shrink: 0;
    color: inherit;
  }

  &__label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__collapse-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 36px;
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
  }
}

@media (max-width: 800px) {
  .app-nav-rail:not(.app-nav-rail--drawer) {
    display: none;
  }
}
</style>
