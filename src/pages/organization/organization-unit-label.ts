import type { OrganizationUnit } from '../../types/app'

export function organizationUnitPathLabel(
  unit: Pick<OrganizationUnit, 'name'> & { pathLabel?: string | null },
) {
  return unit.pathLabel?.trim() || unit.name
}

export function descendantUnitIds(units: OrganizationUnit[], rootId: string) {
  const children = new Map<string, string[]>()
  for (const unit of units) {
    if (!unit.parentId) continue
    const list = children.get(unit.parentId) ?? []
    list.push(unit.id)
    children.set(unit.parentId, list)
  }
  const out = new Set<string>()
  const stack = [...(children.get(rootId) ?? [])]
  while (stack.length) {
    const id = stack.pop()
    if (!id || out.has(id)) continue
    out.add(id)
    stack.push(...(children.get(id) ?? []))
  }
  return out
}

export type OrganizationUnitNode = OrganizationUnit & { children: OrganizationUnitNode[] }

export function organizationUnitMatches(
  unit: OrganizationUnit,
  q: string,
  kind: string,
) {
  if (kind && unit.kindId !== kind) return false
  const term = q.trim().toLowerCase()
  if (!term) return true
  const hay = [
    unit.name,
    unit.kind.name,
    unit.parent?.name,
    unit.pathLabel,
    unit.phone,
    unit.address,
    unit.nutritionRep?.fullName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(term)
}

function sortUnitNodes(nodes: OrganizationUnitNode[], locale: string): OrganizationUnitNode[] {
  return [...nodes]
    .sort((a, b) => a.name.localeCompare(b.name, locale, { numeric: true }))
    .map((node) => ({ ...node, children: sortUnitNodes(node.children, locale) }))
}

export function buildOrganizationUnitForest(
  units: OrganizationUnit[],
  locale = 'fa',
): OrganizationUnitNode[] {
  const byId = new Map<string, OrganizationUnitNode>()
  for (const unit of units) {
    byId.set(unit.id, { ...unit, children: [] })
  }
  const roots: OrganizationUnitNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return sortUnitNodes(roots, locale)
}

export function findOrganizationUnitSubtree(
  nodes: OrganizationUnitNode[],
  id: string,
): OrganizationUnitNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findOrganizationUnitSubtree(node.children, id)
    if (found) return found
  }
}

export function pruneOrganizationUnitForest(
  nodes: OrganizationUnitNode[],
  keep: (unit: OrganizationUnit) => boolean,
  keepSubtreeOnMatch = false,
  seen = new Set<string>(),
): OrganizationUnitNode[] {
  const out: OrganizationUnitNode[] = []
  for (const node of nodes) {
    if (seen.has(node.id)) continue
    seen.add(node.id)
    const matched = keep(node)
    if (matched && keepSubtreeOnMatch) {
      out.push(node)
      continue
    }
    const children = pruneOrganizationUnitForest(
      node.children,
      keep,
      keepSubtreeOnMatch,
      seen,
    )
    if (matched || children.length) {
      out.push({ ...node, children })
    }
  }
  return out
}

export function flattenOrganizationUnitForest(
  nodes: OrganizationUnitNode[],
  collapsed: Set<string>,
  depth = 0,
  seen = new Set<string>(),
): { unit: OrganizationUnitNode; depth: number }[] {
  const rows: { unit: OrganizationUnitNode; depth: number }[] = []
  for (const node of nodes) {
    if (seen.has(node.id)) continue
    seen.add(node.id)
    rows.push({ unit: node, depth })
    if (node.children.length && !collapsed.has(node.id)) {
      rows.push(...flattenOrganizationUnitForest(node.children, collapsed, depth + 1, seen))
    }
  }
  return rows
}
