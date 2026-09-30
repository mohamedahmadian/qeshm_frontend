export function foodsPath() {
  return '/food-reservation/foods'
}

export function foodPath(id: string) {
  return `${foodsPath()}/${id}`
}

export function restaurantsPath() {
  return '/food-reservation/restaurants'
}

export function restaurantPath(id: string) {
  return `${restaurantsPath()}/${id}`
}

export function restaurantMenuPath(restaurantId: string) {
  return `${restaurantPath(restaurantId)}/menu`
}

export function restaurantUnitsPath(restaurantId: string) {
  return `${restaurantPath(restaurantId)}/units`
}

export function restaurantUnitPath(restaurantId: string, linkId: string) {
  return `${restaurantUnitsPath(restaurantId)}/${linkId}`
}

export function foodReservePath() {
  return '/food-reservation/reserve'
}

export function foodReserveItemPath(id: string) {
  return `${foodReservePath()}/${id}`
}

export function foodMyOrdersPath() {
  return '/food-reservation/my-orders'
}

export function foodMyOrderItemPath(id: string) {
  return `${foodMyOrdersPath()}/${id}`
}

export function foodMyReportPath() {
  return '/food-reservation/my-report'
}

export function foodReservationHistoryPath() {
  return '/food-reservation/history'
}

export function foodReservationHistoryItemPath(id: string) {
  return `${foodReservationHistoryPath()}/${id}`
}

export function foodReservationReportPath() {
  return '/food-reservation/report'
}

export function foodCostEstimatePath() {
  return '/food-reservation/cost-estimate'
}

export function foodUnitReportPath() {
  return '/food-reservation/unit-report'
}

export function unitRepsPath() {
  return '/food-reservation/unit-reps'
}

export function unitRepPath(unitId: string) {
  return `${unitRepsPath()}/${unitId}`
}
