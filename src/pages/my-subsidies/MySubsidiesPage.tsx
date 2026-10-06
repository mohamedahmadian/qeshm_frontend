import {
  BadgeCheck,
  BadgeX,
  Banknote,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  Hash,
  TrendingUp,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import { FormSectionTitle } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { ChartPanel, reportColors } from '../projects/ProjectReportCharts'
import { api } from '../../lib/api'
import { formatGroupedNumber, localizeDigits, monthName } from '../../lib/datetime'
import { canSeeAllPortSalesReports } from '../../lib/roles'

type SubsidyMonth = {
  year: number
  month: number
  received: number
  allocated: number
  invalidQeshmondi: number
  weeklyExcess: number
  invalidTotal: number
  reported: boolean
  changeAmount: number | null
  changePercent: number | null
}

type YearMonthSubsidy = {
  month: number
  count: number
  allocated: number
}

type MySubsidies = {
  years: number[]
  count: number
  currentYear: number
  currentMonth: number
  yearMonths: YearMonthSubsidy[]
  latest: { amount: number; year: number; month: number } | null
  ticketSubsidies: { year: number; individual: number | null; vehicle: number | null }
  totals: { received: number; invalidQeshmondi: number; weeklyExcess: number }
  months: SubsidyMonth[]
}

const statTones = {
  teal: {
    card: 'border-teal-100 bg-gradient-to-b from-teal-50 via-white to-white',
    icon: 'bg-teal-500 text-white shadow-[0_12px_24px_rgba(46,189,182,0.32)]',
    glow: 'bg-teal-100/80',
  },
  mint: {
    card: 'bg-gradient-to-b from-mint-50 via-white to-white',
    icon: 'bg-mint-500 text-white shadow-[0_12px_24px_rgba(63,214,190,0.32)]',
    glow: 'bg-mint-100/80',
  },
  ink: {
    card: 'bg-gradient-to-b from-cream-50 via-white to-white',
    icon: 'bg-teal-700 text-white shadow-[0_12px_24px_rgba(15,118,110,0.22)]',
    glow: 'bg-teal-50',
  },
} as const

function SubsidyStat({
  icon: Icon,
  label,
  value,
  unit,
  tone,
  invalid = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  unit: string
  tone: keyof typeof statTones
  invalid?: boolean
}) {
  const colors = statTones[tone]
  return (
    <article
      className={`relative overflow-hidden rounded-[22px] border px-5 py-5 shadow-[0_14px_34px_rgba(20,40,40,0.06)] sm:px-6 sm:py-6 ${colors.card} ${
        invalid ? 'border-red-200' : ''
      }`}
    >
      <div className={`pointer-events-none absolute -end-8 -top-10 size-28 rounded-full ${colors.glow}`} aria-hidden />
      <div className="relative flex items-start gap-4">
        <span className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${colors.icon}`}>
          <Icon className="size-7" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">{value}</p>
            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink-500 ring-1 ring-teal-100">
              {unit}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

function money(amount: number, locale: string, unit: string) {
  return `${formatGroupedNumber(Math.round(amount), locale)} ${unit}`
}

function formatPercent(value: number, locale: string) {
  const text = formatGroupedNumber(Math.abs(value), locale)
  if (value > 0) return `+${text}٪`
  if (value < 0) return `−${text}٪`
  return `${text}٪`
}

function formatSignedMoney(value: number, locale: string, unit: string) {
  const text = money(Math.abs(value), locale, unit)
  if (value > 0) return `+${text}`
  if (value < 0) return `−${text}`
  return text
}

function changeClass(value: number | null) {
  if (value == null || value === 0) return 'text-ink-700'
  return value > 0 ? 'text-teal-700' : 'text-red-600'
}

export function MySubsidiesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { user } = useAuth()
  const manager = canSeeAllPortSalesReports(user)
  const [params, setParams] = useSearchParams()
  const year = params.get('year') ?? ''
  const month = params.get('month') ?? ''
  const userId = manager ? (params.get('userId') ?? '') : ''
  const usersQuery = useQuery({
    queryKey: ['my-subsidies-users'],
    enabled: manager,
    queryFn: async () => {
      const { data: body } = await api.get<{ id: string; fullName: string }[]>(
        '/port-sales-reports/mine/subsidy-users',
      )
      return body
    },
  })
  const { data, isLoading } = useQuery({
    queryKey: ['my-subsidies', year, month, userId],
    queryFn: async () => {
      const { data: body } = await api.get<MySubsidies>('/port-sales-reports/mine/subsidies', {
        params: {
          ...(year ? { year: Number(year) } : {}),
          ...(month ? { month: Number(month) } : {}),
          ...(userId ? { userId } : {}),
        },
      })
      return body
    },
  })

  const unit = t('mySubsidies.toman')
  const months = data?.months ?? []
  const hasData = months.some(
    (item) => item.received || item.invalidQeshmondi || item.weeklyExcess,
  )
  const trendRows = months.filter((item) => item.reported)
  const chartRows = months.map((item) => ({
    ...item,
    label: year
      ? monthName(item.month, locale)
      : `${monthName(item.month, locale)} ${localizeDigits(String(item.year), locale)}`,
  }))
  const yearOptions = [
    { value: '', label: t('mySubsidies.allYears') },
    ...(data?.years ?? []).map((item) => ({
      value: String(item),
      label: localizeDigits(String(item), locale),
    })),
  ]
  const monthOptions = [
    { value: '', label: t('mySubsidies.allMonths') },
    ...Array.from({ length: 12 }, (_, index) => {
      const value = String(index + 1)
      return { value, label: monthName(index + 1, locale) }
    }),
  ]
  const latest = data?.latest
  const ticketSubsidies = data?.ticketSubsidies
  const selectedUser = usersQuery.data?.find((item) => item.id === userId)
  const userOptions = [
    { value: '', label: t('mySubsidies.allUsers') },
    ...(usersQuery.data ?? []).map((item) => ({ value: item.id, label: item.fullName })),
  ]
  const subtitle = !manager
    ? t('mySubsidies.subtitle')
    : selectedUser
      ? t('mySubsidies.subtitleUser', { name: selectedUser.fullName })
      : t('mySubsidies.subtitleAll')
  const emptyLabel = !manager
    ? t('mySubsidies.empty')
    : userId
      ? t('mySubsidies.emptyUser')
      : t('mySubsidies.emptyAll')

  return (
    <div className={`${listShellClassName} space-y-6`}>
      <PageHeader
        className="mb-0"
        icon={Wallet}
        title={t('menus.mySubsidies')}
        subtitle={subtitle}
        action={
          <div data-header-stat className="flex flex-wrap items-stretch gap-2">
            <div className="min-w-[12rem] rounded-2xl border border-mint-100 bg-white/90 px-4 py-2.5 text-start shadow-[0_8px_20px_rgba(20,40,40,0.06)]">
              <p className="text-[11px] font-medium text-ink-500">{t('mySubsidies.latest')}</p>
              <p className="mt-0.5 text-lg font-bold leading-tight text-ink-900">
                {latest ? money(latest.amount, locale, unit) : '—'}
              </p>
              {latest ? (
                <p className="mt-0.5 text-xs text-ink-500">
                  {monthName(latest.month, locale)} {localizeDigits(String(latest.year), locale)}
                </p>
              ) : null}
            </div>
            <div className="min-w-[12rem] rounded-2xl border border-mint-100 bg-white/90 px-4 py-2.5 text-start shadow-[0_8px_20px_rgba(20,40,40,0.06)]">
              <p className="text-[11px] font-medium text-ink-500">{t('mySubsidies.individualTicket')}</p>
              <p className="mt-0.5 text-lg font-bold leading-tight text-ink-900">
                {ticketSubsidies?.individual == null
                  ? '—'
                  : money(ticketSubsidies.individual, locale, unit)}
              </p>
              {ticketSubsidies ? (
                <p className="mt-0.5 text-xs text-ink-500">
                  {localizeDigits(String(ticketSubsidies.year), locale)}
                </p>
              ) : null}
            </div>
            <div className="min-w-[12rem] rounded-2xl border border-mint-100 bg-white/90 px-4 py-2.5 text-start shadow-[0_8px_20px_rgba(20,40,40,0.06)]">
              <p className="text-[11px] font-medium text-ink-500">{t('mySubsidies.vehicleTicket')}</p>
              <p className="mt-0.5 text-lg font-bold leading-tight text-ink-900">
                {ticketSubsidies?.vehicle == null
                  ? '—'
                  : money(ticketSubsidies.vehicle, locale, unit)}
              </p>
              {ticketSubsidies ? (
                <p className="mt-0.5 text-xs text-ink-500">
                  {localizeDigits(String(ticketSubsidies.year), locale)}
                </p>
              ) : null}
            </div>
            <div className="flex min-w-[8.5rem] flex-col items-center justify-center rounded-2xl border border-mint-100 bg-white/90 px-4 py-2.5 text-center shadow-[0_8px_20px_rgba(20,40,40,0.06)]">
              <span className="subsidy-count-lamp mb-1.5 flex size-8 items-center justify-center rounded-xl text-white">
                <Hash className="size-4" aria-hidden />
              </span>
              <p className="text-[11px] font-medium text-ink-500">{t('mySubsidies.count')}</p>
              <p className="mt-0.5 text-2xl font-bold leading-tight text-ink-900">
                {formatGroupedNumber(data?.count ?? 0, locale)}
              </p>
            </div>
          </div>
        }
      />
      <div className={manager ? 'grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]' : 'max-w-3xl'}>
        {manager ? (
          <FormField icon={UserRound} label={t('mySubsidies.user')} htmlFor="my-subsidies-user">
            <SearchSelect
              id="my-subsidies-user"
              value={userId}
              placeholder={t('mySubsidies.allUsers')}
              onChange={(next) => {
                const query = new URLSearchParams(params)
                if (next) query.set('userId', next)
                else query.delete('userId')
                setParams(query)
              }}
              options={userOptions}
            />
          </FormField>
        ) : null}
        <div className="grid gap-4 rounded-[22px] border border-teal-100 bg-gradient-to-b from-white to-cream-50/40 p-4 shadow-[0_10px_30px_rgba(20,40,40,0.05)] sm:grid-cols-2">
          <FormField icon={CalendarRange} label={t('mySubsidies.year')} htmlFor="my-subsidies-year">
            <SearchSelect
              id="my-subsidies-year"
              value={year}
              placeholder={t('mySubsidies.allYears')}
              onChange={(next) => {
                const query = new URLSearchParams(params)
                if (next) query.set('year', next)
                else query.delete('year')
                setParams(query)
              }}
              options={yearOptions}
            />
          </FormField>
          <FormField icon={CalendarDays} label={t('mySubsidies.month')} htmlFor="my-subsidies-month">
            <SearchSelect
              id="my-subsidies-month"
              value={month}
              placeholder={t('mySubsidies.allMonths')}
              onChange={(next) => {
                const query = new URLSearchParams(params)
                if (next) query.set('month', next)
                else query.delete('month')
                setParams(query)
              }}
              options={monthOptions}
            />
          </FormField>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SubsidyStat
          icon={BadgeCheck}
          label={t('mySubsidies.receivedTotal')}
          value={formatGroupedNumber(Math.round(data?.totals.received ?? 0), locale)}
          unit={unit}
          tone="teal"
        />
        <SubsidyStat
          icon={BadgeX}
          label={t('mySubsidies.invalidQeshmondi')}
          value={formatGroupedNumber(Math.round(data?.totals.invalidQeshmondi ?? 0), locale)}
          unit={unit}
          tone="mint"
          invalid
        />
        <SubsidyStat
          icon={CalendarClock}
          label={t('mySubsidies.weeklyExcess')}
          value={formatGroupedNumber(Math.round(data?.totals.weeklyExcess ?? 0), locale)}
          unit={unit}
          tone="ink"
          invalid
        />
      </div>
      {chartRows.length === 1 ? null : (
      <ChartPanel
        className="w-full"
        icon={ChartColumn}
        title={t('mySubsidies.amountsChart')}
        empty={!isLoading && !hasData}
        emptyLabel={emptyLabel}
      >
        <div className="h-[26rem] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartRows} margin={{ top: 28, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e7f6f3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#3d4f4c' }} interval={0} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#3d4f4c' }}
                  tickFormatter={(value) => formatGroupedNumber(Number(value), locale)}
                  width={72}
                />
                <Tooltip
                  formatter={(value, name) => [
                    money(Number(value ?? 0), locale, unit),
                    String(name),
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #b7ebe4',
                    background: '#fff',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="received"
                  name={t('mySubsidies.valid')}
                  stroke={reportColors.teal}
                  strokeWidth={2}
                  dot={{ r: 8, fill: reportColors.teal, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 11, fill: reportColors.teal, stroke: '#fff', strokeWidth: 2 }}
                >
                  <LabelList
                    dataKey="received"
                    position="top"
                    offset={12}
                    fill="#0f766e"
                    fontSize={12}
                    formatter={(value) => formatGroupedNumber(Number(value ?? 0), locale)}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
        </div>
      </ChartPanel>
      )}
      <ChartPanel
        className="w-full"
        icon={TrendingUp}
        title={t('mySubsidies.trendTitle')}
        empty={!isLoading && trendRows.length === 0}
        emptyLabel={emptyLabel}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 text-ink-600">
              <th className="px-4 py-3 text-start font-medium">{t('mySubsidies.year')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('mySubsidies.month')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('mySubsidies.allocated')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('mySubsidies.changePercent')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('mySubsidies.changeAmount')}</th>
            </tr>
          </thead>
          <tbody>
            {trendRows.map((item) => (
              <tr key={`${item.year}-${item.month}`} className="border-t border-teal-50">
                <td className="px-4 py-3">{localizeDigits(String(item.year), locale)}</td>
                <td className="px-4 py-3">{monthName(item.month, locale)}</td>
                <td className="px-4 py-3">{money(item.allocated, locale, unit)}</td>
                <td className={`px-4 py-3 font-medium ${changeClass(item.changePercent)}`}>
                  {item.changePercent == null ? '—' : formatPercent(item.changePercent, locale)}
                </td>
                <td className={`px-4 py-3 font-medium ${changeClass(item.changeAmount)}`}>
                  {item.changeAmount == null ? '—' : formatSignedMoney(item.changeAmount, locale, unit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartPanel>
      {data ? (
        <section className="space-y-3">
          <FormSectionTitle icon={CalendarRange} className="mb-0">
            {t('mySubsidies.currentYearTitle', {
              year: localizeDigits(String(data.currentYear), locale),
            })}
          </FormSectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(data.yearMonths ?? []).map((item) => {
              const active = item.count > 0
              const current = item.month === data.currentMonth
              return (
                <article
                  key={item.month}
                  className={`relative overflow-hidden rounded-[22px] px-4 py-4 ${
                    current
                      ? 'subsidy-current-month border-2 bg-gradient-to-b from-mint-50 via-white to-white'
                      : active
                        ? 'border border-teal-100 bg-gradient-to-b from-teal-50 via-white to-white shadow-[0_12px_28px_rgba(20,40,40,0.05)]'
                        : 'border border-line bg-white shadow-[0_12px_28px_rgba(20,40,40,0.05)]'
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute -end-8 -top-10 size-24 rounded-full ${
                      current ? 'bg-mint-100/80' : 'bg-teal-50'
                    }`}
                    aria-hidden
                  />
                  <div className="relative flex items-start gap-3">
                    <span
                      className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-white ${
                        current
                          ? 'bg-mint-500 shadow-[0_10px_18px_rgba(63,214,190,0.35)]'
                          : active
                            ? 'bg-teal-500 shadow-[0_10px_18px_rgba(46,189,182,0.28)]'
                            : 'bg-ink-300'
                      }`}
                    >
                      <Banknote className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-teal-800">{monthName(item.month, locale)}</p>
                      <p className={`mt-1 text-xl font-bold leading-tight ${active || current ? 'text-ink-900' : 'text-ink-400'}`}>
                        {money(item.allocated, locale, unit)}
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
