export function boardRequestsPath() {
  return '/board/requests'
}

export function boardRequestPath(id: string) {
  return `${boardRequestsPath()}/${id}`
}

export function boardRequestCreatePath() {
  return `${boardRequestsPath()}/new`
}

export function boardRequestEditPath(id: string) {
  return `${boardRequestPath(id)}/edit`
}

export function boardPlansPath() {
  return '/board/plans'
}

export function boardPermissionsPath() {
  return '/board/permissions'
}

export function boardCalendarPath() {
  return '/board/calendar'
}

export function boardReportsPath() {
  return '/board/reports'
}

export function boardSmartSearchPath() {
  return '/board/search'
}

export function boardResolutionsPath() {
  return '/board/resolutions'
}

export function boardMinutesListPath(requestId?: string) {
  return requestId ? `${boardRequestPath(requestId)}/minutes` : '/board/minutes'
}

export function boardMinutesCreatePath(requestId?: string) {
  return `${boardMinutesListPath(requestId)}/new`
}

export function boardMinutePath(id: string, requestId?: string) {
  return `${boardMinutesListPath(requestId)}/${id}`
}

export function boardMinuteEditPath(id: string, requestId?: string) {
  return `${boardMinutePath(id, requestId)}/edit`
}

export function boardMinuteResolutionsPath(minutesId: string, requestId?: string) {
  return `${boardMinutePath(minutesId, requestId)}/resolutions`
}

export function boardMinuteResolutionPath(
  minutesId: string,
  resolutionId: string,
  requestId?: string,
) {
  return `${boardMinuteResolutionsPath(minutesId, requestId)}/${resolutionId}`
}
