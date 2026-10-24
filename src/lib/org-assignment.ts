import type { OrganizationPosition, OrganizationUnit } from '../types/app'

export const ORG_UNIT_KIND_VICE = 'VICE'
export const BOARD_DEPUTY_POSITION_CODE = 'DEPUTY'
export const BOARD_REQUEST_POSITION_CODES = ['DEPUTY', 'MANAGER', 'HEAD', 'SUPERVISOR'] as const

export function isBoardRequestPosition(code?: string | null) {
  return Boolean(
    code && (BOARD_REQUEST_POSITION_CODES as readonly string[]).includes(code),
  )
}

export function unitsForPosition(
  units: OrganizationUnit[],
  positionCode?: string | null,
  currentUserId?: string | null,
) {
  if (positionCode !== BOARD_DEPUTY_POSITION_CODE) return units
  return units.filter((unit) => {
    if (unit.kind?.code !== ORG_UNIT_KIND_VICE) return false
    if (!unit.deputy || unit.deputy.id === currentUserId) return true
    return false
  })
}

export function positionsForUnit(
  positions: OrganizationPosition[],
  unit?: OrganizationUnit,
  currentUserId?: string | null,
) {
  return positions.filter((position) => {
    if (position.code !== BOARD_DEPUTY_POSITION_CODE) return true
    if (!unit) return true
    if (unit.kind?.code !== ORG_UNIT_KIND_VICE) return false
    if (unit.deputy && unit.deputy.id !== currentUserId) return false
    return true
  })
}
