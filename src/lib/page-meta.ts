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
  if (pathname === '/base-info/roles/new') {
    return { titleKey: 'accessRoles.create', subtitleKey: 'accessRoles.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/roles/')) {
    return { titleKey: 'accessRoles.edit', subtitleKey: 'accessRoles.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/roles/')) {
    return { titleKey: 'accessRoles.details', subtitleKey: 'accessRoles.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/roles')) {
    return { titleKey: 'menus.roles', subtitleKey: 'accessRoles.subtitle' }
  }
  if (pathname.startsWith('/projects/live-board')) {
    return {
      titleKey: 'menus.digitalTransformationLiveBoard',
      subtitleKey: 'projectLiveBoard.subtitle',
    }
  }
  if (pathname === '/projects/contractors/new') {
    return { titleKey: 'contractors.create', subtitleKey: 'contractors.createSubtitle' }
  }
  if (/^\/projects\/contractors\/[^/]+\/projects\/new$/.test(pathname)) {
    return { titleKey: 'contractorProjects.create', subtitleKey: 'contractorProjects.createSubtitle' }
  }
  if (/^\/projects\/contractors\/[^/]+\/projects$/.test(pathname)) {
    return { titleKey: 'contractorProjects.title', subtitleKey: 'contractorProjects.subtitle' }
  }
  if (/^\/projects\/contractors\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'contractors.edit', subtitleKey: 'contractors.editSubtitle' }
  }
  if (/^\/projects\/contractors\/[^/]+$/.test(pathname)) {
    return { titleKey: 'contractors.details', subtitleKey: 'contractors.detailsSubtitle' }
  }
  if (pathname === '/projects/contractors') {
    return { titleKey: 'menus.contractorManagement', subtitleKey: 'contractors.globalSubtitle' }
  }
  if (pathname.startsWith('/projects/reports')) {
    return { titleKey: 'menus.projectReports', subtitleKey: 'projectReports.subtitle' }
  }
  if (pathname === '/projects/new') {
    return { titleKey: 'projects.create', subtitleKey: 'projects.createSubtitle' }
  }
  if (pathname === '/projects/progress/new') {
    return { titleKey: 'projectProgress.create', subtitleKey: 'projectProgress.createSubtitle' }
  }
  if (pathname === '/projects/progress') {
    return { titleKey: 'menus.overview' }
  }
  if (/\/contractors\/[^/]+\/payments\/new$/.test(pathname)) {
    return { titleKey: 'contractorPayments.create', subtitleKey: 'contractorPayments.createSubtitle' }
  }
  if (/\/payments\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'contractorPayments.edit', subtitleKey: 'contractorPayments.editSubtitle' }
  }
  if (/\/payments\/[^/]+$/.test(pathname)) {
    return { titleKey: 'contractorPayments.details', subtitleKey: 'contractorPayments.detailsSubtitle' }
  }
  if (/\/payments$/.test(pathname)) {
    return { titleKey: 'contractorPayments.title', subtitleKey: 'contractorPayments.subtitle' }
  }
  if (/\/contractors\/[^/]+\/phases\/new$/.test(pathname)) {
    return { titleKey: 'contractorPhases.create', subtitleKey: 'contractorPhases.createSubtitle' }
  }
  if (/\/contractors\/[^/]+\/phases\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'contractorPhases.edit', subtitleKey: 'contractorPhases.editSubtitle' }
  }
  if (/\/contractors\/[^/]+\/phases\/[^/]+$/.test(pathname)) {
    return { titleKey: 'contractorPhases.details', subtitleKey: 'contractorPhases.detailsSubtitle' }
  }
  if (/\/contractors\/[^/]+\/phases$/.test(pathname)) {
    return { titleKey: 'contractorPhases.title', subtitleKey: 'contractorPhases.subtitle' }
  }
  if (/^\/projects\/[^/]+\/progress\/new$/.test(pathname)) {
    return { titleKey: 'projectProgress.create', subtitleKey: 'projectProgress.createSubtitle' }
  }
  if (/^\/projects\/[^/]+\/progress\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'projectProgress.edit', subtitleKey: 'projectProgress.editSubtitle' }
  }
  if (/^\/projects\/[^/]+\/progress\/[^/]+$/.test(pathname)) {
    return { titleKey: 'projectProgress.details', subtitleKey: 'projectProgress.detailsSubtitle' }
  }
  if (/^\/projects\/[^/]+\/progress$/.test(pathname)) {
    return { titleKey: 'projectProgress.title', subtitleKey: 'projectProgress.subtitle' }
  }
  if (/^\/projects\/[^/]+\/phases\/new$/.test(pathname)) {
    return { titleKey: 'projectPhases.create', subtitleKey: 'projectPhases.createSubtitle' }
  }
  if (/^\/projects\/[^/]+\/phases\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'projectPhases.edit', subtitleKey: 'projectPhases.editSubtitle' }
  }
  if (/^\/projects\/[^/]+\/phases\/[^/]+$/.test(pathname)) {
    return { titleKey: 'projectPhases.details', subtitleKey: 'projectPhases.detailsSubtitle' }
  }
  if (/^\/projects\/[^/]+\/phases$/.test(pathname)) {
    return { titleKey: 'projectPhases.title', subtitleKey: 'projectPhases.subtitle' }
  }
  if (/\/contractors\/[^/]+\/team\/new$/.test(pathname)) {
    return { titleKey: 'contractorTeam.create', subtitleKey: 'contractorTeam.createSubtitle' }
  }
  if (/\/team\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'contractorTeam.edit', subtitleKey: 'contractorTeam.editSubtitle' }
  }
  if (/\/team\/[^/]+$/.test(pathname)) {
    return { titleKey: 'contractorTeam.details', subtitleKey: 'contractorTeam.detailsSubtitle' }
  }
  if (/\/team$/.test(pathname)) {
    return { titleKey: 'contractorTeam.title', subtitleKey: 'contractorTeam.subtitle' }
  }
  if (/\/contractors\/new$/.test(pathname)) {
    return { titleKey: 'contractors.create', subtitleKey: 'contractors.createSubtitle' }
  }
  if (/\/contractors\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'contractors.edit', subtitleKey: 'contractors.editSubtitle' }
  }
  if (/\/contractors\/[^/]+$/.test(pathname)) {
    return { titleKey: 'contractors.details', subtitleKey: 'contractors.detailsSubtitle' }
  }
  if (/\/contractors$/.test(pathname)) {
    return { titleKey: 'contractors.title', subtitleKey: 'contractors.subtitle' }
  }
  if (/^\/projects\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'projects.edit', subtitleKey: 'projects.editSubtitle' }
  }
  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return { titleKey: 'projects.details', subtitleKey: 'projects.detailsSubtitle' }
  }
  if (pathname.startsWith('/projects')) {
    return { titleKey: 'menus.projects', subtitleKey: 'projects.subtitle' }
  }
  if (pathname === '/food-reservation/foods/new') {
    return { titleKey: 'foods.create', subtitleKey: 'foods.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/food-reservation/foods/')) {
    return { titleKey: 'foods.edit', subtitleKey: 'foods.editSubtitle' }
  }
  if (pathname.startsWith('/food-reservation/foods/')) {
    return { titleKey: 'foods.details', subtitleKey: 'foods.detailsSubtitle' }
  }
  if (pathname.startsWith('/food-reservation/foods')) {
    return { titleKey: 'menus.foodManagement', subtitleKey: 'foods.subtitle' }
  }
  if (/\/restaurants\/[^/]+\/menu\/new$/.test(pathname)) {
    return { titleKey: 'restaurantMenuItems.create', subtitleKey: 'restaurantMenuItems.createSubtitle' }
  }
  if (/\/menu\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'restaurantMenuItems.edit', subtitleKey: 'restaurantMenuItems.editSubtitle' }
  }
  if (/\/menu\/[^/]+$/.test(pathname)) {
    return { titleKey: 'restaurantMenuItems.details', subtitleKey: 'restaurantMenuItems.detailsSubtitle' }
  }
  if (/\/menu$/.test(pathname)) {
    return { titleKey: 'restaurantMenuItems.title', subtitleKey: 'restaurantMenuItems.subtitle' }
  }
  if (pathname === '/food-reservation/restaurants/new') {
    return { titleKey: 'restaurants.create', subtitleKey: 'restaurants.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/food-reservation/restaurants/')) {
    return { titleKey: 'restaurants.edit', subtitleKey: 'restaurants.editSubtitle' }
  }
  if (pathname.startsWith('/food-reservation/restaurants/')) {
    return { titleKey: 'restaurants.details', subtitleKey: 'restaurants.detailsSubtitle' }
  }
  if (pathname.startsWith('/food-reservation/restaurants')) {
    return { titleKey: 'menus.restaurantManagement', subtitleKey: 'restaurants.subtitle' }
  }
  if (pathname === '/food-reservation/reserve/new') {
    return { titleKey: 'foodReservations.create', subtitleKey: 'foodReservations.createSubtitle' }
  }
  if (pathname.startsWith('/food-reservation/reserve/')) {
    return { titleKey: 'foodReservations.details', subtitleKey: 'foodReservations.detailsSubtitle' }
  }
  if (pathname.startsWith('/food-reservation/reserve')) {
    return { titleKey: 'menus.foodReserve', subtitleKey: 'foodReservations.subtitle' }
  }
  if (pathname.startsWith('/food-reservation/history/')) {
    return { titleKey: 'foodReservations.details', subtitleKey: 'foodReservations.detailsSubtitle' }
  }
  if (pathname.startsWith('/food-reservation/history')) {
    return { titleKey: 'menus.foodReservationHistory', subtitleKey: 'foodReservations.historySubtitle' }
  }
  if (pathname.startsWith('/food-reservation/cost-estimate')) {
    return { titleKey: 'menus.foodCostEstimate', subtitleKey: 'foodCostEstimate.subtitle' }
  }
  if (pathname.startsWith('/food-reservation/report')) {
    return { titleKey: 'menus.foodReservationReport', subtitleKey: 'foodReservations.reportSubtitle' }
  }
  if (pathname === '/organization/positions/new') {
    return { titleKey: 'organizationPositions.create', subtitleKey: 'organizationPositions.createSubtitle' }
  }
  if (/\/organization\/positions\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'organizationPositions.edit', subtitleKey: 'organizationPositions.editSubtitle' }
  }
  if (/\/organization\/positions\/[^/]+$/.test(pathname)) {
    return { titleKey: 'organizationPositions.details', subtitleKey: 'organizationPositions.detailsSubtitle' }
  }
  if (pathname.startsWith('/organization/positions')) {
    return { titleKey: 'menus.organizationPositions', subtitleKey: 'organizationPositions.subtitle' }
  }
  if (pathname === '/organization/unit-kinds/new') {
    return { titleKey: 'organizationUnitKinds.create', subtitleKey: 'organizationUnitKinds.createSubtitle' }
  }
  if (/\/organization\/unit-kinds\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'organizationUnitKinds.edit', subtitleKey: 'organizationUnitKinds.editSubtitle' }
  }
  if (/\/organization\/unit-kinds\/[^/]+$/.test(pathname)) {
    return { titleKey: 'organizationUnitKinds.details', subtitleKey: 'organizationUnitKinds.detailsSubtitle' }
  }
  if (pathname.startsWith('/organization/unit-kinds')) {
    return { titleKey: 'menus.organizationUnitKinds', subtitleKey: 'organizationUnitKinds.subtitle' }
  }
  if (/\/organization\/units\/[^/]+\/restaurants\/new$/.test(pathname)) {
    return { titleKey: 'organizationUnitRestaurants.create', subtitleKey: 'organizationUnitRestaurants.createSubtitle' }
  }
  if (/\/organization\/units\/[^/]+\/restaurants\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'organizationUnitRestaurants.edit', subtitleKey: 'organizationUnitRestaurants.editSubtitle' }
  }
  if (/\/organization\/units\/[^/]+\/restaurants\/[^/]+$/.test(pathname)) {
    return { titleKey: 'organizationUnitRestaurants.details', subtitleKey: 'organizationUnitRestaurants.detailsSubtitle' }
  }
  if (/\/organization\/units\/[^/]+\/restaurants$/.test(pathname)) {
    return { titleKey: 'organizationUnitRestaurants.title', subtitleKey: 'organizationUnitRestaurants.subtitle' }
  }
  if (pathname === '/organization/units/new') {
    return { titleKey: 'organizationUnits.create', subtitleKey: 'organizationUnits.createSubtitle' }
  }
  if (/\/organization\/units\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'organizationUnits.edit', subtitleKey: 'organizationUnits.editSubtitle' }
  }
  if (/\/organization\/units\/[^/]+$/.test(pathname)) {
    return { titleKey: 'organizationUnits.details', subtitleKey: 'organizationUnits.detailsSubtitle' }
  }
  if (pathname.startsWith('/organization/units')) {
    return { titleKey: 'menus.organizationUnits', subtitleKey: 'organizationUnits.subtitle' }
  }
  if (pathname === '/organization/employees/new') {
    return { titleKey: 'employees.create', subtitleKey: 'employees.createSubtitle' }
  }
  if (/\/organization\/employees\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'employees.edit', subtitleKey: 'employees.editSubtitle' }
  }
  if (/\/organization\/employees\/[^/]+$/.test(pathname)) {
    return { titleKey: 'employees.details', subtitleKey: 'employees.detailsSubtitle' }
  }
  if (pathname.startsWith('/organization/employees')) {
    return { titleKey: 'menus.organizationEmployees', subtitleKey: 'employees.subtitle' }
  }
  if (pathname === '/organization/new') {
    return { titleKey: 'organization.create', subtitleKey: 'organization.createSubtitle' }
  }
  if (pathname === '/organization/edit') {
    return { titleKey: 'organization.edit', subtitleKey: 'organization.editSubtitle' }
  }
  if (pathname === '/organization/phones/new') {
    return { titleKey: 'organizationPhones.create', subtitleKey: 'organizationPhones.createSubtitle' }
  }
  if (/\/organization\/phones\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'organizationPhones.edit', subtitleKey: 'organizationPhones.editSubtitle' }
  }
  if (/\/organization\/phones\/[^/]+$/.test(pathname)) {
    return { titleKey: 'organizationPhones.details', subtitleKey: 'organizationPhones.detailsSubtitle' }
  }
  if (pathname.startsWith('/organization/phones')) {
    return { titleKey: 'organizationPhones.title', subtitleKey: 'organizationPhones.subtitle' }
  }
  if (/\/vehicles\/[^/]+\/assignments\/new$/.test(pathname)) {
    return { titleKey: 'vehicleAssignments.create', subtitleKey: 'vehicleAssignments.createSubtitle' }
  }
  if (/\/vehicles\/[^/]+\/assignments\/[^/]+\/return$/.test(pathname)) {
    return { titleKey: 'vehicleAssignments.return', subtitleKey: 'vehicleAssignments.returnSubtitle' }
  }
  if (/\/vehicles\/[^/]+\/assignments\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'vehicleAssignments.edit', subtitleKey: 'vehicleAssignments.editSubtitle' }
  }
  if (/\/vehicles\/[^/]+\/assignments\/[^/]+$/.test(pathname)) {
    return { titleKey: 'vehicleAssignments.details', subtitleKey: 'vehicleAssignments.detailsSubtitle' }
  }
  if (/\/vehicles\/[^/]+\/assignments$/.test(pathname)) {
    return { titleKey: 'vehicleAssignments.title', subtitleKey: 'vehicleAssignments.subtitle' }
  }
  if (pathname.startsWith('/vehicles/reports')) {
    return { titleKey: 'menus.vehicleReports', subtitleKey: 'vehicleReports.subtitle' }
  }
  if (pathname === '/vehicles/brands/new') {
    return { titleKey: 'vehicleBrands.create', subtitleKey: 'vehicleBrands.createSubtitle' }
  }
  if (/\/vehicles\/brands\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'vehicleBrands.edit', subtitleKey: 'vehicleBrands.editSubtitle' }
  }
  if (/\/vehicles\/brands\/[^/]+$/.test(pathname)) {
    return { titleKey: 'vehicleBrands.details', subtitleKey: 'vehicleBrands.detailsSubtitle' }
  }
  if (pathname.startsWith('/vehicles/brands')) {
    return { titleKey: 'menus.vehicleBrands', subtitleKey: 'vehicleBrands.subtitle' }
  }
  if (pathname === '/vehicles/new') {
    return { titleKey: 'vehicles.create', subtitleKey: 'vehicles.createSubtitle' }
  }
  if (/^\/vehicles\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: 'vehicles.edit', subtitleKey: 'vehicles.editSubtitle' }
  }
  if (/^\/vehicles\/[^/]+$/.test(pathname)) {
    return { titleKey: 'vehicles.details', subtitleKey: 'vehicles.detailsSubtitle' }
  }
  if (pathname.startsWith('/vehicles')) {
    return { titleKey: 'menus.vehicles', subtitleKey: 'vehicles.subtitle' }
  }
  if (pathname.startsWith('/organization')) {
    return { titleKey: 'organization.details', subtitleKey: 'organization.detailsSubtitle' }
  }
  if (pathname === '/') {
    return { titleKey: 'dashboard.title', subtitleKey: 'dashboard.subtitle' }
  }
  return { titleKey: 'menus.overview' }
}
