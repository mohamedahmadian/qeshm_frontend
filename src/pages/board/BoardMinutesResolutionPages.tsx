import {
  Building2,
  CalendarRange,
  FileText,
  History,
  MessageSquare,
  PenLine,
  Phone,
  Plus,
  Printer,
  Scale,
  ScrollText,
  Stamp,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import { BoardResolutionDueValue, resolutionProposerLabel, resolutionSignatoryName } from './BoardResolutionDisplay'
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
import { SearchSelect } from '../../components/ui/SearchSelect'
import { confirmToast } from '../../components/ui/confirmToast'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useCrudListState } from '../../hooks/useCrudListState'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { formatDate, formatNumber, localizeDigits, toLatinDigits } from '../../lib/datetime'
import { isPhoneReady } from '../../lib/identity'
import { resolutionExecutorNames } from '../../lib/resolution-calendar'
import type {
  BoardMinutes,
  BoardMinutesResolution,
  BoardResolutionSmsResult,
  BoardResolutionUnit,
  Paginated,
} from '../../types/app'
import { boardResolutionStatuses } from '../../types/app'
import { BoardResolutionStatusBadge, BoardSignatorySignedBadge } from './BoardStatusBadge'
import { BoardMinutesDossierModal } from './BoardMinutesDossierModal'
import { BoardMinutesResolutionForm, type BoardResolutionPayload } from './BoardMinutesResolutionForm'
import {
  BoardResolutionPrintButton,
  BoardResolutionPrintSheet,
  BoardResolutionsPrintAllButton,
} from './BoardResolutionPrintSheet'
import {
  boardMinuteEditPath,
  boardMinutePath,
  boardMinuteResolutionPath,
  boardMinuteResolutionSmsPath,
  boardMinuteResolutionsPath,
  boardRequestPath,
} from './board-paths'

const SMS_BODY_MAX = 700

function resolutionUnits(item: BoardMinutesResolution): BoardResolutionUnit[] {
  if (item.units?.length) return item.units
  return item.unit ? [item.unit] : []
}

function normalizeSmsMobile(value: string) {
  const digits = toLatinDigits(value).replace(/\D/g, '')
  return digits.length === 10 && digits.startsWith('9') ? `0${digits}` : digits
}

function storedUnitPhone(row: BoardResolutionUnit) {
  return row.phone?.trim() || ''
}

function unitSmsPhone(row: BoardResolutionUnit, overrides: Record<string, string>) {
  const stored = storedUnitPhone(row)
  if (stored) return stored
  const entered = normalizeSmsMobile(overrides[row.id] ?? '')
  return isPhoneReady(entered, true) ? entered : ''
}

function ResolutionCreateModal({
  open,
  minutesId,
  minutesTitle,
  onClose,
  onCreated,
}: {
  open: boolean
  minutesId: string
  minutesTitle: string
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      if (document.querySelector('[data-confirm-toast], [role="listbox"], [role="menu"], .rmdp-wrapper')) return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])

  if (!open) return null

  async function submit(payload: BoardResolutionPayload) {
    await api.post(`/board/minutes/${minutesId}/resolutions`, payload)
    toast.success(t('boardResolutions.created'))
    onCreated()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink-900/30 p-4 py-8"
      data-nested-dialog
      role="presentation"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t('boardResolutions.create')}
        className="relative z-10 w-full max-w-3xl"
      >
        <BoardMinutesResolutionForm
          minutesTitle={minutesTitle}
          headerIcons={false}
          autoFocusFirst
          headerAction={
            <button
              type="button"
              className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" />
            </button>
          }
          onCancel={onClose}
          onSubmit={submit}
        />
      </section>
    </div>,
    document.body,
  )
}

function useMinutesContext() {
  const { requestId, minutesId, resolutionId } = useParams()
  const query = useQuery({
    queryKey: ['board-minutes-item', minutesId],
    enabled: Boolean(minutesId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutes>(`/board/minutes/${minutesId}`)
      return data
    },
  })
  return { requestId, minutesId, resolutionId, minutes: query.data }
}

export function BoardMinutesResolutionListPage({ embedded = false }: { embedded?: boolean }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { requestId, minutesId, minutes } = useMinutesContext()
  const {
    q,
    page,
    term,
    setTerm,
    applySearch,
    setPage,
    sortBy,
    sortDir,
    sortParams,
    onSort,
    searchParams,
    setParams,
  } = useCrudListState(embedded)
  const status = searchParams.get('status') ?? ''
  const filtersActive = Boolean(status)
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const [dossierResolutionId, setDossierResolutionId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const query = useQuery({
    queryKey: ['board-minutes-resolutions', minutesId, q, page, sortBy, sortDir, status],
    enabled: Boolean(minutesId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<BoardMinutesResolution>>(
        `/board/minutes/${minutesId}/resolutions`,
        { params: { page, ...(q ? { q } : {}), ...(status ? { status } : {}), ...sortParams } },
      )
      return data
    },
  })
  if (!minutesId || (!embedded && !minutes)) return <LoadingState />
  const base = boardMinuteResolutionsPath(minutesId, requestId)
  const rows = query.data?.items ?? []
  const printAllAction = minutes ? <BoardResolutionsPrintAllButton minutes={minutes} /> : null
  const createAction = embedded ? (
    <Button type="button" onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" aria-hidden />
      {t('boardResolutions.createNew')}
    </Button>
  ) : (
    <Link to={`${base}/new`}>
      <Button>
        <Plus className="size-4" aria-hidden />
        {t('boardResolutions.createNew')}
      </Button>
    </Link>
  )
  const headerActions = (
    <>
      {printAllAction}
      {createAction}
    </>
  )
  const createModal = embedded ? (
    <ResolutionCreateModal
      open={createOpen}
      minutesId={minutesId}
      minutesTitle={minutes?.subject ?? ''}
      onClose={() => setCreateOpen(false)}
      onCreated={() => {
        const pageSize = query.data?.pageSize ?? 10
        const nextTotal = (query.data?.total ?? 0) + 1
        if (!q && !sortBy) setPage(Math.max(1, Math.ceil(nextTotal / pageSize)))
        void queryClient.invalidateQueries({ queryKey: ['board-minutes-resolutions', minutesId] })
        void queryClient.invalidateQueries({ queryKey: ['board-minutes-item', minutesId] })
        void queryClient.invalidateQueries({ queryKey: ['board-minutes'] })
        setCreateOpen(false)
      }}
    />
  ) : null
  const list = (
    <>
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('boardResolutions.search')}
        placeholder={t('boardResolutions.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <FormField icon={Stamp} label={t('boardResolutions.filterStatus')}>
            <SearchSelect
              value={status}
              onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
              options={[
                { value: '', label: t('common.all') },
                ...Object.values(boardResolutionStatuses).map((value) => ({
                  value,
                  label: t(`boardResolutions.statuses.${value}`),
                })),
              ]}
              placeholder={t('boardResolutions.filterStatus')}
            />
          </FormField>
        }
        {...(embedded ? { autoFocus: false } : {})}
      />
      <TableCard
        loading={query.isLoading}
        empty={q || status ? t('boardResolutions.noResults') : t('boardResolutions.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="title" label={t('boardResolutions.titleField')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('boardResolutions.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="unit" label={t('boardResolutions.unit')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="dueDate" label={t('boardResolutions.dueDate')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">
                  <BoardResolutionStatusBadge value={item.status} />
                </td>
                <td className="px-4 py-3">
                  {resolutionExecutorNames(item, t('boardResolutions.withoutUnit'))}
                </td>
                <td className="px-4 py-3">
                  <BoardResolutionDueValue dueKind={item.dueKind} dueDate={item.dueDate} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    showView={embedded}
                    extra={
                      <>
                        {embedded ? null : (
                          <Button type="button" variant="soft" onClick={() => setDossierResolutionId(item.id)}>
                            <ScrollText className="size-4" aria-hidden />
                            {t('boardResolutions.viewMinutes')}
                          </Button>
                        )}
                        <BoardResolutionPrintButton item={item} minutes={minutes} />
                      </>
                    }
                    editTo={`${base}/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('boardResolutions.confirmDelete'),
                        successMessage: t('boardResolutions.deleted'),
                        path: `/board/minutes/${minutesId}/resolutions/${item.id}`,
                        queryKey: ['board-minutes-resolutions'],
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
      {embedded ? null : (
        <BoardMinutesDossierModal
          minutesId={dossierResolutionId ? minutesId : null}
          focusResolutionId={dossierResolutionId}
          locale={locale}
          onClose={() => setDossierResolutionId(null)}
        />
      )}
    </>
  )

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-end gap-2">{headerActions}</div>
        {list}
        {createModal}
      </div>
    )
  }

  if (!minutes) return <LoadingState />

  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader
        icon={FileText}
        title={t('boardResolutions.title')}
        subtitle={
          <EntityNameSubtitle
            name={minutes.subject}
            icon={ScrollText}
            to={boardMinuteEditPath(minutesId, requestId)}
          />
        }
        backTo={boardMinutePath(minutesId, requestId)}
        action={headerActions}
      />
      {list}
    </div>
  )
}

export function BoardMinutesResolutionCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestId, minutesId, minutes } = useMinutesContext()
  if (!minutes || !minutesId) return <LoadingState />
  const listPath = boardMinuteResolutionsPath(minutesId, requestId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FileText}
        title={t('boardResolutions.create')}
        subtitle={<EntityNameSubtitle name={minutes.subject} icon={FileText} />}
      />
      <BoardMinutesResolutionForm
        minutesTitle={minutes.subject}
        onCancel={() => navigate(listPath)}
        onSubmit={async (payload) => {
          await api.post(`/board/minutes/${minutesId}/resolutions`, payload)
          toast.success(t('boardResolutions.created'))
          navigate(listPath)
        }}
      />
    </div>
  )
}

export function BoardMinutesResolutionEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { requestId, minutesId, resolutionId, minutes } = useMinutesContext()
  const query = useQuery({
    queryKey: ['board-minutes-resolution', minutesId, resolutionId],
    enabled: Boolean(minutesId && resolutionId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutesResolution>(
        `/board/minutes/${minutesId}/resolutions/${resolutionId}`,
      )
      return data
    },
  })
  if (!minutes || !query.data || !minutesId || !resolutionId) return <LoadingState />
  const listPath = boardMinuteResolutionsPath(minutesId, requestId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FileText}
        title={t('boardResolutions.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={FileText} />}
      />
      <BoardMinutesResolutionForm
        initial={query.data}
        minutesTitle={minutes.subject}
        smsTo={boardMinuteResolutionSmsPath(minutesId, resolutionId, requestId)}
        headerAction={
          <Button type="button" variant="soft" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {t('boardResolutions.print')}
          </Button>
        }
        onCancel={() => navigate(listPath)}
        onSaveSignatories={async (signatories) => {
          await api.patch(`/board/minutes/${minutesId}/resolutions/${resolutionId}`, { signatories })
          toast.success(t('boardResolutions.signedSaved'))
          await queryClient.invalidateQueries({ queryKey: ['board-minutes-resolution', minutesId, resolutionId] })
          await queryClient.invalidateQueries({ queryKey: ['board-minutes-resolutions'] })
        }}
        onSubmit={async (payload) => {
          await api.patch(`/board/minutes/${minutesId}/resolutions/${resolutionId}`, payload)
          toast.success(t('boardResolutions.updated'))
          navigate(listPath)
        }}
      />
      <BoardResolutionPrintSheet item={query.data} minutes={minutes} />
    </div>
  )
}

export function BoardMinutesResolutionDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { requestId, minutesId, resolutionId, minutes } = useMinutesContext()
  const query = useQuery({
    queryKey: ['board-minutes-resolution', minutesId, resolutionId],
    enabled: Boolean(minutesId && resolutionId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutesResolution>(
        `/board/minutes/${minutesId}/resolutions/${resolutionId}`,
      )
      return data
    },
  })
  const item = query.data
  if (!minutes || !item || !minutesId || !resolutionId) return <LoadingState />
  const listPath = boardMinuteResolutionsPath(minutesId, requestId)
  const smsPath = boardMinuteResolutionSmsPath(minutesId, resolutionId, requestId)
  const executors = resolutionUnits(item)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FileText}
        title={t('boardResolutions.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={FileText} />}
        className="mb-6 print:hidden"
      />
      <FormCard
        className="print:hidden"
        icon={FileText}
        title={item.title}
        subtitle={minutes.subject}
        action={
          <Button type="button" variant="soft" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {t('boardResolutions.print')}
          </Button>
        }
      >
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={FileText}>{t('boardResolutions.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={FileText} label={t('boardResolutions.titleField')} value={item.title} tone="teal" />
            <FormFactTile
              icon={Stamp}
              label={t('boardResolutions.status')}
              value={<BoardResolutionStatusBadge value={item.status} />}
              tone="mint"
            />
            <FormFactTile icon={UserRound} label={t('boardResolutions.proposer')} value={resolutionProposerLabel(item)} />
            <FormFactTile
              icon={CalendarRange}
              label={t('boardResolutions.dueDate')}
              value={<BoardResolutionDueValue dueKind={item.dueKind} dueDate={item.dueDate} />}
            />
            <FormFactTile
              icon={History}
              label={t('boardResolutions.hasTopicHistory')}
              value={item.hasTopicHistory ? t('boardResolutions.topicHistoryYes') : t('boardResolutions.topicHistoryNo')}
            />
            <FormFactTile icon={Scale} label={t('boardResolutions.legalBasis')} value={item.legalBasis || '—'} />
            <FormFactTile icon={ScrollText} label={t('boardResolutions.description')} value={item.description || '—'} />
            <FormFactTile icon={ScrollText} label={t('boardResolutions.notes')} value={item.notes || '—'} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FormSectionTitle icon={Building2} className="mb-0">
              {t('boardResolutions.unit')}
            </FormSectionTitle>
            <Link to={smsPath}>
              <Button type="button" variant="soft">
                <MessageSquare className="size-4" aria-hidden />
                {t('boardResolutions.sms')}
              </Button>
            </Link>
          </div>
          {executors.length ? (
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              {executors.map((row) => (
                <FormFactTile
                  key={row.id}
                  icon={Building2}
                  label={row.name}
                  value={
                    row.phone?.trim()
                      ? localizeDigits(row.phone, locale)
                      : t('boardResolutions.smsNoPhone')
                  }
                  copyValue={row.phone?.trim() || undefined}
                  tone="mint"
                />
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('boardResolutions.withoutUnit')}</FormEmptyHint>
          )}
          <FormSectionTitle icon={PenLine}>{t('boardResolutions.signatories')}</FormSectionTitle>
          {item.signatories?.length ? (
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              {item.signatories.map((row) => (
                <FormFactTile
                  key={row.id}
                  icon={PenLine}
                  label={row.title}
                  value={
                    <span className="flex flex-col gap-1">
                      <BoardSignatorySignedBadge signed={Boolean(row.signedAt)} />
                      <span>{resolutionSignatoryName(row)}</span>
                      <span className="text-xs text-ink-500">
                        {row.signedAt ? <DateText value={row.signedAt} /> : '—'}
                      </span>
                      {row.signatureImageId ? (
                        <img
                          src={getImageUrl(row.signatureImageId)}
                          alt={resolutionSignatoryName(row)}
                          className="mt-1 h-12 max-w-36 rounded-lg border border-line bg-white object-contain p-1"
                        />
                      ) : null}
                    </span>
                  }
                />
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('boardResolutions.noSignatories')}</FormEmptyHint>
          )}
          <FormSectionTitle icon={ScrollText}>{t('boardResolutions.minutes')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={ScrollText} label={t('boardMinutes.subject')} value={minutes.subject} tone="teal" />
            <FormFactTile icon={CalendarRange} label={t('boardMinutes.heldAt')} value={<DateText value={minutes.heldAt} />} tone="mint" />
            <FormFactTile
              icon={Stamp}
              label={t('boardMinutes.requests')}
              value={
                (minutes.requests?.length
                  ? minutes.requests.map((row) => row.subject).join('، ')
                  : minutes.request?.subject) || t('boardResolutions.noRequest')
              }
            />
          </div>
          <DetailActions
            editTo={boardMinuteResolutionPath(minutesId, resolutionId, requestId) + '/edit'}
            editLabel={t('common.edit')}
            deleteLabel={t('boardResolutions.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('boardResolutions.confirmDelete'),
                successMessage: t('boardResolutions.deleted'),
                path: `/board/minutes/${minutesId}/resolutions/${resolutionId}`,
                queryKey: ['board-minutes-resolutions'],
                onDeleted: () => navigate(listPath),
              })
            }
            extraItems={[
              {
                to: smsPath,
                icon: MessageSquare,
                label: t('boardResolutions.sms'),
              },
              {
                icon: Printer,
                label: t('boardResolutions.print'),
                onClick: () => window.print(),
              },
              {
                to: boardMinutePath(minutesId, requestId),
                icon: ScrollText,
                label: t('boardMinutes.details'),
              },
              ...(minutes.request
                ? [
                    {
                      to: boardRequestPath(minutes.request.id),
                      icon: FileText,
                      label: t('boardRequests.details'),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </FormCard>
      <BoardResolutionPrintSheet item={item} minutes={minutes} />
    </div>
  )
}

export function BoardMinutesResolutionSmsPage() {
  const { requestId, minutesId, resolutionId, minutes } = useMinutesContext()
  const query = useQuery({
    queryKey: ['board-minutes-resolution', minutesId, resolutionId],
    enabled: Boolean(minutesId && resolutionId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutesResolution>(
        `/board/minutes/${minutesId}/resolutions/${resolutionId}`,
      )
      return data
    },
  })
  if (!minutes || !query.data || !minutesId || !resolutionId) return <LoadingState />
  return (
    <BoardMinutesResolutionSmsForm
      item={query.data}
      minutes={minutes}
      minutesId={minutesId}
      resolutionId={resolutionId}
      requestId={requestId}
    />
  )
}

function BoardMinutesResolutionSmsForm({
  item,
  minutes,
  minutesId,
  resolutionId,
  requestId,
}: {
  item: BoardMinutesResolution
  minutes: BoardMinutes
  minutesId: string
  resolutionId: string
  requestId?: string
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)
  const detailsPath = boardMinuteResolutionPath(minutesId, resolutionId, requestId)
  const recipients = resolutionUnits(item)
  const defaultBody = useMemo(
    () =>
      t('boardResolutions.smsDefault', {
        title: item.title,
        number: localizeDigits(minutes.minutesNo, locale),
        date: formatDate(minutes.heldAt, locale),
      }),
    [item.title, locale, minutes.heldAt, minutes.minutesNo, t],
  )
  const [body, setBody] = useState(defaultBody)
  const [phoneOverrides, setPhoneOverrides] = useState<Record<string, string>>({})
  const [selectedIds, setSelectedIds] = useState(() =>
    recipients.filter((row) => storedUnitPhone(row)).map((row) => row.id),
  )
  const selected = recipients.filter((row) => selectedIds.includes(row.id))
  const withPhone = selected.filter((row) => unitSmsPhone(row, phoneOverrides))

  function patchOverride(unitId: string, raw: string) {
    const next = toLatinDigits(raw).replace(/\D/g, '').slice(0, 11)
    setPhoneOverrides((current) => ({ ...current, [unitId]: next }))
    setSelectedIds((current) => {
      if (next) return current.includes(unitId) ? current : [...current, unitId]
      return current.filter((id) => id !== unitId)
    })
  }

  function submit() {
    const text = body.trim()
    if (!text) {
      toast.error(t('boardResolutions.smsBody'))
      return
    }
    if (!recipients.length) {
      toast.error(t('boardResolutions.smsNoUnits'))
      return
    }
    if (!selected.length) {
      toast.error(t('boardResolutions.smsNoneSelected'))
      return
    }
    const missing = selected.find((row) => !storedUnitPhone(row) && !normalizeSmsMobile(phoneOverrides[row.id] ?? ''))
    if (missing) {
      toast.error(t('boardResolutions.smsPhoneRequired', { name: missing.name }))
      return
    }
    const invalid = selected.find((row) => !unitSmsPhone(row, phoneOverrides))
    if (invalid) {
      toast.error(t('boardResolutions.smsPhoneInvalid'))
      return
    }
    if (!withPhone.length) {
      toast.error(t('boardResolutions.smsNoPhones'))
      return
    }
    const phones = selected
      .filter((row) => !storedUnitPhone(row))
      .map((row) => ({ unitId: row.id, phone: unitSmsPhone(row, phoneOverrides) }))
    confirmToast({
      title: t('boardResolutions.smsConfirm', { count: formatNumber(withPhone.length, locale) }),
      confirmLabel: t('boardResolutions.smsSend'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        setSending(true)
        try {
          const { data } = await api.post<BoardResolutionSmsResult>(
            `/board/minutes/${minutesId}/resolutions/${resolutionId}/sms`,
            { body: text, unitIds: selectedIds, ...(phones.length ? { phones } : {}) },
          )
          if (data.skippedNoPhoneCount) {
            toast.success(
              t('boardResolutions.smsSentPartial', {
                sent: formatNumber(data.recipientCount, locale),
                skipped: formatNumber(data.skippedNoPhoneCount, locale),
              }),
            )
          } else {
            toast.success(t('boardResolutions.smsSent', { count: formatNumber(data.recipientCount, locale) }))
          }
          if (data.providerSkipped) {
            toast.info(data.providerMessage || t('boardResolutions.smsProviderPending'))
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
        icon={FileText}
        title={t('boardResolutions.smsTitle')}
        subtitle={<EntityNameSubtitle name={item.title} icon={FileText} />}
        backTo={detailsPath}
      />
      <FormCard icon={MessageSquare} title={t('boardResolutions.smsTitle')} subtitle={t('boardResolutions.smsSubtitle')}>
        <AppForm onSubmit={submit} className={formCardBodyClassName}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FormSectionTitle icon={Building2} className="mb-0">
              {t('boardResolutions.smsRecipients')}
            </FormSectionTitle>
            {recipients.length ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedIds(recipients.map((row) => row.id))}
                >
                  {t('boardResolutions.smsSelectAll')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSelectedIds([])}>
                  {t('boardResolutions.smsClear')}
                </Button>
              </div>
            ) : null}
          </div>
          {recipients.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {recipients.map((row) => {
                const stored = storedUnitPhone(row)
                const override = phoneOverrides[row.id] ?? ''
                return (
                  <div key={row.id} className="space-y-2">
                    <CheckboxField
                      id={`resolution-sms-unit-${row.id}`}
                      checked={selectedIds.includes(row.id)}
                      label={
                        <span className="flex min-w-0 flex-col">
                          <span>{row.name}</span>
                          {stored ? (
                            <span className="text-xs text-ink-500">{localizeDigits(stored, locale)}</span>
                          ) : null}
                        </span>
                      }
                      onChange={(checked) =>
                        setSelectedIds((current) =>
                          checked ? [...current, row.id] : current.filter((id) => id !== row.id),
                        )
                      }
                    />
                    {stored ? null : (
                      <FormField
                        icon={Phone}
                        label={t('boardResolutions.smsPhonePlaceholder')}
                        htmlFor={`resolution-sms-phone-${row.id}`}
                      >
                        <input
                          id={`resolution-sms-phone-${row.id}`}
                          inputMode="numeric"
                          autoComplete="tel"
                          className={`${fieldClassName} digit-field`}
                          dir="ltr"
                          value={override}
                          onChange={(event) => patchOverride(row.id, event.target.value)}
                          placeholder={t('boardResolutions.smsPhonePlaceholder')}
                        />
                      </FormField>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <FormEmptyHint>{t('boardResolutions.smsNoUnits')}</FormEmptyHint>
          )}
          <FormField icon={MessageSquare} label={t('boardResolutions.smsBody')} htmlFor="resolution-sms-body">
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={() => setBody(defaultBody)}>
                  <MessageSquare className="size-4" aria-hidden />
                  {t('boardResolutions.smsResetDefault')}
                </Button>
              </div>
              <textarea
                id="resolution-sms-body"
                required
                maxLength={SMS_BODY_MAX}
                className={`${fieldClassName} min-h-36`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={t('boardResolutions.smsBodyPlaceholder')}
              />
              <p className="text-xs text-ink-500">
                {t('boardResolutions.smsCharCount', { count: formatNumber(body.length, locale) })}
              </p>
            </div>
          </FormField>
          <FormActions
            submitLabel={t('boardResolutions.smsSend')}
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
