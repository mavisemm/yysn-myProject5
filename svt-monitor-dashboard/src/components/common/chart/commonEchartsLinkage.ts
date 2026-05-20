import * as echarts from 'echarts'

export type LinkageRegistry = Map<string, Set<echarts.ECharts>>

export function getLinkageRegistry(): LinkageRegistry {
  const g = globalThis as typeof globalThis & {
    __COMMON_ECHARTS_LINKAGE_REGISTRY__?: LinkageRegistry
  }
  if (!g.__COMMON_ECHARTS_LINKAGE_REGISTRY__) {
    g.__COMMON_ECHARTS_LINKAGE_REGISTRY__ = new Map()
  }
  return g.__COMMON_ECHARTS_LINKAGE_REGISTRY__
}

export type LinkageZoomAttachOptions = {
  inst: echarts.ECharts
  groupId: string
  linkageZoomOnly: boolean
  onSyncingChange: (syncing: boolean) => void
}

export function attachLinkageZoom(options: LinkageZoomAttachOptions): () => void {
  const { inst, groupId, linkageZoomOnly, onSyncingChange } = options
  const registry = getLinkageRegistry()

  if (!linkageZoomOnly) {
    ;(inst as echarts.ECharts & { group?: string }).group = groupId
    echarts.connect(groupId)
    return () => {
      try {
        ;(inst as echarts.ECharts & { group?: string }).group = ''
      } catch {
        // ignore
      }
    }
  }

  ;(inst as echarts.ECharts & { group?: string }).group = ''
  if (!registry.has(groupId)) registry.set(groupId, new Set())
  registry.get(groupId)!.add(inst)

  const handler = (params: unknown) => {
    onSyncingChange(true)
    try {
      const others = registry.get(groupId)
      if (!others) return
      const p = params as { batch?: unknown[] } & Record<string, unknown>
      const batch0 = Array.isArray(p?.batch) ? p.batch[0] : null
      const payload = batch0 && typeof batch0 === 'object' ? (batch0 as Record<string, unknown>) : p
      if (!payload || typeof payload !== 'object') return

      const action: Record<string, unknown> = { type: 'dataZoom' }
      if (typeof payload.startValue !== 'undefined' || typeof payload.endValue !== 'undefined') {
        if (typeof payload.startValue !== 'undefined') action.startValue = payload.startValue
        if (typeof payload.endValue !== 'undefined') action.endValue = payload.endValue
      } else {
        if (typeof payload.start !== 'undefined') action.start = payload.start
        if (typeof payload.end !== 'undefined') action.end = payload.end
      }
      if (typeof payload.dataZoomIndex !== 'undefined') action.dataZoomIndex = payload.dataZoomIndex

      if (
        typeof action.start === 'undefined' &&
        typeof action.end === 'undefined' &&
        typeof action.startValue === 'undefined' &&
        typeof action.endValue === 'undefined'
      ) {
        return
      }

      for (const other of others) {
        if (other === inst) continue
        try {
          other.dispatchAction(action as never)
        } catch {
          // ignore
        }
      }
    } finally {
      onSyncingChange(false)
    }
  }

  inst.on('datazoom', handler)
  return () => {
    try {
      inst.off('datazoom', handler)
    } catch {
      // ignore
    }
    const set = registry.get(groupId)
    if (set) {
      set.delete(inst)
      if (set.size === 0) registry.delete(groupId)
    }
  }
}
