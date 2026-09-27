import { APP_NAV } from './nav'
import { menuPathMatches } from './nav-path'
import { canAccessBoardMinutes, canAccessBoardModule } from './board-access'
import type { AuthUser, NavModule } from '../types/app'

export const ADMIN_ROLE_CODE = 'ADMIN'
export const EMPLOYEE_ROLE_CODE = 'EMPLOYEE'
export const CITIZEN_ROLE_CODE = 'CITIZEN'
export const BOARD_ADMIN_ROLE_CODE = 'BOARD_ADMIN'
export const CONTRACTOR_ROLE_CODE = 'CONTRACTOR'

export function isSystemRoleLocked(role?: { isSystem?: boolean; code?: string } | null) {
  return Boolean(role?.isSystem || role?.code === ADMIN_ROLE_CODE)
}

export function isRolePermissionsLocked(role?: { code?: string } | null) {
  return role?.code === ADMIN_ROLE_CODE || role?.code === CITIZEN_ROLE_CODE
}

/** منوهای مخصوص درگاه پیمانکار؛ در سایدبار مدیر سازمان نمی‌آیند. */
const contractorOnlyMenus = new Set([
  'stakeholders.projects',
  'stakeholders.progress',
  'stakeholders.correspondence',
])

export function isContractor(user?: { roles?: { code: string }[] } | null) {
  return Boolean(user?.roles?.some((role) => role.code === CONTRACTOR_ROLE_CODE))
}

export function isAdmin(user?: { isAdmin?: boolean; roles?: { code: string }[] } | null) {
  if (!user) return false
  if (user.isAdmin) return true
  return Boolean(user.roles?.some((role) => role.code === ADMIN_ROLE_CODE))
}

export function isPilgrim() {
  return false
}

export function formatRoles(
  roles: { name?: string; nameKey?: string; code?: string }[] | undefined,
  t: (key: string) => string,
) {
  if (!roles?.length) return ''
  return roles
    .map((role) => role.name || (role.nameKey ? t(role.nameKey) : role.code) || '')
    .filter(Boolean)
    .join('، ')
}

export function hasNoRoles(user?: { roles?: unknown[] } | null) {
  return !user?.roles?.length
}

export function hasPermission(
  user: Pick<AuthUser, 'isAdmin' | 'permissionCodes' | 'roles'> | null | undefined,
  code: string,
) {
  if (!user) return false
  if (isAdmin(user)) return true
  const codes = user.permissionCodes ?? []
  if (codes.includes(code)) return true
  const parent = code.includes('.') ? code.slice(0, code.lastIndexOf('.')) : null
  return parent ? codes.includes(parent) : false
}

export function hasMenuAccess(
  user: Pick<AuthUser, 'isAdmin' | 'permissionCodes' | 'roles' | 'position'> | null | undefined,
  menuCode: string,
  moduleCode: string,
) {
  if (menuCode === 'dashboard.home') return true
  if (
    !(isContractor(user) && !isAdmin(user)) &&
    (menuCode === 'singard.submit' || menuCode === 'singard.mine')
  ) {
    return true
  }
  if (moduleCode === 'board') {
    if (
      menuCode === 'board.minutes' ||
      menuCode === 'board.search' ||
      menuCode === 'board.resolutions' ||
      menuCode === 'board.calendar' ||
      menuCode === 'board.reports'
    ) {
      return canAccessBoardMinutes(user)
    }
    return canAccessBoardModule(user)
  }
  return hasPermission(user, menuCode) || hasPermission(user, moduleCode)
}

function withoutContractorPortal(nav: NavModule[]) {
  return nav
    .map((mod) =>
      mod.code === 'stakeholders'
        ? { ...mod, menus: mod.menus.filter((menu) => !contractorOnlyMenus.has(menu.code)) }
        : mod,
    )
    .filter((mod) => mod.menus.length > 0)
}

export function filterNavByAccess(
  nav: NavModule[],
  user: Pick<AuthUser, 'isAdmin' | 'permissionCodes' | 'roles' | 'position'> | null | undefined,
) {
  if (isAdmin(user)) {
    return isContractor(user) ? nav : withoutContractorPortal(nav)
  }
  return nav
    .map((mod) => ({
      ...mod,
      menus: mod.menus.filter((menu) => hasMenuAccess(user, menu.code, mod.code)),
    }))
    .filter((mod) => mod.menus.length > 0)
}

/** مدیر را از صفحات مخصوص پیمانکار به صفحهٔ سازمان می‌برد. */
export function orgStakeholderRedirect(
  user: Pick<AuthUser, 'isAdmin' | 'roles'> | null | undefined,
  pathname: string,
) {
  if (!isAdmin(user) || isContractor(user)) return null
  const projectDetail = pathname.match(/^\/stakeholders\/projects\/([^/]+)$/)
  if (projectDetail) return `/projects/${projectDetail[1]}`
  if (pathname === '/stakeholders/projects' || pathname.startsWith('/stakeholders/projects/')) {
    return '/projects'
  }
  const progressItem = pathname.match(/^\/stakeholders\/progress\/([^/]+)/)
  if (progressItem && progressItem[1] !== 'new') return `/stakeholders/reports/${progressItem[1]}`
  if (pathname === '/stakeholders/progress' || pathname.startsWith('/stakeholders/progress/')) {
    return '/stakeholders/reports'
  }
  const mailItem = pathname.match(/^\/stakeholders\/correspondence\/([^/]+)/)
  if (mailItem && mailItem[1] !== 'new') return `/stakeholders/inbox/${mailItem[1]}`
  if (pathname === '/stakeholders/correspondence' || pathname.startsWith('/stakeholders/correspondence/')) {
    return '/stakeholders/inbox'
  }
  return null
}

const ALWAYS_ALLOWED_PREFIXES = ['/account', '/settings']
const OPEN_SINGARD_PREFIXES = ['/singard/submit', '/singard/mine']

export function canAccessPath(
  user: Pick<AuthUser, 'isAdmin' | 'permissionCodes' | 'roles' | 'position'> | null | undefined,
  pathname: string,
) {
  if (!user) return false
  if (isAdmin(user)) return orgStakeholderRedirect(user, pathname) == null
  if (pathname === '/' || pathname === '/dashboard') return true
  if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true
  }
  if (
    !isContractor(user) &&
    OPEN_SINGARD_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return true
  }
  if (pathname === '/board/minutes' || pathname.startsWith('/board/minutes/') || /\/board\/requests\/[^/]+\/minutes/.test(pathname)) {
    return canAccessBoardMinutes(user)
  }
  if (pathname === '/board/resolutions' || pathname.startsWith('/board/resolutions/')) {
    return canAccessBoardMinutes(user)
  }
  if (pathname === '/board/calendar' || pathname.startsWith('/board/calendar/')) {
    return canAccessBoardMinutes(user)
  }
  if (pathname === '/board/search' || pathname.startsWith('/board/search/')) {
    return canAccessBoardMinutes(user)
  }
  if (pathname === '/board/reports' || pathname.startsWith('/board/reports/')) {
    return canAccessBoardMinutes(user)
  }

  let best:
    | {
        menuCode: string
        moduleCode: string
        path: string
      }
    | undefined
  for (const mod of APP_NAV) {
    for (const menu of mod.menus) {
      if (!menuPathMatches(pathname, menu.path)) continue
      if (!best || menu.path.length > best.path.length) {
        best = { menuCode: menu.code, moduleCode: mod.code, path: menu.path }
      }
    }
  }
  if (!best) return true
  return hasMenuAccess(user, best.menuCode, best.moduleCode)
}
