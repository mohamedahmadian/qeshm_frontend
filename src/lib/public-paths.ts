export function isPublicSessionPath(pathname: string) {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/impersonate') ||
    pathname.startsWith('/p/')
  )
}
