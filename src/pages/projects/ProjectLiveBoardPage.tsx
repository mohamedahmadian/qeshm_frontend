import {
  Activity,
  CalendarRange,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  ClipboardList,
  Eye,
  Filter,
  FolderKanban,
  Handshake,
  Landmark,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  MapPinned,
  PauseCircle,
  Percent,
  Radio,
  Table2,
} from 'lucide-react'
import { type CSSProperties, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DateText } from '../../components/ui/DateText'
import { FormField, PageHeader, cardClassName, listShellClassName } from '../../components/ui/Form'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { LoadingState } from '../../components/ui/LoadingState'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatGroupedQuantity, formatNumber } from '../../lib/datetime'
import { projectColor, projectColorAlpha } from '../../lib/project-color'
import { LastActivityPreview, ProjectLiveBoardMap, liveBoardCardTheme } from './ProjectLiveBoardMap'
import {
  projectImportanceOrder,
  projectStatusOrder,
  type OrganizationUnit,
  type ProjectLiveBoard,
  type ProjectLiveBoardItem,
  type ProjectLookups,
} from '../../types/app'
import {
  ProjectImportanceBadge,
  ProjectLifecycleBadge,
  ProjectNameWithColor,
  ProjectOperatorsCell,
  ProjectProgress,
  ProjectStatus as ProjectActiveBadge,
  operatorsColClassName,
  projectOperatorsText,
  withCurrent,
} from './ProjectShared'

const PAGE_SIZE = 10

const views = ['map', 'table', 'cards'] as const
type LiveBoardView = (typeof views)[number]

const viewIcons: Record<LiveBoardView, typeof MapIcon> = {
  map: MapIcon,
  table: Table2,
  cards: LayoutGrid,
}

const statusStatMeta: Record<
  string,
  { icon: typeof FolderKanban; tone: 'teal' | 'mint' | 'ink' }
> = {
  NOT_STARTED: { icon: CircleDashed, tone: 'ink' },
  IN_PROGRESS: { icon: Activity, tone: 'teal' },
  SUSPENDED: { icon: PauseCircle, tone: 'ink' },
  COMPLETED: { icon: CircleCheck, tone: 'mint' },
  unset: { icon: CircleHelp, tone: 'ink' },
}

export function ProjectLiveBoardPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()

  const rawView = searchParams.get('view')
  const view: LiveBoardView =
    rawView === 'table' || rawView === 'cards' ? rawView : 'map'
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
      'live-board',
      q,
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
      const { data } = await api.get<ProjectLiveBoard>('/projects/live-board', {
        params: {
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

  const items = query.data?.items ?? []
  const stats = query.data?.stats
  const located = useMemo(
    () =>
      items.filter(
        (item) =>
          item.showOnLiveBoard !== false && item.latitude != null && item.longitude != null,
      ),
    [items],
  )
  const tableRows = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const filtersActive = Boolean(
    operatorUnitId ||
      companyName ||
      isActive ||
      status ||
      isSupportActive ||
      importance,
  )
  const emptyMessage = q || filtersActive ? t('projectLiveBoard.noResults') : t('projectLiveBoard.empty')
  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'true', label: t('geo.active') },
    { value: 'false', label: t('geo.inactive') },
  ]

  return (
    <div className={listShellClassName}>
      <PageHeader icon={Radio} title={t('projectLiveBoard.title')} subtitle={t('projectLiveBoard.subtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('projectLiveBoard.search')}
        placeholder={t('projectLiveBoard.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-2 xl:grid-cols-3"
        extra={
          <>
            <FormField icon={Landmark} label={t('projects.operators')} htmlFor="live-operator">
              <SearchSelect
                id="live-operator"
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
            <FormField icon={Filter} label={t('projects.companyName')} htmlFor="live-company">
              <SearchSelect
                id="live-company"
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
            <FormField icon={Filter} label={t('projects.isActive')} htmlFor="live-active">
              <SearchSelect
                id="live-active"
                value={isActive}
                placeholder={t('common.all')}
                onChange={(next) => setParams({ isActive: next || undefined }, { resetPage: true })}
                options={statusOptions}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.status')} htmlFor="live-status">
              <SearchSelect
                id="live-status"
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
            <FormField icon={Filter} label={t('projects.isSupportActive')} htmlFor="live-support">
              <SearchSelect
                id="live-support"
                value={isSupportActive}
                placeholder={t('common.all')}
                onChange={(next) =>
                  setParams({ isSupportActive: next || undefined }, { resetPage: true })
                }
                options={statusOptions}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.importance')} htmlFor="live-importance">
              <SearchSelect
                id="live-importance"
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

      <nav className="mb-4 flex flex-wrap gap-2">
        {views.map((item) => {
          const Icon = viewIcons[item]
          const active = view === item
          return (
            <button
              key={item}
              type="button"
              onClick={() => setParams({ view: item === 'map' ? undefined : item })}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                  : 'bg-white text-ink-700 ring-1 ring-teal-400 shadow-[0_6px_14px_rgba(46,189,182,0.12)] hover:bg-cream-50'
              }`}
            >
              <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
              {t(`projectLiveBoard.tabs.${item}`)}
            </button>
          )
        })}
      </nav>

      {query.isLoading ? (
        <LoadingState />
      ) : view === 'map' ? (
        <div className="space-y-4">
          <FormCard
            icon={Radio}
            title={t('projectLiveBoard.tabs.map')}
            subtitle={
              located.length
                ? t('projectLiveBoard.selectHint')
                : t('projectLiveBoard.noLocation')
            }
          >
            <ProjectLiveBoardMap items={items} locale={locale} />
          </FormCard>
          {stats ? <LiveBoardStats stats={stats} locale={locale} /> : null}
        </div>
      ) : view === 'cards' ? (
        <>
          {tableRows.length === 0 ? (
            <FormEmptyHint>{emptyMessage}</FormEmptyHint>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tableRows.map((item) => (
                <ProjectBoardCard key={item.id} project={item} locale={locale} />
              ))}
            </div>
          )}
          {query.data ? (
            <PaginationBar
              page={page}
              pageSize={PAGE_SIZE}
              total={items.length}
              onPageChange={setPage}
            />
          ) : null}
        </>
      ) : (
        <>
          <TableCard loading={query.isLoading} empty={emptyMessage} hasRows={tableRows.length > 0}>
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
                    column="importance"
                    label={t('projects.importance')}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                  />
                  <th className="px-4 py-3 text-start font-medium">
                    {t('projectLiveBoard.mainContractor')}
                  </th>
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
                    column="isActive"
                    label={t('projects.isActive')}
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
                    column="activityCount"
                    label={t('projectLiveBoard.activityCount')}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                  />
                  <th className="px-4 py-3 text-start font-medium">
                    {t('projectLiveBoard.lastActivity')}
                  </th>
                  <ActionsTh />
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">
                      <ProjectNameWithColor name={item.systemName} color={item.color} />
                    </td>
                    <td className="px-4 py-3">{item.code}</td>
                    <td className="px-4 py-3">
                      <ProjectLifecycleBadge value={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ProjectProgress value={item.progressPercent} />
                    </td>
                    <td className="px-4 py-3">
                      <ProjectImportanceBadge value={item.importance} />
                    </td>
                    <td className="px-4 py-3">{item.mainContractor?.name || '—'}</td>
                    <td className={`px-4 py-3 align-top ${operatorsColClassName}`}>
                      <ProjectOperatorsCell operators={item.operators} />
                    </td>
                    <td className="px-4 py-3">{item.companyName || '—'}</td>
                    <td className="px-4 py-3">
                      <ProjectActiveBadge active={item.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      {item.startDate ? <DateText value={item.startDate} /> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.endDate ? <DateText value={item.endDate} /> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(item.activityCount, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <LastActivityPreview
                        projectId={item.id}
                        activity={item.lastActivity}
                        empty={t('projectLiveBoard.noActivity')}
                      />
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
              page={page}
              pageSize={PAGE_SIZE}
              total={items.length}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

function ProgressRing({
  value,
  locale,
  color,
  sizeClass = 'size-[4.5rem]',
}: {
  value: number | null
  locale: string
  color: string
  sizeClass?: string
}) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <div
      className={`relative shrink-0 rounded-full p-[3px] ${sizeClass}`}
      style={{
        background: `conic-gradient(${color} ${pct * 3.6}deg, #e8f4f2 0deg)`,
      }}
    >
      <div className="flex size-full flex-col items-center justify-center rounded-full bg-white text-center">
        <span className="text-[13px] font-bold leading-none text-ink-900">
          {value == null ? '—' : `${formatNumber(value, locale)}٪`}
        </span>
      </div>
    </div>
  )
}

function ProjectBoardCard({
  project,
  locale,
}: {
  project: ProjectLiveBoardItem
  locale: string
}) {
  const { t } = useTranslation()
  const theme = liveBoardCardTheme[project.status ?? 'unset'] ?? liveBoardCardTheme.unset
  const accent = projectColor(project.color)
  return (
    <Link
      to={`/projects/${project.id}`}
      className={`${cardClassName} group relative flex h-full flex-col overflow-hidden border-teal-100/80 shadow-[0_12px_28px_var(--project-shadow)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_var(--project-shadow-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400`}
      style={
        {
          '--project-color': accent,
          '--project-shadow': projectColorAlpha(project.color, 0.16),
          '--project-shadow-hover': projectColorAlpha(project.color, 0.28),
          borderInlineStartWidth: 4,
          borderInlineStartStyle: 'solid',
          borderInlineStartColor: accent,
        } as CSSProperties
      }
    >
      <span
        className="absolute end-3 top-2 z-10 size-3.5 rounded-full ring-2 ring-white"
        style={{
          background: accent,
          boxShadow: `0 0 0 4px ${projectColorAlpha(project.color, 0.18)}, 0 6px 14px ${projectColorAlpha(project.color, 0.3)}`,
        }}
        aria-hidden
      />
      <div className={`h-1.5 ${theme.bar}`} />
      <div className="relative flex flex-1 flex-col gap-4 bg-gradient-to-b from-teal-50/40 via-white to-mint-50/30 px-5 pb-5 pt-6">
        <div
          className="pointer-events-none absolute -start-8 -top-10 size-28 rounded-full bg-teal-200/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -end-8 -bottom-12 size-24 rounded-full bg-mint-100/60"
          aria-hidden
        />
        <div className="relative flex items-start gap-3">
          <span
            className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl ${theme.icon}`}
          >
            <FolderKanban className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-snug text-ink-900">{project.systemName}</h3>
            <p className="mt-1 text-xs font-medium text-teal-700">{project.code}</p>
            <p className="mt-1 truncate text-xs text-ink-500">
              {projectOperatorsText(project.operators) || '—'}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <ProjectLifecycleBadge value={project.status} />
              <ProjectImportanceBadge value={project.importance} />
              <ProjectActiveBadge active={project.isActive} />
            </div>
          </div>
          <ProgressRing value={project.progressPercent} locale={locale} color={theme.ring} />
        </div>

        <div className="relative grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-teal-100 bg-white/80 px-2.5 py-2">
            <p className="text-[10px] font-medium text-ink-500">{t('projectLiveBoard.activityCount')}</p>
            <p className="mt-0.5 text-sm font-bold text-teal-800">
              {formatNumber(project.activityCount, locale)}
            </p>
          </div>
          <div className="rounded-2xl border border-mint-100 bg-white/80 px-2.5 py-2">
            <p className="text-[10px] font-medium text-ink-500">{t('projects.phaseCount')}</p>
            <p className="mt-0.5 text-sm font-bold text-teal-800">
              {formatNumber(project._count?.phases ?? 0, locale)}
            </p>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-white/80 px-2.5 py-2">
            <p className="text-[10px] font-medium text-ink-500">{t('projectReports.totalContractors')}</p>
            <p className="mt-0.5 text-sm font-bold text-teal-800">
              {formatNumber(project.contractors.length, locale)}
            </p>
          </div>
        </div>

        <div className="relative rounded-2xl border border-teal-100 bg-white/90 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
            <Handshake className="size-3.5 text-teal-600" aria-hidden />
            {t('projectLiveBoard.mainContractor')}
          </div>
          <p className={`text-sm font-semibold ${project.mainContractor ? 'text-ink-900' : 'text-ink-400'}`}>
            {project.mainContractor?.name || t('projectLiveBoard.noContractors')}
          </p>
        </div>

        <div className="relative rounded-2xl border border-mint-100 bg-gradient-to-e from-mint-50/80 to-teal-50/50 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
            <ClipboardList className="size-3.5 text-teal-600" aria-hidden />
            {t('projectLiveBoard.lastActivity')}
          </div>
          <LastActivityPreview
            projectId={project.id}
            activity={project.lastActivity}
            empty={t('projectLiveBoard.noActivity')}
          />
        </div>

        <div className="relative mt-auto flex items-center justify-between gap-3">
          <div className="min-w-0 text-[11px] text-ink-500">
            {project.startDate || project.endDate ? (
              <span className="inline-flex items-center gap-1">
                <CalendarRange className="size-3.5 text-teal-600" aria-hidden />
                {project.startDate ? <DateText value={project.startDate} /> : '—'}
                <span aria-hidden> – </span>
                {project.endDate ? <DateText value={project.endDate} /> : '—'}
              </span>
            ) : project.companyName ? (
              <span className="truncate">{project.companyName}</span>
            ) : null}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-teal-400 bg-white px-3 py-1.5 text-xs font-medium text-teal-800 shadow-[0_6px_14px_rgba(46,189,182,0.12)]">
            <Eye className="size-3.5" aria-hidden />
            {t('common.view')}
          </span>
        </div>
      </div>
    </Link>
  )
}

function LiveBoardStats({
  stats,
  locale,
}: {
  stats: ProjectLiveBoard['stats']
  locale: string
}) {
  const { t } = useTranslation()
  return (
    <FormCard icon={Activity} title={t('projectLiveBoard.stats')}>
      <div className={`${formCardBodyClassName}`}>
        <FormSectionTitle icon={FolderKanban}>{t('projectLiveBoard.totalProjects')}</FormSectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
          <FormFactTile
            icon={FolderKanban}
            label={t('projectLiveBoard.totalProjects')}
            value={formatNumber(stats.total, locale)}
            tone="teal"
          />
          <FormFactTile
            icon={MapPinned}
            label={t('projectLiveBoard.withLocation')}
            value={formatNumber(stats.withLocation, locale)}
            tone="mint"
          />
          <FormFactTile
            icon={MapPin}
            label={t('projectLiveBoard.withoutLocation')}
            value={formatNumber(stats.withoutLocation, locale)}
            tone="ink"
          />
          <FormFactTile
            icon={Percent}
            label={t('projectLiveBoard.avgProgress')}
            value={
              stats.avgProgressPercent == null
                ? '—'
                : `${formatGroupedQuantity(stats.avgProgressPercent, locale, 1)}٪`
            }
            empty={stats.avgProgressPercent == null}
          />
        </div>
        <FormSectionTitle icon={Activity}>{t('projects.status')}</FormSectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 sm:gap-3">
          {stats.byStatus.map((item) => {
            const meta = statusStatMeta[item.key] ?? statusStatMeta.unset
            const Icon = meta.icon
            const label =
              item.key === 'unset'
                ? t('projectLiveBoard.unsetStatus')
                : t(`projects.statuses.${item.key}`)
            return (
              <FormFactTile
                key={item.key}
                icon={Icon}
                label={label}
                value={formatNumber(item.count, locale)}
                tone={meta.tone}
              />
            )
          })}
        </div>
      </div>
    </FormCard>
  )
}
