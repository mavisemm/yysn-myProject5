export function clampWidth(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function loadStoredPanelWidth(
  storageKey: string,
  fallback: number,
  min: number,
  max: number,
): number {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return fallback
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return fallback
    return clampWidth(parsed, min, max)
  } catch {
    return fallback
  }
}

export function saveStoredPanelWidth(storageKey: string, width: number) {
  try {
    localStorage.setItem(storageKey, String(Math.round(width)))
  } catch {
    /* ignore quota / private mode */
  }
}

export function useDragResize(options: {
  getWidth: () => number
  setWidth: (width: number) => void
  min: number
  max: number
  storageKey?: string
}) {
  const onMouseDown = (event: MouseEvent) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = options.getWidth()

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      options.setWidth(clampWidth(startWidth + delta, options.min, options.max))
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (options.storageKey) {
        saveStoredPanelWidth(options.storageKey, options.getWidth())
      }
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return { onMouseDown }
}
