import type { LucideIcon } from 'lucide-react'
import { ClipboardList, FolderKanban, MessagesSquare } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormEmptyHint } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { formatGroupedNumber, formatNumber } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import type { StakeholderCorrespondence, StakeholderProgressListItem } from '../stakeholders/types'

const RECENT_LIMIT = 5

const toneClass = {
  teal: {
    icon: 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]',
    blob: 'bg-teal-100/80',
  },
  mint: {
    icon: 'bg-mint-500 text-white shadow-[0_8px_16px_rgba(63,214,190,0.28)]',
    blob: 'bg-mint-100/80',
  },
} as const

function CountCard({
  label,
  to,
  icon: Icon,
  tone,
  total,
  loading,
}: {
  label: string
  to: string
  icon: LucideIcon
  tone: keyof typeof toneClass
  total: number | undefined
  loading: boolean
}) {
  const { i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const colors = toneClass[tone]
  const value = total == null ? null : formatGroupedNumber(total, locale)

  return (
    <Link
      to={to}
      className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-white bg-white p-4 shadow-[0_10px_30px_rgba(20,40,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(46,189,182,0.12)]"
    >
      <span
        className={`pointer-events-none absolute -end-8 -top-10 size-28 rounded-full ${colors.blob}`}
        aria-hidden
      />
      <span className="relative flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xs font-medium text-ink-500">{label}</span>
          {loading ? (
            <span className="mt-2 block h-8 w-16 animate-pulse rounded-xl bg-teal-50" aria-hidden />
          ) : (
            <span className="mt-2 block text-3xl font-bold tabular-nums leading-none text-ink-900">
              {value ?? '—'}
            </span>
          )}
        </span>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${colors.icon}`}>
          <Icon className="size-5" aria-hidden />
        </span>
      </span>
    </Link>
  )
}

function ActionLink({
  to,
  icon: Icon,
  label,
  variant,
}: {
  to: string
  icon: LucideIcon
  label: string
  variant: 'primary' | 'soft'
}) {
  const styles =
    variant === 'soft'
      ? 'bg-mint-500 text-white shadow-[0_10px_22px_rgba(63,214,190,0.28)] hover:bg-mint-600'
      : 'bg-teal-500 text-white shadow-[0_10px_22px_rgba(46,189,182,0.28)] hover:bg-teal-600'
  return (
    <Link
      to={to}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 ${styles}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function ContractorDashboard() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'

  const projects = useQuery({
    queryKey: ['dashboard', 'contractor', 'projects'],
    queryFn: async () => {
      const { data } = await api.get<Paginated<{ id: string }>>('/stakeholders/projects', {
        params: { page: 1, pageSize: 1 },
      })
      return data.total
    },
    staleTime: 60_000,
    retry: 1,
  })

  const reports = useQuery({
    queryKey: ['dashboard', 'contractor', 'reports'],
    queryFn: async () => {
      const { data } = await api.get<Paginated<StakeholderProgressListItem>>('/stakeholders/progress', {
        params: { page: 1, pageSize: RECENT_LIMIT },
      })
      return data
    },
    staleTime: 60_000,
    retry: 1,
  })

  const correspondence = useQuery({
    queryKey: ['dashboard', 'contractor', 'correspondence'],
    queryFn: async () => {
      const { data } = await api.get<Paginated<StakeholderCorrespondence>>('/stakeholders/correspondence', {
        params: { page: 1, pageSize: RECENT_LIMIT },
      })
      return data
    },
    staleTime: 60_000,
    retry: 1,
  })

  const reportItems = reports.data?.items ?? []
  const mailItems = correspondence.data?.items ?? []

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <CountCard
          label={t('dashboard.contractor.projectCount')}
          to="/stakeholders/projects"
          icon={FolderKanban}
          tone="teal"
          total={projects.data}
          loading={projects.isLoading}
        />
        <CountCard
          label={t('dashboard.contractor.correspondenceCount')}
          to="/stakeholders/correspondence"
          icon={MessagesSquare}
          tone="mint"
          total={correspondence.data?.total}
          loading={correspondence.isLoading}
        />
        <CountCard
          label={t('dashboard.contractor.reportCount')}
          to="/stakeholders/progress"
          icon={ClipboardList}
          tone="teal"
          total={reports.data?.total}
          loading={reports.isLoading}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ActionLink
          to="/stakeholders/projects"
          icon={FolderKanban}
          label={t('dashboard.contractor.myProjects')}
          variant="primary"
        />
        <ActionLink
          to="/stakeholders/progress/new"
          icon={ClipboardList}
          label={t('dashboard.contractor.newProgress')}
          variant="primary"
        />
        <ActionLink
          to="/stakeholders/correspondence/new"
          icon={MessagesSquare}
          label={t('dashboard.contractor.newCorrespondence')}
          variant="soft"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormCard
          className="h-full"
          icon={MessagesSquare}
          title={t('dashboard.contractor.correspondenceList')}
          action={
            <Link to="/stakeholders/correspondence">
              <Button type="button" variant="ghost">
                <MessagesSquare className="size-4" aria-hidden />
                {t('dashboard.contractor.seeCorrespondence')}
              </Button>
            </Link>
          }
        >
          <div className="space-y-2 p-5 sm:p-6">
            {correspondence.isLoading ? <LoadingState variant="inline" showLabel={false} /> : null}
            {correspondence.isError ? <FormEmptyHint>{t('common.error')}</FormEmptyHint> : null}
            {!correspondence.isLoading && correspondence.isSuccess && !mailItems.length ? (
              <FormEmptyHint>{t('stakeholders.emptyCorrespondence')}</FormEmptyHint>
            ) : null}
            {mailItems.map((item) => (
              <Link
                key={item.id}
                to={`/stakeholders/correspondence/${item.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-teal-50 bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(20,40,40,0.04)] transition hover:bg-teal-50/60"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mint-50 text-mint-600">
                  <MessagesSquare className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">{item.subject}</span>
                  <span className="mt-1 block truncate text-xs text-ink-500">
                    {item.project?.systemName ?? t(`stakeholders.kinds.${item.kind}`)}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-800">
                      {t(`stakeholders.statuses.${item.status}`)}
                    </span>
                    <DateText value={item.createdAt} withTime />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </FormCard>

        <FormCard
          className="h-full"
          icon={ClipboardList}
          title={t('dashboard.contractor.recentReports')}
          action={
            <Link to="/stakeholders/progress">
              <Button type="button" variant="ghost">
                <ClipboardList className="size-4" aria-hidden />
                {t('dashboard.contractor.seeReports')}
              </Button>
            </Link>
          }
        >
          <div className="space-y-2 p-5 sm:p-6">
            {reports.isLoading ? <LoadingState variant="inline" showLabel={false} /> : null}
            {reports.isError ? <FormEmptyHint>{t('common.error')}</FormEmptyHint> : null}
            {!reports.isLoading && reports.isSuccess && !reportItems.length ? (
              <FormEmptyHint>{t('stakeholders.emptyProgress')}</FormEmptyHint>
            ) : null}
            {reportItems.map((item) => (
              <Link
                key={item.id}
                to={`/stakeholders/progress/${item.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-teal-50 bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(20,40,40,0.04)] transition hover:bg-teal-50/60"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <ClipboardList className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    {item.project?.systemName ?? t('stakeholders.progressDetails')}
                  </span>
                  {item.actionsDone ? (
                    <span className="mt-1 block truncate text-xs text-ink-500">{item.actionsDone}</span>
                  ) : null}
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                    {item.progressPercent != null ? (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-800">
                        {formatNumber(item.progressPercent, locale)}٪
                      </span>
                    ) : null}
                    {item.occurredAt ? <DateText value={item.occurredAt} /> : null}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </FormCard>
      </div>
    </div>
  )
}
