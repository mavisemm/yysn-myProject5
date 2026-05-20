import type { DeviceNode } from '@/types/device'

/** 从根到目标节点父链的 id（不含目标自身），用于展开工厂/车间/设备 */
export function findAncestorKeysForNodeId(nodes: DeviceNode[], targetId: string): string[] | null {
  const t = String(targetId).trim()
  const walk = (list: DeviceNode[], path: string[]): string[] | null => {
    for (const node of list) {
      if (String(node.id).trim() === t) return path
      if (node.children?.length) {
        const found = walk(node.children, [...path, node.id])
        if (found !== null) return found
      }
    }
    return null
  }
  return walk(nodes, [])
}

export function getCssEscaped(v: string): string {
  const raw = String(v ?? '')
  const esc = (globalThis as { CSS?: { escape?: (s: string) => string } }).CSS?.escape
  return typeof esc === 'function' ? esc(raw) : raw.replace(/"/g, '\\"')
}
