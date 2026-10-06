import {
  BadgeCheck,
  Briefcase,
  CalendarRange,
  CalendarX2,
  ChartColumn,
  Layers,
  PieChart,
  Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingState, PageHeader, listShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, formCardBodyClassName } from '../../components/ui/FormLayout'
import { TableCard } from '../../components/ui/ListControls'
import { api } from '../../lib/api'
import { formatGroupedNumber, formatNumber } from '../../lib/datetime'
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
}

function genderSlices(
  counts: GenderCounts,
  labels: { male: string; female: string; unknown: string },
) {
  return [
    { name: labels.male, value: counts.male, color: reportColors.teal },
    { name: labels.female, value: counts.female, color: reportColors.mint },
    { name: labels.unknown, value: counts.unknown, color: reportColors.ink },
  ]
}

function displayName(name: string, emptyLabel: string) {
  return name.trim() ? name : emptyLabel
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
                  icon={Users}
                  label={t('qeshmondiAnalytics.total')}
                  value={countText(report.total)}
                  tone="teal"
                />
                <FormFactTile
                  icon={BadgeCheck}
                  label={t('qeshmondiAnalytics.valid')}
                  value={countText(report.valid)}
                  tone="mint"
                />
                <FormFactTile
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

          <FormCard
            icon={CalendarRange}
            title={t('qeshmondiAnalytics.expiryTitle')}
            onDoubleClick={() => undefined}
          >
            <div className={formCardBodyClassName}>
              <FormFactTile
                icon={CalendarX2}
                label={t('qeshmondiAnalytics.missingExpiry')}
                value={countText(report.missingExpiry)}
                tone="ink"
              />
              <ChartPanel
                icon={CalendarRange}
                title={t('qeshmondiAnalytics.expiryTitle')}
                empty={report.byExpiryYear.length === 0}
                emptyLabel={t('qeshmondiAnalytics.empty')}
              >
                <ReportBar
                  locale={locale}
                  data={report.byExpiryYear.map((item) => ({
                    name: formatNumber(item.year, locale),
                    value: item.count,
                  }))}
                />
              </ChartPanel>
              <TableCard
                loading={false}
                empty={t('qeshmondiAnalytics.empty')}
                hasRows={report.byExpiryYear.length > 0}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('qeshmondiAnalytics.year')}</th>
                      <th className="px-4 py-3 text-start">{t('qeshmondiAnalytics.count')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byExpiryYear.map((item) => (
                      <tr key={item.year} className="border-t border-line">
                        <td className="px-4 py-3">{formatNumber(item.year, locale)}</td>
                        <td className="px-4 py-3">{countText(item.count)}</td>
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

function NamedSection({
  icon,
  title,
  nameLabel,
  emptyName,
  empty,
  countLabel,
  rows,
  locale,
}: {
  icon: typeof Briefcase
  title: string
  nameLabel: string
  emptyName: string
  empty: string
  countLabel: string
  rows: NamedCount[]
  locale: string
}) {
  return (
    <FormCard icon={icon} title={title} onDoubleClick={() => undefined}>
      <div className={formCardBodyClassName}>
        <ChartPanel icon={icon} title={title} empty={rows.length === 0} emptyLabel={empty}>
          <ReportPointBar
            locale={locale}
            data={rows.map((item) => ({
              name: displayName(item.name, emptyName),
              value: item.count,
            }))}
          />
        </ChartPanel>
        <TableCard loading={false} empty={empty} hasRows={rows.length > 0} rowClick={false}>
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-ink-700">
              <tr>
                <th className="px-4 py-3 text-start">{nameLabel}</th>
                <th className="px-4 py-3 text-start">{countLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <tr key={`${item.name}-${index}`} className="border-t border-line">
                  <td className="px-4 py-3">{displayName(item.name, emptyName)}</td>
                  <td className="px-4 py-3">{formatGroupedNumber(item.count, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </FormCard>
  )
}
