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

export function foodReservePath() {
  return '/food-reservation/reserve'
}

export function foodReserveItemPath(id: string) {
  return `${foodReservePath()}/${id}`
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
