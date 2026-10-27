import {
  CalendarRange,
  FileText,
  Hash,
  Inbox,
  Link2,
  MessageSquare,
  Plus,
  ScrollText,
  Stamp,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
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
  AppForm,
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormActions,
  FormField,
  LoadingState,
  PageHeader,
  fieldClassName,
  formShellClassName,
  listShellClassName,
} from '../../components/ui/Form'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { FileAudio } from '../../components/ui/FileMedia'
import { confirmToast } from '../../components/ui/confirmToast'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { formatDate, formatNumber, localizeDigits } from '../../lib/datetime'
import {
  boardMinutesAttendances,
  boardMinutesStatuses,
  type BoardMinutes,
  type BoardMinutesSmsResult,
  type BoardMinutesStats,
  type BoardRequest,
  type Paginated,
} from '../../types/app'
import { BoardMinutesForm } from './BoardMinutesForm'
import { BoardMinutesStatusBadge } from './BoardStatusBadge'
import {
  boardMinuteEditPath,
  boardMinutePath,
  boardMinuteResolutionsPath,
  boardMinuteSmsPath,
  boardMinutesCreatePath,
  boardMinutesListPath,
  boardRequestPath,
} from './board-paths'

const SMS_BODY_MAX = 700

function linkedRequests(item: BoardMinutes) {
  if (item.requests?.length) return item.requests
  return item.request ? [item.request] : []
}

function useMinutesScope() {
  const { requestId, minutesId } = useParams()
  return { requestId, minutesId }
}

function syncMinutesQueries(queryClient: QueryClient, minutes?: BoardMinutes) {
  if (minutes) {
    queryClient.setQueryData(['board-minutes-item', minutes.id], minutes)
    queryClient.setQueriesData<Paginated<BoardMinutes>>({ queryKey: ['board-minutes'] }, (current) => {
      if (!current?.items) return current
      if (!current.items.some((item) => item.id === minutes.id)) return current
      return {
        ...current,
        items: current.items.map((item) => (item.id === minutes.id ? minutes : item)),
      }
    })
    void queryClient.invalidateQueries({ queryKey: ['board-minutes-item', minutes.id] })
    void queryClient.invalidateQueries({ queryKey: ['board-minutes-dossier', minutes.id] })
  }
  void queryClient.invalidateQueries({ queryKey: ['board-minutes'] })
  void queryClient.invalidateQueries({ queryKey: ['board-minutes-stats'] })
}

export function BoardMinutesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { requestId } = useMinutesScope()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const kind = searchParams.get('kind') ?? ''
  const status = searchParams.get('status') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const filtersActive = Boolean(kind || status || from || to)
  const { confirmDelete } = useConfirmDelete()
  const requestQuery = useQuery({
    queryKey: ['board-request', requestId],
    enabled: Boolean(requestId),
    queryFn: async () => {
      const { data } = await api.get<BoardRequest>(`/board/requests/${requestId}`)
      return data
    },
  })
  const stats = useQuery({
    queryKey: ['board-minutes-stats'],
    enabled: !requestId,
    queryFn: async () => {
      const { data } = await api.get<BoardMinutesStats>('/board/minutes/stats')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['board-minutes', requestId, q, page, sortBy, sortDir, kind, status, from, to],
    queryFn: async () => {
      const { data } = await api.get<Paginated<BoardMinutes>>('/board/minutes', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(requestId ? { requestId } : {}),
          ...(kind ? { kind } : {}),
          ...(status ? { status } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  if (requestId && !requestQuery.data) return <LoadingState />

  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader
        icon={ScrollText}
        title={t('boardMinutes.title')}
        subtitle={
          requestQuery.data ? (
            <EntityNameSubtitle name={requestQuery.data.subject} icon={ScrollText} />
          ) : (
            t('boardMinutes.subtitle')
          )
        }
        backTo={requestId ? boardRequestPath(requestId) : undefined}
        action={
          !requestId || requestQuery.data?.status === 'APPROVED' ? (
            <Link to={boardMinutesCreatePath(requestId)}>
              <Button>
                <Plus className="size-4" aria-hidden />
                {t('boardMinutes.create')}
              </Button>
            </Link>
          ) : undefined
        }
      />
      {!requestId && stats.data ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FormFactTile icon={Inbox} label={t('boardMinutes.total')} value={formatNumber(stats.data.total, locale)} tone="teal" />
          <FormFactTile icon={Stamp} label={t('boardMinutes.regular')} value={formatNumber(stats.data.regular, locale)} tone="mint" />
          <FormFactTile icon={Link2} label={t('boardMinutes.linked')} value={formatNumber(stats.data.linked, locale)} />
          <FormFactTile
            icon={FileText}
            label={t('boardMinutes.resolutionCount')}
            value={formatNumber(stats.data.resolutionCount, locale)}
            tone="teal"
          />
        </div>
      ) : null}
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('boardMinutes.search')}
        placeholder={t('boardMinutes.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-3"
        extra={
          requestId ? undefined : (
            <>
              <FormField icon={CalendarRange} label={t('boardMinutes.fromDate')} htmlFor="minutes-from">
                <PersianDateField
                  id="minutes-from"
                  value={from}
                  maxDate={to || undefined}
                  onChange={(value) => {
                    const next = value || undefined
                    setParams(
                      {
                        from: next,
                        ...(to && next && to < next ? { to: undefined } : {}),
                      },
                      { resetPage: true },
                    )
                  }}
                />
              </FormField>
              <FormField icon={CalendarRange} label={t('boardMinutes.toDate')} htmlFor="minutes-to">
                <PersianDateField
                  id="minutes-to"
                  value={to}
                  minDate={from || undefined}
                  onChange={(value) => setParams({ to: value || undefined }, { resetPage: true })}
                />
              </FormField>
              <FormField icon={Stamp} label={t('boardMinutes.filterKind')}>
                <SearchSelect
                  value={kind}
                  onChange={(next) => setParams({ kind: next || undefined }, { resetPage: true })}
                  options={[
                    { value: '', label: t('common.all') },
                    { value: 'regular', label: t('boardMinutes.regular') },
                    { value: 'linked', label: t('boardMinutes.linked') },
                  ]}
                  placeholder={t('boardMinutes.filterKind')}
                />
              </FormField>
              <FormField icon={Stamp} label={t('boardMinutes.filterStatus')}>
                <SearchSelect
                  value={status}
                  onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                  options={[
                    { value: '', label: t('common.all') },
                    ...Object.values(boardMinutesStatuses).map((value) => ({
                      value,
                      label: t(`boardMinutes.statuses.${value}`),
                    })),
                  ]}
                  placeholder={t('boardMinutes.filterStatus')}
                />
              </FormField>
            </>
          )
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || kind || status || from || to ? t('boardMinutes.noResults') : t('boardMinutes.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="minutesNo" label={t('boardMinutes.number')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="heldAt" label={t('boardMinutes.heldAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="subject" label={t('boardMinutes.subject')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('boardMinutes.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="memberCount" label={t('boardMinutes.memberCount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="resolutionCount"
                label={t('boardMinutes.resolutionCount')}
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
                <td className="px-4 py-3">{localizeDigits(item.minutesNo, locale)}</td>
                <td className="px-4 py-3">
                  <DateText value={item.heldAt} />
                </td>
                <td className="px-4 py-3">{item.subject}</td>
                <td className="px-4 py-3">
                  <BoardMinutesStatusBadge value={item.status} />
                </td>
                <td className="px-4 py-3">{formatNumber(item._count?.members ?? item.members.length, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item._count?.resolutions ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={boardMinutePath(item.id, requestId)}
                    showView={false}
                    extra={
                      <Link to={boardMinuteResolutionsPath(item.id, requestId)}>
                        <Button type="button" variant="soft">
                          <FileText className="size-4" aria-hidden />
                          {t('boardResolutions.title')}
                        </Button>
                      </Link>
                    }
                    editTo={boardMinuteEditPath(item.id, requestId)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('boardMinutes.confirmDelete'),
                        successMessage: t('boardMinutes.deleted'),
                        path: `/board/minutes/${item.id}`,
                        queryKey: ['board-minutes'],
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

export function BoardMinutesCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { requestId } = useMinutesScope()
  const requestQuery = useQuery({
    queryKey: ['board-request', requestId],
    enabled: Boolean(requestId),
    queryFn: async () => {
      const { data } = await api.get<BoardRequest>(`/board/requests/${requestId}`)
      return data
    },
  })
  if (requestId && !requestQuery.data) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('boardMinutes.create')}
        subtitle={
          requestQuery.data ? (
            <EntityNameSubtitle name={requestQuery.data.subject} icon={ScrollText} />
          ) : (
            t('boardMinutes.createSubtitle')
          )
        }
      />
      <BoardMinutesForm
        lockedRequestId={requestId}
        onCancel={() => navigate(boardMinutesListPath(requestId))}
        onSubmit={async (payload) => {
          const { data } = await api.post<BoardMinutes>('/board/minutes', payload)
          syncMinutesQueries(queryClient, data)
          toast.success(t('boardMinutes.created'))
          navigate(boardMinutesListPath(requestId))
        }}
      />
    </div>
  )
}

export function BoardMinutesEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { requestId, minutesId } = useMinutesScope()
  const query = useQuery({
    queryKey: ['board-minutes-item', minutesId],
    enabled: Boolean(minutesId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutes>(`/board/minutes/${minutesId}`)
      return data
    },
  })
  if (!query.data || !minutesId) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('boardMinutes.edit')}
        subtitle={<EntityNameSubtitle name={query.data.subject} icon={ScrollText} />}
      />
      <BoardMinutesForm
        key={query.data.updatedAt}
        initial={query.data}
        lockedRequestId={requestId}
        onCancel={() => navigate(boardMinutesListPath(requestId))}
        onSubmit={async (payload) => {
          const { data } = await api.patch<BoardMinutes>(`/board/minutes/${minutesId}`, payload)
          syncMinutesQueries(queryClient, data)
          toast.success(t('boardMinutes.updated'))
          navigate(boardMinutesListPath(requestId))
        }}
      />
    </div>
  )
}

export function BoardMinutesDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const { requestId, minutesId } = useMinutesScope()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['board-minutes-item', minutesId],
    enabled: Boolean(minutesId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutes>(`/board/minutes/${minutesId}`)
      return data
    },
  })
  const item = query.data
  if (!item || !minutesId) return <LoadingState />
  const images = item.attachments.filter((row) => row.kind === 'IMAGE' && row.imageId)
  const audios = item.attachments.filter((row) => row.kind === 'AUDIO' && row.fileId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('boardMinutes.details')}
        subtitle={<EntityNameSubtitle name={item.subject} icon={ScrollText} />}
      />
      <FormCard icon={ScrollText} title={item.subject}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ScrollText}>{t('boardMinutes.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Hash}
              label={t('boardMinutes.number')}
              value={localizeDigits(item.minutesNo, locale)}
              tone="teal"
            />
            <FormFactTile icon={Stamp} label={t('boardMinutes.heldAt')} value={<DateText value={item.heldAt} />} tone="mint" />
            <FormFactTile
              icon={Stamp}
              label={t('boardMinutes.status')}
              value={<BoardMinutesStatusBadge value={item.status} />}
            />
            <FormFactTile icon={Users} label={t('boardMinutes.createdBy')} value={item.createdBy.fullName} />
            <FormFactTile
              icon={FileText}
              label={t('boardMinutes.resolutionCount')}
              value={formatNumber(item._count?.resolutions ?? 0, locale)}
              tone="teal"
            />
          </div>
          <FormSectionTitle icon={FileText}>{t('boardMinutes.requests')}</FormSectionTitle>
          {linkedRequests(item).length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {linkedRequests(item).map((row) => (
                <FormFactTile
                  key={row.id}
                  icon={FileText}
                  label={row.trackingNo ? localizeDigits(row.trackingNo, locale) : t('boardMinutes.request')}
                  value={row.subject}
                  tone="mint"
                />
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('boardMinutes.regular')}</FormEmptyHint>
          )}
          {item.body ? (
            <p className="whitespace-pre-wrap rounded-2xl border border-line bg-cream-50/80 p-4 text-sm leading-7 text-ink-800">
              {item.body}
            </p>
          ) : (
            <FormEmptyHint>{t('boardMinutes.bodyPlaceholder')}</FormEmptyHint>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FormSectionTitle icon={Users} className="mb-0">
              {t('boardMinutes.members')}
            </FormSectionTitle>
            <Link to={boardMinuteSmsPath(minutesId, requestId)}>
              <Button type="button" variant="soft">
                <MessageSquare className="size-4" aria-hidden />
                {t('boardMinutes.sms')}
              </Button>
            </Link>
          </div>
          {item.members.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {item.members.map((row) => (
                <FormFactTile
                  key={row.id}
                  icon={Users}
                  label={row.user.fullName}
                  value={
                    row.attendance === boardMinutesAttendances.PRESENT
                      ? t('boardMinutes.present')
                      : t('boardMinutes.absent')
                  }
                  tone={row.attendance === boardMinutesAttendances.PRESENT ? 'teal' : undefined}
                />
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('boardMinutes.noMembers')}</FormEmptyHint>
          )}
          <FormSectionTitle icon={FileText}>{t('boardMinutes.attachments')}</FormSectionTitle>
          {images.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {images.map((row) => (
                <img
                  key={row.id}
                  src={getImageUrl(row.imageId!)}
                  alt={row.originalName || ''}
                  className="h-28 w-full rounded-2xl object-cover ring-1 ring-teal-100"
                />
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('boardMinutes.noImages')}</FormEmptyHint>
          )}
          {audios.length ? (
            <ul className="space-y-2">
              {audios.map((row) => (
                <li key={row.id} className="rounded-2xl border border-line p-3">
                  <p className="mb-2 text-sm text-ink-700">{row.originalName}</p>
                  <FileAudio fileId={row.fileId!} className="w-full" />
                </li>
              ))}
            </ul>
          ) : (
            <FormEmptyHint>{t('boardMinutes.noAudio')}</FormEmptyHint>
          )}
          <DetailActions
            editTo={boardMinuteEditPath(minutesId, requestId)}
            editLabel={t('common.edit')}
            deleteLabel={t('boardMinutes.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('boardMinutes.confirmDelete'),
                successMessage: t('boardMinutes.deleted'),
                path: `/board/minutes/${minutesId}`,
                queryKey: ['board-minutes'],
                onDeleted: () => navigate(boardMinutesListPath(requestId)),
              })
            }
            extraItems={[
              {
                to: boardMinuteResolutionsPath(minutesId, requestId),
                icon: FileText,
                label: t('boardResolutions.manage'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}

export function BoardMinutesSmsPage() {
  const { requestId, minutesId } = useMinutesScope()
  const query = useQuery({
    queryKey: ['board-minutes-item', minutesId],
    enabled: Boolean(minutesId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutes>(`/board/minutes/${minutesId}`)
      return data
    },
  })
  if (!query.data || !minutesId) return <LoadingState />
  return <BoardMinutesSmsForm item={query.data} minutesId={minutesId} requestId={requestId} />
}

function BoardMinutesSmsForm({
  item,
  minutesId,
  requestId,
}: {
  item: BoardMinutes
  minutesId: string
  requestId?: string
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)
  const defaultBody = useMemo(
    () =>
      t('boardMinutes.smsDefault', {
        number: localizeDigits(item.minutesNo, locale),
        subject: item.subject,
        date: formatDate(item.heldAt, locale),
      }),
    [item.heldAt, item.minutesNo, item.subject, locale, t],
  )
  const [body, setBody] = useState(defaultBody)
  const recipients = item.members
  const selectable = recipients.filter((row) => row.user.phone?.trim())
  const [selectedIds, setSelectedIds] = useState(() => selectable.map((row) => row.id))
  const selected = recipients.filter((row) => selectedIds.includes(row.id))
  const withPhone = selected.filter((row) => row.user.phone?.trim())
  const detailsPath = boardMinutePath(minutesId, requestId)

  function submit() {
    const text = body.trim()
    if (!text) {
      toast.error(t('boardMinutes.smsBody'))
      return
    }
    if (!recipients.length) {
      toast.error(t('boardMinutes.smsNoMembers'))
      return
    }
    if (!selected.length) {
      toast.error(t('boardMinutes.smsNoneSelected'))
      return
    }
    if (!withPhone.length) {
      toast.error(t('boardMinutes.smsNoPhones'))
      return
    }
    confirmToast({
      title: t('boardMinutes.smsConfirm', { count: formatNumber(withPhone.length, locale) }),
      confirmLabel: t('boardMinutes.smsSend'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        setSending(true)
        try {
          const { data } = await api.post<BoardMinutesSmsResult>(`/board/minutes/${minutesId}/sms`, {
            body: text,
            memberIds: selectedIds,
          })
          if (data.skippedNoPhoneCount) {
            toast.success(
              t('boardMinutes.smsSentPartial', {
                sent: formatNumber(data.recipientCount, locale),
                skipped: formatNumber(data.skippedNoPhoneCount, locale),
              }),
            )
          } else {
            toast.success(t('boardMinutes.smsSent', { count: formatNumber(data.recipientCount, locale) }))
          }
          if (data.providerSkipped) {
            toast.info(data.providerMessage || t('boardMinutes.smsProviderPending'))
          }
          navigate(detailsPath)
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
        } finally {
          setSending(false)
        }
      },
    })
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('boardMinutes.smsTitle')}
        subtitle={<EntityNameSubtitle name={item.subject} icon={ScrollText} />}
        backTo={detailsPath}
      />
      <FormCard icon={MessageSquare} title={t('boardMinutes.smsTitle')} subtitle={t('boardMinutes.smsSubtitle')}>
        <AppForm onSubmit={submit} className={formCardBodyClassName}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FormSectionTitle icon={Users} className="mb-0">
              {t('boardMinutes.smsRecipients')}
            </FormSectionTitle>
            {selectable.length ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedIds(selectable.map((row) => row.id))}
                >
                  {t('boardMinutes.smsSelectAll')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSelectedIds([])}>
                  {t('boardMinutes.smsClear')}
                </Button>
              </div>
            ) : null}
          </div>
          {recipients.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {recipients.map((row) => {
                const phone = row.user.phone?.trim() || ''
                return (
                  <CheckboxField
                    key={row.id}
                    id={`minutes-sms-member-${row.id}`}
                    checked={selectedIds.includes(row.id)}
                    disabled={!phone}
                    label={
                      <span className="flex min-w-0 flex-col">
                        <span>{row.user.fullName}</span>
                        <span className="text-xs text-ink-500">
                          {phone ? localizeDigits(phone, locale) : t('boardMinutes.smsNoPhone')}
                        </span>
                      </span>
                    }
                    onChange={(checked) =>
                      setSelectedIds((current) =>
                        checked ? [...current, row.id] : current.filter((id) => id !== row.id),
                      )
                    }
                  />
                )
              })}
            </div>
          ) : (
            <FormEmptyHint>{t('boardMinutes.smsNoMembers')}</FormEmptyHint>
          )}
          <FormField icon={MessageSquare} label={t('boardMinutes.smsBody')} htmlFor="minutes-sms-body">
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={() => setBody(defaultBody)}>
                  <MessageSquare className="size-4" aria-hidden />
                  {t('boardMinutes.smsResetDefault')}
                </Button>
              </div>
              <textarea
                id="minutes-sms-body"
                required
                maxLength={SMS_BODY_MAX}
                className={`${fieldClassName} min-h-36`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={t('boardMinutes.smsBodyPlaceholder')}
              />
              <p className="text-xs text-ink-500">
                {t('boardMinutes.smsCharCount', { count: formatNumber(body.length, locale) })}
              </p>
            </div>
          </FormField>
          <FormActions
            submitLabel={t('boardMinutes.smsSend')}
            cancelLabel={t('common.cancel')}
            submitting={sending}
            onCancel={() => navigate(detailsPath)}
            headerIcons
          />
        </AppForm>
      </FormCard>
    </div>
  )
}
