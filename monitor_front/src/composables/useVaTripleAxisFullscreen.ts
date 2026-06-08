import { inject, provide, ref, shallowRef, type InjectionKey, type Ref } from 'vue'
import type { VibrationAxis } from '@/api/modules/device'

const VIBRATION_AXES: VibrationAxis[] = ['X', 'Y', 'Z']

export type VaTripleFsKind = 'freq' | 'time'

export interface VaTripleAxisFullscreenContext {
  visible: Ref<boolean>
  kind: Ref<VaTripleFsKind | null>
  title: Ref<string>
  toolbarAxis: Ref<VibrationAxis | null>
  toolbarTarget: Ref<HTMLElement | null>
  open: (kind: VaTripleFsKind, fromAxis: VibrationAxis, title: string) => void
  close: () => void
  registerMount: (kind: VaTripleFsKind, axis: VibrationAxis, el: HTMLElement | null) => void
  getMount: (kind: VaTripleFsKind, axis: VibrationAxis) => HTMLElement | null
  registerToolbarTarget: (el: HTMLElement | null) => void
  registerResizeHandler: (fn: () => void) => () => void
  requestResize: () => void
  isActiveFor: (kind: VaTripleFsKind, axis: VibrationAxis) => boolean
  isToolbarAxis: (kind: VaTripleFsKind, axis: VibrationAxis) => boolean
}

export const VA_TRIPLE_AXIS_FULLSCREEN_KEY: InjectionKey<VaTripleAxisFullscreenContext> = Symbol(
  'vaTripleAxisFullscreen',
)

export function provideVaTripleAxisFullscreen(): VaTripleAxisFullscreenContext {
  const visible = ref(false)
  const kind = ref<VaTripleFsKind | null>(null)
  const title = ref('')
  const toolbarAxis = ref<VibrationAxis | null>(null)
  const toolbarTarget = ref<HTMLElement | null>(null)

  const mountMap = shallowRef<Record<string, HTMLElement | null>>({})
  /** 分帧挂载 X→Y→Z，避免一次打开全屏同时 init 三个 ECharts */
  const mountAxesReady = ref<VibrationAxis[]>([])
  const resizeHandlers = shallowRef(new Set<() => void>())

  const mountKey = (k: VaTripleFsKind, axis: VibrationAxis) => `${k}:${axis}`

  const stageMountAxes = () => {
    mountAxesReady.value = ['X']
    requestAnimationFrame(() => {
      if (!visible.value) return
      mountAxesReady.value = ['X', 'Y']
      requestAnimationFrame(() => {
        if (!visible.value) return
        mountAxesReady.value = [...VIBRATION_AXES]
        requestAnimationFrame(() => ctx.requestResize())
      })
    })
  }

  const ctx: VaTripleAxisFullscreenContext = {
    visible,
    kind,
    title,
    toolbarAxis,
    toolbarTarget,
    open(k, fromAxis, dialogTitle) {
      kind.value = k
      toolbarAxis.value = fromAxis
      title.value = dialogTitle
      visible.value = true
      stageMountAxes()
    },
    close() {
      visible.value = false
      kind.value = null
      toolbarAxis.value = null
      title.value = ''
      mountAxesReady.value = []
      mountMap.value = {}
    },
    registerMount(k, axis, el) {
      const key = mountKey(k, axis)
      if (mountMap.value[key] === el) return
      mountMap.value = { ...mountMap.value, [key]: el }
    },
    getMount(k, axis) {
      return mountMap.value[mountKey(k, axis)] ?? null
    },
    registerToolbarTarget(el) {
      if (toolbarTarget.value === el) return
      toolbarTarget.value = el
    },
    registerResizeHandler(fn) {
      const next = new Set(resizeHandlers.value)
      next.add(fn)
      resizeHandlers.value = next
      return () => {
        const rest = new Set(resizeHandlers.value)
        rest.delete(fn)
        resizeHandlers.value = rest
      }
    },
    requestResize() {
      resizeHandlers.value.forEach((fn) => {
        try {
          fn()
        } catch {
          // ignore
        }
      })
    },
    isActiveFor(k, axis) {
      return (
        visible.value &&
        kind.value === k &&
        mountAxesReady.value.includes(axis)
      )
    },
    isToolbarAxis(k, axis) {
      return visible.value && kind.value === k && toolbarAxis.value === axis
    },
  }

  provide(VA_TRIPLE_AXIS_FULLSCREEN_KEY, ctx)
  return ctx
}

export function useVaTripleAxisFullscreen(): VaTripleAxisFullscreenContext | null {
  return inject(VA_TRIPLE_AXIS_FULLSCREEN_KEY, null)
}
