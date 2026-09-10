import { Filter, Plus } from 'lucide-react'
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
import { DateText } from '../../components/ui/DateText'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import {
  projectImportanceOrder,
  projectStatusOrder,
  type Paginated,
  type Project,
  type ProjectLookups,
} from '../../types/app'
import {
  ProjectImportanceBadge,
  ProjectLifecycleBadge,
  ProjectProgress,
  ProjectStatus,
  ProjectUrl,
  withCurrent,
} from './ProjectShared'

export function ProjectsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const vicePresidency = searchParams.get('vicePresidency') ?? ''
  const management = searchParams.get('management') ?? ''
  const unit = searchParams.get('unit') ?? ''
  const companyName = searchParams.get('companyName') ?? ''
  const isActive = searchParams.get('isActive') ?? ''
  const status = searchParams.get('status') ?? ''
  const isSupportActive = searchParams.get('isSupportActive') ?? ''
  const importance = searchParams.get('importance') ?? ''

  const lookups = useQuery({
    queryKey: ['projects', 'lookups', vicePresidency, management],
    queryFn: async () => {
      const { data } = await api.get<ProjectLookups>('/projects/lookups', {
        params: {
          ...(vicePresidency ? { vicePresidency } : {}),
          ...(management ? { management } : {}),
        },
      })
      return data
    },
  })

  const query = useQuery({
    queryKey: [
      'projects',
      'list',
      q,
      page,
      vicePresidency,
      management,
      unit,
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
          ...(vicePresidency ? { vicePresidency } : {}),
          ...(management ? { management } : {}),
          ...(unit ? { unit } : {}),
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
    vicePresidency ||
      management ||
      unit ||
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
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
        action={
          <Link to="/projects/new">
            <Button>
              <Plus className="size-4" />
              {t('projects.create')}
            </Button>
          </Link>
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
            <FormField icon={Filter} label={t('projects.vicePresidency')} htmlFor="project-vice">
              <SearchSelect
                id="project-vice"
                value={vicePresidency}
                placeholder={t('projects.allVicePresidencies')}
                onChange={(next) =>
                  setParams(
                    {
                      vicePresidency: next || undefined,
                      management: undefined,
                      unit: undefined,
                    },
                    { resetPage: true },
                  )
                }
                options={[
                  { value: '', label: t('projects.allVicePresidencies') },
                  ...withCurrent(lookups.data?.vicePresidencies, vicePresidency).map((item) => ({
                    value: item,
                    label: item,
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.management')} htmlFor="project-management">
              <SearchSelect
                id="project-management"
                value={management}
                placeholder={t('projects.allManagements')}
                onChange={(next) =>
                  setParams(
                    { management: next || undefined, unit: undefined },
                    { resetPage: true },
                  )
                }
                options={[
                  { value: '', label: t('projects.allManagements') },
                  ...withCurrent(lookups.data?.managements, management).map((item) => ({
                    value: item,
                    label: item,
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.unit')} htmlFor="project-unit">
              <SearchSelect
                id="project-unit"
                value={unit}
                placeholder={t('projects.allUnits')}
                onChange={(next) => setParams({ unit: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('projects.allUnits') },
                  ...withCurrent(lookups.data?.units, unit).map((item) => ({
                    value: item,
                    label: item,
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
                column="code"
                label={t('projects.code')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="vicePresidency"
                label={t('projects.vicePresidency')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="management"
                label={t('projects.management')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="unit"
                label={t('projects.unit')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="isActive"
                label={t('projects.isActive')}
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
              <SortableTh
                column="progressPercent"
                label={t('projects.progress')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="startDate"
                label={t('projects.startDate')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="endDate"
                label={t('projects.endDate')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="companyName"
                label={t('projects.companyName')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="systemUrl"
                label={t('projects.systemUrl')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="launchYear"
                label={t('projects.launchYear')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="isSupportActive"
                label={t('projects.isSupportActive')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="importance"
                label={t('projects.importance')}
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
                <td className="px-4 py-3 font-medium">{item.systemName}</td>
                <td className="px-4 py-3">{item.code}</td>
                <td className="px-4 py-3">{item.vicePresidency}</td>
                <td className="px-4 py-3">{item.management}</td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="px-4 py-3">
                  <ProjectStatus active={item.isActive} />
                </td>
                <td className="px-4 py-3">
                  <ProjectLifecycleBadge value={item.status} />
                </td>
                <td className="px-4 py-3">
                  <ProjectProgress value={item.progressPercent} />
                </td>
                <td className="px-4 py-3">
                  {item.startDate ? <DateText value={item.startDate} /> : '—'}
                </td>
                <td className="px-4 py-3">
                  {item.endDate ? <DateText value={item.endDate} /> : '—'}
                </td>
                <td className="px-4 py-3">{item.companyName || '—'}</td>
                <td className="px-4 py-3">
                  <ProjectUrl value={item.systemUrl} />
                </td>
                <td className="px-4 py-3">
                  {item.launchYear != null ? formatNumber(item.launchYear, locale) : '—'}
                </td>
                <td className="px-4 py-3">
                  <ProjectStatus active={item.isSupportActive} />
                </td>
                <td className="px-4 py-3">
                  <ProjectImportanceBadge value={item.importance} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/projects/${item.id}`}
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
