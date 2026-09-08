export function getPageMeta(pathname: string): {
  titleKey: string
  subtitleKey?: string
} {
  if (pathname.startsWith('/settings/password')) {
    return {
      titleKey: 'auth.changePassword',
      subtitleKey: 'auth.changePasswordSubtitle',
    }
  }
  if (pathname.includes('/location/history')) {
    return { titleKey: 'location.history', subtitleKey: 'location.historySubtitle' }
  }
  if (pathname.includes('/location')) {
    return { titleKey: 'location.register', subtitleKey: 'location.registerSubtitle' }
  }
  if (pathname.startsWith('/account')) {
    return { titleKey: 'account.title', subtitleKey: 'account.subtitle' }
  }
  if (pathname.startsWith('/settings')) {
    return { titleKey: 'settings.title', subtitleKey: 'settings.subtitle' }
  }
  if (pathname === '/users/new') {
    return { titleKey: 'users.create', subtitleKey: 'users.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/users/')) {
    return { titleKey: 'users.edit', subtitleKey: 'users.editSubtitle' }
  }
  if (pathname.startsWith('/users/')) {
    return { titleKey: 'users.details', subtitleKey: 'users.detailsSubtitle' }
  }
  if (pathname.startsWith('/users')) {
    return { titleKey: 'users.title', subtitleKey: 'users.subtitle' }
  }
  if (pathname === '/base-info/countries/new') {
    return { titleKey: 'countries.create', subtitleKey: 'countries.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/countries/')) {
    return { titleKey: 'countries.edit', subtitleKey: 'countries.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/countries/')) {
    return { titleKey: 'countries.details', subtitleKey: 'countries.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/countries')) {
    return { titleKey: 'menus.countries', subtitleKey: 'countries.subtitle' }
  }
  if (pathname === '/base-info/provinces/new') {
    return { titleKey: 'provinces.create', subtitleKey: 'provinces.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/provinces/')) {
    return { titleKey: 'provinces.edit', subtitleKey: 'provinces.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/provinces/')) {
    return { titleKey: 'provinces.details', subtitleKey: 'provinces.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/provinces')) {
    return { titleKey: 'menus.provinces', subtitleKey: 'provinces.subtitle' }
  }
  if (pathname === '/base-info/cities/new') {
    return { titleKey: 'cities.create', subtitleKey: 'cities.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/cities/')) {
    return { titleKey: 'cities.edit', subtitleKey: 'cities.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/cities/')) {
    return { titleKey: 'cities.details', subtitleKey: 'cities.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/cities')) {
    return { titleKey: 'menus.cities', subtitleKey: 'cities.subtitle' }
  }
  if (pathname === '/') {
    return { titleKey: 'dashboard.title', subtitleKey: 'dashboard.subtitle' }
  }
  return { titleKey: 'menus.overview' }
}
