import type { LucideIcon } from 'lucide-react'
import { FileCheck, FolderKanban, Handshake, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { formatGroupedNumber } from '../../lib/datetime'
import { hasMenuAccess } from '../../lib/roles'
import { api } from '../../lib/api'

type StatItem = {
  key: string
  path: string
  to: string
  menu: string
  module: string
  icon: LucideIcon
  tone: 'teal' | 'mint'
}

const stats: StatItem[] = [
  {
    key: 'projects',
    path: '/dashboard/stats/projects',
    to: '/projects',
    menu: 'projects.list',
    module: 'projects',
    icon: FolderKanban,
    tone: 'teal',
  },
  {
    key: 'contractors',
    path: '/dashboard/stats/contractors',
    to: '/projects/contractors',
    menu: 'projects.contractors',
    module: 'projects',
    icon: Handshake,
    tone: 'mint',
  },
  {
    key: 'resolutions',
    path: '/dashboard/stats/resolutions',
    to: '/board/resolutions',
    menu: 'board.resolutions',
    module: 'board',
    icon: FileCheck,
    tone: 'teal',
  },
  {
    key: 'qeshmondi',
    path: '/dashboard/stats/qeshmondi',
    to: '/qeshmondi',
    menu: 'qeshmondi.citizens',
    module: 'qeshmondi',
    icon: Users,
    tone: 'mint',
  },
]

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

function StatCard({ item }: { item: StatItem }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const Icon = item.icon
  const tone = toneClass[item.tone]
  const query = useQuery({
    queryKey: ['dashboard', 'stats', item.key],
    queryFn: async () => {
      const { data } = await api.get<{ total: number }>(item.path)
      return data.total
    },
    staleTime: 60_000,
    retry: 1,
  })

  const value = query.isSuccess ? formatGroupedNumber(query.data, locale) : null

  return (
    <Link
      to={item.to}
      className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-white bg-white p-4 shadow-[0_10px_30px_rgba(20,40,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(46,189,182,0.12)]"
    >
      <span
        className={`pointer-events-none absolute -end-8 -top-10 size-28 rounded-full ${tone.blob}`}
        aria-hidden
      />
      <span className="relative flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xs font-medium text-ink-500">{t(`dashboard.stats.${item.key}`)}</span>
          {query.isLoading ? (
            <span className="mt-2 block h-8 w-16 animate-pulse rounded-xl bg-teal-50" aria-hidden />
          ) : (
            <span className="mt-2 block text-3xl font-bold tabular-nums leading-none text-ink-900">
              {value ?? '—'}
            </span>
          )}
        </span>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
          <Icon className="size-5" aria-hidden />
        </span>
      </span>
    </Link>
  )
}

export function DashboardStats() {
  const { user } = useAuth()
  const visible = stats.filter((item) => hasMenuAccess(user, item.menu, item.module))
  if (!visible.length) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {visible.map((item) => (
        <StatCard key={item.key} item={item} />
      ))}
    </div>
  )
}
