import {
  Activity,
  Building2,
  CalendarRange,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  Filter,
  FolderKanban,
  Gauge,
  Handshake,
  Landmark,
  Layers3,
  Percent,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import {
  FormCard,
  FormFactTile,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { SearchBar } from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { api } from '../../lib/api'
import { formatGroupedNumber, formatGroupedQuantity, formatNumber } from '../../lib/datetime'
import {
  projectImportanceOrder,
  projectStatusOrder,
  type OrganizationUnit,
  type ProjectLookups,
  type ProjectReportsOverview,
} from '../../types/app'
import {
  ChartPanel,
  ReportBar,
  ReportDonut,
  reportColors,
} from './ProjectReportCharts'
import { withCurrent } from './ProjectShared'

function money(value: number, locale: string) {
  return formatGroupedNumber(value, locale)
}

export function ProjectReportsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, term, setTerm, applySearch, searchParams, setParams } = useListParams()
  const operatorUnitId = searchParams.get('operatorUnitId') ?? ''
  const companyName = searchParams.get('companyName') ?? ''
  const isActive = searchParams.get('isActive') ?? ''
  const lifecycle = searchParams.get('status') ?? ''
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
      'reports',
      q,
      operatorUnitId,
      companyName,
      isActive,
      lifecycle,
      isSupportActive,
      importance,
    ],
    queryFn: async () => {
      const { data } = await api.get<ProjectReportsOverview>('/projects/reports', {
        params: {
          ...(q ? { q } : {}),
          ...(operatorUnitId ? { operatorUnitId } : {}),
          ...(companyName ? { companyName } : {}),
          ...(isActive ? { isActive } : {}),
          ...(lifecycle ? { status: lifecycle } : {}),
          ...(isSupportActive ? { isSupportActive } : {}),
          ...(importance ? { importance } : {}),
        },
      })
      return data
    },
  })

  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const report = query.data
  const kpis = report?.kpis
  const filtersActive = Boolean(
    operatorUnitId ||
      companyName ||
      isActive ||
      lifecycle ||
      isSupportActive ||
      importance,
  )
  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'true', label: t('geo.active') },
    { value: 'false', label: t('geo.inactive') },
  ]
  const lifecycleColors: Record<string, string> = {
    NOT_STARTED: reportColors.ink,
    IN_PROGRESS: reportColors.teal,
    SUSPENDED: reportColors.tealSoft,
    COMPLETED: reportColors.mint,
    unset: reportColors.tealDark,
  }
  const lifecycleSlices = (report?.byLifecycleStatus ?? []).map((item) => ({
    name:
      item.key === 'unset'
        ? t('projectReports.unsetStatus')
        : t(`projects.statuses.${item.key}`),
    value: item.count,
    color: lifecycleColors[item.key] ?? reportColors.teal,
  }))
  const launchYears = (report?.byLaunchYear ?? []).map((item) => ({
    name:
      item.year == null
        ? t('projectReports.unknownYear')
        : formatNumber(item.year, locale),
    value: item.count,
  }))
  const paidRatio =
    kpis?.paidRatio == null ? '—' : `${formatGroupedNumber(Math.round(kpis.paidRatio * 100), locale)}٪`

  return (
    <div className={listShellClassName}>
      <PageHeader icon={ChartColumn} title={t('menus.projectReports')} subtitle={t('projectReports.subtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('projectReports.search')}
        placeholder={t('projectReports.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-2 xl:grid-cols-3"
        extra={
          <>
            <FormField icon={Landmark} label={t('projects.operators')} htmlFor="report-operator">
              <SearchSelect
                id="report-operator"
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
            <FormField icon={Filter} label={t('projects.companyName')} htmlFor="report-company">
              <SearchSelect
                id="report-company"
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
            <FormField icon={Filter} label={t('projects.isActive')} htmlFor="report-active">
              <SearchSelect
                id="report-active"
                value={isActive}
                placeholder={t('common.all')}
                onChange={(next) => setParams({ isActive: next || undefined }, { resetPage: true })}
                options={statusOptions}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.status')} htmlFor="report-lifecycle">
              <SearchSelect
                id="report-lifecycle"
                value={lifecycle}
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
            <FormField icon={Filter} label={t('projects.isSupportActive')} htmlFor="report-support">
              <SearchSelect
                id="report-support"
                value={isSupportActive}
                placeholder={t('common.all')}
                onChange={(next) =>
                  setParams({ isSupportActive: next || undefined }, { resetPage: true })
                }
                options={statusOptions}
              />
            </FormField>
            <FormField icon={Filter} label={t('projects.importance')} htmlFor="report-importance">
              <SearchSelect
                id="report-importance"
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

      {query.isError ? (
        <p className="rounded-2xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
          {t('common.error')}
        </p>
      ) : query.isLoading || !report || !kpis ? (
        <LoadingState />
      ) : (
        <div className="space-y-5">
          <FormCard icon={FolderKanban} title={t('projectReports.overview')}>
            <div className={`${formCardBodyClassName} space-y-5`}>
              <div className="grid items-start gap-2 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3">
                <FormFactTile
                  icon={FolderKanban}
                  label={t('projectReports.totalProjects')}
                  value={money(kpis.totalProjects, locale)}
                />
                <FormFactTile
                  icon={Activity}
                  label={t('projectReports.activeProjects')}
                  value={money(kpis.activeProjects, locale)}
                  tone="mint"
                />
                <FormFactTile
                  icon={Handshake}
                  label={t('projectReports.totalContractors')}
                  value={money(kpis.totalContractors, locale)}
                />
                <ChartPanel
                  icon={Gauge}
                  title={t('projectReports.byLifecycleStatus')}
                  empty={lifecycleSlices.every((item) => item.value === 0)}
                >
                  <ReportDonut compact data={lifecycleSlices} locale={locale} />
                </ChartPanel>
              </div>
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  aria-expanded={showMoreDetails}
                  onClick={() => setShowMoreDetails((open) => !open)}
                >
                  {showMoreDetails ? (
                    <ChevronUp className="size-4" aria-hidden />
                  ) : (
                    <ChevronDown className="size-4" aria-hidden />
                  )}
                  {showMoreDetails
                    ? t('projectReports.hideMoreDetails')
                    : t('projectReports.moreDetails')}
                </Button>
              </div>
              {showMoreDetails ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-3">
                    <FormFactTile
                      icon={ShieldCheck}
                      label={t('projectReports.supportActive')}
                      value={money(kpis.supportActive, locale)}
                    />
                    <FormFactTile
                      icon={Handshake}
                      label={t('projectReports.withContractors')}
                      value={money(kpis.withContractors, locale)}
                      tone="mint"
                    />
                    <FormFactTile
                      icon={UsersRound}
                      label={t('projectReports.totalMembers')}
                      value={money(kpis.totalMembers, locale)}
                      tone="mint"
                    />
                    <FormFactTile
                      icon={Layers3}
                      label={t('projectReports.totalPhases')}
                      value={money(kpis.totalPhases, locale)}
                    />
                    <FormFactTile
                      icon={Wallet}
                      label={t('projectReports.totalPayments')}
                      value={money(kpis.totalPayments, locale)}
                      tone="mint"
                    />
                    <FormFactTile
                      icon={Wallet}
                      label={t('projectReports.totalCostEstimate')}
                      value={money(kpis.totalCostEstimate, locale)}
                    />
                    <FormFactTile
                      icon={Wallet}
                      label={t('projectReports.totalPaid')}
                      value={money(kpis.totalPaid, locale)}
                      tone="mint"
                    />
                    <FormFactTile
                      icon={Wallet}
                      label={t('projectReports.remainingEstimate')}
                      value={money(kpis.remainingEstimate, locale)}
                      tone={kpis.remainingEstimate < 0 ? 'ink' : 'teal'}
                    />
                    <FormFactTile
                      icon={TriangleAlert}
                      label={t('projectReports.overspendContractors')}
                      value={money(kpis.overspendContractors, locale)}
                      tone={kpis.overspendContractors > 0 ? 'ink' : 'mint'}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
                    <FormFactTile
                      icon={Building2}
                      label={t('projectReports.withReplacement')}
                      value={money(kpis.withReplacement, locale)}
                      compact
                    />
                    <FormFactTile
                      icon={Handshake}
                      label={t('projectReports.withoutContractors')}
                      value={money(kpis.withoutContractors, locale)}
                      compact
                      tone="ink"
                    />
                    <FormFactTile
                      icon={ChartColumn}
                      label={t('projectReports.paidRatio')}
                      value={paidRatio}
                      compact
                      tone="mint"
                    />
                    <FormFactTile
                      icon={UsersRound}
                      label={t('projectReports.avgMembers')}
                      value={formatGroupedQuantity(kpis.avgMembersPerContractor, locale, 1)}
                      compact
                    />
                    <FormFactTile
                      icon={Handshake}
                      label={t('projectReports.avgContractors')}
                      value={formatGroupedQuantity(kpis.avgContractorsPerProject, locale, 1)}
                      compact
                    />
                    <FormFactTile
                      icon={CalendarRange}
                      label={t('projectReports.avgPhaseDays')}
                      value={formatGroupedQuantity(kpis.avgPhaseDays, locale, 1)}
                      compact
                      tone="mint"
                    />
                    <FormFactTile
                      icon={Percent}
                      label={t('projectReports.avgProgress')}
                      value={`${formatGroupedQuantity(kpis.avgProgressPercent, locale, 1)}٪`}
                      compact
                    />
                    <FormFactTile
                      icon={Building2}
                      label={t('projectReports.withCompany')}
                      value={money(kpis.withCompany, locale)}
                      compact
                    />
                    <FormFactTile
                      icon={Activity}
                      label={t('projectReports.withUrl')}
                      value={money(kpis.withUrl, locale)}
                      compact
                      tone="mint"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </FormCard>

          <FormCard icon={Building2} title={t('projectReports.organization')}>
            <div className={`${formCardBodyClassName} space-y-4`}>
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartPanel
                  icon={Building2}
                  title={t('projectReports.byOperator')}
                  empty={(report.byOperator ?? []).length === 0}
                >
                  <ReportBar
                    locale={locale}
                    data={(report.byOperator ?? []).map((item) => ({
                      name: item.name,
                      value: item.count,
                    }))}
                  />
                </ChartPanel>
                <ChartPanel
                  icon={CalendarRange}
                  title={t('projectReports.byLaunchYear')}
                  empty={launchYears.length === 0}
                >
                  <ReportBar locale={locale} data={launchYears} />
                </ChartPanel>
              </div>
              <ChartPanel
                icon={Handshake}
                title={t('projectReports.byContractor')}
                empty={(report.byContractor ?? report.byCompany).length === 0}
              >
                <ReportBar
                  locale={locale}
                  data={(report.byContractor ?? report.byCompany).map((item) => ({
                    name: item.name,
                    value: item.count,
                  }))}
                />
              </ChartPanel>
            </div>
          </FormCard>
        </div>
      )}
    </div>
  )
}
