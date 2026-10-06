export function qeshmondiPath() {
  return '/qeshmondi'
}

export function qeshmondiInquiryPath() {
  return '/qeshmondi/inquiry'
}

export function qeshmondiAnalyticsPath() {
  return '/qeshmondi/analytics'
}

export function qeshmondiSyncLogsPath() {
  return '/qeshmondi/sync-logs'
}

export function qeshmondiSyncLogPath(id: string) {
  return `${qeshmondiSyncLogsPath()}/${id}`
}

export function qeshmondiCitizenPath(id: string) {
  return `${qeshmondiPath()}/${id}`
}

export function isQeshmondiPath(pathname: string) {
  return pathname === qeshmondiPath() || pathname.startsWith(`${qeshmondiPath()}/`)
}
