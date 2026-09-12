import { CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint } from '../../../components/ui/FormLayout'
import { LoadingState } from '../../../components/ui/LoadingState'
import { deadlineBucketOrder, groupByDeadline } from '../../../lib/project-calendar'
import type { Project } from '../../../types/app'
import { DeadlineGroup } from './ProjectCalendarShared'

const DASHBOARD_LIMIT = 8

export function DeadlineWidget({
  items,
  locale,
  loading,
  showCalendarLink,
  compact,
}: {
  items: Project[]
  locale: string
  loading?: boolean
  showCalendarLink?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()
  const groups = useMemo(() => groupByDeadline(items, locale), [items, locale])
  const visible = useMemo(() => {
    const ordered = deadlineBucketOrder.flatMap((key) => groups[key])
    return compact ? ordered.slice(0, DASHBOARD_LIMIT) : ordered
  }, [compact, groups])
  const groupedVisible = useMemo(() => {
    if (!compact) return groups
    const limited = new Set(visible.map((item) => item.id))
    return {
      overdue: groups.overdue.filter((item) => limited.has(item.id)),
      today: groups.today.filter((item) => limited.has(item.id)),
      week: groups.week.filter((item) => limited.has(item.id)),
      month: groups.month.filter((item) => limited.has(item.id)),
      later: groups.later.filter((item) => limited.has(item.id)),
    }
  }, [compact, groups, visible])

  const action =
    showCalendarLink ? (
      <Link to="/projects/calendar">
        <Button type="button" variant="ghost">
          <CalendarDays className="size-4" aria-hidden />
          {t('dashboard.seeCalendar')}
        </Button>
      </Link>
    ) : undefined

  return (
    <FormCard
      icon={CalendarDays}
      title={t('dashboard.deadlineWidget')}
      subtitle={t('dashboard.deadlineWidgetSubtitle')}
      action={action}
    >
      <div className="space-y-4 p-5 sm:p-6">
        {loading ? <LoadingState variant="inline" showLabel={false} /> : null}
        {!loading && !visible.length ? (
          <FormEmptyHint>{t('dashboard.deadlineEmpty')}</FormEmptyHint>
        ) : null}
        {!loading && visible.length
          ? deadlineBucketOrder.map((key) => (
              <DeadlineGroup
                key={key}
                title={t(`projectCalendar.buckets.${key}`)}
                items={groupedVisible[key]}
                locale={locale}
                compact={compact}
              />
            ))
          : null}
      </div>
    </FormCard>
  )
}
