export function qeshmondiPath() {
  return '/qeshmondi'
}

export function qeshmondiCitizenPath(id: string) {
  return `${qeshmondiPath()}/${id}`
}

export function isQeshmondiPath(pathname: string) {
  return pathname === qeshmondiPath() || pathname.startsWith(`${qeshmondiPath()}/`)
}
