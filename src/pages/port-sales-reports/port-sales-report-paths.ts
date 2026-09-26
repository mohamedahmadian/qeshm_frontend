export const DEFAULT_PORT_ORIGIN = 'بندر حقانی بندر عباس'
export const DEFAULT_PORT_DESTINATION = 'بندر ذاکری قشم'

export const PORT_OPTIONS = [DEFAULT_PORT_ORIGIN, DEFAULT_PORT_DESTINATION] as const

export function portSalesReportsPath() {
  return '/port-sales-reports'
}

export function portSalesReportPath(id: string) {
  return `${portSalesReportsPath()}/${id}`
}

export function portSalesReportDisplayName(item: {
  reportDate?: string | null
  origin?: string | null
  destination?: string | null
  originalFileName?: string | null
}) {
  const route = [item.origin, item.destination].filter(Boolean).join(' به ')
  return route || item.originalFileName || ''
}
