import { CalendarRange, Filter, Flag, Gauge, ListChecks, Percent, Plus } from 'lucide-react'
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
import { api } from '../../../lib/api'
import {
  phaseProgressModes,
  projectStatusOrder,
  type Paginated,
  type Project,
  type ProjectPhase,
} from '../../../types/app'
import { useChecklistManage } from '../checklist/ChecklistManageModal'
import { ProjectDetailChecklist } from '../checklist/ProjectChecklistBoard'
import { ProjectLifecycleBadge, ProjectProgress } from '../ProjectShared'
import { ProjectPhaseForm } from './ProjectPhaseForm'

function projectPhasesPath(projectId: string) {
  return `/projects/${projectId}/phases`
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

export function ProjectPhaseListPage() {
  const { t } = useTranslation()
  const { projectId, project } = useProject()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const status = searchParams.get('status') ?? ''
  const query = useQuery({
    queryKey: ['project-phases', projectId, q, page, status, sortBy, sortDir],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProjectPhase>>(
        `/projects/${projectId}/phases`,
        {
          params: {
            page,
            ...(q ? { q } : {}),
            ...(status ? { status } : {}),
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
  const base = projectPhasesPath(projectId)
  const filtersActive = Boolean(status)
  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Flag}
        title={t('projectPhases.title')}
        subtitle={<EntityNameSubtitle name={project.systemName} icon={Flag} to={`/projects/${projectId}`} />}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('projectPhases.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('projectPhases.search')}
        placeholder={t('projectPhases.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <FormField icon={Filter} label={t('projectPhases.status')} htmlFor="phase-status-filter">
            <SearchSelect
              id="phase-status-filter"
              value={status}
              placeholder={t('projectPhases.allStatuses')}
              onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
              options={[
                { value: '', label: t('projectPhases.allStatuses') },
                ...projectStatusOrder.map((item) => ({
                  value: item,
                  label: t(`projects.statuses.${item}`),
                })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('projectPhases.noResults') : t('projectPhases.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="name"
                label={t('projectPhases.name')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="startDate"
                label={t('projectPhases.startDate')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="endDate"
                label={t('projectPhases.endDate')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="status"
                label={t('projectPhases.status')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="progressPercent"
                label={t('projectPhases.progress')}
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
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">
                  {item.startDate ? <DateText value={item.startDate} /> : '—'}
                </td>
                <td className="px-4 py-3">
                  {item.endDate ? <DateText value={item.endDate} /> : '—'}
                </td>
                <td className="px-4 py-3">
                  <ProjectLifecycleBadge value={item.status} />
                </td>
                <td className="px-4 py-3">
                  <ProjectProgress value={item.progressPercent} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    editTo={`${base}/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('projectPhases.confirmDelete'),
                        successMessage: t('projectPhases.deleted'),
                        path: `/projects/${projectId}/phases/${item.id}`,
                        queryKey: ['project-phases'],
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

export function ProjectPhaseCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId, project } = useProject()
  if (!project || !projectId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Flag}
        title={t('projectPhases.create')}
        subtitle={<EntityNameSubtitle name={project.systemName} icon={Flag} to={`/projects/${projectId}`} />}
      />
      <ProjectPhaseForm
        projectId={projectId}
        onSubmit={async (payload) => {
          await api.post(`/projects/${projectId}/phases`, payload)
          toast.success(t('projectPhases.created'))
          navigate(projectPhasesPath(projectId))
        }}
      />
    </div>
  )
}

export function ProjectPhaseEditPage() {
  const { t } = useTranslation()
  const { phaseId } = useParams()
  const navigate = useNavigate()
  const { projectId, project } = useProject()
  const query = useQuery({
    queryKey: ['project-phase', projectId, phaseId],
    enabled: Boolean(projectId && phaseId),
    queryFn: async () => {
      const { data } = await api.get<ProjectPhase>(
        `/projects/${projectId}/phases/${phaseId}`,
      )
      return data
    },
  })
  if (!query.data || !projectId || !phaseId || !project) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Flag}
        title={t('projectPhases.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Flag} />}
      />
      <ProjectPhaseForm
        initial={query.data}
        projectId={projectId}
        phaseId={phaseId}
        onSubmit={async (payload) => {
          await api.patch(`/projects/${projectId}/phases/${phaseId}`, payload)
          toast.success(t('projectPhases.updated'))
          navigate(projectPhasesPath(projectId))
        }}
      />
    </div>
  )
}

export function ProjectPhaseDetailPage() {
  const { t } = useTranslation()
  const { phaseId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { projectId } = useProject()
  const checklist = useChecklistManage(projectId, phaseId)
  const query = useQuery({
    queryKey: ['project-phase', projectId, phaseId],
    enabled: Boolean(projectId && phaseId),
    queryFn: async () => {
      const { data } = await api.get<ProjectPhase>(
        `/projects/${projectId}/phases/${phaseId}`,
      )
      return data
    },
  })
  const phase = query.data
  if (!phase || !projectId || !phaseId) {
    return <LoadingState />
  }
  const base = projectPhasesPath(projectId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Flag}
        title={t('projectPhases.details')}
        subtitle={<EntityNameSubtitle name={phase.name} icon={Flag} />}
      />
      <FormCard icon={Flag} title={phase.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Flag}>{t('projectPhases.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Flag} label={t('projectPhases.name')} value={phase.name} tone="teal" />
            <FormFactTile
              icon={CalendarRange}
              label={t('projectPhases.startDate')}
              value={phase.startDate ? <DateText value={phase.startDate} /> : '—'}
              empty={!phase.startDate}
              tone="mint"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('projectPhases.endDate')}
              value={phase.endDate ? <DateText value={phase.endDate} /> : '—'}
              empty={!phase.endDate}
            />
            <FormFactTile
              icon={Gauge}
              label={t('projectPhases.status')}
              value={<ProjectLifecycleBadge value={phase.status} />}
              empty={!phase.status}
              tone="teal"
            />
            <FormFactTile
              icon={ListChecks}
              label={t('projectPhases.progressMode')}
              value={t(`projectPhases.progressModes.${phase.progressMode ?? 'MANUAL'}`)}
              tone="mint"
            />
            <FormFactTile
              icon={Percent}
              label={t('projectPhases.progress')}
              value={<ProjectProgress value={phase.progressPercent} />}
              empty={phase.progressPercent == null}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`${base}/${phaseId}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('projectPhases.delete')}
            extraItems={
              phase.progressMode === phaseProgressModes.CHECKLIST
                ? [
                    {
                      icon: ListChecks,
                      label: t('projectChecklist.manage'),
                      onClick: checklist.openList,
                    },
                  ]
                : undefined
            }
            onDelete={() =>
              confirmDelete({
                message: t('projectPhases.confirmDelete'),
                successMessage: t('projectPhases.deleted'),
                path: `/projects/${projectId}/phases/${phaseId}`,
                queryKey: ['project-phases'],
                onDeleted: () => navigate(base),
              })
            }
          />
        </div>
      </FormCard>
      {phase.progressMode === phaseProgressModes.CHECKLIST ? (
        <ProjectDetailChecklist
          projectId={projectId}
          phaseId={phaseId}
          onEditItem={checklist.openEdit}
        />
      ) : null}
      {checklist.modal}
    </div>
  )
}
