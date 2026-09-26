import {
  Anchor,
  BadgeCheck,
  BadgeX,
  Banknote,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Hash,
  IdCard,
  MapPin,
  Plus,
  Ship,
  Sigma,
  Ticket,
  Users,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
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
} from '../../components/ui/ListControls'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
  inputClassName,
  listShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getApiErrorMessage, getFileUrl } from '../../lib/api'
import { formatGroupedNumber, formatNumber, localizeDigits, parseDigitString } from '../../lib/datetime'
import type {
  Paginated,
  PortSalesReport,
  PortTicketQeshmondiStatus,
  PortTicketSale,
  PortTicketStatus,
} from '../../types/app'
import { portTicketQeshmondiStatuses, portTicketStatuses } from '../../types/app'
import { PortSalesReportForm, type PortSalesReportPayload } from './PortSalesReportForm'
import {
  portSalesReportDisplayName,
  portSalesReportPath,
  portSalesReportsPath,
} from './port-sales-report-paths'

function toFormData(payload: PortSalesReportPayload) {
  const form = new FormData()
  form.append('reportDate', payload.reportDate)
  form.append('origin', payload.origin)
  form.append('destination', payload.destination)
  if (payload.file) form.append('file', payload.file)
  return form
}

const ticketStatusClass: Record<PortTicketStatus, string> = {
  IN_TRIP: 'bg-teal-50 text-teal-800',
  OPERATOR_CANCELLED: 'bg-rose-50 text-rose-700',
  EXPIRED: 'bg-amber-50 text-amber-800',
  OTHER: 'bg-cream-100 text-ink-600',
}

const qeshmondiStatusClass: Record<PortTicketQeshmondiStatus, string> = {
  UNKNOWN: 'bg-cream-100 text-ink-600',
  VALID: 'bg-mint-50 text-teal-800',
  INVALID: 'bg-rose-50 text-rose-700',
}

function TicketStatusBadge({ status }: { status: PortTicketStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ticketStatusClass[status]}`}
    >
      {t(`portSalesReports.status.${status}`)}
    </span>
  )
}

function QeshmondiStatusBadge({ status }: { status?: PortTicketQeshmondiStatus }) {
  const { t } = useTranslation()
  const value = status ?? portTicketQeshmondiStatuses.UNKNOWN
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${qeshmondiStatusClass[value]}`}
    >
      {t(`portSalesReports.qeshmondi.${value}`)}
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
  return (
    <span
      className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5"
      dir="ltr"
    >
      {date ? <DateText value={date} /> : null}
      {time ? <span>{localizeDigits(time, locale)}</span> : null}
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
        onSubmit={async (payload) => {
          await api.post('/port-sales-reports', toFormData(payload))
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
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const ticketStatus = (searchParams.get('ticketStatus') ?? '') as PortTicketStatus | ''
  const qeshmondiStatus = (searchParams.get('qeshmondiStatus') ?? '') as PortTicketQeshmondiStatus | ''
  const [verifying, setVerifying] = useState(false)
  const [subsidy, setSubsidy] = useState('')
  const [exportingGroup, setExportingGroup] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['port-sales-report', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<PortSalesReport>(`/port-sales-reports/${id}`)
      return data
    },
  })
  const ticketsQuery = useQuery({
    queryKey: ['port-sales-report-tickets', id, q, page, sortBy, sortDir, ticketStatus, qeshmondiStatus],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Paginated<PortTicketSale>>(`/port-sales-reports/${id}/tickets`, {
        params: {
          page,
          ...(q ? { q } : {}),
          ...sortParams,
          ...(ticketStatus ? { ticketStatus } : {}),
          ...(qeshmondiStatus ? { qeshmondiStatus } : {}),
        },
      })
      return data
    },
  })
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  const counts = item.statusCounts
  const otherCount = counts?.OTHER ?? 0
  const tickets = ticketsQuery.data?.items ?? []
  const name = portSalesReportDisplayName(item)

  function isInvalidActive() {
    return (
      qeshmondiStatus === portTicketQeshmondiStatuses.INVALID &&
      ticketStatus === portTicketStatuses.IN_TRIP
    )
  }

  function toggleInvalidFilter() {
    const active = isInvalidActive()
    setParams(
      {
        qeshmondiStatus: active ? undefined : portTicketQeshmondiStatuses.INVALID,
        ticketStatus: active ? undefined : portTicketStatuses.IN_TRIP,
      },
      { resetPage: true },
    )
  }

  function isStatusActive(status: PortTicketStatus) {
    return ticketStatus === status && !qeshmondiStatus
  }

  function toggleStatusFilter(status: PortTicketStatus) {
    const active = isStatusActive(status)
    setParams(
      {
        ticketStatus: active ? undefined : status,
        qeshmondiStatus: undefined,
      },
      { resetPage: true },
    )
  }

  const subsidyAmount = Number(subsidy)
  const hasSubsidy = Number.isFinite(subsidyAmount) && subsidyAmount > 0
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

  async function downloadTicketGroup(group: 'invalid' | 'cancelled' | 'expired' | 'total') {
    setExportingGroup(group)
    try {
      const response = await api.get<Blob>(`/port-sales-reports/${id}/tickets/export`, {
        params: { group },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `tickets-${group}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('portSalesReports.exportFailed')))
    } finally {
      setExportingGroup(null)
    }
  }

  function exportButton(group: 'invalid' | 'cancelled' | 'expired' | 'total') {
    return (
      <Button
        type="button"
        variant="ghost"
        icon
        disabled={exportingGroup === group}
        aria-label={t('portSalesReports.exportExcel')}
        title={t('portSalesReports.exportExcel')}
        onClick={(event) => {
          event.stopPropagation()
          void downloadTicketGroup(group)
        }}
      >
        <Download className="size-4" aria-hidden />
      </Button>
    )
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
          <div
            className={`grid gap-2 sm:grid-cols-2 sm:gap-3 ${otherCount > 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}
          >
            <StatFilterTile
              active={!ticketStatus}
              onClick={() => setParams({ ticketStatus: undefined }, { resetPage: true })}
              icon={Hash}
              label={t('portSalesReports.recordCount')}
              value={formatGroupedNumber(item.recordCount, locale)}
              tone="teal"
            />
            <StatFilterTile
              active={ticketStatus === portTicketStatuses.IN_TRIP}
              onClick={() =>
                setParams(
                  {
                    ticketStatus:
                      ticketStatus === portTicketStatuses.IN_TRIP ? undefined : portTicketStatuses.IN_TRIP,
                  },
                  { resetPage: true },
                )
              }
              icon={Ticket}
              label={t('portSalesReports.statusInTrip')}
              value={formatGroupedNumber(counts?.IN_TRIP ?? 0, locale)}
              tone="teal"
            />
            <StatFilterTile
              active={ticketStatus === portTicketStatuses.OPERATOR_CANCELLED}
              onClick={() =>
                setParams(
                  {
                    ticketStatus:
                      ticketStatus === portTicketStatuses.OPERATOR_CANCELLED
                        ? undefined
                        : portTicketStatuses.OPERATOR_CANCELLED,
                  },
                  { resetPage: true },
                )
              }
              icon={Ticket}
              label={t('portSalesReports.statusOperatorCancelled')}
              value={formatGroupedNumber(counts?.OPERATOR_CANCELLED ?? 0, locale)}
              tone="ink"
            />
            <StatFilterTile
              active={ticketStatus === portTicketStatuses.EXPIRED}
              onClick={() =>
                setParams(
                  {
                    ticketStatus:
                      ticketStatus === portTicketStatuses.EXPIRED ? undefined : portTicketStatuses.EXPIRED,
                  },
                  { resetPage: true },
                )
              }
              icon={Ticket}
              label={t('portSalesReports.statusExpired')}
              value={formatGroupedNumber(counts?.EXPIRED ?? 0, locale)}
              tone="ink"
            />
            {otherCount > 0 ? (
              <StatFilterTile
                active={ticketStatus === portTicketStatuses.OTHER}
                onClick={() =>
                  setParams(
                    {
                      ticketStatus:
                        ticketStatus === portTicketStatuses.OTHER ? undefined : portTicketStatuses.OTHER,
                    },
                    { resetPage: true },
                  )
                }
                icon={Ticket}
                label={t('portSalesReports.statusOther')}
                value={formatGroupedNumber(otherCount, locale)}
                tone="mint"
              />
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
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
                await api.post(`/port-sales-reports/${id}/verify-qeshmondi`)
                toast.success(t('portSalesReports.qeshmondiVerified'))
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['port-sales-report', id] }),
                  queryClient.invalidateQueries({ queryKey: ['port-sales-report-tickets', id] }),
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
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
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
            <FormFactTile
              icon={BadgeCheck}
              label={t('portSalesReports.validQeshmondiCount')}
              value={formatGroupedNumber(item.validQeshmondiCount ?? 0, locale)}
              tone="teal"
            />
          </div>
          <div className="max-w-64">
            <FormField
              icon={Banknote}
              label={`${t('portSalesReports.ticketSubsidy')} ${t('portSalesReports.toman')}`}
              htmlFor="ticket-subsidy"
            >
              <div className="flex items-center gap-2">
                <input
                  id="ticket-subsidy"
                  type="text"
                  inputMode="numeric"
                  className={`${inputClassName()} digit-field`}
                  value={subsidy ? formatGroupedNumber(Number(subsidy), locale) : ''}
                  onChange={(event) => setSubsidy(parseDigitString(event.target.value))}
                />
                <span className="shrink-0 text-sm font-medium text-ink-600">
                  {t('portSalesReports.toman')}
                </span>
              </div>
            </FormField>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
            <StatFilterTile
              active={isInvalidActive()}
              onClick={toggleInvalidFilter}
              icon={BadgeX}
              label={t('portSalesReports.invalidQeshmondiCount')}
              value={formatGroupedNumber(item.invalidQeshmondiCount ?? 0, locale)}
              extra={estimateBadge(item.invalidQeshmondiCount ?? 0)}
              action={exportButton('invalid')}
              tone="ink"
            />
            <StatFilterTile
              active={isStatusActive(portTicketStatuses.OPERATOR_CANCELLED)}
              onClick={() => toggleStatusFilter(portTicketStatuses.OPERATOR_CANCELLED)}
              icon={Ticket}
              label={t('portSalesReports.statusOperatorCancelled')}
              value={formatGroupedNumber(counts?.OPERATOR_CANCELLED ?? 0, locale)}
              extra={estimateBadge(counts?.OPERATOR_CANCELLED ?? 0)}
              action={exportButton('cancelled')}
              tone="ink"
            />
            <StatFilterTile
              active={isStatusActive(portTicketStatuses.EXPIRED)}
              onClick={() => toggleStatusFilter(portTicketStatuses.EXPIRED)}
              icon={Ticket}
              label={t('portSalesReports.statusExpired')}
              value={formatGroupedNumber(counts?.EXPIRED ?? 0, locale)}
              extra={estimateBadge(counts?.EXPIRED ?? 0)}
              action={exportButton('expired')}
              tone="ink"
            />
            <StatFilterTile
              active={isStatusActive(portTicketStatuses.OTHER)}
              onClick={() => toggleStatusFilter(portTicketStatuses.OTHER)}
              icon={Ticket}
              label={t('portSalesReports.statusOther')}
              value={formatGroupedNumber(otherCount, locale)}
              tone="mint"
            />
            <div className="relative">
              <FormFactTile
                icon={Sigma}
                label={t('portSalesReports.invalidQeshmondiTotal')}
                value={formatGroupedNumber(item.invalidQeshmondiTotal ?? 0, locale)}
                extra={estimateBadge(item.invalidQeshmondiTotal ?? 0)}
                tone="teal"
              />
              <div className="absolute end-2 top-2 z-20">{exportButton('total')}</div>
            </div>
          </div>
        </div>
      </FormCard>
      <FormCard icon={Ticket} title={t('portSalesReports.ticketsSection')}>
        <div className="space-y-4 p-5 sm:p-6">
        <SearchBar
          autoFocus={false}
          term={term}
          onTermChange={setTerm}
          onSubmit={() => applySearch()}
          label={t('portSalesReports.ticketsSearch')}
          placeholder={t('portSalesReports.ticketsSearchPlaceholder')}
          filtersActive={Boolean(ticketStatus || qeshmondiStatus)}
          extraClassName="w-max max-w-full grid-cols-2 gap-3"
          extra={
            <>
              <div className="w-44 sm:w-52">
              <SearchSelect
                value={ticketStatus}
                onChange={(next) => setParams({ ticketStatus: next || undefined }, { resetPage: true })}
                placeholder={t('portSalesReports.statusFilter')}
                options={[
                  { value: '', label: t('portSalesReports.allStatuses') },
                  { value: portTicketStatuses.IN_TRIP, label: t('portSalesReports.status.IN_TRIP') },
                  {
                    value: portTicketStatuses.OPERATOR_CANCELLED,
                    label: t('portSalesReports.status.OPERATOR_CANCELLED'),
                  },
                  { value: portTicketStatuses.EXPIRED, label: t('portSalesReports.status.EXPIRED') },
                  { value: portTicketStatuses.OTHER, label: t('portSalesReports.status.OTHER') },
                ]}
              />
              </div>
              <div className="w-44 sm:w-52">
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
              </div>
            </>
          }
        />
        <TableCard
          loading={ticketsQuery.isLoading}
          empty={
            q || ticketStatus || qeshmondiStatus
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
                  column="ticketNumber"
                  label={t('portSalesReports.ticketNumber')}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  column="nationalId"
                  label={t('portSalesReports.nationalId')}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  column="fullName"
                  label={t('portSalesReports.fullName')}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  column="ticketStatus"
                  label={t('portSalesReports.ticketStatus')}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortableTh
                  column="qeshmondiStatus"
                  label={t('portSalesReports.qeshmondiStatus')}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <th className="px-4 py-3 text-start font-medium">
                  {t('portSalesReports.qeshmondiEndDate')}
                </th>
                <SortableTh
                  column="travelDate"
                  label={t('portSalesReports.travelDate')}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                />
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
                    {ticket.ticketNumber ? localizeDigits(ticket.ticketNumber, locale) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {ticket.nationalId ? <CopyableDigits value={ticket.nationalId} /> : '—'}
                  </td>
                  <td className="px-4 py-3">{ticket.fullName || '—'}</td>
                  <td className="px-4 py-3">
                    <TicketStatusBadge status={ticket.ticketStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <QeshmondiStatusBadge status={ticket.qeshmondiStatus} />
                  </td>
                  <td className="px-4 py-3">
                    {ticket.qeshmondiEndDate ? (
                      <DateText value={ticket.qeshmondiEndDate} />
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
                    <TravelStamp date={ticket.travelDate} time={ticket.travelTime} locale={locale} />
                  </td>
                  <td className="px-4 py-3">
                    {ticket.amount != null ? formatGroupedNumber(ticket.amount, locale) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
        {ticketsQuery.data ? (
          <PaginationBar
            page={ticketsQuery.data.page}
            pageSize={ticketsQuery.data.pageSize}
            total={ticketsQuery.data.total}
            onPageChange={setPage}
          />
        ) : null}
        </div>
      </FormCard>
    </div>
  )
}
