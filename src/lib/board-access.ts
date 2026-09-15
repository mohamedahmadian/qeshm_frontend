import type { AuthUser } from '../types/app'

export const BOARD_LEADERSHIP_POSITION_CODES = [
  'DEPUTY',
  'MANAGER',
  'HEAD',
  'SUPERVISOR',
  'SECRETARY',
] as const

export const BOARD_ADMIN_ROLE_CODE = 'BOARD_ADMIN'

function isAdminUser(
  user?: Pick<AuthUser, 'isAdmin' | 'roles'> | null,
) {
  if (!user) return false
  if (user.isAdmin) return true
  return Boolean(user.roles?.some((role) => role.code === 'ADMIN'))
}

function hasBoardAdminRole(
  user?: Pick<AuthUser, 'roles'> | null,
) {
  return Boolean(user?.roles?.some((role) => role.code === BOARD_ADMIN_ROLE_CODE))
}

export function canAccessBoardModule(
  user: Pick<AuthUser, 'isAdmin' | 'roles' | 'position'> | null | undefined,
) {
  if (isAdminUser(user) || hasBoardAdminRole(user)) return true
  const code = user?.position?.code
  return Boolean(
    code && (BOARD_LEADERSHIP_POSITION_CODES as readonly string[]).includes(code),
  )
}

export function canPickBoardRequestUnit(
  user: Pick<AuthUser, 'isAdmin' | 'roles'> | null | undefined,
) {
  return isAdminUser(user) || hasBoardAdminRole(user)
}

export function canAccessBoardMinutes(
  user: Pick<AuthUser, 'isAdmin' | 'roles'> | null | undefined,
) {
  return isAdminUser(user) || hasBoardAdminRole(user)
}
