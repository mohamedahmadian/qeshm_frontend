import {
  Activity,
  Building2,
  CalendarRange,
  ChartColumn,
  Filter,
  FolderKanban,
  Handshake,
  Layers3,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import {
  FormCard,
  FormFactTile,
  FormSectionTitle,
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
  type ProjectLookups,
  type ProjectReportsOverview,
} from '../../types/app'
import {
  ChartPanel,
  ReportBar,
  ReportDonut,
  ReportGroupedBar,
  formatYearMonth,
  importanceColors,
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
  const vicePresidency = searchParams.get('vicePresidency') ?? ''
  const management = searchParams.get('management') ?? ''
  const unit = searchParams.get('unit') ?? ''
  const isActive = searchParams.get('isActive') ?? ''
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
      'reports',
      q,
      vicePresidency,
      management,
      unit,
      isActive,
      isSupportActive,
      importance,
    ],
    queryFn: async () => {
      const { data } = await api.get<ProjectReportsOverview>('/projects/reports', {
        params: {
          ...(q ? { q } : {}),
          ...(vicePresidency ? { vicePresidency } : {}),
          ...(management ? { management } : {}),
          ...(unit ? { unit } : {}),
          ...(isActive ? { isActive } : {}),
          ...(isSupportActive ? { isSupportActive } : {}),
          ...(importance ? { importance } : {}),
        },
      })
      return data
    },
  })

  const report = query.data
  const kpis = report?.kpis
  const filtersActive = Boolean(
    vicePresidency || management || unit || isActive || isSupportActive || importance,
  )
  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'true', label: t('geo.active') },
    { value: 'false', label: t('geo.inactive') },
  ]
  const statusSlices = (report?.byStatus ?? []).map((item) => ({
    name: item.key === 'active' ? t('geo.active') : t('geo.inactive'),
    value: item.count,
    color: item.key === 'active' ? reportColors.teal : reportColors.ink,
  }))
  const supportSlices = (report?.bySupport ?? []).map((item) => ({
    name: item.key === 'active' ? t('geo.active') : t('geo.inactive'),
    value: item.count,
    color: item.key === 'active' ? reportColors.mint : reportColors.ink,
  }))
  const importanceSlices = (report?.byImportance ?? []).map((item) => ({
    name: t(`projects.importances.${item.key}`),
    value: item.count,
    color: importanceColors[item.key] ?? reportColors.teal,
  }))
  const coverageSlices = (report?.byContractorCoverage ?? []).map((item) => ({
    name:
      item.key === 'with'
        ? t('projectReports.coverageWith')
        : t('projectReports.coverageWithout'),
    value: item.count,
    color: item.key === 'with' ? reportColors.teal : reportColors.ink,
  }))
  const phaseSlices = (report?.byPhaseStatus ?? []).map((item) => ({
    name:
      item.key === 'upcoming'
        ? t('projectReports.phaseUpcoming')
        : item.key === 'ongoing'
          ? t('projectReports.phaseOngoing')
          : t('projectReports.phaseEnded'),
    value: item.count,
    color:
      item.key === 'upcoming'
        ? reportColors.mint
        : item.key === 'ongoing'
          ? reportColors.teal
          : reportColors.ink,
  }))
  const paymentMonths = (report?.paymentByMonth ?? []).slice(-18).map((item) => ({
    name: formatYearMonth(item.month, locale),
    value: item.amount,
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
      <PageHeader title={t('menus.projectReports')} subtitle={t('projectReports.subtitle')} />
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
            <FormField icon={Filter} label={t('projects.vicePresidency')} htmlFor="report-vice">
              <SearchSelect
                id="report-vice"
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
            <FormField icon={Filter} label={t('projects.management')} htmlFor="report-management">
              <SearchSelect
                id="report-management"
                value={management}
                placeholder={t('projects.allManagements')}
                onChange={(next) =>
                  setParams({ management: next || undefined, unit: undefined }, { resetPage: true })
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
            <FormField icon={Filter} label={t('projects.unit')} htmlFor="report-unit">
              <SearchSelect
                id="report-unit"
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
            <FormField icon={Filter} label={t('projects.isActive')} htmlFor="report-active">
              <SearchSelect
                id="report-active"
                value={isActive}
                placeholder={t('common.all')}
                onChange={(next) => setParams({ isActive: next || undefined }, { resetPage: true })}
                options={statusOptions}
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
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-3">
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
                  icon={Handshake}
                  label={t('projectReports.totalContractors')}
                  value={money(kpis.totalContractors, locale)}
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
            </div>
          </FormCard>

          <FormCard icon={ChartColumn} title={t('projectReports.distributions')}>
            <div className={`${formCardBodyClassName} grid gap-4 lg:grid-cols-2 xl:grid-cols-3`}>
              <ChartPanel
                icon={Activity}
                title={t('projectReports.byStatus')}
                empty={statusSlices.every((item) => item.value === 0)}
              >
                <ReportDonut data={statusSlices} locale={locale} />
              </ChartPanel>
              <ChartPanel
                icon={TriangleAlert}
                title={t('projectReports.byImportance')}
                empty={importanceSlices.every((item) => item.value === 0)}
              >
                <ReportDonut data={importanceSlices} locale={locale} />
              </ChartPanel>
              <ChartPanel
                icon={ShieldCheck}
                title={t('projectReports.bySupport')}
                empty={supportSlices.every((item) => item.value === 0)}
              >
                <ReportDonut data={supportSlices} locale={locale} />
              </ChartPanel>
              <ChartPanel
                icon={Handshake}
                title={t('projectReports.byContractorCoverage')}
                empty={coverageSlices.every((item) => item.value === 0)}
              >
                <ReportDonut data={coverageSlices} locale={locale} />
              </ChartPanel>
              <ChartPanel
                icon={Layers3}
                title={t('projectReports.byPhaseStatus')}
                empty={phaseSlices.every((item) => item.value === 0)}
              >
                <ReportDonut data={phaseSlices} locale={locale} />
              </ChartPanel>
            </div>
          </FormCard>

          <FormCard icon={Building2} title={t('projectReports.organization')}>
            <div className={`${formCardBodyClassName} grid gap-4 xl:grid-cols-2`}>
              <ChartPanel
                icon={Building2}
                title={t('projectReports.byVicePresidency')}
                empty={report.byVicePresidency.length === 0}
              >
                <ReportBar
                  locale={locale}
                  data={report.byVicePresidency.map((item) => ({
                    name: item.name,
                    value: item.count,
                  }))}
                />
              </ChartPanel>
              <ChartPanel
                icon={Building2}
                title={t('projectReports.byManagement')}
                empty={report.byManagement.length === 0}
              >
                <ReportBar
                  locale={locale}
                  data={report.byManagement.map((item) => ({
                    name: item.name,
                    value: item.count,
                  }))}
                />
              </ChartPanel>
              <ChartPanel
                icon={Building2}
                title={t('projectReports.byUnit')}
                empty={report.byUnit.length === 0}
              >
                <ReportBar
                  locale={locale}
                  data={report.byUnit.map((item) => ({ name: item.name, value: item.count }))}
                />
              </ChartPanel>
              <ChartPanel
                icon={CalendarRange}
                title={t('projectReports.byLaunchYear')}
                empty={launchYears.length === 0}
              >
                <ReportBar locale={locale} data={launchYears} />
              </ChartPanel>
              <ChartPanel
                icon={Handshake}
                title={t('projectReports.byCompany')}
                empty={report.byCompany.length === 0}
              >
                <ReportBar
                  locale={locale}
                  data={report.byCompany.map((item) => ({ name: item.name, value: item.count }))}
                />
              </ChartPanel>
            </div>
          </FormCard>

          <FormCard icon={Wallet} title={t('projectReports.finance')}>
            <div className={`${formCardBodyClassName} grid gap-4 xl:grid-cols-2`}>
              <ChartPanel
                icon={Wallet}
                title={t('projectReports.financeByVice')}
                empty={report.financeByVicePresidency.length === 0}
              >
                <ReportGroupedBar
                  data={report.financeByVicePresidency}
                  locale={locale}
                  estimateLabel={t('projectReports.estimate')}
                  paidLabel={t('projectReports.paid')}
                />
              </ChartPanel>
              <ChartPanel
                icon={CalendarRange}
                title={t('projectReports.paymentByMonth')}
                empty={paymentMonths.length === 0}
              >
                <ReportBar locale={locale} data={paymentMonths} />
              </ChartPanel>
            </div>
          </FormCard>

          <FormCard icon={ChartColumn} title={t('projectReports.rankings')}>
            <div className={`${formCardBodyClassName} grid gap-6 xl:grid-cols-2`}>
              <div>
                <FormSectionTitle icon={FolderKanban}>
                  {t('projectReports.topProjects')}
                </FormSectionTitle>
                <RankingTable
                  locale={locale}
                  empty={report.topProjects.length === 0}
                  rows={report.topProjects.map((item) => ({
                    key: item.id,
                    title: item.name,
                    subtitle: item.vicePresidency,
                    to: `/projects/${item.id}`,
                    estimate: item.estimate,
                    paid: item.paid,
                  }))}
                />
              </div>
              <div>
                <FormSectionTitle icon={Handshake}>
                  {t('projectReports.topContractors')}
                </FormSectionTitle>
                <RankingTable
                  locale={locale}
                  empty={report.topContractors.length === 0}
                  rows={report.topContractors.map((item) => ({
                    key: item.id,
                    title: item.name,
                    subtitle: item.projectName,
                    to: `/projects/${item.projectId}/contractors/${item.id}`,
                    estimate: item.estimate,
                    paid: item.paid,
                  }))}
                />
              </div>
            </div>
          </FormCard>
        </div>
      )}
    </div>
  )
}

function RankingTable({
  rows,
  locale,
  empty,
}: {
  rows: {
    key: string
    title: string
    subtitle: string
    to: string
    estimate: number
    paid: number
  }[]
  locale: string
  empty: boolean
}) {
  const { t } = useTranslation()
  if (empty) {
    return <p className="rounded-2xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">{t('projectReports.empty')}</p>
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-teal-100">
      <table className="w-full text-sm">
        <thead className="bg-cream-50 text-ink-700">
          <tr>
            <th className="px-4 py-3 text-start font-medium">{t('projectReports.itemName')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('projectReports.estimate')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('projectReports.paid')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-teal-50">
              <td className="px-4 py-3">
                <Link to={row.to} className="font-medium text-teal-700 hover:underline">
                  {row.title}
                </Link>
                <div className="mt-0.5 text-xs text-ink-500">{row.subtitle}</div>
              </td>
              <td className="px-4 py-3">{money(row.estimate, locale)}</td>
              <td className="px-4 py-3">{money(row.paid, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
