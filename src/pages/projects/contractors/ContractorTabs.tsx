import type { LucideIcon } from 'lucide-react'
import { Handshake, KeyRound, Users, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const contractorManageTabs = ['info', 'payments', 'team', 'users'] as const
export type ContractorManageTab = (typeof contractorManageTabs)[number]

const tabIcons: Record<ContractorManageTab, LucideIcon> = {
  info: Handshake,
  payments: Wallet,
  team: Users,
  users: KeyRound,
}

export function ContractorTabNav({
  tab,
  onChange,
}: {
  tab: ContractorManageTab
  onChange: (tab: ContractorManageTab) => void
}) {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5">
      {contractorManageTabs.map((item) => {
        const Icon = tabIcons[item]
        const active = tab === item
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
              active
                ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
            }`}
          >
            <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
            {t(`contractors.tabs.${item}`)}
          </button>
        )
      })}
    </nav>
  )
}
