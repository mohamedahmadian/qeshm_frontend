import {
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Hash,
  Minus,
  Store,
  TrendingDown,
  TrendingUp,
  Ticket,
  Utensils,
  UtensilsCrossed,
  Wallet,
  Crown,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Button,
  FormField,
  LoadingState,
  PageHeader,
  ToggleField,
  listShellClassName,
} from '../../../components/ui/Form'
import {
  FormCard,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../../components/ui/FormLayout'
import { PaginationBar, SortableTh, TableCard } from '../../../components/ui/ListControls'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api, getApiErrorMessage } from '../../../lib/api'
import {
  addDaysIso,
  formatDate,
  formatGroupedNumber,
  formatNumber,
  formatWeekday,
  todayIsoDate,
} from '../../../lib/datetime'
import {
  ChartPanel,
  ReportBar,
} from '../../projects/ProjectReportCharts'
import type {
  FoodDailyReport,
  FoodDailyReportTotals,
  OrganizationUnit,
  Restaurant,
} from '../../../types/app'
import { FoodMealTypeBadge, GuestCountBadge } from '../FoodReservationStatusBadge'

function money(value: number, locale: string) {
  return formatGroupedNumber(Math.round(value), locale)
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-ink-300">{children}</span>
}

function Count({ value, locale }: { value: number; locale: string }) {
  return value === 0 ? <Muted>{formatNumber(0, locale)}</Muted> : <>{formatNumber(value, locale)}</>
}

function Amount({ value, locale }: { value: number; locale: string }) {
  return value === 0 ? <Muted>{formatNumber(0, locale)}</Muted> : <>{money(value, locale)}</>
}

function Delta({
  current,
  previous,
  previousDate,
  locale,
  amount = false,
}: {
  current: number
  previous: number
  previousDate: string
  locale: string
  amount?: boolean
}) {
  const { t } = useTranslation()
  const label = t('foodDailyReport.vsPrevious', { date: formatDate(previousDate, locale) })
  let tone = 'text-ink-500'
  let Icon = Minus
  let text = t('foodDailyReport.same')
  if (previous === 0 && current > 0) {
    text = t('foodDailyReport.noPrevious')
  } else if (previous > 0 && current !== previous) {
    const percent = Math.round((Math.abs(current - previous) / previous) * 100)
    const diff = amount
      ? money(Math.abs(current - previous), locale)
      : formatNumber(Math.abs(current - previous), locale)
    const up = current > previous
    Icon = up ? TrendingUp : TrendingDown
    tone = up ? 'text-teal-700' : 'text-amber-700'
    text = `${up ? '+' : '−'}${diff} (${formatNumber(percent, locale)}٪)`
  }
  return (
    <p className={`mt-1 flex flex-wrap items-center gap-1 text-[11px] font-medium ${tone}`} title={label}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span dir="auto">{text}</span>
    </p>
  )
}

function AmountHint({ value, locale, toman }: { value: number; locale: string; toman: string }) {
  return (
    <p className="mt-1 text-[11px] font-medium text-ink-500">
      {money(value, locale)} {toman}
    </p>
  )
}

export function FoodDailyReportPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const toman = t('foodReservations.toman')
  const { searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const today = todayIsoDate()
  const date = searchParams.get('date') || today
  const orgUnitId = searchParams.get('orgUnitId') ?? ''
  const restaurantId = searchParams.get('restaurantId') ?? ''
  const mealType = searchParams.get('mealType') ?? ''
  const status = searchParams.get('status') ?? ''
  const showEmpty = searchParams.get('showEmpty') === '1'
  const [exporting, setExporting] = useState(false)

  const filterParams = {
    date,
    ...(orgUnitId ? { orgUnitId } : {}),
    ...(restaurantId ? { restaurantId } : {}),
    ...(mealType ? { mealType } : {}),
    ...(status ? { status } : {}),
    ...(showEmpty ? { showEmpty: 'true' } : {}),
    ...sortParams,
  }

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
  const query = useQuery({
    queryKey: ['food-reservations', 'daily-report', filterParams],
    queryFn: async () => {
      const { data } = await api.get<FoodDailyReport>('/food-reservations/daily-report', {
        params: filterParams,
      })
      return data
    },
  })

  async function downloadExcel() {
    setExporting(true)
    try {
      const response = await api.get<Blob>('/food-reservations/daily-report/export', {
        params: filterParams,
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `گزارش-روزانه-غذا-${date}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('foodDailyReport.exportFailed')))
    } finally {
      setExporting(false)
    }
  }

  const report = query.data
  const summary = report?.summary
  const weekday = formatWeekday(date, locale)
  const dateTitle = [weekday, formatDate(date, locale)].filter(Boolean).join(' ')
  const hasData = Boolean(report && (report.rows.length > 0 || report.summary.orderCount > 0))

  const sortProps = { sortBy, sortDir, onSort }
  const th = 'px-4 py-3 text-start font-medium'

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={CalendarDays}
        title={t('menus.foodDailyReport')}
        subtitle={t('foodDailyReport.subtitle')}
      />

      <FormCard
        icon={CalendarRange}
        title={t('foodDailyReport.filters')}
        subtitle={t('foodDailyReport.filtersHint')}
      >
        <div className={`${formCardBodyClassName} grid gap-4 sm:grid-cols-2 xl:grid-cols-3`}>
          <FormField icon={CalendarDays} label={t('foodDailyReport.date')} htmlFor="dailyReportDate">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                icon
                aria-label={t('foodDailyReport.prevDay')}
                title={t('foodDailyReport.prevDay')}
                onClick={() => setParams({ date: addDaysIso(date, -1) })}
              >
                <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
              </Button>
              <div className="min-w-0 flex-1">
                <PersianDateField
                  id="dailyReportDate"
                  value={date}
                  onChange={(value) => setParams({ date: value || undefined })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                icon
                aria-label={t('foodDailyReport.nextDay')}
                title={t('foodDailyReport.nextDay')}
                onClick={() => setParams({ date: addDaysIso(date, 1) })}
              >
                <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
              </Button>
            </div>
          </FormField>
          <FormField icon={Building2} label={t('foodDailyReport.unit')} htmlFor="dailyReportUnit">
            <SearchSelect
              id="dailyReportUnit"
              value={orgUnitId}
              onChange={(next) => setParams({ orgUnitId: next || undefined })}
              placeholder={t('foodReservations.filterUnit')}
              options={[
                { value: '', label: t('foodReservations.allUnits') },
                ...(units.data ?? []).map((unit) => ({
                  value: unit.id,
                  label: unit.pathLabel || unit.name,
                })),
              ]}
            />
          </FormField>
          <FormField icon={Store} label={t('foodDailyReport.restaurant')} htmlFor="dailyReportRestaurant">
            <SearchSelect
              id="dailyReportRestaurant"
              value={restaurantId}
              onChange={(next) => setParams({ restaurantId: next || undefined })}
              placeholder={t('foodReservations.selectRestaurant')}
              options={[
                { value: '', label: t('foodReservations.allRestaurants') },
                ...(restaurants.data ?? []).map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </FormField>
          <FormField icon={Utensils} label={t('foodDailyReport.mealType')} htmlFor="dailyReportMeal">
            <SearchSelect
              id="dailyReportMeal"
              value={mealType}
              onChange={(next) => setParams({ mealType: next || undefined })}
              placeholder={t('foodReservations.mealType')}
              options={[
                { value: '', label: t('foodReservations.allMealTypes') },
                { value: 'LUNCH', label: t('foodReservations.lunch') },
                { value: 'DINNER', label: t('foodReservations.dinner') },
              ]}
            />
          </FormField>
          <FormField icon={Ticket} label={t('foodDailyReport.status')} htmlFor="dailyReportStatus">
            <SearchSelect
              id="dailyReportStatus"
              value={status}
              onChange={(next) => setParams({ status: next || undefined })}
              placeholder={t('foodReservations.status')}
              options={[
                { value: '', label: t('foodReservations.allStatuses') },
                { value: 'PENDING', label: t('foodReservations.pending') },
                { value: 'CONFIRMED', label: t('foodReservations.confirmed') },
              ]}
            />
          </FormField>
          <FormField icon={Eye} label={t('foodDailyReport.showEmpty')} htmlFor="dailyReportShowEmpty">
            <ToggleField
              id="dailyReportShowEmpty"
              checked={showEmpty}
              onChange={(next) => setParams({ showEmpty: next ? '1' : undefined })}
              onLabel={t('foodDailyReport.showEmptyOn')}
              offLabel={t('foodDailyReport.showEmptyOff')}
            />
          </FormField>
        </div>
      </FormCard>

      {query.isError ? (
        <p className="rounded-2xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
          {t('common.error')}
        </p>
      ) : query.isLoading || !report || !summary ? (
        <LoadingState />
      ) : (
        <div className="space-y-5">
          <FormCard
            icon={Wallet}
            title={t('foodDailyReport.overview')}
            subtitle={t('foodDailyReport.overviewSubtitle', { weekday, date: formatDate(date, locale) })}
          >
            <div
              className={`${formCardBodyClassName} grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-3`}
            >
              <FormFactTile
                icon={UtensilsCrossed}
                label={t('foodDailyReport.orderAndServingsLabel')}
                value={t('foodDailyReport.orderAndServingsValue', {
                  orders: formatNumber(summary.orderCount, locale),
                  servings: formatNumber(summary.servings, locale),
                })}
                tone="teal"
                extra={
                  <Delta
                    current={summary.servings}
                    previous={report.previous.servings}
                    previousDate={report.previousDate}
                    locale={locale}
                  />
                }
              />
              <FormFactTile
                icon={Wallet}
                label={t('foodDailyReport.totalAmount')}
                value={`${money(summary.totalAmount, locale)} ${toman}`}
                tone="mint"
                extra={
                  <Delta
                    amount
                    current={summary.totalAmount}
                    previous={report.previous.totalAmount}
                    previousDate={report.previousDate}
                    locale={locale}
                  />
                }
              />
              <FormFactTile
                icon={UserRound}
                label={t('foodDailyReport.employeeQuantity')}
                value={
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span>{formatNumber(summary.employeeQuantity, locale)}</span>
                    <GuestCountBadge qty={summary.employeeGuestQuantity ?? 0} locale={locale} />
                  </span>
                }
                tone="teal"
                extra={<AmountHint value={summary.employeeAmount} locale={locale} toman={toman} />}
              />
              <FormFactTile
                icon={Crown}
                label={t('foodDailyReport.managementQuantity')}
                value={
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span>{formatNumber(summary.managementQuantity, locale)}</span>
                    <GuestCountBadge qty={summary.managementGuestQuantity ?? 0} locale={locale} />
                  </span>
                }
                tone="mint"
                extra={<AmountHint value={summary.managementAmount} locale={locale} toman={toman} />}
              />
              <FormFactTile
                icon={UserPlus}
                label={t('foodDailyReport.guestQuantity')}
                value={formatNumber(summary.guestQuantity ?? 0, locale)}
                extra={<AmountHint value={summary.guestAmount ?? 0} locale={locale} toman={toman} />}
              />
              <FormFactTile
                icon={Building2}
                label={t('foodDailyReport.unitCount')}
                value={formatNumber(summary.unitCount, locale)}
                tone="teal"
              />
              <FormFactTile
                icon={Building2}
                label={t('foodDailyReport.idleUnitCount')}
                value={formatNumber(summary.idleUnitCount, locale)}
              />
              <FormFactTile
                icon={Store}
                label={t('foodDailyReport.restaurantCount')}
                value={formatNumber(summary.restaurantCount, locale)}
                tone="mint"
              />
            </div>
          </FormCard>

          <FormCard
            icon={Building2}
            title={t('foodDailyReport.tableTitle')}
            subtitle={`${t('foodDailyReport.tableSubtitle')} · ${dateTitle}`}
          >
            <div className={formCardBodyClassName}>
              <TableCard
                loading={false}
                empty={t('foodDailyReport.empty')}
                hasRows={report.rows.length > 0}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <SortableTh column="unit" label={t('foodDailyReport.colUnit')} {...sortProps} />
                      <SortableTh column="restaurant" label={t('foodDailyReport.colRestaurant')} {...sortProps} />
                      <SortableTh column="mealType" label={t('foodDailyReport.colMealType')} {...sortProps} />
                      <SortableTh column="orderCount" label={t('foodDailyReport.colOrderCount')} {...sortProps} />
                      <SortableTh column="servings" label={t('foodDailyReport.colServings')} {...sortProps} />
                      <SortableTh
                        column="employeeQuantity"
                        label={t('foodDailyReport.colEmployeeQuantity')}
                        {...sortProps}
                      />
                      <SortableTh
                        column="employeeAmount"
                        label={`${t('foodDailyReport.colEmployeeAmount')} (${toman})`}
                        {...sortProps}
                      />
                      <SortableTh
                        column="managementQuantity"
                        label={t('foodDailyReport.colManagementQuantity')}
                        {...sortProps}
                      />
                      <SortableTh
                        column="managementAmount"
                        label={`${t('foodDailyReport.colManagementAmount')} (${toman})`}
                        {...sortProps}
                      />
                      <SortableTh
                        column="guestQuantity"
                        label={t('foodDailyReport.colGuestQuantity')}
                        {...sortProps}
                      />
                      <SortableTh
                        column="guestAmount"
                        label={`${t('foodDailyReport.colGuestAmount')} (${toman})`}
                        {...sortProps}
                      />
                      <SortableTh
                        column="totalAmount"
                        label={`${t('foodDailyReport.colTotalAmount')} (${toman})`}
                        {...sortProps}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => {
                      const idle = row.orderCount === 0
                      return (
                        <tr
                          key={`${row.unitId}-${row.restaurantId ?? ''}-${row.mealType ?? ''}`}
                          className={`border-t border-line ${idle ? 'bg-cream-50/60 text-ink-500' : ''}`}
                        >
                          <td className="px-4 py-3">{row.unitName}</td>
                          <td className="px-4 py-3">{row.restaurantName ?? <Muted>—</Muted>}</td>
                          <td className="px-4 py-3">
                            {row.mealType ? (
                              <FoodMealTypeBadge mealType={row.mealType} />
                            ) : (
                              <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                {t('foodDailyReport.noOrder')}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3"><Count value={row.orderCount} locale={locale} /></td>
                          <td className="px-4 py-3 font-medium"><Count value={row.servings} locale={locale} /></td>
                          <td className="px-4 py-3"><Count value={row.employeeQuantity} locale={locale} /></td>
                          <td className="px-4 py-3"><Amount value={row.employeeAmount} locale={locale} /></td>
                          <td className="px-4 py-3"><Count value={row.managementQuantity} locale={locale} /></td>
                          <td className="px-4 py-3"><Amount value={row.managementAmount} locale={locale} /></td>
                          <td className="px-4 py-3"><Count value={row.guestQuantity ?? 0} locale={locale} /></td>
                          <td className="px-4 py-3"><Amount value={row.guestAmount ?? 0} locale={locale} /></td>
                          <td className="px-4 py-3 font-semibold text-ink-900">
                            <Amount value={row.totalAmount} locale={locale} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-teal-200 bg-teal-50 font-semibold text-teal-900">
                      <td className="px-4 py-3" colSpan={3}>{t('foodDailyReport.total')}</td>
                      <td className="px-4 py-3">{formatNumber(summary.orderCount, locale)}</td>
                      <td className="px-4 py-3">{formatNumber(summary.servings, locale)}</td>
                      <td className="px-4 py-3">{formatNumber(summary.employeeQuantity, locale)}</td>
                      <td className="px-4 py-3">{money(summary.employeeAmount, locale)}</td>
                      <td className="px-4 py-3">{formatNumber(summary.managementQuantity, locale)}</td>
                      <td className="px-4 py-3">{money(summary.managementAmount, locale)}</td>
                      <td className="px-4 py-3">{formatNumber(summary.guestQuantity ?? 0, locale)}</td>
                      <td className="px-4 py-3">{money(summary.guestAmount ?? 0, locale)}</td>
                      <td className="px-4 py-3">{money(summary.totalAmount, locale)}</td>
                    </tr>
                  </tfoot>
                </table>
              </TableCard>
              <PaginationBar
                page={1}
                pageSize={Math.max(report.rows.length, 1)}
                total={report.rows.length}
                onPageChange={() => undefined}
                startExtra={
                  hasData ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={exporting}
                      onClick={() => void downloadExcel()}
                    >
                      <FileSpreadsheet className="size-4" aria-hidden />
                      {t('foodDailyReport.exportExcel')}
                    </Button>
                  ) : null
                }
              />
            </div>
          </FormCard>

          {report.byRestaurant.length > 0 ? (
            <FormCard icon={Store} title={t('foodDailyReport.byRestaurant')}>
              <div className={formCardBodyClassName}>
                <TableCard loading={false} empty={t('foodDailyReport.empty')} hasRows rowClick={false}>
                  <SummaryTable
                    rows={report.byRestaurant.map((item) => ({ key: item.id, name: item.name, totals: item }))}
                    nameLabel={t('foodDailyReport.colRestaurant')}
                    locale={locale}
                    toman={toman}
                  />
                </TableCard>
              </div>
            </FormCard>
          ) : null}

          {report.byMealType.length > 1 ? (
            <FormCard icon={Utensils} title={t('foodDailyReport.byMealType')}>
              <div className={formCardBodyClassName}>
                <TableCard loading={false} empty={t('foodDailyReport.empty')} hasRows rowClick={false}>
                  <SummaryTable
                    rows={report.byMealType.map((item) => ({
                      key: item.mealType,
                      name: <FoodMealTypeBadge mealType={item.mealType} />,
                      totals: item,
                    }))}
                    nameLabel={t('foodDailyReport.colMealType')}
                    locale={locale}
                    toman={toman}
                  />
                </TableCard>
              </div>
            </FormCard>
          ) : null}

          <TrendSection report={report} locale={locale} toman={toman} th={th} />
        </div>
      )}
    </div>
  )
}

function SummaryTable({
  rows,
  nameLabel,
  locale,
  toman,
}: {
  rows: { key: string; name: ReactNode; totals: FoodDailyReportTotals }[]
  nameLabel: string
  locale: string
  toman: string
}) {
  const { t } = useTranslation()
  return (
    <table className="w-full text-sm">
      <thead className="bg-cream-50 text-ink-700">
        <tr>
          <th className="px-4 py-3 text-start font-medium">{nameLabel}</th>
          <th className="px-4 py-3 text-start font-medium">{t('foodDailyReport.colOrderCount')}</th>
          <th className="px-4 py-3 text-start font-medium">{t('foodDailyReport.colServings')}</th>
          <th className="px-4 py-3 text-start font-medium">{t('foodDailyReport.colEmployeeQuantity')}</th>
          <th className="px-4 py-3 text-start font-medium">{t('foodDailyReport.colManagementQuantity')}</th>
          <th className="px-4 py-3 text-start font-medium">{t('foodDailyReport.colGuestQuantity')}</th>
          <th className="px-4 py-3 text-start font-medium">
            {t('foodDailyReport.colTotalAmount')} ({toman})
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ key, name, totals }) => (
          <tr key={key} className="border-t border-line">
            <td className="px-4 py-3">{name}</td>
            <td className="px-4 py-3">{formatNumber(totals.orderCount, locale)}</td>
            <td className="px-4 py-3 font-medium">{formatNumber(totals.servings, locale)}</td>
            <td className="px-4 py-3">{formatNumber(totals.employeeQuantity, locale)}</td>
            <td className="px-4 py-3">{formatNumber(totals.managementQuantity, locale)}</td>
            <td className="px-4 py-3">{formatNumber(totals.guestQuantity ?? 0, locale)}</td>
            <td className="px-4 py-3 font-semibold text-ink-900">{money(totals.totalAmount, locale)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TrendSection({
  report,
  locale,
  toman,
  th,
}: {
  report: FoodDailyReport
  locale: string
  toman: string
  th: string
}) {
  const { t } = useTranslation()
  const chartRows = report.trend.map((item) => ({
    name: formatDate(item.date, locale),
    count: item.orderCount,
    amount: item.totalAmount,
  }))
  const empty = report.trend.every((item) => item.orderCount === 0)

  return (
    <FormCard
      icon={Hash}
      title={t('foodDailyReport.trend')}
      subtitle={t('foodDailyReport.trendSubtitle', { count: formatNumber(report.trend.length, locale) })}
    >
      <div className={`${formCardBodyClassName} space-y-4`}>
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel icon={Ticket} title={t('foodDailyReport.trendCountChart')} empty={empty}>
            <ReportBar locale={locale} data={chartRows.map((item) => ({ name: item.name, value: item.count }))} />
          </ChartPanel>
          <ChartPanel icon={Wallet} title={t('foodDailyReport.trendAmountChart')} empty={empty}>
            <ReportBar locale={locale} data={chartRows.map((item) => ({ name: item.name, value: item.amount }))} />
          </ChartPanel>
        </div>
        <FormSectionTitle icon={CalendarDays}>{t('foodDailyReport.trend')}</FormSectionTitle>
        <TableCard loading={false} empty={t('foodDailyReport.empty')} hasRows rowClick={false}>
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-ink-700">
              <tr>
                <th className={th}>{t('foodDailyReport.trendDay')}</th>
                <th className={th}>{t('foodDailyReport.colOrderCount')}</th>
                <th className={th}>{t('foodDailyReport.colServings')}</th>
                <th className={th}>{t('foodDailyReport.colEmployeeQuantity')}</th>
                <th className={th}>{t('foodDailyReport.colManagementQuantity')}</th>
                <th className={th}>{t('foodDailyReport.colGuestQuantity')}</th>
                <th className={th}>
                  {t('foodDailyReport.colTotalAmount')} ({toman})
                </th>
                <th className={th}>{t('foodDailyReport.trendDelta')}</th>
              </tr>
            </thead>
            <tbody>
              {[...report.trend].reverse().map((item, index, list) => {
                const before = list[index + 1]
                const selected = item.date === report.date
                const weekday = formatWeekday(item.date, locale)
                return (
                  <tr
                    key={item.date}
                    className={`border-t border-line ${selected ? 'bg-teal-50/70 font-medium' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="flex flex-col items-start gap-0.5">
                        <span>{formatDate(item.date, locale)}</span>
                        {weekday ? <span className="text-xs text-ink-500">{weekday}</span> : null}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Count value={item.orderCount} locale={locale} /></td>
                    <td className="px-4 py-3"><Count value={item.servings} locale={locale} /></td>
                    <td className="px-4 py-3"><Count value={item.employeeQuantity} locale={locale} /></td>
                    <td className="px-4 py-3"><Count value={item.managementQuantity} locale={locale} /></td>
                    <td className="px-4 py-3"><Count value={item.guestQuantity ?? 0} locale={locale} /></td>
                    <td className="px-4 py-3"><Amount value={item.totalAmount} locale={locale} /></td>
                    <td className="px-4 py-3">
                      {before ? (
                        <Delta
                          amount
                          current={item.totalAmount}
                          previous={before.totalAmount}
                          previousDate={before.date}
                          locale={locale}
                        />
                      ) : (
                        <Muted>—</Muted>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableCard>
      </div>
    </FormCard>
  )
}
