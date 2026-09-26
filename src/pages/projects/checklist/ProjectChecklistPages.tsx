import { Filter, Flag, ListChecks, Percent, Plus } from 'lucide-react'
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
  FormField,
  LoadingState,
  PageHeader,
  ToggleField,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import {
  projectProgressModes,
  type Paginated,
  type Project,
  type ProjectChecklistItem,
  type ProjectChecklistSummary,
  type ProjectPhase,
} from '../../../types/app'
import { ProjectChecklistBoard, useChecklistActions } from './ProjectChecklistBoard'
import { ProjectChecklistForm } from './ProjectChecklistForm'
import { projectChecklistPath, projectPhaseChecklistPath } from './checklist-paths'

function useChecklistScope() {
  const { id: projectId, phaseId, itemId } = useParams()
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${projectId}`)
      return data
    },
  })
  const phaseQuery = useQuery({
    queryKey: ['project-phase', projectId, phaseId],
    enabled: Boolean(projectId && phaseId),
    queryFn: async () => {
      const { data } = await api.get<ProjectPhase>(
        `/projects/${projectId}/phases/${phaseId}`,
      )
      return data
    },
  })
  const apiBase =
    projectId && phaseId
      ? `/projects/${projectId}/phases/${phaseId}/checklist`
      : projectId
        ? `/projects/${projectId}/checklist`
        : ''
  const listPath =
    projectId && phaseId
      ? projectPhaseChecklistPath(projectId, phaseId)
      : projectId
        ? projectChecklistPath(projectId)
        : ''
  return {
    projectId,
    phaseId,
    itemId,
    project: projectQuery.data,
    phase: phaseQuery.data,
    apiBase,
    listPath,
  }
}

function scopeReady(
  scope: ReturnType<typeof useChecklistScope>,
): scope is ReturnType<typeof useChecklistScope> & { projectId: string; project: Project } {
  if (!scope.projectId || !scope.project) return false
  if (scope.phaseId && !scope.phase) return false
  return true
}

export function ProjectChecklistListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const scope = useChecklistScope()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const done = searchParams.get('isDone') ?? ''
  const { pendingId, toggleItem, deleteItem } = useChecklistActions(
    scope.projectId ?? '',
    scope.apiBase,
  )
  const boardQuery = useQuery({
    queryKey: ['project-checklist', scope.projectId, 'project', 'board', q, done],
    enabled: Boolean(scope.projectId) && !scope.phaseId,
    queryFn: async () => {
      const { data } = await api.get<ProjectChecklistItem[]>(scope.apiBase, {
        params: {
          ...(q ? { q } : {}),
          ...(done ? { isDone: done } : {}),
        },
      })
      return data
    },
  })
  const query = useQuery({
    queryKey: [
      'project-checklist',
      scope.projectId,
      scope.phaseId ?? 'project',
      q,
      page,
      done,
      sortBy,
      sortDir,
    ],
    enabled: Boolean(scope.phaseId) && Boolean(scope.phase),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProjectChecklistItem>>(scope.apiBase, {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(done ? { isDone: done } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const summaryQuery = useQuery({
    queryKey: ['project-checklist', scope.projectId, scope.phaseId ?? 'project', 'summary'],
    enabled: Boolean(scope.apiBase),
    queryFn: async () => {
      const { data } = await api.get<ProjectChecklistSummary>(`${scope.apiBase}/summary`)
      return data
    },
  })
  if (!scopeReady(scope)) {
    return <LoadingState />
  }
  const rows = query.data?.items ?? []
  const filtersActive = Boolean(done)
  const summary = summaryQuery.data
  const weightHint = scope.phaseId
    ? t('projectChecklist.phaseWeightHint')
    : t('projectChecklist.weightHint')
  const activeMode = scope.phaseId
    ? projectProgressModes.PHASE_CHECKLIST
    : projectProgressModes.PROJECT_CHECKLIST

  const boardItems = boardQuery.data ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={ListChecks}
        title={scope.phase ? t('projectChecklist.phaseTitle') : t('projectChecklist.title')}
        subtitle={
          <EntityNameSubtitle
            name={scope.phase?.name ?? scope.project.systemName}
            icon={scope.phase ? Flag : ListChecks}
          />
        }
        action={
          <Link to={`${scope.listPath}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('projectChecklist.create')}
            </Button>
          </Link>
        }
      />
      <p className="mb-4 rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm leading-6 text-ink-700">
        {summary?.drivesProgress
          ? t('projectChecklist.drivesHint')
          : t('projectChecklist.idleHint', {
              mode: t(`projects.progressModes.${activeMode}`),
            })}
      </p>
      {scope.phaseId && summary ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
          <FormFactTile
            icon={Percent}
            label={t('projectChecklist.allocated')}
            value={`${formatNumber(summary.allocatedWeight, locale)}٪`}
            tone="teal"
          />
          <FormFactTile
            icon={ListChecks}
            label={t('projectChecklist.doneWeight')}
            value={`${formatNumber(summary.doneWeight, locale)}٪`}
            tone="mint"
          />
          <FormFactTile
            icon={Percent}
            label={t('projectChecklist.remaining')}
            value={`${formatNumber(summary.remainingWeight, locale)}٪`}
          />
        </div>
      ) : null}
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('projectChecklist.search')}
        placeholder={t('projectChecklist.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <FormField icon={Filter} label={t('projectChecklist.status')} htmlFor="checklist-done-filter">
            <SearchSelect
              id="checklist-done-filter"
              value={done}
              placeholder={t('projectChecklist.allStates')}
              onChange={(next) => setParams({ isDone: next || undefined }, { resetPage: true })}
              options={[
                { value: '', label: t('projectChecklist.allStates') },
                { value: 'true', label: t('projectChecklist.done') },
                { value: 'false', label: t('projectChecklist.open') },
              ]}
            />
          </FormField>
        }
      />
      <p className="mb-3 text-xs leading-6 text-ink-500">{weightHint}</p>
      {!scope.phaseId ? (
        boardQuery.isLoading ? (
          <LoadingState />
        ) : (
          <ProjectChecklistBoard
            items={boardItems}
            progress={summary?.doneWeight ?? 0}
            allocated={summary?.allocatedWeight}
            remaining={summary?.remainingWeight}
            pendingId={pendingId}
            listPath={scope.listPath}
            onToggle={(item, isDone) => void toggleItem(item, isDone)}
            onDelete={deleteItem}
            empty={q || filtersActive ? t('projectChecklist.noResults') : t('projectChecklist.empty')}
          />
        )
      ) : (
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('projectChecklist.noResults') : t('projectChecklist.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('projectChecklist.name')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="weightPercent"
                label={t('projectChecklist.weight')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="isDone"
                label={t('projectChecklist.status')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-start">{item.title}</td>
                <td className="px-4 py-3 text-start tabular-nums">
                  {formatNumber(item.weightPercent, locale)}٪
                </td>
                <td className="px-4 py-3 text-start">
                  <ToggleField
                    checked={item.isDone}
                    disabled={pendingId === item.id}
                    onChange={(next) => void toggleItem(item, next)}
                    onLabel={t('projectChecklist.done')}
                    offLabel={t('projectChecklist.open')}
                  />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${scope.listPath}/${item.id}`}
                    editTo={`${scope.listPath}/${item.id}/edit`}
                    onDelete={() => deleteItem(item)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      )}
      {scope.phaseId && query.data ? (
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

export function ProjectChecklistCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scope = useChecklistScope()
  if (!scopeReady(scope)) {
    return <LoadingState />
  }
  const weightHint = scope.phaseId
    ? t('projectChecklist.phaseWeightHint')
    : t('projectChecklist.weightHint')
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ListChecks}
        title={t('projectChecklist.create')}
        subtitle={
          <EntityNameSubtitle
            name={scope.phase?.name ?? scope.project.systemName}
            icon={scope.phase ? Flag : ListChecks}
          />
        }
      />
      <ProjectChecklistForm
        weightHint={weightHint}
        onSubmit={async (payload) => {
          await api.post(scope.apiBase, payload)
          toast.success(t('projectChecklist.created'))
          navigate(scope.listPath)
        }}
      />
    </div>
  )
}

export function ProjectChecklistEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scope = useChecklistScope()
  const query = useQuery({
    queryKey: ['project-checklist-item', scope.projectId, scope.phaseId, scope.itemId],
    enabled: Boolean(scope.apiBase && scope.itemId),
    queryFn: async () => {
      const { data } = await api.get<ProjectChecklistItem>(
        `${scope.apiBase}/${scope.itemId}`,
      )
      return data
    },
  })
  if (!scopeReady(scope) || !query.data || !scope.itemId) {
    return <LoadingState />
  }
  const item = query.data
  const weightHint = scope.phaseId
    ? t('projectChecklist.phaseWeightHint')
    : t('projectChecklist.weightHint')
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ListChecks}
        title={t('projectChecklist.edit')}
        subtitle={<EntityNameSubtitle name={item.title} icon={ListChecks} />}
      />
      <ProjectChecklistForm
        initial={item}
        weightHint={weightHint}
        onSubmit={async (payload) => {
          await api.patch(`${scope.apiBase}/${scope.itemId}`, payload)
          toast.success(t('projectChecklist.updated'))
          navigate(scope.listPath)
        }}
      />
    </div>
  )
}

export function ProjectChecklistDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const scope = useChecklistScope()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['project-checklist-item', scope.projectId, scope.phaseId, scope.itemId],
    enabled: Boolean(scope.apiBase && scope.itemId),
    queryFn: async () => {
      const { data } = await api.get<ProjectChecklistItem>(
        `${scope.apiBase}/${scope.itemId}`,
      )
      return data
    },
  })
  if (!scopeReady(scope) || !query.data || !scope.itemId) {
    return <LoadingState />
  }
  const item = query.data
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ListChecks}
        title={t('projectChecklist.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={ListChecks} />}
      />
      <FormCard icon={ListChecks} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ListChecks}>{t('projectChecklist.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={ListChecks}
              label={t('projectChecklist.name')}
              value={item.title}
              tone="teal"
              className="sm:col-span-2"
            />
            <FormFactTile
              icon={Percent}
              label={t('projectChecklist.weight')}
              value={`${formatNumber(item.weightPercent, locale)}٪`}
              tone="mint"
            />
            <FormFactTile
              icon={ListChecks}
              label={t('projectChecklist.status')}
              value={item.isDone ? t('projectChecklist.done') : t('projectChecklist.open')}
            />
          </div>
          <DetailActions
            editTo={`${scope.listPath}/${item.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('projectChecklist.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('projectChecklist.confirmDelete'),
                successMessage: t('projectChecklist.deleted'),
                path: `${scope.apiBase}/${item.id}`,
                queryKey: ['project-checklist'],
                onDeleted: () => navigate(scope.listPath),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
