import { Building2, CalendarRange, FileText, Plus, ScrollText, Stamp, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  Button,
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useCrudListState } from '../../hooks/useCrudListState'
import { api } from '../../lib/api'
import type { BoardMinutes, BoardMinutesResolution, Paginated } from '../../types/app'
import { BoardMinutesDossierModal } from './BoardMinutesDossierModal'
import { BoardMinutesResolutionForm, type BoardResolutionPayload } from './BoardMinutesResolutionForm'
import {
  boardMinuteEditPath,
  boardMinutePath,
  boardMinuteResolutionPath,
  boardMinuteResolutionsPath,
  boardRequestPath,
} from './board-paths'

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
        className="relative z-10 w-full max-w-2xl"
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
  const { q, page, term, setTerm, applySearch, setPage, sortBy, sortDir, sortParams, onSort } =
    useCrudListState(embedded)
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const [dossierResolutionId, setDossierResolutionId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const query = useQuery({
    queryKey: ['board-minutes-resolutions', minutesId, q, page, sortBy, sortDir],
    enabled: Boolean(minutesId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<BoardMinutesResolution>>(
        `/board/minutes/${minutesId}/resolutions`,
        { params: { page, ...(q ? { q } : {}), ...sortParams } },
      )
      return data
    },
  })
  if (!minutesId || (!embedded && !minutes)) return <LoadingState />
  const base = boardMinuteResolutionsPath(minutesId, requestId)
  const rows = query.data?.items ?? []
  const createAction = embedded ? (
    <Button type="button" onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" aria-hidden />
      {t('boardResolutions.create')}
    </Button>
  ) : (
    <Link to={`${base}/new`}>
      <Button>
        <Plus className="size-4" aria-hidden />
        {t('boardResolutions.create')}
      </Button>
    </Link>
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
        {...(embedded ? { autoFocus: false } : {})}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('boardResolutions.noResults') : t('boardResolutions.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="title" label={t('boardResolutions.titleField')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="unit" label={t('boardResolutions.unit')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="dueDate" label={t('boardResolutions.dueDate')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.unit?.name || t('boardResolutions.withoutUnit')}</td>
                <td className="px-4 py-3">{item.dueDate ? <DateText value={item.dueDate} /> : '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    showView={embedded}
                    extra={
                      embedded ? undefined : (
                        <Button type="button" variant="soft" onClick={() => setDossierResolutionId(item.id)}>
                          <ScrollText className="size-4" aria-hidden />
                          {t('boardResolutions.viewMinutes')}
                        </Button>
                      )
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
        <div className="flex justify-end">{createAction}</div>
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
        action={createAction}
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
        onCancel={() => navigate(listPath)}
        onSubmit={async (payload) => {
          await api.patch(`/board/minutes/${minutesId}/resolutions/${resolutionId}`, payload)
          toast.success(t('boardResolutions.updated'))
          navigate(listPath)
        }}
      />
    </div>
  )
}

export function BoardMinutesResolutionDetailPage() {
  const { t } = useTranslation()
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
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FileText}
        title={t('boardResolutions.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={FileText} />}
      />
      <FormCard icon={FileText} title={item.title} subtitle={minutes.subject}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={FileText}>{t('boardResolutions.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={FileText} label={t('boardResolutions.titleField')} value={item.title} tone="teal" />
            <FormFactTile icon={Building2} label={t('boardResolutions.unit')} value={item.unit?.name || t('boardResolutions.withoutUnit')} tone="mint" />
            <FormFactTile
              icon={CalendarRange}
              label={t('boardResolutions.dueDate')}
              value={item.dueDate ? <DateText value={item.dueDate} /> : '—'}
            />
            <FormFactTile icon={ScrollText} label={t('boardResolutions.description')} value={item.description || '—'} />
            <FormFactTile icon={ScrollText} label={t('boardResolutions.notes')} value={item.notes || '—'} />
          </div>
          <FormSectionTitle icon={ScrollText}>{t('boardResolutions.minutes')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={ScrollText} label={t('boardMinutes.subject')} value={minutes.subject} tone="teal" />
            <FormFactTile icon={CalendarRange} label={t('boardMinutes.heldAt')} value={<DateText value={minutes.heldAt} />} tone="mint" />
            <FormFactTile
              icon={Stamp}
              label={t('boardMinutes.request')}
              value={minutes.request?.subject || t('boardResolutions.noRequest')}
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
    </div>
  )
}
