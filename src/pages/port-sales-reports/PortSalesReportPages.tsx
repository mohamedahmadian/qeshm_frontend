import {
  Anchor,
  BadgeCheck,
  BadgeX,
  Banknote,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Download,
  FileSpreadsheet,
  Hash,
  IdCard,
  MapPin,
  Plus,
  Ship,
  Ticket,
  Users,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { DateText } from '../../components/ui/DateText'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
  nextSortState,
  type SortDir,
} from '../../components/ui/ListControls'
import {
  Button,
  DetailActions,
  FormField,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getApiErrorMessage, getFileUrl } from '../../lib/api'
import {
  displayDateParts,
  formatGroupedNumber,
  formatNumber,
  formatWeekday,
  localizeDigits,
  monthName,
  toLatinDigits,
} from '../../lib/datetime'
import type {
  Paginated,
  PortSalesReport,
  PortTicketQeshmondiStatus,
  PortTicketQuotaRow,
  PortTicketSale,
} from '../../types/app'
import { portTicketQeshmondiStatuses } from '../../types/app'
import {
  PortSalesReportForm,
  type PortSalesImportProgress,
  type PortSalesReportPayload,
} from './PortSalesReportForm'
import {
  portSalesReportDisplayName,
  portSalesReportPath,
  portSalesReportsPath,
} from './port-sales-report-paths'

type PortSalesImportJob = {
  phase: 'parsing' | 'saving' | 'done' | 'error'
  percent: number
  processed: number
  total: number
  error: string | null
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toFormData(payload: PortSalesReportPayload) {
  const form = new FormData()
  form.append('reportDate', payload.reportDate)
  form.append('origin', payload.origin)
  form.append('destination', payload.destination)
  if (payload.file) form.append('file', payload.file)
  return form
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

const ticketReportTabs = ['all', 'invalid', 'weekly', 'personal'] as const
type TicketReportTab = (typeof ticketReportTabs)[number]
type QuotaTab = 'weekly' | 'personal'

type QuotaListState = {
  page: number
  q: string
  term: string
  sortBy: string
  sortDir: SortDir | ''
}

function emptyQuotaList(): QuotaListState {
  return { page: 1, q: '', term: '', sortBy: 'unauthorized', sortDir: 'desc' }
}

const ticketSortFields = new Set([
  'ticketNumber',
  'nationalId',
  'passportNumber',
  'fullName',
  'citizenship',
  'qeshmondiStatus',
  'travelDate',
  'amount',
  'rowNumber',
])

const quotaSortFields = new Set([
  'week',
  'nationalId',
  'total',
  'allowed',
  'unauthorized',
  'amount',
  'status',
])

function parseTicketTab(value: string | null): TicketReportTab {
  if (value === 'invalid' || value === 'weekly' || value === 'personal') return value
  return 'all'
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
        violation
          ? 'bg-red-50 text-red-700 ring-red-100'
          : 'bg-mint-50 text-teal-800 ring-teal-100'
      }`}
    >
      <span aria-hidden>{violation ? '🔴' : '🟢'}</span>
      {t(violation ? 'portSalesReports.quotaViolation' : 'portSalesReports.quotaAllowed')}
    </span>
  )
}

function StatFilterTile({
  active,
  onClick,
  icon,
  label,
  value,
  extra,
  action,
  tone = 'teal',
}: {
  active: boolean
  onClick: () => void
  icon: typeof Ticket
  label: string
  value: string
  extra?: ReactNode
  action?: ReactNode
  tone?: 'teal' | 'mint' | 'ink'
}) {
  return (
    <div className={`relative rounded-2xl ${active ? 'ring-2 ring-teal-500' : ''}`}>
      <button type="button" className="w-full cursor-pointer text-start" onClick={onClick}>
        <FormFactTile icon={icon} label={label} value={value} extra={extra} tone={tone} />
      </button>
      {action ? (
        <div className="absolute end-2 top-2 z-20">{action}</div>
      ) : null}
    </div>
  )
}

export function PortSalesReportListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['port-sales-reports', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<PortSalesReport>>('/port-sales-reports', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = portSalesReportsPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Ship}
        title={t('menus.portSalesReports')}
        subtitle={t('portSalesReports.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('portSalesReports.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('portSalesReports.search')}
        placeholder={t('portSalesReports.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('portSalesReports.noResults') : t('portSalesReports.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="createdAt"
                label={t('portSalesReports.uploadedAt')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="reportDate"
                label={t('portSalesReports.reportDate')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="originalFileName"
                label={t('portSalesReports.fileLink')}
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
                column="recordCount"
                label={t('portSalesReports.recordCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <DateText value={item.createdAt} withTime />
                </td>
                <td className="px-4 py-3">
                  <DateText value={item.reportDate} />
                </td>
                <td className="px-4 py-3">
                  <a
                    href={getFileUrl(item.fileId)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-teal-700 hover:underline"
                  >
                    <Download className="size-4" aria-hidden />
                    {item.originalFileName}
                  </a>
                </td>
                <td className="px-4 py-3">{item.origin}</td>
                <td className="px-4 py-3">{item.destination}</td>
                <td className="px-4 py-3">{formatNumber(item.recordCount, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={portSalesReportPath(item.id)}
                    editTo={`${portSalesReportPath(item.id)}/edit`}
                    rowOpensView
                    onDelete={() =>
                      confirmDelete({
                        message: t('portSalesReports.confirmDelete'),
                        successMessage: t('portSalesReports.deleted'),
                        path: `/port-sales-reports/${item.id}`,
                        queryKey: ['port-sales-reports'],
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}

export function PortSalesReportCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader icon={Ship} title={t('portSalesReports.create')} subtitle={t('portSalesReports.createSubtitle')} />
      <PortSalesReportForm
        onSubmit={async (payload, onProgress) => {
          const started = Date.now()
          onProgress?.({ phase: 'uploading', percent: 0 })
          const { data } = await api.post<{ jobId: string }>('/port-sales-reports', toFormData(payload), {
            onUploadProgress: (event) => {
              const total = event.total || payload.file?.size || 0
              const ratio = total > 0 ? event.loaded / total : 0
              onProgress?.({
                phase: 'uploading',
                percent: Math.min(35, Math.round(ratio * 35)),
              })
            },
          })
          onProgress?.({ phase: 'parsing', percent: 35 })
          for (;;) {
            if (Date.now() - started > 20 * 60 * 1000) {
              throw new Error(t('portSalesReports.importFailed'))
            }
            await wait(400)
            const { data: job } = await api.get<PortSalesImportJob>(
              `/port-sales-reports/imports/${data.jobId}`,
            )
            if (job.phase === 'error') {
              throw new Error(job.error || t('portSalesReports.importFailed'))
            }
            const phase: PortSalesImportProgress['phase'] = job.phase === 'parsing' ? 'parsing' : 'saving'
            onProgress?.({
              phase,
              percent: 35 + Math.round((job.percent / 100) * 65),
              processed: job.processed,
              total: job.total,
            })
            if (job.phase === 'done') break
          }
          toast.success(t('portSalesReports.created'))
          navigate(portSalesReportsPath())
        }}
      />
    </div>
  )
}

export function PortSalesReportEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['port-sales-report', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<PortSalesReport>(`/port-sales-reports/${id}`)
      return data
    },
  })
  if (!query.data || !id) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Ship}
        title={t('portSalesReports.edit')}
        subtitle={<EntityNameSubtitle name={portSalesReportDisplayName(query.data)} icon={Ship} />}
      />
      <PortSalesReportForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/port-sales-reports/${id}`, {
            reportDate: payload.reportDate,
            origin: payload.origin,
            destination: payload.destination,
          })
          toast.success(t('portSalesReports.updated'))
          navigate(portSalesReportsPath())
        }}
      />
    </div>
  )
}

export function PortSalesReportDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, onSort } = useListSort(searchParams, setParams)
  const qeshmondiStatus = (searchParams.get('qeshmondiStatus') ?? '') as PortTicketQeshmondiStatus | ''
  const travelFrom = searchParams.get('from') ?? ''
  const travelTo = searchParams.get('to') ?? ''
  const ticketTab = parseTicketTab(searchParams.get('tab'))
  const quotaTab = ticketTab === 'weekly' || ticketTab === 'personal'
  const [verifying, setVerifying] = useState(false)
  const [exportingGroup, setExportingGroup] = useState<TicketReportTab | null>(null)
  const [quotaLists, setQuotaLists] = useState<Record<QuotaTab, QuotaListState>>({
    weekly: emptyQuotaList(),
    personal: emptyQuotaList(),
  })
  const quotaScope: QuotaTab = ticketTab === 'personal' ? 'personal' : 'weekly'
  const activeQuotaList = quotaLists[quotaScope]
  const query = useQuery({
    queryKey: ['port-sales-report', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<PortSalesReport>(`/port-sales-reports/${id}`)
      return data
    },
  })
  const explicitTicketSort = Boolean(
    !quotaTab && sortBy && ticketSortFields.has(sortBy) && (sortDir === 'asc' || sortDir === 'desc'),
  )
  const ticketSortBy = explicitTicketSort ? sortBy : ticketTab === 'all' ? 'travelDate' : ''
  const ticketSortDir = explicitTicketSort ? sortDir : ticketTab === 'all' ? 'asc' : ''
  const ticketSort =
    ticketSortBy && (ticketSortDir === 'asc' || ticketSortDir === 'desc')
      ? { sortBy: ticketSortBy, sortDir: ticketSortDir }
      : {}
  const quotaSort =
    quotaTab &&
    activeQuotaList.sortBy &&
    quotaSortFields.has(activeQuotaList.sortBy) &&
    (activeQuotaList.sortDir === 'asc' || activeQuotaList.sortDir === 'desc')
      ? { sortBy: activeQuotaList.sortBy, sortDir: activeQuotaList.sortDir }
      : {}
  const ticketsQuery = useQuery({
    queryKey: [
      'port-sales-report-tickets',
      id,
      q,
      page,
      sortBy,
      sortDir,
      qeshmondiStatus,
      ticketTab,
      travelFrom,
      travelTo,
    ],
    enabled: Boolean(id) && !quotaTab,
    queryFn: async () => {
      const { data } = await api.get<Paginated<PortTicketSale>>(`/port-sales-reports/${id}/tickets`, {
        params: {
          page,
          ...(q ? { q } : {}),
          ...ticketSort,
          ...(ticketTab === 'invalid'
            ? { qeshmondiStatus: portTicketQeshmondiStatuses.INVALID }
            : qeshmondiStatus
              ? { qeshmondiStatus }
              : {}),
          ...(ticketTab === 'all' && travelFrom ? { from: travelFrom } : {}),
          ...(ticketTab === 'all' && travelTo ? { to: travelTo } : {}),
        },
      })
      return data
    },
  })
  const quotaQuery = useQuery({
    queryKey: [
      'port-sales-report-quota',
      id,
      quotaScope,
      activeQuotaList.q,
      activeQuotaList.page,
      activeQuotaList.sortBy,
      activeQuotaList.sortDir,
    ],
    enabled: Boolean(id) && quotaTab,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await api.get<Paginated<PortTicketQuotaRow> & { unauthorizedTotal: number }>(
        `/port-sales-reports/${id}/tickets/quota`,
        {
          params: {
            scope: quotaScope,
            page: activeQuotaList.page,
            ...(activeQuotaList.q ? { q: activeQuotaList.q } : {}),
            ...quotaSort,
          },
        },
      )
      return data
    },
  })
  useEffect(() => {
    setQuotaLists({ weekly: emptyQuotaList(), personal: emptyQuotaList() })
  }, [id])
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  const tickets = ticketsQuery.data?.items ?? []
  const quotaRows = quotaQuery.data?.items ?? []
  const name = portSalesReportDisplayName(item)

  function sortQuota(column: string) {
    setQuotaLists((current) => {
      const list = current[quotaScope]
      const next = nextSortState(column, list.sortBy, list.sortDir)
      return {
        ...current,
        [quotaScope]: {
          ...list,
          page: 1,
          sortBy: next.sortBy ?? '',
          sortDir: next.sortDir ?? '',
        },
      }
    })
  }

  function selectTab(next: TicketReportTab) {
    setParams(
      {
        tab: next === 'all' ? undefined : next,
        sortBy: undefined,
        sortDir: undefined,
        qeshmondiStatus: undefined,
        weeklyQuota: undefined,
      },
      { resetPage: true },
    )
  }

  const individualSubsidy = item.individualSubsidy
  const tariffYear = item.tariffYear
  const subsidyAmount = individualSubsidy ?? 0
  const hasSubsidy = subsidyAmount > 0
  function subsidyMoney(amount: number) {
    if (individualSubsidy == null) {
      return t('portSalesReports.tariffMissing', {
        year: localizeDigits(String(tariffYear ?? ''), locale),
      })
    }
    return `${formatGroupedNumber(Math.round(amount), locale)} ${t('portSalesReports.toman')}`
  }
  function estimateBadge(count: number) {
    if (!hasSubsidy) return undefined
    return (
      <span className="mt-1 inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-teal-800 ring-1 ring-teal-100">
        {t('portSalesReports.financialEstimate')}{' '}
        {formatGroupedNumber(Math.round(count * subsidyAmount), locale)}{' '}
        {t('portSalesReports.toman')}
      </span>
    )
  }

  async function downloadTicketGroup(group: TicketReportTab) {
    setExportingGroup(group)
    try {
      const response = await api.get<Blob>(`/port-sales-reports/${id}/tickets/export`, {
        params: {
          group,
          ...((group === 'weekly' || group === 'personal') && quotaLists[group].q
            ? { q: quotaLists[group].q }
            : group !== 'weekly' && group !== 'personal' && q
              ? { q }
              : {}),
          ...(group === 'all' && qeshmondiStatus ? { qeshmondiStatus } : {}),
          ...(group === 'all' && travelFrom ? { from: travelFrom } : {}),
          ...(group === 'all' && travelTo ? { to: travelTo } : {}),
          ...((group === 'weekly' || group === 'personal') && hasSubsidy
            ? { subsidy: subsidyAmount }
            : {}),
        },
        responseType: 'blob',
      })
      const fileNames: Record<TicketReportTab, string> = {
        all: 'بلیط‌های فروخته‌شده.xlsx',
        invalid: 'قشموندی نامعتبر.xlsx',
        weekly: 'سهمیه هفتگی مازاد.xlsx',
        personal: 'سهمیه شخصی مازاد.xlsx',
      }
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = fileNames[group]
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('portSalesReports.exportFailed')))
    } finally {
      setExportingGroup(null)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Ship}
        title={t('portSalesReports.details')}
        subtitle={<EntityNameSubtitle name={name} icon={Ship} />}
      />
      <FormCard icon={Ship} title={name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={FileSpreadsheet}>{t('portSalesReports.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            <FormFactTile
              icon={Hash}
              label={t('portSalesReports.recordCount')}
              value={formatGroupedNumber(item.recordCount, locale)}
              tone="teal"
            />
            <FormFactTile
              icon={Users}
              label={t('portSalesReports.uniqueNationalIds')}
              value={formatGroupedNumber(item.uniqueNationalIdCount, locale)}
              tone="mint"
            />
            <FormFactTile
              icon={IdCard}
              label={t('portSalesReports.nationalIdPrefix', {
                prefix: localizeDigits(item.nationalIdPrefix ?? '345', locale),
              })}
              value={formatGroupedNumber(item.nationalIdPrefixCount ?? 0, locale)}
              tone="teal"
            />
          </div>
          <FormSectionTitle icon={Ship}>{t('portSalesReports.metaSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={CalendarDays}
              label={t('portSalesReports.uploadedAt')}
              value={<DateText value={item.createdAt} withTime />}
              tone="teal"
            />
            <FormFactTile
              icon={CalendarDays}
              label={t('portSalesReports.reportDate')}
              value={<DateText value={item.reportDate} />}
              tone="mint"
            />
            <FormFactTile icon={Anchor} label={t('portSalesReports.origin')} value={item.origin} tone="teal" />
            <FormFactTile
              icon={MapPin}
              label={t('portSalesReports.destination')}
              value={item.destination}
              tone="mint"
            />
            <FormFactTile
              icon={Download}
              label={t('portSalesReports.fileLink')}
              value={
                <a
                  href={getFileUrl(item.fileId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-teal-700 hover:underline"
                >
                  {item.originalFileName}
                </a>
              }
            />
          </div>
          <DetailActions
            editTo={`${portSalesReportPath(id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('portSalesReports.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('portSalesReports.confirmDelete'),
                successMessage: t('portSalesReports.deleted'),
                path: `/port-sales-reports/${id}`,
                queryKey: ['port-sales-reports'],
                onDeleted: () => navigate(portSalesReportsPath()),
              })
            }
          />
        </div>
      </FormCard>
      <FormCard
        icon={BadgeCheck}
        title={t('portSalesReports.qeshmondiSection')}
        action={
          <Button
            type="button"
            variant="soft"
            disabled={verifying}
            onClick={async () => {
              setVerifying(true)
              try {
                const { data } = await api.post<PortSalesReport>(
                  `/port-sales-reports/${id}/verify-qeshmondi`,
                )
                toast.success(
                  t('portSalesReports.qeshmondiVerified', {
                    count: formatGroupedNumber(data.weeklyQuotaExcessCount ?? 0, locale),
                  }),
                )
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['port-sales-report', id] }),
                  queryClient.invalidateQueries({ queryKey: ['port-sales-report-tickets', id] }),
                  queryClient.invalidateQueries({ queryKey: ['port-sales-report-quota', id] }),
                ])
              } catch (error) {
                toast.error(getApiErrorMessage(error, t('common.error')))
              } finally {
                setVerifying(false)
              }
            }}
          >
            <BadgeCheck className="size-4" aria-hidden />
            {verifying ? t('portSalesReports.verifyingQeshmondi') : t('portSalesReports.verifyQeshmondi')}
          </Button>
        }
      >
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Hash}
              label={t('portSalesReports.recordCount')}
              value={formatGroupedNumber(item.recordCount, locale)}
              tone="teal"
            />
            <FormFactTile
              icon={IdCard}
              label={t('portSalesReports.nationalIdPrefix', {
                prefix: localizeDigits(item.nationalIdPrefix ?? '345', locale),
              })}
              value={formatGroupedNumber(item.nationalIdPrefixCount ?? 0, locale)}
              tone="mint"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            <FormFactTile
              icon={BadgeCheck}
              label={t('portSalesReports.validQeshmondiCount')}
              value={formatGroupedNumber(item.validQeshmondiCount ?? 0, locale)}
              tone="teal"
            />
            <StatFilterTile
              active={ticketTab === 'invalid'}
              onClick={() => selectTab(ticketTab === 'invalid' ? 'all' : 'invalid')}
              icon={BadgeX}
              label={t('portSalesReports.invalidQeshmondiCount')}
              value={formatGroupedNumber(item.invalidQeshmondiCount ?? 0, locale)}
              extra={estimateBadge(item.invalidQeshmondiCount ?? 0)}
              tone="ink"
            />
            <StatFilterTile
              active={ticketTab === 'weekly'}
              onClick={() => selectTab(ticketTab === 'weekly' ? 'all' : 'weekly')}
              icon={CalendarClock}
              label={t('portSalesReports.weeklyQuotaExcess')}
              value={formatGroupedNumber(item.weeklyQuotaExcessCount ?? 0, locale)}
              extra={estimateBadge(item.weeklyQuotaExcessCount ?? 0)}
              tone="ink"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            <FormFactTile
              icon={Banknote}
              label={t('portSalesReports.individualSubsidy')}
              value={
                item.individualSubsidy != null
                  ? `${formatGroupedNumber(item.individualSubsidy, locale)} ${t('portSalesReports.toman')}`
                  : t('portSalesReports.tariffMissing', {
                      year: localizeDigits(String(item.tariffYear ?? ''), locale),
                    })
              }
              tone="teal"
            />
            <FormFactTile
              icon={BadgeCheck}
              label={t('portSalesReports.realSubsidy')}
              value={subsidyMoney((item.validQeshmondiCount ?? 0) * subsidyAmount)}
              tone="mint"
            />
            <FormFactTile
              icon={BadgeX}
              label={t('portSalesReports.invalidSubsidy')}
              value={
                item.individualSubsidy == null ? (
                  subsidyMoney(0)
                ) : (
                  <span className="font-bold text-red-700">
                    {subsidyMoney(
                      ((item.invalidQeshmondiCount ?? 0) + (item.weeklyQuotaExcessCount ?? 0)) *
                        subsidyAmount,
                    )}
                  </span>
                )
              }
              tone="ink"
            />
          </div>
        </div>
      </FormCard>
      <FormCard icon={Ticket} title={t('portSalesReports.ticketsSection')}>
        <div className="space-y-4 p-5 sm:p-6">
        <nav className="flex flex-wrap gap-2" role="tablist">
          {ticketReportTabs.map((tab) => {
            const active = ticketTab === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (tab !== ticketTab) selectTab(tab)
                }}
                className={`inline-flex cursor-pointer items-center rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
                  active
                    ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                    : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                }`}
              >
                {t(`portSalesReports.tabs.${tab}`)}
              </button>
            )
          })}
        </nav>
        <SearchBar
          autoFocus={false}
          term={quotaTab ? activeQuotaList.term : term}
          onTermChange={
            quotaTab
              ? (value) =>
                  setQuotaLists((current) => ({
                    ...current,
                    [quotaScope]: { ...current[quotaScope], term: value },
                  }))
              : setTerm
          }
          onSubmit={
            quotaTab
              ? () =>
                  setQuotaLists((current) => {
                    const term = current[quotaScope].term.trim()
                    const byDate = Boolean(toLatinDigits(term).replace(/\D/g, ''))
                    return {
                      ...current,
                      [quotaScope]: {
                        ...current[quotaScope],
                        q: term,
                        page: 1,
                        sortBy: byDate ? 'week' : 'unauthorized',
                        sortDir: byDate ? 'asc' : 'desc',
                      },
                    }
                  })
              : () => applySearch()
          }
          label={t('portSalesReports.ticketsSearch')}
          placeholder={
            quotaTab
              ? t('portSalesReports.quotaSearchPlaceholder')
              : t('portSalesReports.ticketsSearchPlaceholder')
          }
          filtersActive={ticketTab === 'all' && Boolean(qeshmondiStatus || travelFrom || travelTo)}
          extraClassName="sm:grid-cols-3"
          extra={
            ticketTab === 'all' ? (
              <>
                <FormField icon={CalendarRange} label={t('portSalesReports.fromDate')} htmlFor="ticket-from">
                  <PersianDateField
                    id="ticket-from"
                    value={travelFrom}
                    maxDate={travelTo || undefined}
                    onChange={(value) => {
                      const next = value || undefined
                      setParams(
                        {
                          from: next,
                          ...(travelTo && next && travelTo < next ? { to: undefined } : {}),
                        },
                        { resetPage: true },
                      )
                    }}
                  />
                </FormField>
                <FormField icon={CalendarRange} label={t('portSalesReports.toDate')} htmlFor="ticket-to">
                  <PersianDateField
                    id="ticket-to"
                    value={travelTo}
                    minDate={travelFrom || undefined}
                    onChange={(value) => setParams({ to: value || undefined }, { resetPage: true })}
                  />
                </FormField>
                <FormField icon={BadgeCheck} label={t('portSalesReports.qeshmondiStatusFilter')}>
                  <SearchSelect
                    value={qeshmondiStatus}
                    onChange={(next) => setParams({ qeshmondiStatus: next || undefined }, { resetPage: true })}
                    placeholder={t('portSalesReports.qeshmondiStatusFilter')}
                    options={[
                      { value: '', label: t('portSalesReports.allQeshmondiStatuses') },
                      {
                        value: portTicketQeshmondiStatuses.UNKNOWN,
                        label: t('portSalesReports.qeshmondi.UNKNOWN'),
                      },
                      {
                        value: portTicketQeshmondiStatuses.VALID,
                        label: t('portSalesReports.qeshmondi.VALID'),
                      },
                      {
                        value: portTicketQeshmondiStatuses.INVALID,
                        label: t('portSalesReports.qeshmondi.INVALID'),
                      },
                    ]}
                  />
                </FormField>
              </>
            ) : undefined
          }
        />
        {quotaTab ? (
          <TableCard
            loading={quotaQuery.isLoading}
            empty={
              activeQuotaList.q
                ? t('portSalesReports.quotaNoResults')
                : t('portSalesReports.quotaEmpty')
            }
            hasRows={quotaRows.length > 0}
            rowClick={false}
          >
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  {ticketTab === 'weekly' ? (
                    <SortableTh
                      column="week"
                      label={t('portSalesReports.quotaWeek')}
                      sortBy={activeQuotaList.sortBy}
                      sortDir={activeQuotaList.sortDir}
                      onSort={sortQuota}
                    />
                  ) : null}
                  <SortableTh
                    column="nationalId"
                    label={t('portSalesReports.nationalId')}
                    sortBy={activeQuotaList.sortBy}
                    sortDir={activeQuotaList.sortDir}
                    onSort={sortQuota}
                  />
                  <SortableTh
                    column="total"
                    label={t('portSalesReports.quotaTotal')}
                    sortBy={activeQuotaList.sortBy}
                    sortDir={activeQuotaList.sortDir}
                    onSort={sortQuota}
                  />
                  <SortableTh
                    column="allowed"
                    label={t('portSalesReports.quotaAllowedCount')}
                    sortBy={activeQuotaList.sortBy}
                    sortDir={activeQuotaList.sortDir}
                    onSort={sortQuota}
                  />
                  <SortableTh
                    column="unauthorized"
                    label={t('portSalesReports.quotaUnauthorized')}
                    sortBy={activeQuotaList.sortBy}
                    sortDir={activeQuotaList.sortDir}
                    onSort={sortQuota}
                  />
                  <SortableTh
                    column="amount"
                    label={t('portSalesReports.quotaUnauthorizedAmount')}
                    sortBy={activeQuotaList.sortBy}
                    sortDir={activeQuotaList.sortDir}
                    onSort={sortQuota}
                  />
                  <SortableTh
                    column="status"
                    label={t('portSalesReports.quotaStatus')}
                    sortBy={activeQuotaList.sortBy}
                    sortDir={activeQuotaList.sortDir}
                    onSort={sortQuota}
                  />
                </tr>
              </thead>
              <tbody>
                {quotaRows.map((row) => (
                  <tr
                    key={`${row.weekStart ?? 'all'}-${row.nationalId}`}
                    className="border-t border-line"
                  >
                    {ticketTab === 'weekly' ? (
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
                    <td className="px-4 py-3">
                      {formatGroupedNumber(
                        hasSubsidy ? row.unauthorized * subsidyAmount : 0,
                        locale,
                      )}
                    </td>
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
            loading={ticketsQuery.isLoading}
            empty={
              q || qeshmondiStatus || travelFrom || travelTo || ticketTab === 'invalid'
                ? t('portSalesReports.ticketsNoResults')
                : t('portSalesReports.ticketsEmpty')
            }
            hasRows={tickets.length > 0}
            rowClick={false}
          >
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <SortableTh
                    column="travelDate"
                    label={t('portSalesReports.travelDate')}
                    sortBy={ticketSortBy}
                    sortDir={ticketSortDir}
                    onSort={onSort}
                  />
                  <SortableTh
                    column="ticketNumber"
                    label={t('portSalesReports.ticketNumber')}
                    sortBy={ticketSortBy}
                    sortDir={ticketSortDir}
                    onSort={onSort}
                  />
                  <th className="px-4 py-3 text-start font-medium">
                    {t('portSalesReports.identityNumber')}
                  </th>
                  <SortableTh
                    column="fullName"
                    label={t('portSalesReports.fullName')}
                    sortBy={ticketSortBy}
                    sortDir={ticketSortDir}
                    onSort={onSort}
                  />
                  <th className="px-4 py-3 text-start font-medium">
                    {t('portSalesReports.qeshmondiEndDate')}
                  </th>
                  <SortableTh
                    column="amount"
                    label={t('portSalesReports.amount')}
                    sortBy={ticketSortBy}
                    sortDir={ticketSortDir}
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
                      ) : ticket.nationalId?.startsWith(item.nationalIdPrefix ?? '345') ? (
                        <span className="inline-flex rounded-full bg-mint-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                          {t('portSalesReports.qeshmondiCitizenPrefix', {
                            prefix: localizeDigits(item.nationalIdPrefix ?? '345', locale),
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
        {(quotaTab ? quotaQuery.data : ticketsQuery.data) ? (
          <PaginationBar
            page={(quotaTab ? quotaQuery.data : ticketsQuery.data)!.page}
            pageSize={(quotaTab ? quotaQuery.data : ticketsQuery.data)!.pageSize}
            total={(quotaTab ? quotaQuery.data : ticketsQuery.data)!.total}
            onPageChange={
              quotaTab
                ? (nextPage) =>
                    setQuotaLists((current) => ({
                      ...current,
                      [quotaScope]: { ...current[quotaScope], page: nextPage },
                    }))
                : setPage
            }
            startExtra={
              (quotaTab ? quotaQuery.data : ticketsQuery.data)!.total > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={exportingGroup === ticketTab}
                  onClick={() => void downloadTicketGroup(ticketTab)}
                >
                  <FileSpreadsheet className="size-4" aria-hidden />
                  {t('portSalesReports.exportExcel')}
                </Button>
              ) : null
            }
          />
        ) : null}
        {quotaTab && quotaQuery.data ? (
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={BadgeX}
              label={t('portSalesReports.quotaUnauthorizedGrand')}
              value={formatGroupedNumber(quotaQuery.data.unauthorizedTotal ?? 0, locale)}
              tone="ink"
            />
            <FormFactTile
              icon={Banknote}
              label={t('portSalesReports.quotaUnauthorizedAmountGrand')}
              value={`${formatGroupedNumber(
                hasSubsidy ? (quotaQuery.data.unauthorizedTotal ?? 0) * subsidyAmount : 0,
                locale,
              )} ${t('portSalesReports.toman')}`}
              tone="teal"
            />
          </div>
        ) : null}
        </div>
      </FormCard>
    </div>
  )
}
