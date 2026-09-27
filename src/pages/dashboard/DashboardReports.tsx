import { Inbox } from 'lucide-react'
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

type ReceivedReport = {
  id: string
  projectName: string
  contractorName: string
  reportType: 'PROGRESS'
  occurredAt: string | null
  isNew: boolean
}

export function DashboardReports() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const enabled = hasMenuAccess(user, 'stakeholders.reports', 'stakeholders')
  const query = useQuery({
    queryKey: ['dashboard', 'recent-reports'],
    queryFn: async () => {
      const { data } = await api.get<{ items: ReceivedReport[] }>('/dashboard/recent-reports')
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
      icon={Inbox}
      title={t('dashboard.receivedReports')}
      subtitle={t('dashboard.receivedReportsSubtitle')}
      action={
        <Link to="/stakeholders/reports">
          <Button type="button" variant="ghost">
            <Inbox className="size-4" aria-hidden />
            {t('dashboard.seeReports')}
          </Button>
        </Link>
      }
    >
      <div className="space-y-2 p-5 sm:p-6">
        {query.isLoading ? <LoadingState variant="inline" showLabel={false} /> : null}
        {query.isError ? <FormEmptyHint>{t('common.error')}</FormEmptyHint> : null}
        {!query.isLoading && query.isSuccess && !items.length ? (
          <FormEmptyHint>{t('dashboard.receivedReportsEmpty')}</FormEmptyHint>
        ) : null}
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/stakeholders/reports/${item.id}`}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-teal-50 bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(20,40,40,0.04)] transition hover:bg-teal-50/60"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <Inbox className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-ink-900">{item.projectName}</span>
                {item.isNew ? (
                  <span className="shrink-0 rounded-full bg-mint-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {t('dashboard.newBadge')}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block truncate text-xs text-ink-500">{item.contractorName}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-800">
                  {t('dashboard.reportTypeLabel')}: {t('dashboard.reportTypeProgress')}
                </span>
                {item.occurredAt ? <DateText value={item.occurredAt} /> : null}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </FormCard>
  )
}
