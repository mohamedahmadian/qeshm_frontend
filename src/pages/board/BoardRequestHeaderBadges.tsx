import { Building2, FileText, Hash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyableDigits } from '../../components/ui/CopyableDigits'

export function BoardRequestHeaderBadges({
  trackingNo,
  unitName,
  subject,
}: {
  trackingNo: string
  unitName: string
  subject: string
}) {
  const { t } = useTranslation()
  return (
    <>
      <HeaderMetaBadge
        icon={Hash}
        label={t('boardRequests.trackingNo')}
        value={<CopyableDigits value={trackingNo} />}
      />
      <HeaderMetaBadge icon={Building2} label={t('boardRequests.requestingUnit')} value={unitName} />
      <HeaderMetaBadge icon={FileText} label={t('boardRequests.titleLabel')} value={subject} />
    </>
  )
}

function HeaderMetaBadge({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[0_4px_10px_rgba(20,40,40,0.05)] ring-1 ring-teal-100">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-medium text-teal-700">{label}</span>
        <span className="block truncate text-xs font-semibold text-ink-800">{value}</span>
      </span>
    </span>
  )
}
