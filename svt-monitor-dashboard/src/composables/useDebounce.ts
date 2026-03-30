import { ref, watch, onUnmounted, type Ref, isRef } from 'vue'

export function useDebounce<T>(value: T | Ref<T>, delay = 300): Ref<T> {
  
  
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