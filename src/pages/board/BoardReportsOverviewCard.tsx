import {
  Building2,
  CalendarDays,
  FileCheck,
  ScrollText,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FormCard, FormFactTile, formCardBodyClassName } from '../../components/ui/FormLayout'
import { formatNumber } from '../../lib/datetime'
import type { BoardReportsOverview } from '../../types/app'

export function BoardReportsOverviewCard({
  kpis,
}: {
  kpis: BoardReportsOverview['kpis']
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const count = (value: number) => formatNumber(value, locale)

  return (
    <FormCard icon={ScrollText} title={t('boardReports.overview')}>
      <div className={`${formCardBodyClassName} space-y-5`}>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3">
          <FormFactTile
            icon={ScrollText}
            label={t('boardReports.totalMinutes')}
            value={count(kpis.totalMinutes)}
            tone="teal"
          />
          <FormFactTile
            icon={FileCheck}
            label={t('boardReports.totalResolutions')}
            value={count(kpis.totalResolutions)}
            tone="mint"
          />
          <FormFactTile
            icon={TriangleAlert}
            label={t('boardReports.overdue')}
            value={count(kpis.overdue)}
          />
          <FormFactTile
            icon={Building2}
            label={t('boardReports.topUnit')}
            value={
              kpis.topUnit ? `${kpis.topUnit} (${count(kpis.topUnitCount)})` : '—'
            }
            empty={!kpis.topUnit}
            tone="teal"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3">
          <FormFactTile
            icon={CalendarDays}
            label={t('boardReports.dueSoon')}
            value={count(kpis.dueToday + kpis.dueSoon)}
            compact
            tone="teal"
          />
          <FormFactTile
            icon={Building2}
            label={t('boardReports.withoutUnit')}
            value={count(kpis.withoutUnit)}
            compact
          />
          <FormFactTile
            icon={FileCheck}
            label={t('boardReports.avgResolutions')}
            value={count(kpis.avgResolutionsPerMeeting)}
            compact
            tone="mint"
          />
          <FormFactTile
            icon={Users}
            label={t('boardReports.avgMembers')}
            value={count(kpis.avgMembersPerMeeting)}
            compact
          />
        </div>
      </div>
    </FormCard>
  )
}
