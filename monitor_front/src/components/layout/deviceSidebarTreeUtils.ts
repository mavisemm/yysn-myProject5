import type { DeviceNode } from '@/types/device'

export type TreeNodeLike = {
  expanded?: boolean
  expand?: (expandParent?: boolean, recursive?: boolean) => void
  collapse?: (collapseParent?: boolean) => void
}

export type TreeRefLike = {
  getNode?: (key: string) => TreeNodeLike | null | undefined
}

/** 从根到目标节点父链的 id（不含目标自身），用于展开工厂/车间/设备 */
export function findNodeById(nodes: DeviceNode[], targetId: string): DeviceNode | null {
  const t = String(targetId).trim()
  const walk = (list: DeviceNode[]): DeviceNode | null => {
    for (const node of list) {
      if (String(node.id).trim() === t) return node
      if (node.children?.length) {
        const found = walk(node.children)
        if (found) return found
      }
    }
    return null
  }
  return walk(nodes)
}

/**
 * 选中变更时仅保留树上真实展开节点，不强制把祖先车间/工厂写入 store（避免用户收起车间后被再次撑开）。
 */
export function buildExpandedKeysForSelection(
  treeData: DeviceNode[],
  _targetId: string,
  currentExpanded: string[],
): string[] {
  return currentExpanded.filter((k) => Boolean(findNodeById(treeData, k)))
}

/**
 * 从 el-tree 读取「有效展开」节点：自身 expanded 且所有祖先也 expanded。
 * 避免车间已收起但子设备仍为 expanded 时被写回 store，导致车间无法保持收起。
 */
export function collectExpandedKeysFromTree(
  treeData: DeviceNode[],
  tree: TreeRefLike | null | undefined,
): string[] {
  if (!tree?.getNode) return []
  const keys: string[] = []

  const walk = (nodes: DeviceNode[], ancestorsExpanded: boolean) => {
    for (const n of nodes) {
      const id = String(n.id).trim()
      if (!id) continue
      let selfExpanded = false
      try {
        selfExpanded = Boolean(tree.getNode!(id)?.expanded)
      } catch {
        selfExpanded = false
      }
      const effectivelyExpanded = ancestorsExpanded && selfExpanded
      if (effectivelyExpanded) keys.push(id)
      if (n.children?.length) walk(n.children, effectivelyExpanded)
    }
  }

  walk(treeData, true)
  return keys
}

type CollapsibleTreeNode = {
  expanded?: boolean
  collapse?: (collapseParent?: boolean) => void
  childNodes?: CollapsibleTreeNode[]
}

/** 收起节点前先递归收起所有已展开子节点（否则父级车间可能收不起来） */
export function collapseTreeNodeDeep(node: CollapsibleTreeNode) {
  const children = node.childNodes ?? []
  for (const child of children) {
    if (child.expanded) {
      collapseTreeNodeDeep(child)
    }
  }
  if (node.expanded && typeof node.collapse === 'function') {
    node.collapse(false)
  }
}

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
