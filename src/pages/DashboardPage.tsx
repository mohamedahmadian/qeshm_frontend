import { LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { PageHeader, formShellClassName } from '../components/ui/Form'
import { hasMenuAccess } from '../lib/roles'
import { DashboardImportantProjects } from './dashboard/DashboardImportantProjects'
import { DashboardQuickAccess } from './dashboard/DashboardQuickAccess'
import { DashboardReports } from './dashboard/DashboardReports'
import { DashboardStats } from './dashboard/DashboardStats'

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const showPanels =
    hasMenuAccess(user, 'stakeholders.reports', 'stakeholders') ||
    hasMenuAccess(user, 'projects.list', 'projects')

  return (
    <div className={`${formShellClassName} space-y-5`}>
      <PageHeader
        icon={LayoutDashboard}
        title={t('dashboard.title')}
        subtitle={t('dashboard.welcomeUser', { name: user?.fullName ?? '' })}
      />
      <DashboardStats />
      <DashboardQuickAccess />
      {showPanels ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:[&>*:only-child]:col-span-2">
          <DashboardReports />
          <DashboardImportantProjects />
        </div>
      ) : null}
    </div>
  )
}
