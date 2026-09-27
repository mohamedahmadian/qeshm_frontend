import { CalendarDays } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormEmptyHint } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { hasMenuAccess } from '../../lib/roles'
import { DeadlineDaysBadge } from '../projects/calendar/ProjectCalendarShared'
import { ProjectImportanceBadge, ProjectLifecycleBadge, ProjectNameWithColor } from '../projects/ProjectShared'
import type { ProjectImportance, ProjectStatus } from '../../types/app'

type ImportantProject = {
  id: string
  systemName: string
  code: string
  endDate: string | null
  importance: ProjectImportance
  status: ProjectStatus
  color: string | null
}

export function DashboardImportantProjects() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { user } = useAuth()
  const enabled = hasMenuAccess(user, 'projects.list', 'projects')
  const query = useQuery({
    queryKey: ['dashboard', 'important-projects'],
    queryFn: async () => {
      const { data } = await api.get<{ items: ImportantProject[] }>('/dashboard/important-projects')
      return data.items
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  })

  if (!enabled) return null

  const items = query.data ?? []

  return (
    <FormCard
      className="h-full"
      icon={CalendarDays}
      title={t('dashboard.importantProjects')}
      subtitle={t('dashboard.importantProjectsSubtitle')}
      action={
        <Link to="/projects">
          <Button type="button" variant="ghost">
            <CalendarDays className="size-4" aria-hidden />
            {t('dashboard.seeProjects')}
          </Button>
        </Link>
      }
    >
      <div className="space-y-2 p-5 sm:p-6">
        {query.isLoading ? <LoadingState variant="inline" showLabel={false} /> : null}
        {query.isError ? <FormEmptyHint>{t('common.error')}</FormEmptyHint> : null}
        {!query.isLoading && query.isSuccess && !items.length ? (
          <FormEmptyHint>{t('dashboard.importantProjectsEmpty')}</FormEmptyHint>
        ) : null}
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/projects/${item.id}`}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-teal-50 bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(20,40,40,0.04)] transition hover:bg-teal-50/60"
          >
            <DeadlineDaysBadge endDate={item.endDate} locale={locale} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink-900">
                <ProjectNameWithColor name={item.systemName} color={item.color} />
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-2">
                <ProjectImportanceBadge value={item.importance} />
                <ProjectLifecycleBadge value={item.status} />
                {item.endDate ? <DateText value={item.endDate} /> : null}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </FormCard>
  )
}
