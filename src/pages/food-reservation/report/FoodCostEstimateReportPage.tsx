import {
  Building2,
  CalendarRange,
  ChartColumn,
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
import { SearchBar, TableCard } from '../../../components/ui/ListControls'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useListParams } from '../../../hooks/useListParams'
import { api } from '../../../lib/api'
import { formatDate, formatGroupedNumber, formatNumber } from '../../../lib/datetime'
import {
  ChartPanel,
  ReportBar,
  ReportDonut,
  formatYearMonth,
  reportColors,
} from '../../projects/ProjectReportCharts'
import type {
  Food,
  FoodCostEstimateFoodGroup,
  FoodCostEstimateGroup,
  FoodCostEstimatePeriod,
  FoodCostEstimateReport,
  OrganizationUnit,
  Restaurant,
} from '../../../types/app'

const periodKeys = ['month', 'week', 'day'] as const
type PeriodKey = (typeof periodKeys)[number]

function money(value: number, locale: string, toman: string) {
  return `${formatGroupedNumber(Math.round(value), locale)} ${toman}`
}

function highlight(name: string | undefined, amount: number | undefined, locale: string, toman: string) {
  if (!name) return '—'
  return `${name} (${money(amount ?? 0, locale, toman)})`
}

function shareOf(amount: number, total: number, locale: string) {
  if (total <= 0) return formatNumber(0, locale)
  return `${formatNumber(Math.round((amount / total) * 100), locale)}٪`
}

function periodRows(report: FoodCostEstimateReport, period: PeriodKey) {
  if (period === 'day') return report.byDay
  if (period === 'week') return report.byWeek
  return report.byMonth
}

function chartSlice(rows: FoodCostEstimatePeriod[], period: PeriodKey) {
  if (period === 'day') return rows.slice(-31)
  if (period === 'week') return rows.slice(-12)
  return rows.slice(-18)
}

export function FoodCostEstimateReportPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const toman = t('foodReservations.toman')
  const { q, term, setTerm, applySearch, searchParams, setParams } = useListParams()
  const reservedFrom = searchParams.get('reservedFrom') ?? ''
  const reservedTo = searchParams.get('reservedTo') ?? ''
  const orgUnitId = searchParams.get('orgUnitId') ?? ''
  const restaurantId = searchParams.get('restaurantId') ?? ''
  const foodId = searchParams.get('foodId') ?? ''
  const status = searchParams.get('status') ?? ''
  const period = (periodKeys.includes(searchParams.get('period') as PeriodKey)
    ? searchParams.get('period')
    : 'month') as PeriodKey
  const filtersActive = Boolean(reservedFrom || reservedTo || orgUnitId || restaurantId || foodId || status)

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const restaurants = useQuery({
    queryKey: ['restaurants', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Restaurant[]>('/restaurants')
      return data
    },
  })
  const foods = useQuery({
    queryKey: ['foods', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Food[]>('/foods')
      return data
    },
  })
  const query = useQuery({
    queryKey: [
      'food-reservations',
      'cost-estimate',
      q,
      reservedFrom,
      reservedTo,
      orgUnitId,
      restaurantId,
      foodId,
      status,
    ],
    queryFn: async () => {
      const { data } = await api.get<FoodCostEstimateReport>('/food-reservations/cost-estimate', {
        params: {
          ...(q ? { q } : {}),
          ...(reservedFrom ? { reservedFrom } : {}),
          ...(reservedTo ? { reservedTo } : {}),
          ...(orgUnitId ? { orgUnitId } : {}),
          ...(restaurantId ? { restaurantId } : {}),
          ...(foodId ? { foodId } : {}),
          ...(status ? { status } : {}),
        },
      })
      return data
    },
  })

  const report = query.data
  const kpis = report?.summary
  const extremes = report?.extremes
  const totalCost = kpis?.totalCost ?? 0
  const rows = report ? periodRows(report, period) : []
  const chartPeriods = chartSlice(rows, period).map((item) => ({
    name:
      period === 'month'
        ? formatYearMonth(item.period, locale)
        : period === 'week'
          ? t('foodCostEstimate.weekOf', { date: formatDate(item.period, locale) })
          : formatDate(item.period, locale),
    value: item.totalPrice,
  }))
  const unitSlices = (report?.byUnit ?? []).map((item, index) => ({
    name: item.name,
    value: item.totalPrice,
    color: [reportColors.teal, reportColors.mint, reportColors.tealDark, reportColors.tealSoft, reportColors.tealDeep, reportColors.ink][
      index % 6
    ],
  }))
  const foodBars = (report?.byFood ?? []).slice(0, 12).map((item) => ({
    name: item.name,
    value: item.totalPrice,
  }))

  function periodLabel(item: FoodCostEstimatePeriod) {
    if (period === 'month') return formatYearMonth(item.period, locale)
    if (period === 'week') return t('foodCostEstimate.weekOf', { date: formatDate(item.period, locale) })
    return formatDate(item.period, locale)
  }

  return (
    <div className={listShellClassName}>
      <PageHeader title={t('menus.foodCostEstimate')} subtitle={t('foodCostEstimate.subtitle')} />
      <FormCard icon={CalendarRange} title={t('foodCostEstimate.range')} subtitle={t('foodCostEstimate.rangeHint')}>
        <div className={`${formCardBodyClassName} grid gap-4 sm:grid-cols-2`}>
          <FormField icon={CalendarRange} label={t('foodReservations.fromDate')} htmlFor="costFrom">
            <PersianDateField
              id="costFrom"
              value={reservedFrom}
              maxDate={reservedTo || undefined}
              onChange={(value) => setParams({ reservedFrom: value || undefined }, { resetPage: true })}
            />
          </FormField>
          <FormField icon={CalendarRange} label={t('foodReservations.toDate')} htmlFor="costTo">
            <PersianDateField
              id="costTo"
              value={reservedTo}
              minDate={reservedFrom || undefined}
              onChange={(value) => setParams({ reservedTo: value || undefined }, { resetPage: true })}
            />
          </FormField>
        </div>
      </FormCard>
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('foodCostEstimate.search')}
        placeholder={t('foodCostEstimate.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-2 xl:grid-cols-4"
        extra={
          <>
            <FormField icon={Building2} label={t('foodReservations.orgUnit')} htmlFor="costUnit">
              <SearchSelect
                id="costUnit"
                value={orgUnitId}
                onChange={(next) => setParams({ orgUnitId: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.filterUnit')}
                options={[
                  { value: '', label: t('foodReservations.allUnits') },
                  ...(units.data ?? []).map((unit) => ({ value: unit.id, label: unit.name })),
                ]}
              />
            </FormField>
            <FormField icon={Store} label={t('foodReservations.restaurant')} htmlFor="costRestaurant">
              <SearchSelect
                id="costRestaurant"
                value={restaurantId}
                onChange={(next) => setParams({ restaurantId: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.selectRestaurant')}
                options={[
                  { value: '', label: t('foodReservations.allRestaurants') },
                  ...(restaurants.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </FormField>
            <FormField icon={UtensilsCrossed} label={t('foodReservations.food')} htmlFor="costFood">
              <SearchSelect
                id="costFood"
                value={foodId}
                onChange={(next) => setParams({ foodId: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.selectFood')}
                options={[
                  { value: '', label: t('foodReservations.allFoods') },
                  ...(foods.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </FormField>
            <FormField icon={Ticket} label={t('foodReservations.status')} htmlFor="costStatus">
              <SearchSelect
                id="costStatus"
                value={status}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.status')}
                options={[
                  { value: '', label: t('foodReservations.allStatuses') },
                  { value: 'PENDING', label: t('foodReservations.pending') },
                  { value: 'CONFIRMED', label: t('foodReservations.confirmed') },
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
      ) : query.isLoading || !report || !kpis || !extremes ? (
        <LoadingState />
      ) : (
        <div className="space-y-5">
          <FormCard icon={Wallet} title={t('foodCostEstimate.overview')}>
            <div className={`${formCardBodyClassName} space-y-5`}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-3">
                <FormFactTile
                  icon={Wallet}
                  label={t('foodCostEstimate.totalCost')}
                  value={money(kpis.totalCost, locale, toman)}
                  tone="teal"
                />
                <FormFactTile
                  icon={Ticket}
                  label={t('foodCostEstimate.confirmedCost')}
                  value={money(kpis.confirmedCost, locale, toman)}
                  tone="mint"
                />
                <FormFactTile
                  icon={Ticket}
                  label={t('foodCostEstimate.pendingCost')}
                  value={money(kpis.pendingCost, locale, toman)}
                />
                <FormFactTile
                  icon={UtensilsCrossed}
                  label={t('foodCostEstimate.totalQuantity')}
                  value={formatNumber(kpis.totalQuantity, locale)}
                  tone="teal"
                />
                <FormFactTile
                  icon={Ticket}
                  label={t('foodCostEstimate.reservationCount')}
                  value={formatNumber(kpis.reservationCount, locale)}
                  tone="mint"
                />
                <FormFactTile
                  icon={Wallet}
                  label={t('foodCostEstimate.avgPerServing')}
                  value={money(kpis.avgCostPerServing, locale, toman)}
                />
                <FormFactTile
                  icon={Wallet}
                  label={t('foodCostEstimate.avgPerReservation')}
                  value={money(kpis.avgCostPerReservation, locale, toman)}
                  tone="teal"
                />
                <FormFactTile
                  icon={CalendarRange}
                  label={t('foodCostEstimate.avgDailyCost')}
                  value={money(kpis.avgDailyCost, locale, toman)}
                  tone="mint"
                />
                <FormFactTile
                  icon={CalendarRange}
                  label={t('foodCostEstimate.uniqueDays')}
                  value={formatNumber(kpis.uniqueDays, locale)}
                />
                <FormFactTile
                  icon={UserRound}
                  label={t('foodCostEstimate.uniqueEmployees')}
                  value={formatNumber(kpis.uniqueEmployees, locale)}
                  tone="teal"
                />
              </div>
              <FormSectionTitle icon={ChartColumn}>{t('foodCostEstimate.highlights')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
                <FormFactTile
                  icon={Building2}
                  label={t('foodCostEstimate.highestCostUnit')}
                  value={highlight(extremes.highestCostUnit?.name, extremes.highestCostUnit?.totalPrice, locale, toman)}
                  empty={!extremes.highestCostUnit}
                  tone="teal"
                />
                <FormFactTile
                  icon={Building2}
                  label={t('foodCostEstimate.lowestCostUnit')}
                  value={highlight(extremes.lowestCostUnit?.name, extremes.lowestCostUnit?.totalPrice, locale, toman)}
                  empty={!extremes.lowestCostUnit}
                  tone="mint"
                />
                <FormFactTile
                  icon={UtensilsCrossed}
                  label={t('foodCostEstimate.mostExpensiveFood')}
                  value={highlight(
                    extremes.mostExpensiveFood?.name,
                    extremes.mostExpensiveFood?.avgUnitPrice,
                    locale,
                    toman,
                  )}
                  empty={!extremes.mostExpensiveFood}
                />
                <FormFactTile
                  icon={UtensilsCrossed}
                  label={t('foodCostEstimate.cheapestFood')}
                  value={highlight(extremes.cheapestFood?.name, extremes.cheapestFood?.avgUnitPrice, locale, toman)}
                  empty={!extremes.cheapestFood}
                  tone="teal"
                />
                <FormFactTile
                  icon={UtensilsCrossed}
                  label={t('foodCostEstimate.topSpendFood')}
                  value={highlight(extremes.topSpendFood?.name, extremes.topSpendFood?.totalPrice, locale, toman)}
                  empty={!extremes.topSpendFood}
                  tone="mint"
                />
                <FormFactTile
                  icon={Store}
                  label={t('foodCostEstimate.topSpendRestaurant')}
                  value={highlight(
                    extremes.topSpendRestaurant?.name,
                    extremes.topSpendRestaurant?.totalPrice,
                    locale,
                    toman,
                  )}
                  empty={!extremes.topSpendRestaurant}
                />
              </div>
            </div>
          </FormCard>

          <FormCard icon={ChartColumn} title={t('foodCostEstimate.charts')}>
            <div className={`${formCardBodyClassName} space-y-4`}>
              <FormField icon={CalendarRange} label={t('foodCostEstimate.period')} htmlFor="costPeriod">
                <SearchSelect
                  id="costPeriod"
                  value={period}
                  onChange={(next) => setParams({ period: next || 'month' })}
                  placeholder={t('foodCostEstimate.period')}
                  options={periodKeys.map((value) => ({
                    value,
                    label: t(`foodCostEstimate.${value === 'day' ? 'byDay' : value === 'week' ? 'byWeek' : 'byMonth'}`),
                  }))}
                />
              </FormField>
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartPanel
                  icon={CalendarRange}
                  title={t('foodCostEstimate.periodChart')}
                  empty={chartPeriods.every((item) => item.value === 0)}
                >
                  <ReportBar locale={locale} data={chartPeriods} />
                </ChartPanel>
                <ChartPanel
                  icon={Building2}
                  title={t('foodCostEstimate.unitShare')}
                  empty={unitSlices.every((item) => item.value === 0)}
                >
                  <ReportDonut data={unitSlices} locale={locale} />
                </ChartPanel>
                <ChartPanel
                  icon={UtensilsCrossed}
                  title={t('foodCostEstimate.foodChart')}
                  empty={foodBars.every((item) => item.value === 0)}
                >
                  <ReportBar locale={locale} data={foodBars} />
                </ChartPanel>
                <ChartPanel
                  icon={Building2}
                  title={t('foodCostEstimate.byUnit')}
                  empty={(report.byUnit ?? []).length === 0}
                >
                  <ReportBar
                    locale={locale}
                    data={report.byUnit.map((item) => ({ name: item.name, value: item.totalPrice }))}
                  />
                </ChartPanel>
              </div>
            </div>
          </FormCard>

          <CostTable
            icon={Building2}
            title={t('foodCostEstimate.byUnit')}
            empty={t('foodCostEstimate.empty')}
            rows={report.byUnit}
            totalCost={totalCost}
            locale={locale}
            toman={toman}
          />
          <FoodCostTable
            title={t('foodCostEstimate.byFood')}
            empty={t('foodCostEstimate.empty')}
            rows={report.byFood}
            totalCost={totalCost}
            locale={locale}
            toman={toman}
          />
          <CostTable
            icon={Store}
            title={t('foodCostEstimate.byRestaurant')}
            empty={t('foodCostEstimate.empty')}
            rows={report.byRestaurant}
            totalCost={totalCost}
            locale={locale}
            toman={toman}
          />
          <FormCard icon={CalendarRange} title={t('foodCostEstimate.byPeriod')}>
            <div className={formCardBodyClassName}>
              <FormSectionTitle icon={CalendarRange}>
                {t(`foodCostEstimate.${period === 'day' ? 'byDay' : period === 'week' ? 'byWeek' : 'byMonth'}`)}
              </FormSectionTitle>
              <TableCard loading={false} empty={t('foodCostEstimate.empty')} hasRows={rows.length > 0} rowClick={false}>
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.name')}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.count')}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.quantity')}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.cost')}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.share')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.period} className="border-t border-line">
                        <td className="px-4 py-3">{periodLabel(item)}</td>
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
        </div>
      )}
    </div>
  )
}

function CostTable({
  icon: Icon,
  title,
  empty,
  rows,
  totalCost,
  locale,
  toman,
}: {
  icon: typeof Building2
  title: string
  empty: string
  rows: FoodCostEstimateGroup[]
  totalCost: number
  locale: string
  toman: string
}) {
  const { t } = useTranslation()
  return (
    <FormCard icon={Icon} title={title}>
      <div className={formCardBodyClassName}>
        <TableCard loading={false} empty={empty} hasRows={rows.length > 0} rowClick={false}>
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-ink-700">
              <tr>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.name')}</th>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.count')}</th>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.quantity')}</th>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.cost')}</th>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.share')}</th>
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

function FoodCostTable({
  title,
  empty,
  rows,
  totalCost,
  locale,
  toman,
}: {
  title: string
  empty: string
  rows: FoodCostEstimateFoodGroup[]
  totalCost: number
  locale: string
  toman: string
}) {
  const { t } = useTranslation()
  return (
    <FormCard icon={UtensilsCrossed} title={title}>
      <div className={formCardBodyClassName}>
        <TableCard loading={false} empty={empty} hasRows={rows.length > 0} rowClick={false}>
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-ink-700">
              <tr>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.name')}</th>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.count')}</th>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.quantity')}</th>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.avgPrice')}</th>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.cost')}</th>
                <th className="px-4 py-3 text-start">{t('foodCostEstimate.share')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{formatNumber(item.count, locale)}</td>
                  <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                  <td className="px-4 py-3">{money(item.avgUnitPrice, locale, toman)}</td>
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
