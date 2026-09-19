import type { NavModule } from '../types/app'

export const MANAGEMENT_MODULE_CODE = 'management'

/** ماژول مدیریت کاربران همیشه آخرین کارت منوی اصلی می‌ماند. */
export function withManagementLast(nav: NavModule[]): NavModule[] {
  const rest: NavModule[] = []
  const management: NavModule[] = []
  for (const mod of nav) {
    if (mod.code === MANAGEMENT_MODULE_CODE) management.push(mod)
    else rest.push(mod)
  }
  return [...rest, ...management]
}

export const APP_NAV: NavModule[] = withManagementLast([
  {
    code: 'dashboard',
    nameKey: 'modules.dashboard',
    icon: 'layout-dashboard',
    sortOrder: 1,
    menus: [
      {
        code: 'dashboard.home',
        nameKey: 'menus.overview',
        path: '/dashboard',
        icon: 'layout-dashboard',
        sortOrder: 1,
      },
    ],
  },
  {
    code: 'singard',
    nameKey: 'modules.singard',
    icon: 'sparkles',
    sortOrder: 2,
    menus: [
      {
        code: 'singard.submit',
        nameKey: 'menus.singardSubmit',
        path: '/singard/submit',
        icon: 'message-circle-heart',
        sortOrder: 1,
      },
      {
        code: 'singard.mine',
        nameKey: 'menus.singardMine',
        path: '/singard/mine',
        icon: 'inbox',
        sortOrder: 2,
      },
      {
        code: 'singard.inbox',
        nameKey: 'menus.singardInbox',
        path: '/singard/inbox',
        icon: 'messages-square',
        sortOrder: 3,
      },
      {
        code: 'singard.categories',
        nameKey: 'menus.singardCategories',
        path: '/singard/categories',
        icon: 'folder-tree',
        sortOrder: 4,
      },
      {
        code: 'singard.reports',
        nameKey: 'menus.singardReports',
        path: '/singard/reports',
        icon: 'chart-column',
        sortOrder: 5,
      },
    ],
  },
  {
    code: 'projects',
    nameKey: 'modules.projects',
    icon: 'folder-kanban',
    sortOrder: 3,
    menus: [
      {
        code: 'projects.list',
        nameKey: 'menus.projects',
        path: '/projects',
        icon: 'folder-kanban',
        sortOrder: 1,
      },
      {
        code: 'projects.groups',
        nameKey: 'menus.projectGroups',
        path: '/projects/groups',
        icon: 'layers',
        sortOrder: 2,
      },
      {
        code: 'projects.calendar',
        nameKey: 'menus.projectCalendar',
        path: '/projects/calendar',
        icon: 'calendar-days',
        sortOrder: 3,
      },
      {
        code: 'projects.liveBoard',
        nameKey: 'menus.digitalTransformationLiveBoard',
        path: '/projects/live-board',
        icon: 'radio',
        sortOrder: 4,
      },
      {
        code: 'projects.reports',
        nameKey: 'menus.projectReports',
        path: '/projects/reports',
        icon: 'chart-column',
        sortOrder: 5,
      },
      {
        code: 'projects.contractors',
        nameKey: 'menus.contractorManagement',
        path: '/projects/contractors',
        icon: 'handshake',
        sortOrder: 6,
      },
    ],
  },
  {
    code: 'food-reservation',
    nameKey: 'modules.foodReservation',
    icon: 'cooking-pot',
    sortOrder: 4,
    menus: [
      {
        code: 'food-reservation.foods',
        nameKey: 'menus.foodManagement',
        path: '/food-reservation/foods',
        icon: 'utensils-crossed',
        sortOrder: 1,
      },
      {
        code: 'food-reservation.restaurants',
        nameKey: 'menus.restaurantManagement',
        path: '/food-reservation/restaurants',
        icon: 'store',
        sortOrder: 2,
      },
      {
        code: 'food-reservation.reserve',
        nameKey: 'menus.foodReserve',
        path: '/food-reservation/reserve/new',
        icon: 'ticket',
        sortOrder: 3,
      },
      {
        code: 'food-reservation.history',
        nameKey: 'menus.foodReservationHistory',
        path: '/food-reservation/history',
        icon: 'history',
        sortOrder: 4,
      },
      {
        code: 'food-reservation.report',
        nameKey: 'menus.foodReservationReport',
        path: '/food-reservation/report',
        icon: 'chart-column',
        sortOrder: 5,
      },
      {
        code: 'food-reservation.cost-estimate',
        nameKey: 'menus.foodCostEstimate',
        path: '/food-reservation/cost-estimate',
        icon: 'wallet',
        sortOrder: 6,
      },
    ],
  },
  {
    code: 'qeshm-organization',
    nameKey: 'modules.qeshmOrganization',
    icon: 'landmark',
    sortOrder: 5,
    menus: [
      {
        code: 'qeshm-organization.info',
        nameKey: 'menus.organization',
        path: '/organization',
        icon: 'landmark',
        sortOrder: 1,
      },
      {
        code: 'qeshm-organization.units',
        nameKey: 'menus.organizationUnits',
        path: '/organization/units',
        icon: 'building-2',
        sortOrder: 2,
      },
      {
        code: 'qeshm-organization.unit-kinds',
        nameKey: 'menus.organizationUnitKinds',
        path: '/organization/unit-kinds',
        icon: 'tags',
        sortOrder: 3,
      },
      {
        code: 'qeshm-organization.positions',
        nameKey: 'menus.organizationPositions',
        path: '/organization/positions',
        icon: 'clipboard-list',
        sortOrder: 4,
      },
      {
        code: 'qeshm-organization.employees',
        nameKey: 'menus.organizationEmployees',
        path: '/organization/employees',
        icon: 'users',
        sortOrder: 5,
      },
    ],
  },
  {
    code: 'light-assets',
    nameKey: 'modules.lightAssets',
    icon: 'car',
    sortOrder: 6,
    menus: [
      {
        code: 'light-assets.vehicles',
        nameKey: 'menus.vehicles',
        path: '/vehicles',
        icon: 'car',
        sortOrder: 1,
      },
      {
        code: 'light-assets.vehicle-brands',
        nameKey: 'menus.vehicleBrands',
        path: '/vehicles/brands',
        icon: 'tags',
        sortOrder: 2,
      },
      {
        code: 'light-assets.vehicle-reports',
        nameKey: 'menus.vehicleReports',
        path: '/vehicles/reports',
        icon: 'chart-column',
        sortOrder: 3,
      },
    ],
  },
  {
    code: 'base-info',
    nameKey: 'modules.baseInfo',
    icon: 'globe',
    sortOrder: 7,
    menus: [
      {
        code: 'base-info.countries',
        nameKey: 'menus.countries',
        path: '/base-info/countries',
        icon: 'globe',
        sortOrder: 1,
      },
      {
        code: 'base-info.provinces',
        nameKey: 'menus.provinces',
        path: '/base-info/provinces',
        icon: 'map',
        sortOrder: 2,
      },
      {
        code: 'base-info.cities',
        nameKey: 'menus.cities',
        path: '/base-info/cities',
        icon: 'map-pin',
        sortOrder: 3,
      },
    ],
  },
  {
    code: 'board',
    nameKey: 'modules.board',
    icon: 'gavel',
    sortOrder: 8,
    menus: [
      {
        code: 'board.search',
        nameKey: 'menus.boardSmartSearch',
        path: '/board/search',
        icon: 'scan-search',
        sortOrder: 1,
      },
      {
        code: 'board.requests',
        nameKey: 'menus.boardRequests',
        path: '/board/requests',
        icon: 'file-text',
        sortOrder: 2,
      },
      {
        code: 'board.plans',
        nameKey: 'menus.boardPlans',
        path: '/board/plans',
        icon: 'stamp',
        sortOrder: 3,
      },
      {
        code: 'board.minutes',
        nameKey: 'menus.boardMinutes',
        path: '/board/minutes',
        icon: 'scroll-text',
        sortOrder: 4,
      },
      {
        code: 'board.reports',
        nameKey: 'menus.boardReports',
        path: '/board/reports',
        icon: 'chart-column',
        sortOrder: 5,
      },
      {
        code: 'board.resolutions',
        nameKey: 'menus.boardResolutions',
        path: '/board/resolutions',
        icon: 'file-check',
        sortOrder: 6,
      },
      {
        code: 'board.calendar',
        nameKey: 'menus.boardCalendar',
        path: '/board/calendar',
        icon: 'calendar-days',
        sortOrder: 7,
      },
      {
        code: 'board.permissions',
        nameKey: 'menus.boardPermissions',
        path: '/board/permissions',
        icon: 'shield',
        sortOrder: 8,
      },
    ],
  },
  {
    code: 'management',
    nameKey: 'modules.management',
    icon: 'user-cog',
    sortOrder: 9,
    menus: [
      {
        code: 'management.users',
        nameKey: 'menus.users',
        path: '/users',
        icon: 'users',
        sortOrder: 1,
      },
      {
        code: 'management.roles',
        nameKey: 'menus.roles',
        path: '/base-info/roles',
        icon: 'shield',
        sortOrder: 2,
      },
    ],
  },
])
