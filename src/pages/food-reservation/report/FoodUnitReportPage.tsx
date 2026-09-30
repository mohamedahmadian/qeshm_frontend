import {
  Building2,
  CalendarRange,
  ChartColumn,
  Hash,
  Store,
  Ticket,
  UserRound,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FormField, LoadingState, PageHeader, listShellClassName } from '../../../components/ui/Form'
import {
  FormCard,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../../components/ui/FormLayout'
import { TableCard } from '../../../components/ui/ListControls'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useListParams } from '../../../hooks/useListParams'
import { api } from '../../../lib/api'
import { formatDate, formatGroupedNumber, formatNumber, localizeDigits } from '../../../lib/datetime'
import {
  ChartPanel,
  ReportBar,
  ReportDonut,
  reportColors,
} from '../../projects/ProjectReportCharts'
import type {
  FoodCostEstimateGroup,
  FoodCostEstimatePeriod,
  FoodUnitReport,
  OrganizationUnit,
} from '../../../types/app'

const grains = ['week', 'month', 'year'] as const
type Grain = (typeof grains)[number]

const sliceColors = [
  reportColors.teal,
  reportColors.mint,
  reportColors.tealDark,
  reportColors.tealSoft,
  reportColors.tealDeep,
  reportColors.ink,
]

function money(value: number, locale: string, toman: string) {
  return `${formatGroupedNumber(Math.round(value), locale)} ${toman}`
}

function shareOf(amount: number, total: number, locale: string) {
  if (total <= 0) return formatNumber(0, locale)
  return `${formatNumber(Math.round((amount / total) * 100), locale)}٪`
}

function periodRows(report: FoodUnitReport, grain: Grain) {
  if (grain === 'week') return report.byWeek
  if (grain === 'month') return report.byMonth
  return report.byYear
}

function chartSlice(rows: FoodCostEstimatePeriod[], grain: Grain) {
  if (grain === 'week') return rows.slice(-16)
  if (grain === 'month') return rows.slice(-18)
  return rows
}

function periodLabel(grain: Grain, period: string, locale: string, weekOf: (date: string) => string) {
  if (grain === 'week') return weekOf(formatDate(period, locale))
  if (grain === 'year') return localizeDigits(period, locale)
  const [year, month] = period.split('-')
  return localizeDigits(`${year}/${Number(month)}`, locale)
}

export function FoodUnitReportPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const toman = t('foodReservations.toman')
  const { searchParams, setParams } = useListParams()
  const orgUnitId = searchParams.get('orgUnitId') ?? ''
  const reservedFrom = searchParams.get('reservedFrom') ?? ''
  const reservedTo = searchParams.get('reservedTo') ?? ''

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['food-reservations', 'unit-report', orgUnitId, reservedFrom, reservedTo],
    queryFn: async () => {
      const { data } = await api.get<FoodUnitReport>('/food-reservations/unit-report', {
        params: {
          ...(orgUnitId ? { orgUnitId } : {}),
          ...(reservedFrom ? { reservedFrom } : {}),
          ...(reservedTo ? { reservedTo } : {}),
        },
      })
      return data
    },
  })

  const report = query.data
  const kpis = report?.summary
  const aggregated = report?.scope !== 'unit'
  const totalCost = kpis?.totalCost ?? 0
  const scopeTitle = report?.unit
    ? t('foodUnitReport.selectedUnit', { name: report.unit.name })
    : t('foodUnitReport.aggregated')
  const rangeTitle =
    reservedFrom || reservedTo
      ? [reservedFrom ? formatDate(reservedFrom, locale) : '…', reservedTo ? formatDate(reservedTo, locale) : '…'].join(' – ')
      : t('foodUnitReport.allTime')

  function labelOf(grain: Grain, period: string) {
    return periodLabel(grain, period, locale, (date) => t('foodUnitReport.weekOf', { date }))
  }

  const unitSlices = (report?.byUnit ?? []).map((item, index) => ({
    name: item.name,
    value: item.totalPrice,
    color: sliceColors[index % sliceColors.length],
  }))

  return (
    <div className={listShellClassName}>
      <PageHeader icon={Building2} title={t('menus.foodUnitReport')} subtitle={t('foodUnitReport.subtitle')} />
      <FormCard icon={CalendarRange} title={t('foodUnitReport.filters')} subtitle={t('foodUnitReport.filtersHint')}>
        <div className={`${formCardBodyClassName} grid gap-4 sm:grid-cols-2 xl:grid-cols-3`}>
          <FormField icon={Building2} label={t('foodReservations.orgUnit')} htmlFor="unitReportUnit">
            <SearchSelect
              id="unitReportUnit"
              value={orgUnitId}
              onChange={(next) => setParams({ orgUnitId: next || undefined })}
              placeholder={t('foodReservations.filterUnit')}
              options={[
                { value: '', label: t('foodUnitReport.allUnits') },
                ...(units.data ?? []).map((unit) => ({
                  value: unit.id,
                  label: unit.pathLabel || unit.name,
                })),
              ]}
            />
          </FormField>
          <FormField icon={CalendarRange} label={t('foodReservations.fromDate')} htmlFor="unitReportFrom">
            <PersianDateField
              id="unitReportFrom"
              value={reservedFrom}
              maxDate={reservedTo || undefined}
              onChange={(value) => setParams({ reservedFrom: value || undefined })}
            />
          </FormField>
          <FormField icon={CalendarRange} label={t('foodReservations.toDate')} htmlFor="unitReportTo">
            <PersianDateField
              id="unitReportTo"
              value={reservedTo}
              minDate={reservedFrom || undefined}
              onChange={(value) => setParams({ reservedTo: value || undefined })}
            />
          </FormField>
        </div>
      </FormCard>

      {query.isError ? (
        <p className="rounded-2xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
          {t('common.error')}
        </p>
      ) : query.isLoading || !report || !kpis ? (
        <LoadingState />
      ) : (
        <div className="space-y-5">
          <FormCard icon={Wallet} title={t('foodUnitReport.overview')} subtitle={`${scopeTitle} · ${rangeTitle}`}>
            <div className={`${formCardBodyClassName} grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-3`}>
              <FormFactTile
                icon={Ticket}
                label={t('foodUnitReport.reservationCount')}
                value={formatNumber(kpis.reservationCount, locale)}
                tone="teal"
              />
              <FormFactTile
                icon={UtensilsCrossed}
                label={t('foodUnitReport.quantity')}
                value={formatNumber(kpis.totalQuantity, locale)}
                tone="mint"
              />
              <FormFactTile
                icon={Wallet}
                label={t('foodUnitReport.amount')}
                value={money(kpis.totalCost, locale, toman)}
                tone="teal"
              />
              <FormFactTile
                icon={Ticket}
                label={t('foodUnitReport.confirmedCount')}
                value={formatNumber(kpis.confirmedCount, locale)}
                tone="mint"
              />
              <FormFactTile
                icon={Ticket}
                label={t('foodUnitReport.pendingCount')}
                value={formatNumber(kpis.pendingCount, locale)}
              />
              <FormFactTile
                icon={Wallet}
                label={t('foodUnitReport.confirmedAmount')}
                value={money(kpis.confirmedCost, locale, toman)}
                tone="teal"
              />
              <FormFactTile
                icon={Wallet}
                label={t('foodUnitReport.pendingAmount')}
                value={money(kpis.pendingCost, locale, toman)}
                tone="mint"
              />
              <FormFactTile
                icon={Wallet}
                label={t('foodUnitReport.avgPerReservation')}
                value={money(kpis.avgCostPerReservation, locale, toman)}
              />
              <FormFactTile
                icon={Wallet}
                label={t('foodUnitReport.avgPerServing')}
                value={money(kpis.avgCostPerServing, locale, toman)}
                tone="teal"
              />
              <FormFactTile
                icon={CalendarRange}
                label={t('foodUnitReport.avgDaily')}
                value={money(kpis.avgDailyCost, locale, toman)}
                tone="mint"
              />
              <FormFactTile
                icon={CalendarRange}
                label={t('foodUnitReport.uniqueDays')}
                value={formatNumber(kpis.uniqueDays, locale)}
              />
              <FormFactTile
                icon={UserRound}
                label={t('foodUnitReport.uniqueEmployees')}
                value={formatNumber(kpis.uniqueEmployees, locale)}
                tone="teal"
              />
              {aggregated ? (
                <FormFactTile
                  icon={Building2}
                  label={t('foodUnitReport.uniqueUnits')}
                  value={formatNumber(kpis.uniqueUnits, locale)}
                  tone="mint"
                />
              ) : null}
              <FormFactTile
                icon={Store}
                label={t('foodUnitReport.uniqueRestaurants')}
                value={formatNumber(kpis.uniqueRestaurants, locale)}
              />
            </div>
          </FormCard>

          {aggregated ? (
            <>
              <FormCard icon={ChartColumn} title={t('foodUnitReport.byUnit')}>
                <div className={`${formCardBodyClassName} grid gap-4 xl:grid-cols-2`}>
                  <ChartPanel
                    icon={Hash}
                    title={t('foodUnitReport.unitCountChart')}
                    empty={report.byUnit.every((item) => item.count === 0)}
                  >
                    <ReportBar
                      locale={locale}
                      data={report.byUnit.slice(0, 12).map((item) => ({ name: item.name, value: item.count }))}
                    />
                  </ChartPanel>
                  <ChartPanel
                    icon={Wallet}
                    title={t('foodUnitReport.unitAmountChart')}
                    empty={report.byUnit.every((item) => item.totalPrice === 0)}
                  >
                    <ReportBar
                      locale={locale}
                      data={report.byUnit.slice(0, 12).map((item) => ({ name: item.name, value: item.totalPrice }))}
                    />
                  </ChartPanel>
                  <ChartPanel
                    icon={Building2}
                    title={t('foodUnitReport.unitShare')}
                    empty={unitSlices.every((item) => item.value === 0)}
                  >
                    <ReportDonut data={unitSlices} locale={locale} />
                  </ChartPanel>
                </div>
              </FormCard>
              <GroupTable
                icon={Building2}
                title={t('foodUnitReport.byUnit')}
                rows={report.byUnit}
                totalCost={totalCost}
                locale={locale}
                toman={toman}
              />
            </>
          ) : null}

          <GroupCharts
            icon={UtensilsCrossed}
            title={t('foodUnitReport.byFood')}
            rows={report.byFood}
            locale={locale}
            countLabel={t('foodUnitReport.countChart')}
            amountLabel={t('foodUnitReport.amountChart')}
          />
          <GroupTable
            icon={UtensilsCrossed}
            title={t('foodUnitReport.byFood')}
            rows={report.byFood}
            totalCost={totalCost}
            locale={locale}
            toman={toman}
          />
          <GroupCharts
            icon={Store}
            title={t('foodUnitReport.byRestaurant')}
            rows={report.byRestaurant}
            locale={locale}
            countLabel={t('foodUnitReport.countChart')}
            amountLabel={t('foodUnitReport.amountChart')}
          />
          <GroupTable
            icon={Store}
            title={t('foodUnitReport.byRestaurant')}
            rows={report.byRestaurant}
            totalCost={totalCost}
            locale={locale}
            toman={toman}
          />

          {grains.map((grain) => (
            <PeriodSection
              key={grain}
              grain={grain}
              rows={periodRows(report, grain)}
              totalCost={totalCost}
              locale={locale}
              toman={toman}
              labelOf={(period) => labelOf(grain, period)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCharts({
  icon,
  title,
  rows,
  locale,
  countLabel,
  amountLabel,
}: {
  icon: typeof Building2
  title: string
  rows: FoodCostEstimateGroup[]
  locale: string
  countLabel: string
  amountLabel: string
}) {
  const top = rows.slice(0, 12)
  return (
    <FormCard icon={icon} title={title}>
      <div className={`${formCardBodyClassName} grid gap-4 xl:grid-cols-2`}>
        <ChartPanel icon={Hash} title={countLabel} empty={top.every((item) => item.count === 0)}>
          <ReportBar locale={locale} data={top.map((item) => ({ name: item.name, value: item.count }))} />
        </ChartPanel>
        <ChartPanel icon={Wallet} title={amountLabel} empty={top.every((item) => item.totalPrice === 0)}>
          <ReportBar locale={locale} data={top.map((item) => ({ name: item.name, value: item.totalPrice }))} />
        </ChartPanel>
      </div>
    </FormCard>
  )
}

function GroupTable({
  icon: Icon,
  title,
  rows,
  totalCost,
  locale,
  toman,
}: {
  icon: typeof Building2
  title: string
  rows: FoodCostEstimateGroup[]
  totalCost: number
  locale: string
  toman: string
}) {
  const { t } = useTranslation()
  return (
    <FormCard icon={Icon} title={title}>
      <div className={formCardBodyClassName}>
        <TableCard loading={false} empty={t('foodUnitReport.empty')} hasRows={rows.length > 0} rowClick={false}>
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-ink-700">
              <tr>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.name')}</th>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.count')}</th>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.quantity')}</th>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.amount')}</th>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.share')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{formatNumber(item.count, locale)}</td>
                  <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                  <td className="px-4 py-3">{money(item.totalPrice, locale, toman)}</td>
                  <td className="px-4 py-3">{shareOf(item.totalPrice, totalCost, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </FormCard>
  )
}

function PeriodSection({
  grain,
  rows,
  totalCost,
  locale,
  toman,
  labelOf,
}: {
  grain: Grain
  rows: FoodCostEstimatePeriod[]
  totalCost: number
  locale: string
  toman: string
  labelOf: (period: string) => string
}) {
  const { t } = useTranslation()
  const titleKey = grain === 'week' ? 'byWeek' : grain === 'month' ? 'byMonth' : 'byYear'
  const chartRows = chartSlice(rows, grain).map((item) => ({
    name: labelOf(item.period),
    count: item.count,
    amount: item.totalPrice,
  }))
  const avgCount = rows.length ? rows.reduce((sum, item) => sum + item.count, 0) / rows.length : 0
  const avgAmount = rows.length ? rows.reduce((sum, item) => sum + item.totalPrice, 0) / rows.length : 0

  return (
    <FormCard icon={CalendarRange} title={t(`foodUnitReport.${titleKey}`)}>
      <div className={`${formCardBodyClassName} space-y-4`}>
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          <FormFactTile
            icon={CalendarRange}
            label={t('foodUnitReport.periods')}
            value={formatNumber(rows.length, locale)}
            tone="teal"
          />
          <FormFactTile
            icon={Hash}
            label={t('foodUnitReport.avgCount')}
            value={formatNumber(Math.round(avgCount), locale)}
            tone="mint"
          />
          <FormFactTile
            icon={Wallet}
            label={t('foodUnitReport.avgAmount')}
            value={money(avgAmount, locale, toman)}
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel
            icon={Hash}
            title={t('foodUnitReport.countChart')}
            empty={chartRows.every((item) => item.count === 0)}
          >
            <ReportBar locale={locale} data={chartRows.map((item) => ({ name: item.name, value: item.count }))} />
          </ChartPanel>
          <ChartPanel
            icon={Wallet}
            title={t('foodUnitReport.amountChart')}
            empty={chartRows.every((item) => item.amount === 0)}
          >
            <ReportBar locale={locale} data={chartRows.map((item) => ({ name: item.name, value: item.amount }))} />
          </ChartPanel>
        </div>
        <FormSectionTitle icon={CalendarRange}>{t(`foodUnitReport.${titleKey}`)}</FormSectionTitle>
        <TableCard loading={false} empty={t('foodUnitReport.empty')} hasRows={rows.length > 0} rowClick={false}>
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-ink-700">
              <tr>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.period')}</th>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.count')}</th>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.quantity')}</th>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.amount')}</th>
                <th className="px-4 py-3 text-start">{t('foodUnitReport.share')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.period} className="border-t border-line">
                  <td className="px-4 py-3">{labelOf(item.period)}</td>
                  <td className="px-4 py-3">{formatNumber(item.count, locale)}</td>
                  <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                  <td className="px-4 py-3">{money(item.totalPrice, locale, toman)}</td>
                  <td className="px-4 py-3">{shareOf(item.totalPrice, totalCost, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </FormCard>
  )
}
