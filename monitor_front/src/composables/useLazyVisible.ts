import { ref, onMounted, onUnmounted, nextTick, watch, type Ref } from 'vue'

/** 元素进入视口后再为 true，用于图表/API 懒加载 */
export function useLazyVisible(
  target: Ref<HTMLElement | null | undefined>,
  options?: IntersectionObserverInit,
) {
  const visible = ref(false)
  let observer: IntersectionObserver | null = null

  const disconnect = () => {
    observer?.disconnect()
    observer = null
  }

  const observe = async () => {
    await nextTick()
    disconnect()
    if (visible.value) return
    const el = target.value
    if (!el) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          visible.value = true
          disconnect()
        }
      },
      { root: null, rootMargin: '160px 0px', threshold: 0.01, ...options },
    )
    observer.observe(el)
  }

  onMounted(() => {
    void observe()
  })

  watch(target, () => {
    if (!visible.value) void observe()
  })

  onUnmounted(disconnect)

  return { visible }
}
