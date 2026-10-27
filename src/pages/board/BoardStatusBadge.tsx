import { useTranslation } from 'react-i18next'
import {
  boardMinutesStatuses,
  boardRequestStatuses,
  boardResolutionStatuses,
  type BoardMinutesStatus,
  type BoardRequestStatus,
  type BoardResolutionStatus,
} from '../../types/app'

const tones: Record<BoardRequestStatus, string> = {
  PENDING_REVIEW: 'border-teal-200 bg-teal-50 text-teal-800',
  PENDING_LEGAL: 'border-mint-200 bg-mint-50 text-mint-800',
  PENDING_BUDGET: 'border-amber-200 bg-amber-50 text-amber-800',
  PENDING_SECRETARY: 'border-teal-200 bg-teal-50 text-teal-900',
  PENDING_CEO: 'border-mint-200 bg-mint-50 text-mint-900',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
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

const minutesTones: Record<BoardMinutesStatus, string> = {
  NOT_HELD: 'border-amber-200 bg-amber-50 text-amber-900',
  HELD: 'border-teal-200 bg-teal-50 text-teal-800',
  NOTIFIED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

export function BoardMinutesStatusBadge({ value }: { value: BoardMinutesStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${minutesTones[value] ?? minutesTones.NOT_HELD}`}
    >
      {t(`boardMinutes.statuses.${value}`)}
    </span>
  )
}

export const boardMinutesStatusOptions = Object.values(boardMinutesStatuses)

const resolutionTones: Record<BoardResolutionStatus, string> = {
  NOT_NOTIFIED: 'border-amber-200 bg-amber-50 text-amber-900',
  NOTIFIED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

export function BoardResolutionStatusBadge({ value }: { value: BoardResolutionStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${resolutionTones[value] ?? resolutionTones.NOT_NOTIFIED}`}
    >
      {t(`boardResolutions.statuses.${value}`)}
    </span>
  )
}

export const boardResolutionStatusOptions = Object.values(boardResolutionStatuses)
