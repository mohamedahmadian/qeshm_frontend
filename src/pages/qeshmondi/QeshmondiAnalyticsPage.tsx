import {
  BadgeCheck,
  Briefcase,
  Cake,
  CalendarRange,
  CalendarX2,
  ChartColumn,
  Layers,
  PieChart,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingState, PageHeader, listShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PaginationBar, SearchBar, TableCard } from '../../components/ui/ListControls'
import { api } from '../../lib/api'
import { formatGroupedNumber, formatNumber, toLatinDigits } from '../../lib/datetime'
import {
  ChartPanel,
  ReportBar,
  ReportDonut,
  ReportPointBar,
  reportColors,
} from '../projects/ProjectReportCharts'

type GenderCounts = {
  male: number
  female: number
  unknown: number
}

type NamedCount = {
  name: string
  count: number
}

type QeshmondiAnalytics = {
  total: number
  valid: number
  expired: number
  gender: {
    total: GenderCounts
    valid: GenderCounts
    expired: GenderCounts
  }
  byOccupation: NamedCount[]
  byGroup: NamedCount[]
  byExpiryYear: { year: number; count: number }[]
  missingExpiry: number
  byBirthYear: { year: number; count: number }[]
  missingBirth: number
}

function genderSlices(
  counts: GenderCounts,
  labels: { male: string; female: string; unknown: string },
) {
  return [
    { name: labels.male, value: counts.male, color: reportColors.teal },
    { name: labels.female, value: counts.female, color: reportColors.pink },
    { name: labels.unknown, value: counts.unknown, color: reportColors.ink },
  ]
}

function displayName(name: string, emptyLabel: string) {
  return name.trim() ? name : emptyLabel
}

const LOCAL_PAGE_SIZE = 10
const OCCUPATION_CHART_MAX = 40
const QUIET_CHART_AT = 48

function normalizeSearch(value: string) {
  return toLatinDigits(value)
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
}

type CountRow = {
  key: string
  label: string
  count: string
  searchText: string
}

function PagedCountTable({
  rows,
  empty,
  noResults,
  searchLabel,
  searchPlaceholder,
  inputId,
  nameLabel,
  countLabel,
}: {
  rows: CountRow[]
  empty: string
  noResults: string
  searchLabel: string
  searchPlaceholder: string
  inputId: string
  nameLabel: string
  countLabel: string
}) {
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    const query = normalizeSearch(term)
    if (!query) return rows
    return rows.filter((row) => normalizeSearch(row.searchText).includes(query))
  }, [rows, term])
  const pageCount = Math.max(1, Math.ceil(filtered.length / LOCAL_PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const pageRows = filtered.slice((current - 1) * LOCAL_PAGE_SIZE, current * LOCAL_PAGE_SIZE)
  const searching = normalizeSearch(term).length > 0

  return (
    <div>
      <SearchBar
        autoFocus={false}
        inputId={inputId}
        term={term}
        onTermChange={(value) => {
          setTerm(value)
          setPage(1)
        }}
        onSubmit={() => setPage(1)}
        label={searchLabel}
        placeholder={searchPlaceholder}
      />
      <TableCard
        loading={false}
        empty={searching ? noResults : empty}
        hasRows={pageRows.length > 0}
        rowClick={false}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <th className="px-4 py-3 text-start">{nameLabel}</th>
              <th className="px-4 py-3 text-start">{countLabel}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((item) => (
              <tr key={item.key} className="border-t border-line">
                <td className="px-4 py-3">{item.label}</td>
                <td className="px-4 py-3">{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      <PaginationBar
        page={current}
        pageSize={LOCAL_PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
      />
    </div>
  )
}

export function QeshmondiAnalyticsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useQuery({
    queryKey: ['qeshmondi-analytics', locale],
    queryFn: async () => {
      const { data } = await api.get<QeshmondiAnalytics>('/users/qeshmondi-analytics')
      return data
    },
  })
  const report = query.data
  const genderLabels = {
    male: t('userGenders.MALE'),
    female: t('userGenders.FEMALE'),
    unknown: t('qeshmondiAnalytics.unknownGender'),
  }
  const countText = (value: number) => formatGroupedNumber(value, locale)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={ChartColumn}
        title={t('qeshmondiAnalytics.title')}
        subtitle={t('qeshmondiAnalytics.subtitle')}
      />
      {query.isError ? (
        <p className="rounded-2xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
          {t('qeshmondiAnalytics.loadFailed')}
        </p>
      ) : query.isLoading || !report ? (
        <LoadingState />
      ) : (
        <div className="space-y-5">
          <FormCard
            icon={Users}
            title={t('qeshmondiAnalytics.overview')}
            onDoubleClick={() => undefined}
          >
            <div className={formCardBodyClassName}>
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                <FormFactTile
                  large
                  icon={Users}
                  label={t('qeshmondiAnalytics.total')}
                  value={countText(report.total)}
                  tone="teal"
                />
                <FormFactTile
                  large
                  icon={BadgeCheck}
                  label={t('qeshmondiAnalytics.valid')}
                  value={countText(report.valid)}
                  tone="mint"
                />
                <FormFactTile
                  large
                  icon={CalendarX2}
                  label={t('qeshmondiAnalytics.expired')}
                  value={countText(report.expired)}
                  tone="ink"
                />
              </div>
            </div>
          </FormCard>

          <FormCard
            icon={PieChart}
            title={t('qeshmondiAnalytics.genderTitle')}
            onDoubleClick={() => undefined}
          >
            <div className={formCardBodyClassName}>
              <div className="grid gap-4 lg:grid-cols-3">
                <ChartPanel
                  icon={Users}
                  title={t('qeshmondiAnalytics.genderTotal')}
                  empty={report.total === 0}
                  emptyLabel={t('qeshmondiAnalytics.empty')}
                >
                  <ReportDonut
                    locale={locale}
                    data={genderSlices(report.gender.total, genderLabels)}
                  />
                </ChartPanel>
                <ChartPanel
                  icon={BadgeCheck}
                  title={t('qeshmondiAnalytics.genderValid')}
                  empty={report.valid === 0}
                  emptyLabel={t('qeshmondiAnalytics.empty')}
                >
                  <ReportDonut
                    locale={locale}
                    data={genderSlices(report.gender.valid, genderLabels)}
                  />
                </ChartPanel>
                <ChartPanel
                  icon={CalendarX2}
                  title={t('qeshmondiAnalytics.genderExpired')}
                  empty={report.expired === 0}
                  emptyLabel={t('qeshmondiAnalytics.empty')}
                >
                  <ReportDonut
                    locale={locale}
                    data={genderSlices(report.gender.expired, genderLabels)}
                  />
                </ChartPanel>
              </div>
              <TableCard
                loading={false}
                empty={t('qeshmondiAnalytics.empty')}
                hasRows={report.total > 0}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('qeshmondiAnalytics.status')}</th>
                      <th className="px-4 py-3 text-start">{t('userGenders.MALE')}</th>
                      <th className="px-4 py-3 text-start">{t('userGenders.FEMALE')}</th>
                      <th className="px-4 py-3 text-start">{t('qeshmondiAnalytics.unknownGender')}</th>
                      <th className="px-4 py-3 text-start">{t('qeshmondiAnalytics.count')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ['total', t('qeshmondiAnalytics.total'), report.gender.total, report.total],
                        ['valid', t('qeshmondiAnalytics.valid'), report.gender.valid, report.valid],
                        [
                          'expired',
                          t('qeshmondiAnalytics.expired'),
                          report.gender.expired,
                          report.expired,
                        ],
                      ] as const
                    ).map(([key, label, counts, total]) => (
                      <tr key={key} className="border-t border-line">
                        <td className="px-4 py-3">{label}</td>
                        <td className="px-4 py-3">{countText(counts.male)}</td>
                        <td className="px-4 py-3">{countText(counts.female)}</td>
                        <td className="px-4 py-3">{countText(counts.unknown)}</td>
                        <td className="px-4 py-3">{countText(total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          </FormCard>

          <NamedSection
            icon={Briefcase}
            title={t('qeshmondiAnalytics.occupationTitle')}
            nameLabel={t('qeshmondiAnalytics.occupation')}
            emptyName={t('qeshmondiAnalytics.noOccupation')}
            empty={t('qeshmondiAnalytics.empty')}
            countLabel={t('qeshmondiAnalytics.count')}
            rows={report.byOccupation}
            locale={locale}
            paged
            chartMax={OCCUPATION_CHART_MAX}
            chartNote={t('qeshmondiAnalytics.occupationChartNote', {
              count: formatNumber(OCCUPATION_CHART_MAX, locale),
            })}
            searchLabel={t('qeshmondiAnalytics.searchOccupation')}
            searchPlaceholder={t('qeshmondiAnalytics.searchOccupationPlaceholder')}
            searchInputId="qeshmondi-occupation-search"
            noResults={t('qeshmondiAnalytics.noResults')}
          />
          <NamedSection
            icon={Layers}
            title={t('qeshmondiAnalytics.groupTitle')}
            nameLabel={t('qeshmondiAnalytics.group')}
            emptyName={t('qeshmondiAnalytics.noGroup')}
            empty={t('qeshmondiAnalytics.empty')}
            countLabel={t('qeshmondiAnalytics.count')}
            rows={report.byGroup}
            locale={locale}
          />

          <YearSection
            icon={Cake}
            title={t('qeshmondiAnalytics.birthTitle')}
            missingIcon={CalendarX2}
            missingLabel={t('qeshmondiAnalytics.missingBirth')}
            missingCount={report.missingBirth}
            yearLabel={t('qeshmondiAnalytics.year')}
            countLabel={t('qeshmondiAnalytics.count')}
            empty={t('qeshmondiAnalytics.empty')}
            rows={report.byBirthYear}
            locale={locale}
            paged
            searchLabel={t('qeshmondiAnalytics.searchYear')}
            searchPlaceholder={t('qeshmondiAnalytics.searchYearPlaceholder')}
            searchInputId="qeshmondi-birth-year-search"
            noResults={t('qeshmondiAnalytics.noResults')}
          />
          <YearSection
            icon={CalendarRange}
            title={t('qeshmondiAnalytics.expiryTitle')}
            missingIcon={CalendarX2}
            missingLabel={t('qeshmondiAnalytics.missingExpiry')}
            missingCount={report.missingExpiry}
            yearLabel={t('qeshmondiAnalytics.year')}
            countLabel={t('qeshmondiAnalytics.count')}
            empty={t('qeshmondiAnalytics.empty')}
            rows={report.byExpiryYear}
            locale={locale}
          />
        </div>
      )}
    </div>
  )
}

function YearSection({
  icon,
  title,
  missingIcon,
  missingLabel,
  missingCount,
  yearLabel,
  countLabel,
  empty,
  rows,
  locale,
  paged = false,
  searchLabel = '',
  searchPlaceholder = '',
  searchInputId = '',
  noResults = '',
}: {
  icon: typeof CalendarRange
  title: string
  missingIcon: typeof CalendarX2
  missingLabel: string
  missingCount: number
  yearLabel: string
  countLabel: string
  empty: string
  rows: { year: number; count: number }[]
  locale: string
  paged?: boolean
  searchLabel?: string
  searchPlaceholder?: string
  searchInputId?: string
  noResults?: string
}) {
  const quiet = rows.length > QUIET_CHART_AT
  const tableRows = rows.map((item) => {
    const year = formatNumber(item.year, locale)
    return {
      key: String(item.year),
      label: year,
      count: formatGroupedNumber(item.count, locale),
      searchText: `${item.year} ${year}`,
    }
  })
  return (
    <FormCard icon={icon} title={title} onDoubleClick={() => undefined}>
      <div className={formCardBodyClassName}>
        <FormFactTile
          large
          icon={missingIcon}
          label={missingLabel}
          value={formatGroupedNumber(missingCount, locale)}
          tone="ink"
        />
        <ChartPanel icon={icon} title={title} empty={rows.length === 0} emptyLabel={empty}>
          <ReportBar
            locale={locale}
            animate={!quiet}
            showLabels={!quiet}
            data={rows.map((item) => ({
              name: formatNumber(item.year, locale),
              value: item.count,
            }))}
          />
        </ChartPanel>
        {paged ? (
          <PagedCountTable
            rows={tableRows}
            empty={empty}
            noResults={noResults}
            searchLabel={searchLabel}
            searchPlaceholder={searchPlaceholder}
            inputId={searchInputId}
            nameLabel={yearLabel}
            countLabel={countLabel}
          />
        ) : (
          <TableCard loading={false} empty={empty} hasRows={rows.length > 0} rowClick={false}>
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <th className="px-4 py-3 text-start">{yearLabel}</th>
                  <th className="px-4 py-3 text-start">{countLabel}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item) => (
                  <tr key={item.key} className="border-t border-line">
                    <td className="px-4 py-3">{item.label}</td>
                    <td className="px-4 py-3">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </div>
    </FormCard>
  )
}

function NamedSection({
  icon,
  title,
  nameLabel,
  emptyName,
  empty,
  countLabel,
  rows,
  locale,
  paged = false,
  chartMax,
  chartNote,
  searchLabel = '',
  searchPlaceholder = '',
  searchInputId = '',
  noResults = '',
}: {
  icon: typeof Briefcase
  title: string
  nameLabel: string
  emptyName: string
  empty: string
  countLabel: string
  rows: NamedCount[]
  locale: string
  paged?: boolean
  chartMax?: number
  chartNote?: string
  searchLabel?: string
  searchPlaceholder?: string
  searchInputId?: string
  noResults?: string
}) {
  const chartRows = chartMax != null && rows.length > chartMax ? rows.slice(0, chartMax) : rows
  const quiet = chartRows.length > QUIET_CHART_AT
  const tableRows = rows.map((item, index) => ({
    key: `${item.name}-${index}`,
    label: displayName(item.name, emptyName),
    count: formatGroupedNumber(item.count, locale),
    searchText: displayName(item.name, emptyName),
  }))
  return (
    <FormCard icon={icon} title={title} onDoubleClick={() => undefined}>
      <div className={formCardBodyClassName}>
        <ChartPanel icon={icon} title={title} empty={rows.length === 0} emptyLabel={empty}>
          <ReportPointBar
            locale={locale}
            animate={!quiet}
            showLabels={!quiet}
            data={chartRows.map((item) => ({
              name: displayName(item.name, emptyName),
              value: item.count,
            }))}
          />
        </ChartPanel>
        {chartNote && chartRows.length < rows.length ? (
          <p className="text-center text-xs text-ink-500">{chartNote}</p>
        ) : null}
        {paged ? (
          <PagedCountTable
            rows={tableRows}
            empty={empty}
            noResults={noResults}
            searchLabel={searchLabel}
            searchPlaceholder={searchPlaceholder}
            inputId={searchInputId}
            nameLabel={nameLabel}
            countLabel={countLabel}
          />
        ) : (
          <TableCard loading={false} empty={empty} hasRows={rows.length > 0} rowClick={false}>
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <th className="px-4 py-3 text-start">{nameLabel}</th>
                  <th className="px-4 py-3 text-start">{countLabel}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item) => (
                  <tr key={item.key} className="border-t border-line">
                    <td className="px-4 py-3">{item.label}</td>
                    <td className="px-4 py-3">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </div>
    </FormCard>
  )
}
