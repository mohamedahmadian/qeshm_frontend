import { Archive, Check, Sparkles, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  inspectionFeedbackStatuses,
  type InspectionFeedbackStatus,
  type InspectionKind,
} from '../../types/app'

const statusClass: Record<InspectionFeedbackStatus, string> = {
  NEW: 'bg-sky-50 text-sky-800',
  IN_PROGRESS: 'bg-amber-50 text-amber-800',
  ANSWERED: 'bg-teal-50 text-teal-800',
  CLOSED: 'bg-ink-100 text-ink-600',
}

export function InspectionKindBadge({ kind }: { kind: Pick<InspectionKind, 'title'> }) {
  return (
    <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
      {kind.title}
    </span>
  )
}

export function InspectionStatusBadge({ status }: { status: InspectionFeedbackStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[status]}`}>
      {t(`inspection.statuses.${status}`)}
    </span>
  )
}

const statusSwitch = [
  { value: inspectionFeedbackStatuses.NEW, icon: Sparkles, active: 'bg-sky-500 text-white shadow-sm' },
  { value: inspectionFeedbackStatuses.IN_PROGRESS, icon: Timer, active: 'bg-amber-500 text-white shadow-sm' },
  { value: inspectionFeedbackStatuses.ANSWERED, icon: Check, active: 'bg-teal-500 text-white shadow-sm' },
  { value: inspectionFeedbackStatuses.CLOSED, icon: Archive, active: 'bg-ink-700 text-white shadow-sm' },
] as const

export function InspectionStatusSwitch({
  value,
  disabled,
  onChange,
}: {
  value: InspectionFeedbackStatus
  disabled?: boolean
  onChange: (status: InspectionFeedbackStatus) => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="group"
      aria-label={t('inspection.updateStatus')}
      className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-teal-400 bg-cream-50 p-1 shadow-[0_8px_18px_rgba(46,189,182,0.08)] sm:grid-cols-4"
    >
      {statusSwitch.map((item) => {
        const Icon = item.icon
        const selected = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm ${
              selected ? item.active : 'cursor-pointer text-ink-600 hover:bg-white'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            onClick={() => {
              if (!selected) onChange(item.value)
            }}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {t(`inspection.statuses.${item.value}`)}
          </button>
        )
      })}
    </div>
  )
}
