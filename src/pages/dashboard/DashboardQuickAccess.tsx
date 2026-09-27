import type { LucideIcon } from 'lucide-react'
import { ChevronRight, FolderKanban, Radio, UserRoundCheck, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { hasMenuAccess } from '../../lib/roles'

type Shortcut = {
  key: 'users' | 'liveBoard' | 'projects' | 'qeshmondi'
  to: string
  menu: string
  module: string
  icon: LucideIcon
}

const shortcuts: Shortcut[] = [
  { key: 'users', to: '/users', menu: 'management.users', module: 'management', icon: Users },
  {
    key: 'liveBoard',
    to: '/projects/live-board',
    menu: 'projects.liveBoard',
    module: 'projects',
    icon: Radio,
  },
  { key: 'projects', to: '/projects', menu: 'projects.list', module: 'projects', icon: FolderKanban },
  {
    key: 'qeshmondi',
    to: '/qeshmondi',
    menu: 'qeshmondi.citizens',
    module: 'qeshmondi',
    icon: UserRoundCheck,
  },
]

export function DashboardQuickAccess() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const visible = shortcuts.filter((item) => hasMenuAccess(user, item.menu, item.module))
  if (!visible.length) return null

  return (
    <section className="space-y-3">
      <h2 className="px-1 text-sm font-semibold text-ink-700">{t('dashboard.quickAccess')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              to={item.to}
              className="group flex cursor-pointer items-center gap-3 rounded-[22px] border border-white bg-white p-4 shadow-[0_10px_30px_rgba(20,40,40,0.05)] transition hover:-translate-y-0.5 hover:border-teal-100 hover:shadow-[0_14px_32px_rgba(46,189,182,0.12)]"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white shadow-[0_10px_22px_rgba(46,189,182,0.32)]">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900">
                  {t(`dashboard.shortcuts.${item.key}`)}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-500">
                  {t(`dashboard.shortcutHints.${item.key}`)}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-teal-500 rtl:rotate-180" aria-hidden />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
