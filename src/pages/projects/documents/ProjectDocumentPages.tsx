import { Download, FileText, Paperclip, Plus, ScrollText, Type } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useCrudListState } from '../../../hooks/useCrudListState'
import { api, getProjectDocumentUrl } from '../../../lib/api'
import { formatGroupedQuantity } from '../../../lib/datetime'
import type { Paginated, Project, ProjectDocument } from '../../../types/app'
import { ProjectDocumentForm, type ProjectDocumentPayload } from './ProjectDocumentForm'

function projectDocumentsPath(projectId: string) {
  return `/projects/${projectId}/documents`
}

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

function toFormData(payload: ProjectDocumentPayload) {
  const form = new FormData()
  form.append('title', payload.title)
  form.append('description', payload.description ?? '')
  if (payload.file) form.append('file', payload.file)
  return form
}

const KB = 1024
const MB = 1024 * 1024

function formatBytes(value: number, locale: string, kilobyte: string, megabyte: string) {
  const asMegabytes = value >= MB || roundSize(value / KB) >= KB
  const amount = asMegabytes ? value / MB : value / KB
  const unit = asMegabytes ? megabyte : kilobyte
  return `${formatSizeAmount(amount, locale)} ${unit}`
}

function roundSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  const rounded = Math.round(value * 10) / 10
  return rounded === 0 ? 0.1 : rounded
}

function formatSizeAmount(value: number, locale: string) {
  return formatGroupedQuantity(roundSize(value), locale, 1)
}

export function ProjectDocumentListPage({ embedded = false }: { embedded?: boolean }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { projectId, project } = useProject()
  const { q, page, term, setTerm, applySearch, setPage, sortBy, sortDir, sortParams, onSort } =
    useCrudListState(embedded)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['project-documents', projectId, q, page, sortBy, sortDir],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProjectDocument>>(
        `/projects/${projectId}/documents`,
        {
          params: {
            page,
            ...(q ? { q } : {}),
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
  const base = projectDocumentsPath(projectId)
  const createAction = (
    <Link to={`${base}/new`}>
      <Button>
        <Plus className="size-4" />
        {t('projectDocuments.create')}
      </Button>
    </Link>
  )
  const list = (
    <>
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('projectDocuments.search')}
        placeholder={t('projectDocuments.searchPlaceholder')}
        {...(embedded ? { autoFocus: false } : {})}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('projectDocuments.noResults') : t('projectDocuments.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('projectDocuments.titleField')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="originalName"
                label={t('projectDocuments.originalName')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="byteSize"
                label={t('projectDocuments.size')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="createdAt"
                label={t('projectDocuments.createdAt')}
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
                <td className="px-4 py-3 font-medium">{item.title}</td>
                <td className="px-4 py-3">{item.originalName}</td>
                <td className="px-4 py-3">
                  {formatBytes(
                    item.byteSize,
                    locale,
                    t('projectDocuments.kilobyte'),
                    t('projectDocuments.megabyte'),
                  )}
                </td>
                <td className="px-4 py-3">
                  <DateText value={item.createdAt} withTime />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    editTo={`${base}/${item.id}/edit`}
                    extra={
                      <a href={getProjectDocumentUrl(projectId, item.id)}>
                        <Button type="button" variant="soft">
                          <Download className="size-4" aria-hidden />
                          {t('projectDocuments.download')}
                        </Button>
                      </a>
                    }
                    onDelete={() =>
                      confirmDelete({
                        message: t('projectDocuments.confirmDelete'),
                        successMessage: t('projectDocuments.deleted'),
                        path: `/projects/${projectId}/documents/${item.id}`,
                        queryKey: ['project-documents'],
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
    </>
  )
  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{createAction}</div>
        {list}
      </div>
    )
  }
  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Paperclip}
        title={t('projectDocuments.title')}
        subtitle={<EntityNameSubtitle name={project.systemName} icon={Paperclip} to={`/projects/${projectId}`} />}
        action={createAction}
      />
      {list}
    </div>
  )
}

export function ProjectDocumentCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { projectId, project } = useProject()
  if (!project || !projectId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Paperclip}
        title={t('projectDocuments.create')}
        subtitle={t('projectDocuments.createSubtitle')}
      />
      <ProjectDocumentForm
        onSubmit={async (payload) => {
          await api.post(`/projects/${projectId}/documents`, toFormData(payload))
          await queryClient.invalidateQueries({ queryKey: ['project-documents'] })
          toast.success(t('projectDocuments.created'))
          navigate(projectDocumentsPath(projectId))
        }}
      />
    </div>
  )
}

export function ProjectDocumentEditPage() {
  const { t } = useTranslation()
  const { documentId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { projectId } = useProject()
  const query = useQuery({
    queryKey: ['project-document', projectId, documentId],
    enabled: Boolean(projectId && documentId),
    queryFn: async () => {
      const { data } = await api.get<ProjectDocument>(
        `/projects/${projectId}/documents/${documentId}`,
      )
      return data
    },
  })
  if (!query.data || !projectId || !documentId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Paperclip}
        title={t('projectDocuments.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={Paperclip} />}
      />
      <ProjectDocumentForm
        initial={query.data}
        fileHref={getProjectDocumentUrl(projectId, documentId)}
        onSubmit={async (payload) => {
          await api.patch(`/projects/${projectId}/documents/${documentId}`, toFormData(payload))
          await queryClient.invalidateQueries({ queryKey: ['project-documents'] })
          await queryClient.invalidateQueries({ queryKey: ['project-document', projectId, documentId] })
          toast.success(t('projectDocuments.updated'))
          navigate(projectDocumentsPath(projectId))
        }}
      />
    </div>
  )
}

export function ProjectDocumentDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { documentId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { projectId } = useProject()
  const query = useQuery({
    queryKey: ['project-document', projectId, documentId],
    enabled: Boolean(projectId && documentId),
    queryFn: async () => {
      const { data } = await api.get<ProjectDocument>(
        `/projects/${projectId}/documents/${documentId}`,
      )
      return data
    },
  })
  const item = query.data
  if (!item || !projectId || !documentId) {
    return <LoadingState />
  }
  const base = projectDocumentsPath(projectId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Paperclip}
        title={t('projectDocuments.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={Paperclip} />}
      />
      <FormCard icon={Paperclip} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Paperclip}>{t('projectDocuments.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Type}
              label={t('projectDocuments.titleField')}
              value={item.title}
              tone="teal"
            />
            <FormFactTile
              icon={FileText}
              label={t('projectDocuments.originalName')}
              value={item.originalName}
              tone="mint"
            />
            <FormFactTile
              icon={ScrollText}
              label={t('projectDocuments.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
            <FormFactTile
              icon={FileText}
              label={t('projectDocuments.size')}
              value={formatBytes(
                item.byteSize,
                locale,
                t('projectDocuments.kilobyte'),
                t('projectDocuments.megabyte'),
              )}
            />
          </div>
          <a href={getProjectDocumentUrl(projectId, item.id)}>
            <Button type="button" variant="soft">
              <Download className="size-4" aria-hidden />
              {t('projectDocuments.download')}
            </Button>
          </a>
          <DetailActions
            editTo={`${base}/${documentId}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('projectDocuments.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('projectDocuments.confirmDelete'),
                successMessage: t('projectDocuments.deleted'),
                path: `/projects/${projectId}/documents/${documentId}`,
                queryKey: ['project-documents'],
                onDeleted: () => navigate(base),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
