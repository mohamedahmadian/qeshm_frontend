import type { AuthUser } from '../types/app'

export const BOARD_LEADERSHIP_POSITION_CODES = [
  'DEPUTY',
  'MANAGER',
  'HEAD',
  'SUPERVISOR',
  'SECRETARY',
] as const

export const BOARD_SECRETARY_POSITION_CODE = 'SECRETARY'

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
  if (isBoardModuleAdmin(user)) return true
  return isBoardAccessPosition(user?.position?.code)
}

export function canPickBoardRequestUnit(
  user: Pick<AuthUser, 'isAdmin' | 'roles' | 'position'> | null | undefined,
) {
  if (isBoardModuleAdmin(user)) return true
  return user?.position?.code === BOARD_SECRETARY_POSITION_CODE
}

export function canChooseBoardRequestKind(
  user: Pick<AuthUser, 'isAdmin' | 'roles'> | null | undefined,
) {
  return isBoardModuleAdmin(user)
}

export function canEditBoardRequest(
  item: {
    kind: string
    status: string
    ceoAt?: string | null
  },
  user?: Pick<AuthUser, 'isAdmin' | 'roles'> | null,
) {
  if (isBoardModuleAdmin(user)) return true
  if (item.status === 'PENDING_REVIEW') return true
  return item.kind === 'MANAGEMENT' && item.status === 'PENDING_CEO' && !item.ceoAt
}

export function isBoardModuleAdmin(
  user: Pick<AuthUser, 'isAdmin' | 'roles'> | null | undefined,
) {
  return isAdminUser(user) || hasBoardAdminRole(user)
}

export function isBoardAccessPosition(code?: string | null) {
  return Boolean(
    code && (BOARD_LEADERSHIP_POSITION_CODES as readonly string[]).includes(code),
  )
}

export function canAccessBoardMinutes(
  user: Pick<AuthUser, 'isAdmin' | 'roles'> | null | undefined,
) {
  return isBoardModuleAdmin(user)
}

export function canManageBoardSettings(
  user: Pick<AuthUser, 'isAdmin' | 'roles'> | null | undefined,
) {
  return isBoardModuleAdmin(user)
}

export function canDeleteBoardRequests(
  user: Pick<AuthUser, 'isAdmin' | 'roles'> | null | undefined,
) {
  return isBoardModuleAdmin(user)
}
