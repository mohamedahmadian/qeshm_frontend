export function isAdmin(_user?: { impersonating?: boolean } | null) {
  return true
}

export function isPilgrim() {
  return false
}

export function formatRoles(
  _roles: { nameKey?: string }[] | undefined,
  _t: (key: string) => string,
) {
  return ''
}

export function hasNoRoles() {
  return true
}
