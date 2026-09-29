import { CalendarRange, ChartColumn, Hash, UtensilsCrossed, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../../components/ui/DateText'
import { FormField, LoadingState, PageHeader, listShellClassName } from '../../../components/ui/Form'
import { FormCard, FormFactTile, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchBar, TableCard } from '../../../components/ui/ListControls'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useListParams } from '../../../hooks/useListParams'
import { api } from '../../../lib/api'
import { displayDateParts, formatDate, formatGroupedNumber, formatNumber, monthName } from '../../../lib/datetime'
import type { FoodMyReport, FoodMyReportGrain, FoodMyReportPeriod } from '../../../types/app'

const periodKeys = ['week', 'month', 'year'] as const

function money(value: number, locale: string, toman: string) {
  return `${formatGroupedNumber(Math.round(value), locale)} ${toman}`
}

function periodLabel(iso: string, grain: FoodMyReportGrain, locale: string, weekOf: (date: string) => string) {
  if (grain === 'month') {
    const parts = displayDateParts(iso, locale)
    if (!parts) return iso
    return `${monthName(parts.month, locale)} ${formatNumber(parts.year, locale)}`
  }
  if (grain === 'week') return weekOf(formatDate(iso, locale))
  return formatDate(iso, locale)
}

export function FoodMyReportPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const toman = t('foodReservations.toman')
  const { q, term, setTerm, applySearch, searchParams, setParams } = useListParams()
  const reservedFrom = searchParams.get('reservedFrom') ?? ''
  const reservedTo = searchParams.get('reservedTo') ?? ''
  const periodParam = searchParams.get('period')
  const period = (periodKeys.includes(periodParam as FoodMyReportPeriod) ? periodParam : 'week') as FoodMyReportPeriod
  const filtersActive = Boolean(reservedFrom || reservedTo || (periodParam && periodParam !== 'week'))

  const query = useQuery({
    queryKey: ['food-reservations', 'mine-summary', period, q, reservedFrom, reservedTo],
    queryFn: async () => {
      const { data } = await api.get<FoodMyReport>('/food-reservations/mine/summary', {
        params: {
          period,
          ...(q ? { q } : {}),
          ...(reservedFrom ? { reservedFrom } : {}),
          ...(reservedTo ? { reservedTo } : {}),
        },
      })
      return data
    },
  })
  const report = query.data
  const grainTitle =
    report?.grain === 'week'
      ? t('foodCostEstimate.byWeek')
      : report?.grain === 'month'
        ? t('foodCostEstimate.byMonth')
        : t('foodCostEstimate.byDay')

  return (
    <div className={listShellClassName}>
      <PageHeader icon={ChartColumn} title={t('menus.foodMyReport')} subtitle={t('foodMyReport.subtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('foodMyReport.search')}
        placeholder={t('foodMyReport.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-3"
        extra={
          <>
            <FormField icon={CalendarRange} label={t('foodMyReport.period')} htmlFor="myReportPeriod">
              <SearchSelect
                id="myReportPeriod"
                value={period}
                onChange={(next) => setParams({ period: next || 'week' })}
                placeholder={t('foodMyReport.period')}
                options={periodKeys.map((value) => ({
                  value,
                  label: t(`foodMyReport.${value}`),
                }))}
              />
            </FormField>
            <FormField icon={CalendarRange} label={t('foodReservations.fromDate')} htmlFor="myReportFrom">
              <PersianDateField
                id="myReportFrom"
                value={reservedFrom}
                maxDate={reservedTo || undefined}
                onChange={(value) => setParams({ reservedFrom: value || undefined })}
              />
            </FormField>
            <FormField icon={CalendarRange} label={t('foodReservations.toDate')} htmlFor="myReportTo">
              <PersianDateField
                id="myReportTo"
                value={reservedTo}
                minDate={reservedFrom || undefined}
                onChange={(value) => setParams({ reservedTo: value || undefined })}
              />
            </FormField>
          </>
        }
      />
      {query.isLoading && !report ? <LoadingState /> : null}
      {query.isError ? (
        <p className="rounded-2xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
          {t('common.error')}
        </p>
      ) : null}
      {report ? (
        <div className="space-y-5">
          <FormCard icon={ChartColumn} title={t('foodMyReport.summary')}>
            <div className={formCardBodyClassName}>
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
                <DateText value={report.reservedFrom} />
                <span aria-hidden>—</span>
                <DateText value={report.reservedTo} />
              </p>
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                <FormFactTile
                  icon={Hash}
                  label={t('foodReservations.totalCount')}
                  value={formatNumber(report.summary.count, locale)}
                  tone="teal"
                />
                <FormFactTile
                  icon={UtensilsCrossed}
                  label={t('foodReservations.totalQuantity')}
                  value={formatNumber(report.summary.quantity, locale)}
                  tone="mint"
                />
                <FormFactTile
                  icon={Wallet}
                  label={t('foodReservations.totalAmount')}
                  value={money(report.summary.totalPrice, locale, toman)}
                />
              </div>
            </div>
          </FormCard>

          <FormCard icon={UtensilsCrossed} title={t('foodReservations.byFood')}>
            <div className="p-5 sm:p-6">
              <TableCard
                loading={query.isLoading}
                empty={t('foodMyReport.empty')}
                hasRows={report.byFood.length > 0}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('foodReservations.food')}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.count')}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.quantity')}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.cost')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byFood.map((item) => (
                      <tr key={item.id} className="border-t border-line">
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3">{formatNumber(item.count, locale)}</td>
                        <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                        <td className="px-4 py-3">{money(item.totalPrice, locale, toman)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          </FormCard>

          <FormCard icon={CalendarRange} title={grainTitle}>
            <div className="p-5 sm:p-6">
              <TableCard
                loading={query.isLoading}
                empty={t('foodMyReport.empty')}
                hasRows={report.byPeriod.length > 0}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start">{grainTitle}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.count')}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.quantity')}</th>
                      <th className="px-4 py-3 text-start">{t('foodCostEstimate.cost')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byPeriod.map((item) => (
                      <tr key={item.period} className="border-t border-line">
                        <td className="px-4 py-3">
                          {item.period && report.grain === 'day' ? (
                            <DateText value={item.period} />
                          ) : (
                            periodLabel(item.period, report.grain, locale, (date) =>
                              t('foodCostEstimate.weekOf', { date }),
                            )
                          )}
                        </td>
                        <td className="px-4 py-3">{formatNumber(item.count, locale)}</td>
                        <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                        <td className="px-4 py-3">{money(item.totalPrice, locale, toman)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          </FormCard>
        </div>
      ) : null}
    </div>
  )
}
