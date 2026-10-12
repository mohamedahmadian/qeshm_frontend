import { Building2, CalendarRange, Check, ChevronLeft, ChevronRight, Hash, Store, Ticket, Users, UtensilsCrossed } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, Button, FormActions, FormField, ToggleField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { languageDir } from '../../../i18n'
import { api, getApiErrorMessage } from '../../../lib/api'
import {
  addDaysIso,
  formatDate,
  formatWeekday,
  iranWeekdayIndex,
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
  forGuest?: boolean
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

function isStandardMealName(name: string) {
  const label = name.trim()
  return label.startsWith('غذای کارمندی') || label.startsWith('غذای مدیریتی')
}

function weekIsos(start: string) {
  return Array.from({ length: 7 }, (_, index) => addDaysIso(start, index))
}

function WeekDayPicker({
  value,
  onChange,
  label,
  foodByWeekday,
  allowPast = false,
}: {
  value: string
  onChange: (iso: string) => void
  label: string
  foodByWeekday?: Record<number, string>
  allowPast?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const rtl = languageDir(locale) === 'rtl'
  const today = todayIsoDate()
  const currentWeek = startOfIranWeekIso(today)
  const [weekStart, setWeekStart] = useState(currentWeek)
  const [slideFrom, setSlideFrom] = useState<number | null>(null)
  const days = useMemo(() => weekIsos(weekStart), [weekStart])
  const drag = useRef<{ x: number; id: number } | null>(null)
  const suppressClick = useRef(false)
  const selectedVisible = days.includes(value)

  function goToWeek(nextStart: string) {
    if (!nextStart || nextStart === weekStart) return
    const forward = nextStart > weekStart
    const logical = (forward ? 1 : -1) * (rtl ? -1 : 1)
    setSlideFrom(logical * 36)
    setWeekStart(nextStart)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    drag.current = { x: event.clientX, id: event.pointerId }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return
    if (Math.abs(event.clientX - state.x) < 10) return
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    drag.current = null
    if (!state || state.id !== event.pointerId) return
    const dx = event.clientX - state.x
    if (Math.abs(dx) < 48) return
    suppressClick.current = true
    const later = rtl ? dx > 0 : dx < 0
    goToWeek(addDaysIso(weekStart, (later ? 1 : -1) * 7))
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          icon
          className="shrink-0"
          aria-label={t('foodReservations.earlierDays')}
          onClick={() => goToWeek(addDaysIso(weekStart, -7))}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
        </Button>
        <div
          role="radiogroup"
          aria-label={label}
          className="min-w-0 flex-1 cursor-grab touch-pan-y select-none overflow-x-auto active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null
          }}
          onClickCapture={onClickCapture}
        >
          <div
            key={weekStart}
            className={`grid w-full min-w-[33rem] grid-cols-7 gap-1.5 sm:gap-2 ${slideFrom == null ? '' : 'food-days-slide'}`}
            style={slideFrom == null ? undefined : { ['--food-day-from' as string]: `${slideFrom}px` }}
          >
            {days.map((iso) => {
              const selected = value === iso
              const isToday = iso === today
              const locked = !allowPast && iso < today
              const dayNo = formatDate(iso, locale).split('/').pop() ?? ''
              const foodName = foodByWeekday?.[iranWeekdayIndex(iso)] ?? ''
              const weekday = formatWeekday(iso, locale)
              return (
                <button
                  key={iso}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={locked}
                  aria-label={foodName ? `${weekday} ${dayNo} ${foodName}` : `${weekday} ${dayNo}`}
                  disabled={locked}
                  title={
                    locked
                      ? foodName
                        ? `${t('foodReservations.pastDay')} — ${foodName}`
                        : t('foodReservations.pastDay')
                      : foodName || undefined
                  }
                  onClick={() => {
                    if (suppressClick.current || locked) return
                    onChange(iso)
                  }}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border-[3px] px-1 py-2.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                    locked
                      ? 'cursor-not-allowed border-transparent bg-cream-50 text-ink-300 opacity-55'
                      : selected
                        ? 'cursor-pointer border-teal-600 bg-teal-50 text-teal-800 shadow-[0_0_0_1px_#148f8a]'
                        : 'cursor-pointer border-transparent bg-cream-50 text-ink-700 hover:border-teal-300 hover:bg-teal-50'
                  }`}
                >
                  <span className={`whitespace-nowrap text-[11px] font-medium ${selected ? 'text-teal-700' : locked ? 'text-ink-300' : 'text-ink-500'}`}>
                    {weekday}
                  </span>
                  <span className="text-base font-semibold leading-none">{dayNo}</span>
                  {foodByWeekday ? (
                    <span
                      className={`line-clamp-2 min-h-8 w-full text-[11px] font-semibold leading-4 ${
                        selected ? 'text-teal-800' : locked ? 'text-ink-300' : 'text-teal-700'
                      }`}
                    >
                      {foodName || '\u00a0'}
                    </span>
                  ) : null}
                  {isToday && !selected ? (
                    <span className="size-1.5 rounded-full bg-teal-500" aria-hidden />
                  ) : (
                    <span className="size-1.5" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          icon
          className="shrink-0"
          aria-label={t('foodReservations.laterDays')}
          onClick={() => goToWeek(addDaysIso(weekStart, 7))}
        >
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
        <span className="text-ink-500">
          {t('foodReservations.dayRange', {
            from: formatDate(days[0], locale),
            to: formatDate(days[6], locale),
          })}
        </span>
        {!selectedVisible && value ? (
          <span className="font-medium text-teal-700">
            {t('foodReservations.selectedDay', { date: formatDate(value, locale) })}
          </span>
        ) : null}
        {weekStart !== currentWeek ? (
          <button
            type="button"
            className="cursor-pointer font-medium text-teal-700 underline-offset-2 hover:underline"
            onClick={() => goToWeek(currentWeek)}
          >
            {t('foodReservations.currentWeek')}
          </button>
        ) : null}
      </div>
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
  const unitRestaurants = context.restaurants
  const onlyRestaurantId = unitRestaurants.length === 1 ? unitRestaurants[0].id : ''
  const [restaurantId, setRestaurantId] = useState(onlyRestaurantId)
  const [foodId, setFoodId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [forGuest, setForGuest] = useState(false)
  const [saving, setSaving] = useState(false)
  const quantityScope = canManage ? orgUnitId : 'self'
  const selectedRestaurantId = onlyRestaurantId || restaurantId
  const canChooseQuantity = canManage || context.isNutritionRep
  const activeUnit = canManage
    ? context.units.find((unit) => unit.id === orgUnitId)
    : context.orgUnit
  const guestMealsEnabled = Boolean(activeUnit?.guestMealsEnabled)

  const weekMenu = useQuery({
    queryKey: ['food-reservation-week-menu', selectedRestaurantId, canManage ? orgUnitId : ''],
    enabled: Boolean(selectedRestaurantId && (!canManage || orgUnitId)),
    queryFn: async () => {
      const { data } = await api.get<RestaurantMenuItem[]>('/food-reservations/week-menu', {
        params: {
          restaurantId: selectedRestaurantId,
          ...(canManage ? { orgUnitId } : {}),
        },
      })
      return data
    },
  })
  const foodByWeekday = useMemo(() => {
    if (!selectedRestaurantId || !weekMenu.data) return undefined
    const names = new Map<number, string[]>()
    for (const item of weekMenu.data) {
      if (isStandardMealName(item.food.name)) continue
      const list = names.get(item.weekday) ?? []
      list.push(item.food.name)
      names.set(item.weekday, list)
    }
    const byWeekday: Record<number, string> = {}
    for (const [weekday, dayNames] of names) {
      if (dayNames.length) byWeekday[weekday] = dayNames.join('، ')
    }
    return byWeekday
  }, [selectedRestaurantId, weekMenu.data])
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
      forGuest,
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
            ...(forGuest ? { forGuest: true } : {}),
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
    if (!guestMealsEnabled) setForGuest(false)
  }, [guestMealsEnabled])

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

  const quantityLookupKey = `${quantityScope}|${selectedRestaurantId}|${resolvedFoodId}|${forGuest ? 'guest' : 'unit'}`
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
    if (!canManage && reservedAt < todayIsoDate()) {
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
        ...(canChooseQuantity && guestMealsEnabled ? { forGuest } : {}),
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
            foodByWeekday={foodByWeekday}
            allowPast={canManage}
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
            <div className="flex w-[300px] max-w-full flex-col items-center gap-4">
              {guestMealsEnabled ? (
                <FormField icon={Users} label={t('foodReservations.forGuest')}>
                  <div className="flex justify-center">
                    <ToggleField
                      checked={forGuest}
                      onChange={setForGuest}
                      onLabel={t('foodReservations.guestOrder')}
                      offLabel={t('foodReservations.unitOrder')}
                    />
                  </div>
                </FormField>
              ) : null}
              <FormField
                icon={Hash}
                label={forGuest ? t('foodReservations.guestQuantity') : t('foodReservations.quantity')}
                htmlFor="reserveQuantity"
              >
                <input
                  id="reserveQuantity"
                  type="number"
                  min={1}
                  max={forGuest && activeUnit?.maxGuestMeals ? activeUnit.maxGuestMeals : 500}
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
          <FormEmptyHint>{t('restaurants.noRestaurants')}</FormEmptyHint>
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
