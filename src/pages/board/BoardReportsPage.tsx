import {
  Building2,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  FileCheck,
  Image,
  Link2,
  Stamp,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FormField, LoadingState, PageHeader, listShellClassName } from '../../components/ui/Form'
import {
  FormCard,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { SearchBar, TableCard } from '../../components/ui/ListControls'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import {
  ChartPanel,
  ReportBar,
  ReportDonut,
  ReportHorizontalBar,
  ReportRadialScore,
  ReportStackedBar,
  ReportTwinBar,
  formatYearMonth,
  reportColors,
} from '../projects/ProjectReportCharts'
import type { BoardReportsOverview, OrganizationUnit } from '../../types/app'
import { BoardReportsOverviewCard } from './BoardReportsOverviewCard'

const dueColors: Record<string, string> = {
  overdue: reportColors.tealDeep,
  today: reportColors.tealDark,
  soon: reportColors.mint,
  upcoming: reportColors.teal,
  later: reportColors.tealSoft,
  noDue: reportColors.ink,
}

function count(value: number, locale: string) {
  return formatNumber(value, locale)
}

export function BoardReportsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, term, setTerm, applySearch, searchParams, setParams } = useListParams()
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const unitId = searchParams.get('unitId') ?? ''
  const kind = searchParams.get('kind') ?? ''
  const filtersActive = Boolean(from || to || unitId || kind)

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['board', 'reports', q, from, to, unitId, kind],
    queryFn: async () => {
      const { data } = await api.get<BoardReportsOverview>('/board/reports', {
        params: {
          ...(q ? { q } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(unitId ? { unitId } : {}),
          ...(kind ? { kind } : {}),
        },
      })
      return data
    },
  })

  const report = query.data
  const kpis = report?.kpis
  const emptyLabel = t('boardReports.empty')
  const unitName = (item: { id: string | null; name: string }) =>
    item.id ? item.name : t('boardResolutions.withoutUnit')

  const dueSlices = (report?.byDueStatus ?? []).map((item) => ({
    name: t(`boardReports.dueStatus.${item.key}`),
    value: item.count,
    color: dueColors[item.key] ?? reportColors.ink,
  }))
  const coverageSlices = (report?.byCoverage ?? []).map((item) => ({
    name:
      item.key === 'with'
        ? t('boardReports.meetingsWithResolutions')
        : t('boardReports.meetingsWithoutResolutions'),
    value: item.count,
    color: item.key === 'with' ? reportColors.teal : reportColors.ink,
  }))
  const attachmentSlices = (report?.byAttachment ?? []).map((item) => ({
    name: item.key === 'image' ? t('boardMinutes.images') : t('boardMinutes.audio'),
    value: item.count,
    color: item.key === 'image' ? reportColors.teal : reportColors.mint,
  }))
  const monthRows = (report?.byMonth ?? []).map((item) => ({
    name: formatYearMonth(item.month, locale),
    left: item.minutes,
    right: item.resolutions,
  }))
  const unitBars = (report?.byUnit ?? []).map((item) => ({
    name: unitName(item),
    value: item.count,
  }))
  const unitStacked = (report?.byUnit ?? []).map((item) => ({
    name: unitName(item),
    overdue: item.overdue,
    onTrack: item.soon + item.upcoming + item.later,
    noDue: item.noDue,
  }))
  const requestUnitBars = (report?.byRequestUnit ?? []).map((item) => ({
    name: item.name,
    value: item.count,
  }))

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={ChartColumn}
        title={t('menus.boardReports')}
        subtitle={t('boardReports.subtitle')}
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('boardReports.search')}
        placeholder={t('boardReports.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-2 xl:grid-cols-4"
        extra={
          <>
            <FormField icon={CalendarRange} label={t('boardReports.fromDate')} htmlFor="boardReportFrom">
              <PersianDateField
                id="boardReportFrom"
                value={from}
                maxDate={to || undefined}
                onChange={(value) => setParams({ from: value || undefined }, { resetPage: true })}
              />
            </FormField>
            <FormField icon={CalendarRange} label={t('boardReports.toDate')} htmlFor="boardReportTo">
              <PersianDateField
                id="boardReportTo"
                value={to}
                minDate={from || undefined}
                onChange={(value) => setParams({ to: value || undefined }, { resetPage: true })}
              />
            </FormField>
            <FormField icon={Building2} label={t('boardResolutions.unit')} htmlFor="boardReportUnit">
              <SearchSelect
                id="boardReportUnit"
                value={unitId}
                onChange={(next) => setParams({ unitId: next || undefined }, { resetPage: true })}
                placeholder={t('boardResolutions.selectUnit')}
                options={[
                  { value: '', label: t('common.all') },
                  ...(units.data ?? []).map((item) => ({
                    value: item.id,
                    label: item.pathLabel || item.name,
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Stamp} label={t('boardMinutes.filterKind')} htmlFor="boardReportKind">
              <SearchSelect
                id="boardReportKind"
                value={kind}
                onChange={(next) => setParams({ kind: next || undefined }, { resetPage: true })}
                placeholder={t('boardMinutes.filterKind')}
                options={[
                  { value: '', label: t('common.all') },
                  { value: 'regular', label: t('boardMinutes.regular') },
                  { value: 'linked', label: t('boardMinutes.linked') },
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
          <BoardReportsOverviewCard kpis={kpis} />

          <FormCard icon={ChartColumn} title={t('boardReports.distributions')}>
            <div className={`${formCardBodyClassName} grid gap-4 lg:grid-cols-2`}>
              <ChartPanel
                icon={TriangleAlert}
                title={t('boardReports.byDueStatus')}
                empty={dueSlices.every((item) => item.value === 0)}
                emptyLabel={emptyLabel}
              >
                <ReportDonut data={dueSlices} locale={locale} />
              </ChartPanel>
              <ChartPanel
                icon={FileCheck}
                title={t('boardReports.byCoverage')}
                empty={coverageSlices.every((item) => item.value === 0)}
                emptyLabel={emptyLabel}
              >
                <ReportDonut data={coverageSlices} locale={locale} />
              </ChartPanel>
              <ChartPanel
                icon={Users}
                title={t('boardReports.attendanceRate')}
                empty={kpis.presentCount + kpis.absentCount === 0}
                emptyLabel={emptyLabel}
              >
                <ReportRadialScore
                  value={kpis.attendanceRate}
                  locale={locale}
                  label={t('boardReports.attendanceRate')}
                />
              </ChartPanel>
            </div>
          </FormCard>

          <FormCard icon={CalendarDays} title={t('boardReports.trends')}>
            <div className={formCardBodyClassName}>
              <ChartPanel
                icon={ChartColumn}
                title={t('boardReports.byMonthBars')}
                empty={monthRows.length === 0}
                emptyLabel={emptyLabel}
              >
                <ReportTwinBar
                  data={monthRows}
                  locale={locale}
                  leftLabel={t('boardReports.totalMinutes')}
                  rightLabel={t('boardReports.totalResolutions')}
                />
              </ChartPanel>
            </div>
          </FormCard>

          <FormCard icon={Building2} title={t('boardReports.units')}>
            <div className={`${formCardBodyClassName} grid gap-4 xl:grid-cols-2`}>
              <ChartPanel
                icon={Building2}
                title={t('boardReports.byUnit')}
                empty={unitBars.every((item) => item.value === 0)}
                emptyLabel={emptyLabel}
              >
                <ReportHorizontalBar locale={locale} data={unitBars} />
              </ChartPanel>
              <ChartPanel
                icon={TriangleAlert}
                title={t('boardReports.byUnitStatus')}
                empty={unitStacked.every((item) => item.overdue + item.onTrack + item.noDue === 0)}
                emptyLabel={emptyLabel}
              >
                <ReportStackedBar
                  data={unitStacked}
                  locale={locale}
                  overdueLabel={t('boardReports.dueStatus.overdue')}
                  onTrackLabel={t('boardReports.onTrack')}
                  noDueLabel={t('boardReports.dueStatus.noDue')}
                />
              </ChartPanel>
              <ChartPanel
                icon={Link2}
                title={t('boardReports.byRequestUnit')}
                empty={requestUnitBars.length === 0}
                emptyLabel={emptyLabel}
              >
                <ReportBar locale={locale} data={requestUnitBars} />
              </ChartPanel>
              <ChartPanel
                icon={Image}
                title={t('boardReports.byAttachment')}
                empty={attachmentSlices.every((item) => item.value === 0)}
                emptyLabel={emptyLabel}
              >
                <ReportDonut data={attachmentSlices} locale={locale} compact />
              </ChartPanel>
            </div>
          </FormCard>

          <FormCard icon={Building2} title={t('boardReports.unitTable')}>
            <div className={formCardBodyClassName}>
              <FormSectionTitle icon={Building2}>{t('boardReports.byUnit')}</FormSectionTitle>
              <TableCard
                loading={false}
                empty={emptyLabel}
                hasRows={report.byUnit.some((item) => item.count > 0)}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('boardReports.unitName')}</th>
                      <th className="px-4 py-3 text-start">{t('boardReports.totalResolutions')}</th>
                      <th className="px-4 py-3 text-start">{t('boardReports.dueStatus.overdue')}</th>
                      <th className="px-4 py-3 text-start">{t('boardReports.dueStatus.soon')}</th>
                      <th className="px-4 py-3 text-start">{t('boardReports.dueStatus.upcoming')}</th>
                      <th className="px-4 py-3 text-start">{t('boardReports.dueStatus.noDue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byUnit.map((item) => (
                      <tr key={item.id ?? 'none'} className="border-t border-line">
                        <td className="px-4 py-3">{unitName(item)}</td>
                        <td className="px-4 py-3">{count(item.count, locale)}</td>
                        <td className="px-4 py-3">{count(item.overdue, locale)}</td>
                        <td className="px-4 py-3">{count(item.soon, locale)}</td>
                        <td className="px-4 py-3">{count(item.upcoming, locale)}</td>
                        <td className="px-4 py-3">{count(item.noDue, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          </FormCard>
        </div>
      )}
    </div>
  )
}
