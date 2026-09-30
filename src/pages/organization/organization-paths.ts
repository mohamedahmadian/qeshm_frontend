import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export function organizationPath() {
  return '/organization'
}

export function organizationNewPath() {
  return `${organizationPath()}/new`
}

export function organizationEditPath() {
  return `${organizationPath()}/edit`
}

export function organizationPhonesPath() {
  return `${organizationPath()}/phones`
}

export function organizationPhonePath(id: string) {
  return `${organizationPhonesPath()}/${id}`
}

export function organizationPositionsPath() {
  return `${organizationPath()}/positions`
}

export function organizationPositionPath(id: string) {
  return `${organizationPositionsPath()}/${id}`
}

export function organizationUnitKindsPath() {
  return `${organizationPath()}/unit-kinds`
}

export function organizationUnitKindPath(id: string) {
  return `${organizationUnitKindsPath()}/${id}`
}

export const FOOD_RESERVATION_UNIT_REPS_PATH = '/food-reservation/unit-reps'

export function organizationUnitsPath() {
  return `${organizationPath()}/units`
}

export function organizationUnitsBase(pathname: string) {
  if (
    pathname === FOOD_RESERVATION_UNIT_REPS_PATH ||
    pathname.startsWith(`${FOOD_RESERVATION_UNIT_REPS_PATH}/`)
  ) {
    return FOOD_RESERVATION_UNIT_REPS_PATH
  }
  return organizationUnitsPath()
}

export function organizationUnitPath(id: string) {
  return `${organizationUnitsPath()}/${id}`
}

export function organizationEmployeesPath() {
  return `${organizationPath()}/employees`
}

export function organizationEmployeePath(id: string) {
  return `${organizationEmployeesPath()}/${id}`
}

export function isOrganizationEmployeePath(pathname: string) {
  return pathname.startsWith(organizationEmployeesPath())
}

export function organizationUnitRestaurantsPath(unitId: string) {
  return `${organizationUnitPath(unitId)}/restaurants`
}

export function organizationUnitRestaurantPath(unitId: string, id: string) {
  return `${organizationUnitRestaurantsPath(unitId)}/${id}`
}

export function useOrganizationUnitRoutes() {
  const { pathname } = useLocation()
  return useMemo(() => {
    const base = organizationUnitsBase(pathname)
    const onUnitReps = base === FOOD_RESERVATION_UNIT_REPS_PATH
    return {
      list: () => base,
      unit: (id: string) => `${base}/${id}`,
      restaurants: (unitId: string) =>
        onUnitReps ? `${base}/${unitId}/edit` : `${base}/${unitId}/restaurants`,
      restaurantLinks: (unitId: string) => `${base}/${unitId}/restaurants`,
      restaurant: (unitId: string, linkId: string) => `${base}/${unitId}/restaurants/${linkId}`,
    }
  }, [pathname])
}
