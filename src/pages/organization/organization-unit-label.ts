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
