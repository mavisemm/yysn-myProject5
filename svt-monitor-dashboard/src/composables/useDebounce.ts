// src/composables/useDebounce.ts
import { ref, watch, onUnmounted, type Ref, isRef } from 'vue'

/**
 * 防抖组合式函数 - 简化版
 * @param value 需要防抖处理的响应式值
 * @param delay 防抖延迟时间（毫秒），默认300ms
 * @returns 防抖处理后的响应式值
 */
export function useDebounce<T>(value: T | Ref<T>, delay = 300): Ref<T> {
  // 处理传入值，确保是响应式引用
  // 使用 Vue 的 isRef 函数来判断是否是响应式引用
  const sourceValue = isRef(value) ? value : ref(value)
  
  const debouncedValue = ref(sourceValue.value) as Ref<T>
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  watch(
    () => sourceValue.value,
    (newValue) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        debouncedValue.value = newValue
      }, delay)
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  })

  return debouncedValue
}