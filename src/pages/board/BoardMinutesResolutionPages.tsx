import { Building2, CalendarRange, FileText, Plus, ScrollText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import type { BoardMinutes, BoardMinutesResolution, Paginated } from '../../types/app'
import { BoardMinutesResolutionForm } from './BoardMinutesResolutionForm'
import {
  boardMinutePath,
  boardMinuteResolutionPath,
  boardMinuteResolutionsPath,
} from './board-paths'

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

export function BoardMinutesResolutionListPage() {
  const { t } = useTranslation()
  const { requestId, minutesId, minutes } = useMinutesContext()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
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
  if (!minutes || !minutesId) return <LoadingState />
  const base = boardMinuteResolutionsPath(minutesId, requestId)
  const rows = query.data?.items ?? []
  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader
        icon={FileText}
        title={t('boardResolutions.title')}
        subtitle={<EntityNameSubtitle name={minutes.subject} icon={FileText} />}
        backTo={boardMinutePath(minutesId, requestId)}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" aria-hidden />
              {t('boardResolutions.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('boardResolutions.search')}
        placeholder={t('boardResolutions.searchPlaceholder')}
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
                <td className="px-4 py-3">{item.unit.name}</td>
                <td className="px-4 py-3">{item.dueDate ? <DateText value={item.dueDate} /> : '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
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
            <FormFactTile icon={Building2} label={t('boardResolutions.unit')} value={item.unit.name} tone="mint" />
            <FormFactTile
              icon={CalendarRange}
              label={t('boardResolutions.dueDate')}
              value={item.dueDate ? <DateText value={item.dueDate} /> : '—'}
            />
            <FormFactTile icon={ScrollText} label={t('boardResolutions.description')} value={item.description || '—'} />
            <FormFactTile icon={ScrollText} label={t('boardResolutions.notes')} value={item.notes || '—'} />
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
          />
        </div>
      </FormCard>
    </div>
  )
}
