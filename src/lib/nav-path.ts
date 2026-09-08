export function normalizeMenuPath(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

export function menuPathMatches(pathname: string, menuPath: string) {
  const path = normalizeMenuPath(pathname)
  const itemPath = normalizeMenuPath(menuPath)
  if (itemPath === '/') return path === '/'
  return path === itemPath || path.startsWith(`${itemPath}/`)
}

/** Longest matching menu path wins, so `/evaluations` stays inactive on `/evaluations/campaigns`. */
export function isSidebarMenuActive(pathname: string, menuPath: string, allMenuPaths: string[]) {
  if (!menuPathMatches(pathname, menuPath)) return false
  const normalized = normalizeMenuPath(menuPath)
  return !allMenuPaths.some((other) => {
    const otherPath = normalizeMenuPath(other)
    return otherPath !== normalized && otherPath.length > normalized.length && menuPathMatches(pathname, other)
  })
}
