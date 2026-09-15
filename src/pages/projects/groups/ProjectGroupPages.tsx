import { FolderKanban, Layers, Palette, Plus, ScrollText, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
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
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import { projectColor } from '../../../lib/project-color'
import type { Paginated, ProjectGroup } from '../../../types/app'
import { ProjectColorDot } from '../ProjectShared'
import { ProjectGroupForm } from './ProjectGroupForm'
import { projectGroupPath, projectGroupsPath } from './group-paths'

export function ProjectGroupListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['project-groups', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProjectGroup>>('/projects/groups', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = projectGroupsPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Layers}
        title={t('projectGroups.title')}
        subtitle={t('projectGroups.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('projectGroups.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('projectGroups.search')}
        placeholder={t('projectGroups.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('projectGroups.noResults') : t('projectGroups.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="name"
                label={t('projectGroups.name')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="description"
                label={t('projectGroups.description')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="projectCount"
                label={t('projectGroups.projectCount')}
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
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <ProjectColorDot color={item.color} />
                    <span>{item.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-600">{item.description || '—'}</td>
                <td className="px-4 py-3">{formatNumber(item._count?.projects ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={projectGroupPath(item.id)}
                    editTo={`${projectGroupPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('projectGroups.confirmDelete'),
                        successMessage: t('projectGroups.deleted'),
                        path: `/projects/groups/${item.id}`,
                        queryKey: ['project-groups'],
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

export function ProjectGroupCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader icon={Layers} title={t('projectGroups.create')} subtitle={t('projectGroups.createSubtitle')} />
      <ProjectGroupForm
        onSubmit={async (payload) => {
          await api.post('/projects/groups', payload)
          toast.success(t('projectGroups.created'))
          navigate(projectGroupsPath())
        }}
      />
    </div>
  )
}

export function ProjectGroupEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['project-group', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ProjectGroup>(`/projects/groups/${id}`)
      return data
    },
  })
  if (!query.data || !id) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Layers}
        title={t('projectGroups.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Layers} />}
      />
      <ProjectGroupForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/projects/groups/${id}`, payload)
          toast.success(t('projectGroups.updated'))
          navigate(projectGroupsPath())
        }}
      />
    </div>
  )
}

export function ProjectGroupDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['project-group', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ProjectGroup>(`/projects/groups/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Layers}
        title={t('projectGroups.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={Layers} />}
      />
      <FormCard icon={Layers} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Layers}>{t('projectGroups.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('projectGroups.name')} value={item.name} tone="teal" />
            <FormFactTile
              icon={Palette}
              label={t('projectGroups.color')}
              value={
                <span className="inline-flex items-center gap-2">
                  <ProjectColorDot color={item.color} className="size-4" />
                  <span dir="ltr">{projectColor(item.color)}</span>
                </span>
              }
              tone="mint"
            />
            <FormFactTile
              icon={FolderKanban}
              label={t('projectGroups.projectCount')}
              value={formatNumber(item._count?.projects ?? 0, locale)}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('projectGroups.description')}
              value={item.description || '—'}
              empty={!item.description}
            />
          </div>
          <DetailActions
            editTo={`${projectGroupPath(id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('projectGroups.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('projectGroups.confirmDelete'),
                successMessage: t('projectGroups.deleted'),
                path: `/projects/groups/${id}`,
                queryKey: ['project-groups'],
                onDeleted: () => navigate(projectGroupsPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
