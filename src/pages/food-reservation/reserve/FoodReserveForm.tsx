import { Building2, CalendarRange, Check, Hash, Store, Ticket, UtensilsCrossed } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
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
  orgUnitId?: string
  restaurantId: string
  foodId: string
  quantity: number
}

function ChoiceList({
  value,
  onChange,
  options,
  label,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  options: { value: string; label: string }[]
  label: string
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap justify-center gap-2">
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-11 w-[300px] max-w-full items-center justify-center gap-1.5 rounded-2xl border-2 bg-white px-3 text-sm font-medium text-ink-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
              disabled
                ? 'cursor-not-allowed border-line text-ink-300'
                : selected
                  ? 'cursor-pointer border-teal-500'
                  : 'cursor-pointer border-line hover:border-teal-300'
            }`}
          >
            {selected ? <Check className="size-4 shrink-0 text-teal-600" aria-hidden /> : null}
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
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
  const canManage = context.canManage
  const [reservedAt, setReservedAt] = useState(todayIsoDate)
  const [orgUnitId, setOrgUnitId] = useState(
    canManage && context.units.length === 1 ? context.units[0].id : '',
  )
  const unitRestaurants = useMemo(() => {
    if (!canManage) return context.restaurants
    return context.units.find((unit) => unit.id === orgUnitId)?.restaurants ?? []
  }, [canManage, context.restaurants, context.units, orgUnitId])
  const onlyRestaurantId = unitRestaurants.length === 1 ? unitRestaurants[0].id : ''
  const [restaurantId, setRestaurantId] = useState(onlyRestaurantId)
  const [foodId, setFoodId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const quantityScope = canManage ? orgUnitId : 'self'
  const selectedRestaurantId = onlyRestaurantId || restaurantId
  const canChooseQuantity = canManage || context.isNutritionRep

  const menu = useQuery({
    queryKey: ['food-reservation-menu', selectedRestaurantId, reservedAt, canManage ? orgUnitId : ''],
    enabled: Boolean(selectedRestaurantId && reservedAt && (!canManage || orgUnitId)),
    queryFn: async () => {
      const { data } = await api.get<RestaurantMenuItem[]>('/food-reservations/menu', {
        params: {
          restaurantId: selectedRestaurantId,
          offeredAt: reservedAt,
          ...(canManage ? { orgUnitId } : {}),
        },
      })
      return data
    },
  })
  const foods = Array.isArray(menu.data) ? menu.data : []
  const resolvedFoodId =
    foods.length === 1 ? foods[0].food.id : foodId
  const menuPending = Boolean(selectedRestaurantId && reservedAt && menu.isLoading)
  const lastQuantity = useQuery({
    queryKey: [
      'food-reservation-last-quantity',
      quantityScope,
      selectedRestaurantId,
      resolvedFoodId,
    ],
    enabled: canChooseQuantity && (!canManage || Boolean(orgUnitId)),
    queryFn: async () => {
      const { data } = await api.get<{ quantity: number | null }>(
        '/food-reservations/last-quantity',
        {
          params: {
            ...(canManage ? { orgUnitId } : {}),
            ...(selectedRestaurantId ? { restaurantId: selectedRestaurantId } : {}),
            ...(resolvedFoodId ? { foodId: resolvedFoodId } : {}),
          },
        },
      )
      return data
    },
  })

  useEffect(() => {
    if (unitRestaurants.length === 1) {
      setRestaurantId(unitRestaurants[0].id)
      return
    }
    setRestaurantId((current) =>
      unitRestaurants.some((item) => item.id === current) ? current : '',
    )
  }, [unitRestaurants])

  useEffect(() => {
    if (!selectedRestaurantId) {
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
  }, [selectedRestaurantId, reservedAt, menu.data])

  const quantityLookupKey = `${quantityScope}|${selectedRestaurantId}|${resolvedFoodId}`
  const appliedQuantityKey = useRef('')

  useEffect(() => {
    if (!canChooseQuantity || !lastQuantity.isFetched || lastQuantity.isFetching) return
    if (appliedQuantityKey.current === quantityLookupKey) return
    appliedQuantityKey.current = quantityLookupKey
    const previous = lastQuantity.data?.quantity
    setQuantity(previous && previous > 0 ? String(previous) : '1')
  }, [
    canChooseQuantity,
    quantityLookupKey,
    lastQuantity.isFetched,
    lastQuantity.isFetching,
    lastQuantity.data,
  ])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!reservedAt) {
      toast.error(t('foodReservations.selectDay'))
      return
    }
    if (canManage && !orgUnitId) {
      toast.error(t('foodReservations.selectUnit'))
      return
    }
    if (!selectedRestaurantId) {
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
    const qty = canChooseQuantity ? Number(quantity) || 1 : 1
    setSaving(true)
    try {
      await onSubmit({
        reservedAt,
        ...(canManage ? { orgUnitId } : {}),
        restaurantId: selectedRestaurantId,
        foodId: resolvedFoodId,
        quantity: qty,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  if (canManage && !context.units.length) {
    return (
      <FormCard icon={Ticket} title={t('foodReservations.create')}>
        <div className="p-5 sm:p-6">
          <FormEmptyHint>{t('foodReservations.noUnits')}</FormEmptyHint>
        </div>
      </FormCard>
    )
  }

  if (!canManage && !context.orgUnit) {
    return (
      <FormCard icon={Ticket} title={t('foodReservations.create')}>
        <div className="p-5 sm:p-6">
          <FormEmptyHint>{t('foodReservations.noUnit')}</FormEmptyHint>
        </div>
      </FormCard>
    )
  }

  if (!canManage && !context.restaurants.length) {
    return (
      <FormCard icon={Ticket} title={t('foodReservations.create')} subtitle={context.orgUnit?.name}>
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
        {canManage ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField icon={Building2} label={t('foodReservations.orgUnit')} htmlFor="reserveUnit">
              <SearchSelect
                id="reserveUnit"
                value={orgUnitId}
                required
                onChange={setOrgUnitId}
                placeholder={t('foodReservations.selectUnit')}
                options={context.units.map((unit) => ({
                  value: unit.id,
                  label: unit.pathLabel || unit.name,
                }))}
              />
            </FormField>
          </div>
        ) : null}
        <div className="flex flex-col items-center gap-4 pt-8 [&_label]:justify-center">
          <FormField icon={Store} label={t('foodReservations.restaurant')}>
            {canManage && !orgUnitId ? (
              <p className="w-[300px] max-w-full px-1 py-2.5 text-center text-sm text-ink-400">
                {t('foodReservations.selectUnit')}
              </p>
            ) : (
              <ChoiceList
                value={selectedRestaurantId}
                onChange={setRestaurantId}
                label={t('foodReservations.restaurant')}
                options={unitRestaurants.map((item) => ({ value: item.id, label: item.name }))}
              />
            )}
          </FormField>
          <FormField icon={UtensilsCrossed} label={t('foodReservations.food')}>
            {foods.length > 0 ? (
              <ChoiceList
                value={resolvedFoodId}
                onChange={setFoodId}
                label={t('foodReservations.food')}
                options={foods.map((item) => ({ value: item.food.id, label: item.food.name }))}
              />
            ) : (
              <p className="w-[300px] max-w-full px-1 py-2.5 text-center text-sm text-ink-400">
                {selectedRestaurantId ? '—' : t('foodReservations.selectRestaurant')}
              </p>
            )}
          </FormField>
          {canChooseQuantity ? (
            <div className="w-[300px] max-w-full">
              <FormField icon={Hash} label={t('foodReservations.quantity')} htmlFor="reserveQuantity">
                <input
                  id="reserveQuantity"
                  type="number"
                  min={1}
                  max={500}
                  className={`${fieldClassName} text-center`}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </FormField>
            </div>
          ) : null}
        </div>
        {canManage && orgUnitId && unitRestaurants.length === 0 ? (
          <FormEmptyHint>{t('foodReservations.noUnitRestaurants')}</FormEmptyHint>
        ) : null}
        {selectedRestaurantId && menu.isSuccess && foods.length === 0 ? (
          <FormEmptyHint>{t('foodReservations.noActiveFood')}</FormEmptyHint>
        ) : (
          <FormActions
            className="justify-center [&>div]:flex-row-reverse [&>div]:gap-8"
            submitLabel={t('foodReservations.save')}
            cancelLabel={t('foodReservations.cancel')}
            submitting={saving || menuPending}
            onCancel={() => history.back()}
          />
        )}
      </AppForm>
    </FormCard>
  )
}
