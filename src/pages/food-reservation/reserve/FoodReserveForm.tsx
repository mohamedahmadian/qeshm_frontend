import { CalendarRange, Hash, Store, Ticket, UtensilsCrossed } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import {
  addDaysIso,
  formatDate,
  formatWeekday,
  startOfIranWeekIso,
  todayIsoDate,
} from '../../../lib/datetime'
import type { FoodReservationContext, RestaurantMenuItem } from '../../../types/app'

export type FoodReservePayload = {
  reservedAt: string
  restaurantId: string
  foodId: string
  quantity: number
}

function currentWeekIsos() {
  const start = startOfIranWeekIso()
  return Array.from({ length: 7 }, (_, index) => addDaysIso(start, index))
}

function WeekDayPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (iso: string) => void
  label: string
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const today = todayIsoDate()
  const days = useMemo(() => currentWeekIsos(), [])

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {days.map((iso) => {
        const selected = value === iso
        const isToday = iso === today
        const past = iso < today
        const dayNo = formatDate(iso, locale).split('/').pop() ?? ''
        return (
          <button
            key={iso}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={past}
            disabled={past}
            title={past ? t('foodReservations.pastDay') : undefined}
            onClick={() => {
              if (!past) onChange(iso)
            }}
            className={`flex min-w-[4.75rem] flex-1 flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
              past
                ? 'cursor-not-allowed border-line bg-cream-50 text-ink-300 opacity-55'
                : selected
                  ? 'cursor-pointer border-teal-500 bg-teal-500 text-white shadow-[0_6px_14px_rgba(46,189,182,0.28)]'
                  : 'cursor-pointer border-line bg-cream-50 text-ink-700 hover:border-teal-300 hover:bg-teal-50'
            }`}
          >
            <span className={`text-[11px] font-medium ${selected ? 'text-white/90' : past ? 'text-ink-300' : 'text-ink-500'}`}>
              {formatWeekday(iso, locale)}
            </span>
            <span className="text-base font-semibold leading-none">{dayNo}</span>
            {isToday && !selected ? (
              <span className="size-1.5 rounded-full bg-teal-500" aria-hidden />
            ) : (
              <span className="size-1.5" aria-hidden />
            )}
          </button>
        )
      })}
    </div>
  )
}

export function FoodReserveForm({
  context,
  onSubmit,
}: {
  context: FoodReservationContext
  onSubmit: (payload: FoodReservePayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [reservedAt, setReservedAt] = useState(todayIsoDate)
  const [restaurantId, setRestaurantId] = useState(
    context.restaurants.length === 1 ? context.restaurants[0].id : '',
  )
  const [foodId, setFoodId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)

  const menu = useQuery({
    queryKey: ['restaurant-menu', restaurantId, 'lookup', 'active', reservedAt],
    enabled: Boolean(restaurantId && reservedAt),
    queryFn: async () => {
      const { data } = await api.get<RestaurantMenuItem[]>(
        `/restaurants/${restaurantId}/menu-items`,
        { params: { isActive: true, offeredAt: reservedAt } },
      )
      return data
    },
  })
  const foods = menu.data ?? []
  const resolvedFoodId =
    foods.length === 1 ? foods[0].food.id : foodId
  const menuPending = Boolean(restaurantId && reservedAt && menu.isLoading)

  useEffect(() => {
    if (context.restaurants.length === 1) {
      setRestaurantId(context.restaurants[0].id)
    }
  }, [context.restaurants])

  useEffect(() => {
    if (!restaurantId) {
      setFoodId('')
      return
    }
    if (!menu.data) {
      setFoodId('')
      return
    }
    if (menu.data.length === 1) {
      setFoodId(menu.data[0].food.id)
      return
    }
    setFoodId((current) =>
      menu.data.some((item) => item.food.id === current) ? current : '',
    )
  }, [restaurantId, reservedAt, menu.data])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!reservedAt) {
      toast.error(t('foodReservations.selectDay'))
      return
    }
    if (!restaurantId) {
      toast.error(t('foodReservations.selectRestaurant'))
      return
    }
    if (reservedAt < todayIsoDate()) {
      toast.error(t('foodReservations.pastDay'))
      return
    }
    if (menuPending) {
      return
    }
    if (menu.isSuccess && foods.length === 0) {
      toast.error(t('foodReservations.noActiveFood'))
      return
    }
    if (!resolvedFoodId) {
      toast.error(t('foodReservations.selectFood'))
      return
    }
    const qty = context.isNutritionRep ? Number(quantity) || 1 : 1
    setSaving(true)
    try {
      await onSubmit({
        reservedAt,
        restaurantId,
        foodId: resolvedFoodId,
        quantity: qty,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  if (!context.orgUnit) {
    return (
      <FormCard icon={Ticket} title={t('foodReservations.create')}>
        <div className="p-5 sm:p-6">
          <FormEmptyHint>{t('foodReservations.noUnit')}</FormEmptyHint>
        </div>
      </FormCard>
    )
  }

  if (!context.restaurants.length) {
    return (
      <FormCard icon={Ticket} title={t('foodReservations.create')} subtitle={context.orgUnit.name}>
        <div className="p-5 sm:p-6">
          <FormEmptyHint>{t('foodReservations.noRestaurants')}</FormEmptyHint>
        </div>
      </FormCard>
    )
  }

  return (
    <FormCard
      icon={Ticket}
      title={t('foodReservations.create')}
      subtitle={t('foodReservations.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={CalendarRange} label={t('foodReservations.weekDays')}>
          <WeekDayPicker
            value={reservedAt}
            onChange={setReservedAt}
            label={t('foodReservations.weekDays')}
          />
        </FormField>
        <div className={context.isNutritionRep ? 'grid gap-4 sm:grid-cols-2' : undefined}>
          <FormField icon={Store} label={t('foodReservations.restaurant')} htmlFor="reserveRestaurant">
            <SearchSelect
              id="reserveRestaurant"
              value={restaurantId}
              required
              onChange={setRestaurantId}
              placeholder={t('foodReservations.selectRestaurant')}
              options={context.restaurants.map((item) => ({ value: item.id, label: item.name }))}
            />
          </FormField>
          {context.isNutritionRep ? (
            <FormField icon={Hash} label={t('foodReservations.quantity')} htmlFor="reserveQuantity">
              <input
                id="reserveQuantity"
                type="number"
                min={1}
                max={500}
                className={fieldClassName}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </FormField>
          ) : null}
        </div>
        {restaurantId && menu.isSuccess && foods.length === 0 ? (
          <FormEmptyHint>{t('foodReservations.noActiveFood')}</FormEmptyHint>
        ) : null}
        {foods.length > 0 ? (
          <FormField icon={UtensilsCrossed} label={t('foodReservations.food')} htmlFor="reserveFood">
            <SearchSelect
              id="reserveFood"
              value={resolvedFoodId}
              required
              onChange={setFoodId}
              placeholder={t('foodReservations.selectFood')}
              options={foods.map((item) => ({ value: item.food.id, label: item.food.name }))}
            />
          </FormField>
        ) : null}
        <FormActions
          submitLabel={t('foodReservations.save')}
          cancelLabel={t('foodReservations.cancel')}
          submitting={saving || menuPending}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
