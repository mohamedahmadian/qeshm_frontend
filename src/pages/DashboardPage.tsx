import { LayoutDashboard } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { PageHeader, formShellClassName } from '../components/ui/Form'
import { filterCalendarProjects, projectsWithEndDate } from '../lib/project-calendar'
import { hasMenuAccess } from '../lib/roles'
import { DeadlineWidget } from './projects/calendar/DeadlineWidget'
import { useProjectCalendarItems } from './projects/calendar/useProjectCalendarItems'

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { user } = useAuth()
  const query = useProjectCalendarItems()
  const items = useMemo(
    () =>
      projectsWithEndDate(
        filterCalendarProjects(query.data ?? [], {
          includeCompleted: false,
          includeInactive: false,
        }),
      ),
    [query.data],
  )

  return (
    <div className={`${formShellClassName} space-y-5`}>
      <PageHeader
        icon={LayoutDashboard}
        title={t('dashboard.title')}
        subtitle={t('dashboard.welcomeUser', { name: user?.fullName ?? '' })}
      />
      <DeadlineWidget
        items={items}
        locale={locale}
        loading={query.isLoading}
        compact
        showCalendarLink={hasMenuAccess(user, 'projects.calendar', 'projects')}
      />
    </div>
  )
}
