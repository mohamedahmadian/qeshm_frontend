import type { NavModule } from '../types/app'

export const APP_NAV: NavModule[] = [
  {
    code: 'dashboard',
    nameKey: 'modules.dashboard',
    icon: 'layout-dashboard',
    sortOrder: 1,
    menus: [
      {
        code: 'dashboard.home',
        nameKey: 'menus.overview',
        path: '/',
        icon: 'layout-dashboard',
        sortOrder: 1,
      },
      {
        code: 'dashboard.users',
        nameKey: 'menus.users',
        path: '/users',
        icon: 'users',
        sortOrder: 2,
      },
    ],
  },
  {
    code: 'base-info',
    nameKey: 'modules.baseInfo',
    icon: 'globe',
    sortOrder: 2,
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
]
