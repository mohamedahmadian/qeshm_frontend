import { useTranslation } from 'react-i18next'
import { boardRequestStatuses, type BoardRequestStatus } from '../../types/app'

const tones: Record<BoardRequestStatus, string> = {
  PENDING_REVIEW: 'border-teal-200 bg-teal-50 text-teal-800',
  PENDING_LEGAL: 'border-mint-200 bg-mint-50 text-mint-800',
  PENDING_BUDGET: 'border-amber-200 bg-amber-50 text-amber-800',
  PENDING_SECRETARY: 'border-teal-200 bg-teal-50 text-teal-900',
  APPROVED: 'border-mint-200 bg-mint-50 text-mint-900',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
}

export function BoardStatusBadge({ value }: { value: BoardRequestStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[value] ?? tones.PENDING_REVIEW}`}
    >
      {t(`board.statuses.${value}`)}
    </span>
  )
}

export const boardStatusOptions = Object.values(boardRequestStatuses)
