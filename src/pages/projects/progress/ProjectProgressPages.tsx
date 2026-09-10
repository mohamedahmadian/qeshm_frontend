import {
  CalendarRange,
  ClipboardList,
  Filter,
  ImagePlus,
  Mic,
  Percent,
  Plus,
  RefreshCw,
  ScrollText,
  Sparkles,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../../components/ui/DateText'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api, getApiErrorMessage, getFileUrl, getImageUrl } from '../../../lib/api'
import { localizeDigits } from '../../../lib/datetime'
import {
  projectProgressTranscriptionStatusOrder,
  projectProgressTranscriptionStatuses,
  type Paginated,
  type Project,
  type ProjectProgressEntry,
  type ProjectProgressTranscriptionStatus,
} from '../../../types/app'
import { ProjectProgress } from '../ProjectShared'
import { ProjectProgressForm } from './ProjectProgressForm'
import { projectProgressEntryPath, projectProgressPath } from './progress-paths'

function useProject() {
  const { id: projectId } = useParams()
  const query = useQuery({
    queryKey: ['project', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${projectId}`)
      return data
    },
  })
  return { projectId, project: query.data }
}

function entryTitle(entry: ProjectProgressEntry, fallback: string) {
  const text = (entry.body || entry.transcript || entry.summary || '').trim()
  if (!text) return fallback
  const line = text.split(/\n/)[0]?.trim() ?? fallback
  return line.length > 48 ? `${line.slice(0, 48)}…` : line
}

function formatDuration(ms: number | null | undefined, locale: string) {
  if (ms == null) return '—'
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return localizeDigits(
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    locale,
  )
}

function TranscriptionBadge({ value }: { value: ProjectProgressTranscriptionStatus }) {
  const { t } = useTranslation()
  const tone: Record<ProjectProgressTranscriptionStatus, string> = {
    NONE: 'bg-cream-100 text-ink-600',
    PENDING: 'bg-cream-50 text-ink-600',
    PROCESSING: 'bg-teal-50 text-teal-700',
    READY: 'bg-mint-100 text-teal-800',
    FAILED: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone[value]}`}>
      {t(`projectProgress.statuses.${value}`)}
    </span>
  )
}

export function ProjectProgressListPage() {
  const { t } = useTranslation()
  const { projectId, project } = useProject()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const transcriptionStatus = searchParams.get('transcriptionStatus') ?? ''
  const query = useQuery({
    queryKey: ['project-progress', projectId, q, page, transcriptionStatus, sortBy, sortDir],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProjectProgressEntry>>(
        `/projects/${projectId}/progress`,
        {
          params: {
            page,
            ...(q ? { q } : {}),
            ...(transcriptionStatus ? { transcriptionStatus } : {}),
            ...sortParams,
          },
        },
      )
      return data
    },
  })
  if (!project || !projectId) {
    return <LoadingState />
  }
  const rows = query.data?.items ?? []
  const base = projectProgressPath(projectId)
  const filtersActive = Boolean(transcriptionStatus)
  return (
    <div className={listShellClassName}>
      <PageHeader
        title={t('projectProgress.title')}
        subtitle={<EntityNameSubtitle name={project.systemName} icon={ClipboardList} />}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('projectProgress.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('projectProgress.search')}
        placeholder={t('projectProgress.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <FormField
            icon={Filter}
            label={t('projectProgress.transcriptionStatus')}
            htmlFor="progress-status-filter"
          >
            <SearchSelect
              id="progress-status-filter"
              value={transcriptionStatus}
              placeholder={t('projectProgress.allStatuses')}
              onChange={(next) =>
                setParams({ transcriptionStatus: next || undefined }, { resetPage: true })
              }
              options={[
                { value: '', label: t('projectProgress.allStatuses') },
                ...projectProgressTranscriptionStatusOrder.map((item) => ({
                  value: item,
                  label: t(`projectProgress.statuses.${item}`),
                })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('projectProgress.noResults') : t('projectProgress.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="occurredAt"
                label={t('projectProgress.occurredAt')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="body"
                label={t('projectProgress.body')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="progressPercent"
                label={t('projectProgress.progress')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="transcriptionStatus"
                label={t('projectProgress.transcriptionStatus')}
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
                  <DateText value={item.occurredAt} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{entryTitle(item, '—')}</span>
                    {item.audioId ? <Mic className="size-3.5 text-teal-600" aria-hidden /> : null}
                    {item.images.length ? (
                      <ImagePlus className="size-3.5 text-teal-600" aria-hidden />
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ProjectProgress value={item.progressPercent} />
                </td>
                <td className="px-4 py-3">
                  <TranscriptionBadge value={item.transcriptionStatus} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    editTo={`${base}/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('projectProgress.confirmDelete'),
                        successMessage: t('projectProgress.deleted'),
                        path: `/projects/${projectId}/progress/${item.id}`,
                        queryKey: ['project-progress'],
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

export function ProjectProgressCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId, project } = useProject()
  if (!project || !projectId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('projectProgress.create')}
        subtitle={<EntityNameSubtitle name={project.systemName} icon={ClipboardList} />}
      />
      <ProjectProgressForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>(
            `/projects/${projectId}/progress`,
            payload,
          )
          toast.success(t('projectProgress.created'))
          navigate(projectProgressEntryPath(projectId, data.id))
        }}
      />
    </div>
  )
}

export function ProjectProgressEditPage() {
  const { t } = useTranslation()
  const { entryId } = useParams()
  const navigate = useNavigate()
  const { projectId } = useProject()
  const query = useQuery({
    queryKey: ['project-progress-entry', projectId, entryId],
    enabled: Boolean(projectId && entryId),
    queryFn: async () => {
      const { data } = await api.get<ProjectProgressEntry>(
        `/projects/${projectId}/progress/${entryId}`,
      )
      return data
    },
  })
  if (!query.data || !projectId || !entryId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('projectProgress.edit')}
        subtitle={
          <EntityNameSubtitle
            name={entryTitle(query.data, query.data.occurredAt)}
            icon={ClipboardList}
          />
        }
      />
      <ProjectProgressForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/projects/${projectId}/progress/${entryId}`, payload)
          toast.success(t('projectProgress.updated'))
          navigate(projectProgressEntryPath(projectId, entryId))
        }}
      />
    </div>
  )
}

export function ProjectProgressDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { entryId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { projectId } = useProject()
  const query = useQuery({
    queryKey: ['project-progress-entry', projectId, entryId],
    enabled: Boolean(projectId && entryId),
    refetchInterval: (current) => {
      const status = current.state.data?.transcriptionStatus
      return status === projectProgressTranscriptionStatuses.PENDING ||
        status === projectProgressTranscriptionStatuses.PROCESSING
        ? 5000
        : false
    },
    queryFn: async () => {
      const { data } = await api.get<ProjectProgressEntry>(
        `/projects/${projectId}/progress/${entryId}`,
      )
      return data
    },
  })
  const entry = query.data
  if (!entry || !projectId || !entryId) {
    return <LoadingState />
  }
  const base = projectProgressPath(projectId)
  const title = entryTitle(entry, entry.occurredAt)
  const pending =
    entry.transcriptionStatus === projectProgressTranscriptionStatuses.PENDING ||
    entry.transcriptionStatus === projectProgressTranscriptionStatuses.PROCESSING ||
    entry.transcriptionStatus === projectProgressTranscriptionStatuses.FAILED

  async function retry() {
    try {
      await api.post(`/projects/${projectId}/progress/${entryId}/process`)
      await query.refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('projectProgress.details')}
        subtitle={<EntityNameSubtitle name={title} icon={ClipboardList} />}
      />
      <FormCard icon={ClipboardList} title={title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ClipboardList}>{t('projectProgress.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={CalendarRange}
              label={t('projectProgress.occurredAt')}
              value={<DateText value={entry.occurredAt} />}
              tone="teal"
            />
            <FormFactTile
              icon={Percent}
              label={t('projectProgress.progress')}
              value={<ProjectProgress value={entry.progressPercent} />}
              empty={entry.progressPercent == null}
              tone="mint"
            />
            <FormFactTile
              icon={Sparkles}
              label={t('projectProgress.transcriptionStatus')}
              value={<TranscriptionBadge value={entry.transcriptionStatus} />}
            />
            <FormFactTile
              icon={Mic}
              label={t('projectProgress.processingMode')}
              value={t(`projectProgress.modes.${entry.processingMode}`)}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('projectProgress.body')}
              value={entry.body || '—'}
              empty={!entry.body}
              className="sm:col-span-2"
            />
            <FormFactTile
              icon={ScrollText}
              label={t('projectProgress.transcript')}
              value={entry.transcript || '—'}
              empty={!entry.transcript}
              className="sm:col-span-2"
            />
            <FormFactTile
              icon={Sparkles}
              label={t('projectProgress.summary')}
              value={entry.summary || '—'}
              empty={!entry.summary}
              className="sm:col-span-2"
            />
          </div>
          <FormSectionTitle icon={Mic}>{t('projectProgress.attachments')}</FormSectionTitle>
          <div className="space-y-4">
            {entry.audioId ? (
              <div className="rounded-2xl bg-cream-50 p-3 ring-1 ring-teal-100">
                <p className="mb-2 text-xs text-ink-500">
                  {t('projectProgress.audio')}
                  {entry.audio?.durationMs != null
                    ? ` · ${formatDuration(entry.audio.durationMs, locale)}`
                    : ''}
                </p>
                <audio controls src={getFileUrl(entry.audioId)} className="w-full" />
              </div>
            ) : (
              <p className="text-sm text-ink-400">{t('projectProgress.audio')}: —</p>
            )}
            {entry.images.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {entry.images.map((item) => (
                  <a key={item.id} href={getImageUrl(item.imageId)} target="_blank" rel="noreferrer">
                    <img
                      src={getImageUrl(item.imageId)}
                      alt=""
                      className="h-32 w-full rounded-2xl object-cover ring-1 ring-teal-100"
                    />
                  </a>
                ))}
              </div>
            ) : null}
            {pending ? (
              <p className="text-sm text-teal-700">{t('projectProgress.processing')}</p>
            ) : null}
          </div>
          <DetailActions
            editTo={`${base}/${entryId}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('projectProgress.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('projectProgress.confirmDelete'),
                successMessage: t('projectProgress.deleted'),
                path: `/projects/${projectId}/progress/${entryId}`,
                queryKey: ['project-progress'],
                onDeleted: () => navigate(base),
              })
            }
            extraItems={
              entry.audioId &&
              entry.transcriptionStatus !== projectProgressTranscriptionStatuses.READY
                ? [
                    {
                      icon: RefreshCw,
                      label: t('projectProgress.retryProcess'),
                      onClick: () => void retry(),
                    },
                  ]
                : undefined
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
