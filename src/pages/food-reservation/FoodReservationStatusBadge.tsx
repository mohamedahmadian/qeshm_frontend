import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../lib/datetime'
import type { FoodMealType, FoodReservation, FoodReservationStatus } from '../../types/app'

export function reservationAudienceQty(item: Pick<FoodReservation, 'quantity' | 'forGuest' | 'unitQuantity' | 'guestQuantity'>) {
  return {
    unit: item.unitQuantity ?? (item.forGuest ? 0 : item.quantity),
    guest: item.guestQuantity ?? (item.forGuest ? item.quantity : 0),
  }
}

export function ReservationQtySplit({
  item,
  locale,
}: {
  item: Pick<FoodReservation, 'quantity' | 'forGuest' | 'unitQuantity' | 'guestQuantity'>
  locale: string
}) {
  const { t } = useTranslation()
  const qty = reservationAudienceQty(item)
  return t('foodReservations.quantitySplit', {
    unit: formatNumber(qty.unit, locale),
    guest: formatNumber(qty.guest, locale),
  })
}

export function ReservationOrderBadges({
  item,
  locale,
}: {
  item: Pick<FoodReservation, 'quantity' | 'forGuest' | 'unitQuantity' | 'guestQuantity'>
  locale: string
}) {
  const { t } = useTranslation()
  const qty = reservationAudienceQty(item)
  if (qty.unit <= 0 && qty.guest <= 0) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {qty.unit > 0 ? (
        <span className="inline-flex rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-teal-800 ring-1 ring-teal-100">
          {t('foodReservations.unitOrdersBadge', { qty: formatNumber(qty.unit, locale) })}
        </span>
      ) : null}
      {qty.guest > 0 ? <GuestCountBadge qty={qty.guest} locale={locale} /> : null}
    </span>
  )
}

export function GuestCountBadge({ qty, locale }: { qty: number; locale: string }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex rounded-full bg-mint-50 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-teal-800 ring-1 ring-mint-100">
      {t('foodReservations.guestOrdersBadge', { qty: formatNumber(qty, locale) })}
    </span>
  )
}

export function mealTypeLabelKey(mealType: FoodMealType) {
  return mealType === 'DINNER' ? 'foodReservations.dinner' : 'foodReservations.lunch'
}

export function FoodMealTypeBadge({ mealType }: { mealType: FoodMealType }) {
  const { t } = useTranslation()
  const dinner = mealType === 'DINNER'
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        dinner ? 'bg-mint-50 text-teal-800' : 'bg-teal-50 text-teal-800'
      }`}
    >
      {t(mealTypeLabelKey(mealType))}
    </span>
  )
}

export function ReservationGuestMark({ forGuest }: { forGuest: boolean }) {
  const { t } = useTranslation()
  if (!forGuest) return null
  return (
    <span className="inline-flex rounded-full bg-mint-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
      {t('foodReservations.guestOrder')}
    </span>
  )
}

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
