import { BadgeX, Banknote, CalendarClock, Ticket } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { DateText } from '../../components/ui/DateText'
import {
  nextSortState,
  PaginationBar,
  SortableTh,
  TableCard,
  type SortDir,
} from '../../components/ui/ListControls'
import { FormCard, FormEmptyHint, FormFactTile } from '../../components/ui/FormLayout'
import { api } from '../../lib/api'
import {
  displayDateParts,
  formatGroupedNumber,
  formatWeekday,
  localizeDigits,
  monthName,
} from '../../lib/datetime'
import type { Paginated, Port, PortTicketQuotaRow, PortTicketSale } from '../../types/app'
import { usePortsLookup } from '../port-sales-reports/PortSalesReportForm'

const trafficTabs = ['all', 'weekly', 'personal'] as const
type TrafficTab = (typeof trafficTabs)[number]

const tabIcons = {
  all: Ticket,
  weekly: CalendarClock,
  personal: BadgeX,
} as const

const defaultSort: Record<TrafficTab, { sortBy: string; sortDir: SortDir }> = {
  all: { sortBy: 'travelDate', sortDir: 'asc' },
  weekly: { sortBy: 'week', sortDir: 'asc' },
  personal: { sortBy: 'unauthorized', sortDir: 'desc' },
}

type TrafficQuotaRow = PortTicketQuotaRow & {
  amount: number
  reportId: string
  reportDate: string | null
  origin: string | null
  destination: string | null
}

type TrafficRoute = {
  origin: string | null
  destination: string | null
  count: number
}

type TrafficResponse = Paginated<PortTicketSale | TrafficQuotaRow> & {
  tripCount: number
  routes: TrafficRoute[]
  nationalIdPrefix: string
  unauthorizedTotal?: number
  unauthorizedAmount?: number
}

function formatQuotaWeek(
  start: string,
  end: string,
  locale: string,
  t: (key: string, options?: Record<string, string>) => string,
) {
  const from = displayDateParts(start, locale)
  const to = displayDateParts(end, locale)
  if (!from || !to) return '—'
  if (from.year === to.year && from.month === to.month) {
    return t('portSalesReports.weekRangeSame', {
      from: localizeDigits(String(from.day), locale),
      to: localizeDigits(String(to.day), locale),
      month: monthName(from.month, locale),
    })
  }
  if (from.year === to.year) {
    return t('portSalesReports.weekRangeSpan', {
      from: localizeDigits(String(from.day), locale),
      fromMonth: monthName(from.month, locale),
      to: localizeDigits(String(to.day), locale),
      toMonth: monthName(to.month, locale),
    })
  }
  return t('portSalesReports.weekRangeYears', {
    from: localizeDigits(String(from.day), locale),
    fromMonth: monthName(from.month, locale),
    fromYear: localizeDigits(String(from.year), locale),
    to: localizeDigits(String(to.day), locale),
    toMonth: monthName(to.month, locale),
    toYear: localizeDigits(String(to.year), locale),
  })
}

function QuotaStatusBadge({ status }: { status: PortTicketQuotaRow['status'] }) {
  const { t } = useTranslation()
  const violation = status === 'violation'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
        violation ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-mint-50 text-teal-800 ring-teal-100'
      }`}
    >
      <span aria-hidden>{violation ? '🔴' : '🟢'}</span>
      {t(violation ? 'portSalesReports.quotaViolation' : 'portSalesReports.quotaAllowed')}
    </span>
  )
}

function TravelStamp({
  date,
  time,
  locale,
}: {
  date: string | null
  time: string | null
  locale: string
}) {
  if (!date && !time) return '—'
  const weekday = date ? formatWeekday(date, locale) : ''
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5" dir="ltr">
      {weekday ? <span className="text-ink-600">{weekday}</span> : null}
      {date ? <DateText value={date} /> : null}
      {time ? <span>{localizeDigits(time, locale)}</span> : null}
    </span>
  )
}

const portTones = [
  'bg-sky-50 text-sky-800 ring-sky-200',
  'bg-amber-50 text-amber-900 ring-amber-200',
  'bg-violet-50 text-violet-800 ring-violet-200',
  'bg-rose-50 text-rose-800 ring-rose-200',
  'bg-teal-50 text-teal-800 ring-teal-200',
  'bg-orange-50 text-orange-900 ring-orange-200',
  'bg-indigo-50 text-indigo-800 ring-indigo-200',
  'bg-lime-50 text-lime-900 ring-lime-200',
  'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200',
  'bg-cyan-50 text-cyan-900 ring-cyan-200',
] as const

const pendingPortTone = 'bg-cream-100 text-ink-700 ring-line'

function portKey(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function hashPort(name: string) {
  let hash = 0
  for (const char of name) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0
  return hash
}

function usePortToneMap(ports: Port[] | undefined) {
  return useMemo(() => {
    const ordered = [...(ports ?? [])].sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    )
    const map = new Map<string, string>()
    ordered.forEach((port, index) => {
      map.set(portKey(port.name), portTones[index % portTones.length])
    })
    return map
  }, [ports])
}

function PortNameChip({ name, tone }: { name?: string | null; tone: string }) {
  const label = name?.trim()
  if (!label) return '—'
  return (
    <span className={`inline-flex max-w-full rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tone}`}>
      {label}
    </span>
  )
}

export function CitizenTrafficCard({
  nationalId,
  locale,
}: {
  nationalId: string | null
  locale: string
}) {
  const { t } = useTranslation()
  const portsQuery = usePortsLookup()
  const portToneMap = usePortToneMap(portsQuery.data)
  const [tab, setTab] = useState<TrafficTab>('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState(defaultSort.all.sortBy)
  const [sortDir, setSortDir] = useState<SortDir | ''>(defaultSort.all.sortDir)
  const [tripCount, setTripCount] = useState<number | null>(null)
  const [routes, setRoutes] = useState<TrafficRoute[]>([])

  useEffect(() => {
    setTab('all')
    setPage(1)
    setSortBy(defaultSort.all.sortBy)
    setSortDir(defaultSort.all.sortDir)
    setTripCount(null)
    setRoutes([])
  }, [nationalId])

  const query = useQuery({
    queryKey: ['qeshmondi-traffic', nationalId, tab, page, sortBy, sortDir],
    enabled: Boolean(nationalId),
    queryFn: async () => {
      const { data } = await api.get<TrafficResponse>('/users/qeshmondi-traffic', {
        params: {
          nationalId,
          scope: tab,
          page,
          ...(sortBy && (sortDir === 'asc' || sortDir === 'desc') ? { sortBy, sortDir } : {}),
        },
      })
      return data
    },
  })

  useEffect(() => {
    if (!query.data) return
    setTripCount(query.data.tripCount)
    setRoutes(query.data.routes ?? [])
  }, [query.data])

  function selectTab(next: TrafficTab) {
    if (next === tab) return
    const sort = defaultSort[next]
    setTab(next)
    setPage(1)
    setSortBy(sort.sortBy)
    setSortDir(sort.sortDir)
  }

  function onSort(column: string) {
    const next = nextSortState(column, sortBy, sortDir)
    setSortBy(next.sortBy ?? '')
    setSortDir(next.sortDir ?? '')
    setPage(1)
  }

  function toneFor(name?: string | null) {
    const key = portKey(name ?? '')
    if (!key) return pendingPortTone
    const assigned = portToneMap.get(key)
    if (assigned) return assigned
    if (!portsQuery.isFetched) return pendingPortTone
    return portTones[hashPort(key) % portTones.length]
  }

  const prefix = query.data?.nationalIdPrefix ?? '345'
  const quotaTab = tab === 'weekly' || tab === 'personal'
  const tickets = !quotaTab ? ((query.data?.items ?? []) as PortTicketSale[]) : []
  const quotaRows = quotaTab ? ((query.data?.items ?? []) as TrafficQuotaRow[]) : []

  return (
    <FormCard
      className="mt-4"
      icon={Ticket}
      title={t('qeshmondiInquiry.trafficTitle')}
      subtitle={t('qeshmondiInquiry.trafficSubtitle')}
      onDoubleClick={() => undefined}
      action={
        <div className="flex max-w-full flex-wrap items-stretch justify-end gap-2 sm:max-w-3xl">
          {routes.map((route) => (
            <div
              key={`${route.origin ?? ''}\n${route.destination ?? ''}`}
              data-header-stat
              className="rounded-2xl bg-white px-3 py-2 text-center shadow-[0_8px_18px_rgba(20,40,40,0.06)] ring-1 ring-teal-100"
              aria-label={t('qeshmondiInquiry.trafficRouteCount', {
                origin: route.origin?.trim() || '—',
                destination: route.destination?.trim() || '—',
                count: formatGroupedNumber(route.count, locale),
              })}
            >
              <p className="flex flex-wrap items-center justify-center gap-1">
                <PortNameChip name={route.origin} tone={toneFor(route.origin)} />
                <span className="text-[11px] font-medium text-ink-400">{t('qeshmondiInquiry.trafficRouteTo')}</span>
                <PortNameChip name={route.destination} tone={toneFor(route.destination)} />
              </p>
              <p className="mt-1 text-lg font-bold leading-none tabular-nums text-ink-900" dir="ltr">
                {formatGroupedNumber(route.count, locale)}
              </p>
            </div>
          ))}
          <div
            data-header-stat
            className="rounded-2xl bg-white px-4 py-2 text-center shadow-[0_8px_18px_rgba(20,40,40,0.06)] ring-1 ring-teal-100"
          >
            <p className="text-xs font-medium text-ink-500">{t('qeshmondiInquiry.trafficTotal')}</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-teal-700" dir="ltr">
              {tripCount == null ? '—' : formatGroupedNumber(tripCount, locale)}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 p-5 sm:p-6">
        {!nationalId ? (
          <FormEmptyHint>{t('qeshmondiInquiry.trafficNoNationalId')}</FormEmptyHint>
        ) : (
          <>
            <nav className="flex flex-wrap gap-2" role="tablist" aria-label={t('qeshmondiInquiry.trafficTitle')}>
              {trafficTabs.map((item) => {
                const Icon = tabIcons[item]
                const active = tab === item
                return (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => selectTab(item)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
                      active
                        ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                        : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                    }`}
                  >
                    <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
                    {t(`qeshmondiInquiry.trafficTabs.${item}`)}
                  </button>
                )
              })}
            </nav>
            {query.isError ? (
              <p className="text-sm text-ink-600">{t('qeshmondiInquiry.trafficFailed')}</p>
            ) : null}
            {quotaTab ? (
              <TableCard
                loading={query.isLoading}
                empty={t('qeshmondiInquiry.trafficEmpty')}
                hasRows={quotaRows.length > 0}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <SortableTh
                        column="report"
                        label={t('qeshmondiInquiry.trafficReport')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      {tab === 'weekly' ? (
                        <SortableTh
                          column="week"
                          label={t('portSalesReports.quotaWeek')}
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={onSort}
                        />
                      ) : null}
                      <SortableTh
                        column="nationalId"
                        label={t('portSalesReports.nationalId')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <SortableTh
                        column="total"
                        label={t('portSalesReports.quotaTotal')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <SortableTh
                        column="allowed"
                        label={t('portSalesReports.quotaAllowedCount')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <SortableTh
                        column="unauthorized"
                        label={t('portSalesReports.quotaUnauthorized')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <SortableTh
                        column="amount"
                        label={t('portSalesReports.quotaUnauthorizedAmount')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <SortableTh
                        column="status"
                        label={t('portSalesReports.quotaStatus')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {quotaRows.map((row) => (
                      <tr key={`${row.reportId}-${row.weekStart ?? 'all'}`} className="border-t border-line">
                        <td className="px-4 py-3">
                          <span className="inline-flex flex-col items-start gap-0.5">
                            {row.reportDate ? <DateText value={row.reportDate} /> : '—'}
                            {row.origin || row.destination ? (
                              <span className="inline-flex flex-wrap items-center gap-1">
                                {row.origin ? <PortNameChip name={row.origin} tone={toneFor(row.origin)} /> : null}
                                {row.origin && row.destination ? (
                                  <span className="text-xs text-ink-400">به</span>
                                ) : null}
                                {row.destination ? (
                                  <PortNameChip name={row.destination} tone={toneFor(row.destination)} />
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                        </td>
                        {tab === 'weekly' ? (
                          <td className="px-4 py-3">
                            {row.weekStart && row.weekEnd
                              ? formatQuotaWeek(row.weekStart, row.weekEnd, locale, t)
                              : '—'}
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          <CopyableDigits value={row.nationalId} />
                        </td>
                        <td className="px-4 py-3">{formatGroupedNumber(row.total, locale)}</td>
                        <td className="px-4 py-3">{formatGroupedNumber(row.allowed, locale)}</td>
                        <td className="px-4 py-3">
                          <span className={row.unauthorized > 0 ? 'font-bold' : undefined}>
                            {formatGroupedNumber(row.unauthorized, locale)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatGroupedNumber(row.amount, locale)}</td>
                        <td className="px-4 py-3">
                          <QuotaStatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            ) : (
              <TableCard
                loading={query.isLoading}
                empty={t('qeshmondiInquiry.trafficEmpty')}
                hasRows={tickets.length > 0}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <SortableTh
                        column="travelDate"
                        label={t('portSalesReports.travelDate')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <SortableTh
                        column="origin"
                        label={t('portSalesReports.origin')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <SortableTh
                        column="destination"
                        label={t('portSalesReports.destination')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <SortableTh
                        column="ticketNumber"
                        label={t('portSalesReports.ticketNumber')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <th className="px-4 py-3 text-start font-medium">
                        {t('portSalesReports.identityNumber')}
                      </th>
                      <SortableTh
                        column="fullName"
                        label={t('portSalesReports.fullName')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                      <th className="px-4 py-3 text-start font-medium">
                        {t('portSalesReports.qeshmondiEndDate')}
                      </th>
                      <SortableTh
                        column="amount"
                        label={t('portSalesReports.amount')}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="border-t border-line">
                        <td className="px-4 py-3">
                          <TravelStamp date={ticket.travelDate} time={ticket.travelTime} locale={locale} />
                        </td>
                        <td className="px-4 py-3">
                          <PortNameChip name={ticket.origin} tone={toneFor(ticket.origin)} />
                        </td>
                        <td className="px-4 py-3">
                          <PortNameChip name={ticket.destination} tone={toneFor(ticket.destination)} />
                        </td>
                        <td className="px-4 py-3">
                          {ticket.ticketNumber ? localizeDigits(ticket.ticketNumber, locale) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {ticket.nationalId || ticket.passportNumber ? (
                            <span className="inline-flex flex-col items-start gap-1">
                              {ticket.nationalId ? <CopyableDigits value={ticket.nationalId} /> : null}
                              {ticket.passportNumber ? <CopyableDigits value={ticket.passportNumber} /> : null}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">{ticket.fullName || '—'}</td>
                        <td className="px-4 py-3">
                          {ticket.qeshmondiEndDate ? (
                            <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
                              <DateText value={ticket.qeshmondiEndDate} />
                            </span>
                          ) : ticket.nationalId?.startsWith(prefix) ? (
                            <span className="inline-flex rounded-full bg-mint-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                              {t('portSalesReports.qeshmondiCitizenPrefix', {
                                prefix: localizeDigits(prefix, locale),
                              })}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {ticket.amount != null ? (
                            <span className="inline-flex rounded-full bg-mint-50 px-2 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-mint-100">
                              {formatGroupedNumber(ticket.amount, locale)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            )}
            {query.data ? (
              <PaginationBar
                page={query.data.page}
                pageSize={query.data.pageSize}
                total={query.data.total}
                onPageChange={setPage}
              />
            ) : null}
            {quotaTab && query.data ? (
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={BadgeX}
                  label={t('portSalesReports.quotaUnauthorizedGrand')}
                  value={formatGroupedNumber(query.data.unauthorizedTotal ?? 0, locale)}
                  tone="ink"
                />
                <FormFactTile
                  icon={Banknote}
                  label={t('portSalesReports.quotaUnauthorizedAmountGrand')}
                  value={`${formatGroupedNumber(query.data.unauthorizedAmount ?? 0, locale)} ${t('portSalesReports.toman')}`}
                  tone="teal"
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </FormCard>
  )
}
