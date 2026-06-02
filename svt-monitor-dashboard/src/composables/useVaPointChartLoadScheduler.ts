import { inject, provide, type InjectionKey } from 'vue'

export type VaPointChartLoadScheduler = {
  /** 获取加载槽位；全选/多点位时串行化，避免同时打满接口 */
  acquire: () => Promise<void>
  release: () => void
}

const VA_POINT_CHART_SCHEDULER_KEY: InjectionKey<VaPointChartLoadScheduler> = Symbol(
  'vaPointChartLoadScheduler',
)

export function provideVaPointChartLoadScheduler(
  enabled: () => boolean,
  maxConcurrent = 2,
): VaPointChartLoadScheduler {
  let active = 0
  const waitQueue: Array<() => void> = []

  const pump = () => {
    while (active < maxConcurrent && waitQueue.length > 0) {
      const run = waitQueue.shift()
      if (!run) break
      active += 1
      run()
    }
  }

  const scheduler: VaPointChartLoadScheduler = {
    acquire: () => {
      if (!enabled()) return Promise.resolve()
      return new Promise<void>((resolve) => {
        waitQueue.push(resolve)
        pump()
      })
    },
    release: () => {
      if (!enabled()) return
      active = Math.max(0, active - 1)
      pump()
    },
  }

  provide(VA_POINT_CHART_SCHEDULER_KEY, scheduler)
  return scheduler
}

export function useVaPointChartLoadScheduler(): VaPointChartLoadScheduler | null {
  return inject(VA_POINT_CHART_SCHEDULER_KEY, null)
}
