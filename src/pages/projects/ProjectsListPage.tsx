import { ClipboardList, Filter, FolderKanban, Landmark, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ActionsTh,
  PaginationBar,
  SearchBar,
  TableCard,
  EntityRowActions,
  SortableTh,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { Button, FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import {
  projectImportanceOrder,
  projectStatusOrder,
  type OrganizationUnit,
  type Paginated,
  type Project,
  type ProjectLookups,
} from '../../types/app'
import {
  ProjectLifecycleBadge,
  ProjectNameWithColor,
  ProjectOperatorsCell,
  ProjectProgress,
  operatorsColClassName,
  withCurrent,
} from './ProjectShared'
import {
  projectProgressCreateGlobalPath,
  projectProgressCreatePath,
} from './progress/progress-paths'

export function ProjectsListPage() {
  const { t } = useTranslation()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const operatorUnitId = searchParams.get('operatorUnitId') ?? ''
  const companyName = searchParams.get('companyName') ?? ''
  const isActive = searchParams.get('isActive') ?? ''
  const status = searchParams.get('status') ?? ''
  const isSupportActive = searchParams.get('isSupportActive') ?? ''
  const importance = searchParams.get('importance') ?? ''

  const orgUnits = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })

  const lookups = useQuery({
    queryKey: ['projects', 'lookups'],
    queryFn: async () => {
      const { data } = await api.get<ProjectLookups>('/projects/lookups')
      return data
    },
  })

  const query = useQuery({
    queryKey: [
      'projects',
      'list',
      q,
      page,
      operatorUnitId,
      companyName,
      isActive,
      status,
      isSupportActive,
      importance,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Project>>('/projects', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(operatorUnitId ? { operatorUnitId } : {}),
          ...(companyName ? { companyName } : {}),
          ...(isActive ? { isActive } : {}),
          ...(status ? { status } : {}),
          ...(isSupportActive ? { isSupportActive } : {}),
          ...(importance ? { importance } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtersActive = Boolean(
    operatorUnitId ||
      companyName ||
      isActive ||
      status ||
      isSupportActive ||
      importance,
  )
  const emptyMessage = q || filtersActive ? t('projects.noResults') : t('projects.empty')
  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'true', label: t('geo.active') },
    { value: 'false', label: t('geo.inactive') },
  ]

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link to={projectProgressCreateGlobalPath}>
              <Button type="button" variant="soft">
                <ClipboardList className="size-4" aria-hidden />
                {t('projectProgress.create')}
              </Button>
            </Link>
            <Link to="/projects/new">
              <Button>
                <Plus className="size-4" />
                {t('projects.create')}
              </Button>
            </Link>
          </div>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('projects.search')}
        placeholder={t('projects.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-2 xl:grid-cols-3"
        extra={
          <>
            <FormField icon={Landmark} label={t('projects.operators')} htmlFor="project-operator">
              <SearchSelect
                id="project-operator"
                value={operatorUnitId}
                placeholder={t('projects.allOperators')}
                onChange={(next) =>
                  setParams({ operatorUnitId: next || undefined }, { resetPage: true })
                }
                options={[
                  { value: '', label: t('projects.allOperators') },
                  ...(orgUnits.data ?? []).map((item) => ({
                    value: item.id,
                    label: item.pathLabel || item.name,
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.companyName')} htmlFor="project-company">
              <SearchSelect
                id="project-company"
                value={companyName}
                placeholder={t('projects.allCompanies')}
                onChange={(next) =>
                  setParams({ companyName: next || undefined }, { resetPage: true })
                }
                options={[
                  { value: '', label: t('projects.allCompanies') },
                  ...withCurrent(lookups.data?.companies, companyName).map((item) => ({
                    value: item,
                    label: item,
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.isActive')} htmlFor="project-active">
              <SearchSelect
                id="project-active"
                value={isActive}
                placeholder={t('common.all')}
                onChange={(next) => setParams({ isActive: next || undefined }, { resetPage: true })}
                options={statusOptions}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.status')} htmlFor="project-status">
              <SearchSelect
                id="project-status"
                value={status}
                placeholder={t('projects.allStatuses')}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('projects.allStatuses') },
                  ...projectStatusOrder.map((item) => ({
                    value: item,
                    label: t(`projects.statuses.${item}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.isSupportActive')} htmlFor="project-support">
              <SearchSelect
                id="project-support"
                value={isSupportActive}
                placeholder={t('common.all')}
                onChange={(next) =>
                  setParams({ isSupportActive: next || undefined }, { resetPage: true })
                }
                options={statusOptions}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.importance')} htmlFor="project-importance">
              <SearchSelect
                id="project-importance"
                value={importance}
                placeholder={t('projects.allImportances')}
                onChange={(next) =>
                  setParams({ importance: next || undefined }, { resetPage: true })
                }
                options={[
                  { value: '', label: t('projects.allImportances') },
                  ...projectImportanceOrder.map((item) => ({
                    value: item,
                    label: t(`projects.importances.${item}`),
                  })),
                ]}
              />
            </FormField>
          </>
        }
      />
      <TableCard loading={query.isLoading} empty={emptyMessage} hasRows={rows.length > 0}>
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="systemName"
                label={t('projects.systemName')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="operators"
                label={t('projects.operators')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className={operatorsColClassName}
              />
              <SortableTh
                column="companyName"
                label={t('projects.companyName')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="progressPercent"
                label={t('projects.progress')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="status"
                label={t('projects.status')}
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
                <td className="px-4 py-3 font-medium">
                  <ProjectNameWithColor name={item.systemName} color={item.color} />
                </td>
                <td className={`px-4 py-3 align-top ${operatorsColClassName}`}>
                  <ProjectOperatorsCell operators={item.operators} />
                </td>
                <td className="px-4 py-3">{item.companyName || '—'}</td>
                <td className="px-4 py-3">
                  <ProjectProgress value={item.progressPercent} />
                </td>
                <td className="px-4 py-3">
                  <ProjectLifecycleBadge value={item.status} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={projectProgressCreatePath(item.id)}
                    viewLabel={t('projectProgress.create')}
                    viewIcon={ClipboardList}
                    editTo={`/projects/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('projects.confirmDelete'),
                        successMessage: t('projects.deleted'),
                        path: `/projects/${item.id}`,
                        queryKey: ['projects'],
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
