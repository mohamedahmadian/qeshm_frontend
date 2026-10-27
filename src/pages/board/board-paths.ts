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

export function boardSignatoriesPath() {
  return '/board/signatories'
}

export function boardSignatoryPath(id: string) {
  return `${boardSignatoriesPath()}/${id}`
}

export function boardSignatoryCreatePath() {
  return `${boardSignatoriesPath()}/new`
}

export function boardSignatoryEditPath(id: string) {
  return `${boardSignatoryPath(id)}/edit`
}

export function boardSignatoryFullName(item: { firstName: string; lastName: string }) {
  return `${item.firstName} ${item.lastName}`.trim()
}

export function boardMinutesMemberName(item: {
  firstName?: string | null
  lastName?: string | null
  user?: { fullName?: string | null } | null
}) {
  const name = `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()
  return name || item.user?.fullName?.trim() || ''
}

export function boardMinutesMemberKind(item: {
  kind?: string | null
  signatoryId?: string | null
  userId?: string | null
}) {
  if (item.kind === 'SIGNATORY' || item.kind === 'GUEST' || item.kind === 'USER') return item.kind
  if (item.signatoryId) return 'SIGNATORY'
  if (item.userId) return 'USER'
  return 'GUEST'
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

export function boardMinuteSmsPath(id: string, requestId?: string) {
  return `${boardMinutePath(id, requestId)}/sms`
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
