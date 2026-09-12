import { ChartColumn, Inbox, MessageCircleHeart, Reply } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader, listShellClassName } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import { ChartPanel, ReportBar, ReportDonut, reportColors } from '../../projects/ProjectReportCharts'
import type { SingardReports } from '../../../types/app'

const kindColors: Record<string, string> = {
  SUGGESTION: reportColors.teal,
  COMPLAINT: reportColors.tealDeep,
  CRITICISM: reportColors.mint,
  REPORT: reportColors.tealSoft,
}

const statusColors: Record<string, string> = {
  NEW: reportColors.tealSoft,
  IN_PROGRESS: reportColors.mint,
  ANSWERED: reportColors.teal,
  CLOSED: reportColors.ink,
}

export function SingardReportsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useQuery({
    queryKey: ['singard', 'reports'],
    queryFn: async () => {
      const { data } = await api.get<SingardReports>('/singard/reports')
      return data
    },
  })
  const data = query.data
  const empty = !data || data.kpis.total === 0

  return (
    <div className={listShellClassName}>
      <PageHeader icon={ChartColumn} title={t('menus.singardReports')} subtitle={t('singardReports.subtitle')} />
      <FormCard icon={ChartColumn} title={t('singardReports.title')}>
        <div className="space-y-6 p-5 sm:p-6">
          {empty ? (
            <FormEmptyHint>{t('singardReports.empty')}</FormEmptyHint>
          ) : (
            <>
              <FormSectionTitle icon={Inbox}>{t('singardReports.total')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
                <FormFactTile icon={Inbox} label={t('singardReports.total')} value={formatNumber(data.kpis.total, locale)} tone="teal" />
                <FormFactTile icon={MessageCircleHeart} label={t('singardReports.pending')} value={formatNumber(data.kpis.pending, locale)} tone="mint" />
                <FormFactTile icon={Reply} label={t('singardReports.answered')} value={formatNumber(data.kpis.answered, locale)} />
                <FormFactTile icon={ChartColumn} label={t('singardReports.closed')} value={formatNumber(data.kpis.closed, locale)} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
                <FormFactTile icon={MessageCircleHeart} label={t('singard.kinds.SUGGESTION')} value={formatNumber(data.kpis.suggestions, locale)} tone="teal" />
                <FormFactTile icon={MessageCircleHeart} label={t('singard.kinds.COMPLAINT')} value={formatNumber(data.kpis.complaints, locale)} />
                <FormFactTile icon={MessageCircleHeart} label={t('singard.kinds.CRITICISM')} value={formatNumber(data.kpis.criticisms, locale)} />
                <FormFactTile icon={MessageCircleHeart} label={t('singard.kinds.REPORT')} value={formatNumber(data.kpis.reports, locale)} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartPanel icon={MessageCircleHeart} title={t('singardReports.byKind')}>
                  <ReportDonut
                    locale={locale}
                    data={data.byKind.map((row) => ({
                      name: t(`singard.kinds.${row.key}`),
                      value: row.count,
                      color: kindColors[row.key],
                    }))}
                  />
                </ChartPanel>
                <ChartPanel icon={Inbox} title={t('singardReports.byStatus')}>
                  <ReportDonut
                    locale={locale}
                    data={data.byStatus.map((row) => ({
                      name: t(`singard.statuses.${row.key}`),
                      value: row.count,
                      color: statusColors[row.key],
                    }))}
                  />
                </ChartPanel>
              </div>
              <ChartPanel icon={ChartColumn} title={t('singardReports.byCategory')}>
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
