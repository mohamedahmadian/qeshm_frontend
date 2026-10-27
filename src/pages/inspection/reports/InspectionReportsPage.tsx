import { ChartColumn, Inbox, MessageCircleHeart, Reply } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader, listShellClassName } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import { ChartPanel, ReportBar, ReportDonut, reportColors } from '../../projects/ProjectReportCharts'
import type { InspectionReports } from '../../../types/app'

const kindPalette = [reportColors.teal, reportColors.tealDeep, reportColors.mint, reportColors.tealSoft]

const statusColors: Record<string, string> = {
  NEW: reportColors.tealSoft,
  IN_PROGRESS: reportColors.mint,
  ANSWERED: reportColors.teal,
  CLOSED: reportColors.ink,
}

export function InspectionReportsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useQuery({
    queryKey: ['inspection', 'reports'],
    queryFn: async () => {
      const { data } = await api.get<InspectionReports>('/inspection/reports')
      return data
    },
  })
  const data = query.data
  const empty = !data || data.kpis.total === 0

  return (
    <div className={listShellClassName}>
      <PageHeader icon={ChartColumn} title={t('menus.inspectionReports')} subtitle={t('inspectionReports.subtitle')} />
      <FormCard icon={ChartColumn} title={t('inspectionReports.title')}>
        <div className="space-y-6 p-5 sm:p-6">
          {empty ? (
            <FormEmptyHint>{t('inspectionReports.empty')}</FormEmptyHint>
          ) : (
            <>
              <FormSectionTitle icon={Inbox}>{t('inspectionReports.total')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
                <FormFactTile icon={Inbox} label={t('inspectionReports.total')} value={formatNumber(data.kpis.total, locale)} tone="teal" />
                <FormFactTile icon={MessageCircleHeart} label={t('inspectionReports.pending')} value={formatNumber(data.kpis.pending, locale)} tone="mint" />
                <FormFactTile icon={Reply} label={t('inspectionReports.answered')} value={formatNumber(data.kpis.answered, locale)} />
                <FormFactTile icon={ChartColumn} label={t('inspectionReports.closed')} value={formatNumber(data.kpis.closed, locale)} />
              </div>
              {data.byKind.length ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
                  {data.byKind.map((row, index) => (
                    <FormFactTile
                      key={row.id}
                      icon={MessageCircleHeart}
                      label={row.title}
                      value={formatNumber(row.count, locale)}
                      tone={index === 0 ? 'teal' : index === 1 ? 'mint' : undefined}
                    />
                  ))}
                </div>
              ) : null}
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartPanel icon={MessageCircleHeart} title={t('inspectionReports.byKind')}>
                  <ReportDonut
                    locale={locale}
                    data={data.byKind.map((row, index) => ({
                      name: row.title,
                      value: row.count,
                      color: kindPalette[index % kindPalette.length],
                    }))}
                  />
                </ChartPanel>
                <ChartPanel icon={Inbox} title={t('inspectionReports.byStatus')}>
                  <ReportDonut
                    locale={locale}
                    data={data.byStatus.map((row) => ({
                      name: t(`inspection.statuses.${row.key}`),
                      value: row.count,
                      color: statusColors[row.key],
                    }))}
                  />
                </ChartPanel>
              </div>
              <ChartPanel icon={ChartColumn} title={t('inspectionReports.byCategory')}>
                <ReportBar
                  locale={locale}
                  data={data.byCategory.map((row) => ({ name: row.name, value: row.count }))}
                />
              </ChartPanel>
            </>
          )}
        </div>
      </FormCard>
    </div>
  )
}
