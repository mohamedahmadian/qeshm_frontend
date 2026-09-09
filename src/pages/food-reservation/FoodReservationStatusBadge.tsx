import { useTranslation } from 'react-i18next'
import type { FoodReservationStatus } from '../../types/app'

export function FoodReservationStatusBadge({ status }: { status: FoodReservationStatus }) {
  const { t } = useTranslation()
  const confirmed = status === 'CONFIRMED'
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        confirmed ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-800'
      }`}
    >
      {confirmed ? t('foodReservations.confirmed') : t('foodReservations.pending')}
    </span>
  )
}
