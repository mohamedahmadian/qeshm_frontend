import {
  Anchor,
  BadgeCheck,
  BadgeX,
  Banknote,
  CalendarClock,
  CalendarDays,
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
import {
  formatGroupedNumber,
  formatNumber,
  formatWeekday,
  localizeDigits,
  parseDigitString,
} from '../../lib/datetime'
import type {
  Paginated,
  PortSalesReport,
  PortTicketQeshmondiStatus,
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
    <span
      className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5"
      dir="ltr"
    >
      {date ? <DateText value={date} /> : null}
      {weekday ? (
        <span className="inline-flex rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-teal-800 ring-1 ring-teal-100">
          {weekday}
        </span>
      ) : null}
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
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const qeshmondiStatus = (searchParams.get('qeshmondiStatus') ?? '') as PortTicketQeshmondiStatus | ''
  const weeklyQuota = searchParams.get('weeklyQuota') ?? ''
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
    queryKey: ['port-sales-report-tickets', id, q, page, sortBy, sortDir, qeshmondiStatus, weeklyQuota],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Paginated<PortTicketSale>>(`/port-sales-reports/${id}/tickets`, {
        params: {
          page,
          ...(q ? { q } : {}),
          ...sortParams,
          ...(qeshmondiStatus ? { qeshmondiStatus } : {}),
          ...(weeklyQuota === 'excess' ? { weeklyQuota } : {}),
        },
      })
      return data
    },
  })
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  const tickets = ticketsQuery.data?.items ?? []
  const name = portSalesReportDisplayName(item)

  function isInvalidActive() {
    return qeshmondiStatus === portTicketQeshmondiStatuses.INVALID
  }

  function toggleInvalidFilter() {
    const active = isInvalidActive()
    setParams(
      {
        qeshmondiStatus: active ? undefined : portTicketQeshmondiStatuses.INVALID,
      },
      { resetPage: true },
    )
  }

  function isWeeklyActive() {
    return weeklyQuota === 'excess'
  }

  function toggleWeeklyFilter() {
    setParams(
      { weeklyQuota: isWeeklyActive() ? undefined : 'excess' },
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

  async function downloadTicketGroup(group: 'invalid' | 'weekly') {
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

  function exportButton(group: 'invalid' | 'weekly') {
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
              active={isWeeklyActive()}
              onClick={toggleWeeklyFilter}
              icon={CalendarClock}
              label={t('portSalesReports.weeklyQuotaExcess')}
              value={formatGroupedNumber(item.weeklyQuotaExcessCount ?? 0, locale)}
              action={exportButton('weekly')}
              tone="ink"
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
          filtersActive={Boolean(qeshmondiStatus || weeklyQuota === 'excess')}
          extraClassName="w-max max-w-full"
          extra={
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
          }
        />
        <TableCard
          loading={ticketsQuery.isLoading}
          empty={
            q || qeshmondiStatus || weeklyQuota === 'excess'
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
