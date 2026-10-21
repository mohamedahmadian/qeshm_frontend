import {
  Building2,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Hash,
  Minus,
  Moon,
  Plus,
  Store,
  Sun,
  Ticket,
  Users,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, Button, FormActions, FormField } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, FormSectionTitle, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { languageDir } from '../../../i18n'
import { api, getApiErrorMessage } from '../../../lib/api'
import {
  addDaysIso,
  formatDate,
  formatGroupedNumber,
  formatNumber,
  formatWeekday,
  iranWeekdayIndex,
  startOfIranWeekIso,
  toLatinDigits,
  todayIsoDate,
} from '../../../lib/datetime'
import type { FoodMealType, FoodReservationContext, RestaurantMenuItem } from '../../../types/app'
import { foodMealTypes } from '../../../types/app'
import { EntityThumb } from '../EntityThumb'

export type FoodReservePayload = {
  reservedAt: string
  mealType: FoodMealType
  orgUnitId?: string
  restaurantId: string
  items: { foodId: string; quantity: number; forGuest?: boolean }[]
}

type FoodOrderCounts = { unit: string; guest: string }

function digitsOnly(value: string) {
  return toLatinDigits(value).replace(/\D/g, '')
}

function SegmentedTwo<T extends string>({
  value,
  onChange,
  label,
  options,
}: {
  value: T
  onChange: (next: T) => void
  label: string
  options: { value: T; label: string; icon: LucideIcon }[]
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid w-1/3 min-w-[12rem] grid-cols-2 gap-1 rounded-2xl border border-line bg-cream-50 p-1"
    >
      {options.map((option) => {
        const selected = value === option.value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
              selected ? 'bg-teal-500 text-white shadow-sm' : 'text-ink-600 hover:bg-white'
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function OptionPick({
  value,
  onChange,
  label,
  options,
  columns = 2,
}: {
  value: string
  onChange: (next: string) => void
  label: string
  options: { value: string; title: string; hint?: string; imageId?: string | null; icon: LucideIcon }[]
  columns?: 2 | 4
}) {
  const compact = columns === 4
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={compact ? 'grid grid-cols-4 gap-2' : 'grid grid-cols-2 gap-2'}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex min-w-0 cursor-pointer rounded-2xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
              compact
                ? 'min-h-[6.5rem] flex-col items-center gap-2 p-2.5 text-center'
                : 'min-h-[4.75rem] items-start gap-3 p-3 text-start'
            } ${
              selected
                ? 'border-teal-500 bg-gradient-to-b from-teal-50 to-white shadow-[0_8px_18px_rgba(46,189,182,0.14)]'
                : 'border-line bg-white hover:border-teal-300'
            }`}
          >
            <EntityThumb imageId={option.imageId} icon={option.icon} label={option.title} />
            <span className="min-w-0">
              <span className={`block font-semibold text-ink-900 ${compact ? 'line-clamp-2 text-xs leading-4' : 'text-sm'}`}>
                {option.title}
              </span>
              {option.hint ? <span className="mt-0.5 block text-xs leading-5 text-ink-500">{option.hint}</span> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function clampQty(value: string, max: number) {
  return String(Math.max(0, Math.min(max, Number(value) || 0)))
}

function bumpQty(current: string, delta: number, max: number) {
  return clampQty(String((Number(current) || 0) + delta), max)
}

function QtyStepper({
  id,
  value,
  onChange,
  max,
  decreaseLabel,
  increaseLabel,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  max: number
  decreaseLabel: string
  increaseLabel: string
}) {
  return (
    <div dir="ltr" className="flex h-11 w-1/3 min-w-[8.5rem] items-center overflow-hidden rounded-2xl border border-line bg-cream-50">
      <button
        type="button"
        aria-label={decreaseLabel}
        onClick={() => onChange(bumpQty(value, -1, max))}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center text-teal-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        id={id}
        inputMode="numeric"
        className="digit-field min-w-0 flex-1 border-0 bg-transparent py-2 text-center text-sm text-ink-900 outline-none"
        value={value === '' ? '0' : value}
        onChange={(event) => onChange(clampQty(digitsOnly(event.target.value), max))}
      />
      <button
        type="button"
        aria-label={increaseLabel}
        onClick={() => onChange(bumpQty(value, 1, max))}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center text-teal-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300"
      >
        <Plus className="size-4" aria-hidden />
      </button>
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
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                    locked
                      ? 'cursor-not-allowed border-transparent bg-cream-50 text-ink-300 opacity-55'
                      : selected
                        ? 'cursor-pointer border-teal-500 bg-gradient-to-b from-teal-50 to-white text-teal-800 shadow-[0_6px_14px_rgba(46,189,182,0.14)]'
                        : 'cursor-pointer border-transparent bg-cream-50 text-ink-700 hover:border-teal-300 hover:bg-white'
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
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const canManage = context.canManage
  const [reservedAt, setReservedAt] = useState(todayIsoDate)
  const [mealType, setMealType] = useState<FoodMealType>(foodMealTypes.LUNCH)
  const [orgUnitId, setOrgUnitId] = useState(
    canManage && context.units.length === 1 ? context.units[0].id : '',
  )
  const unitRestaurants = context.restaurants
  const onlyRestaurantId = unitRestaurants.length === 1 ? unitRestaurants[0].id : ''
  const [restaurantId, setRestaurantId] = useState(onlyRestaurantId)
  const [foodId, setFoodId] = useState('')
  const [orders, setOrders] = useState<Record<string, FoodOrderCounts>>({})
  const [saving, setSaving] = useState(false)
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
  const selectedFood = foods.find((item) => item.food.id === resolvedFoodId)
  const unitQtyMax = 500
  const guestQtyMax = activeUnit?.maxGuestMeals ? activeUnit.maxGuestMeals : 500
  const countsOf = (foodIdValue: string): FoodOrderCounts =>
    orders[foodIdValue] ?? { unit: '0', guest: '0' }
  const orderedLines = foods
    .map((item) => {
      const counts = countsOf(item.food.id)
      const unit = Number(counts.unit) || 0
      const guest = guestMealsEnabled ? Number(counts.guest) || 0 : 0
      return { item, unit, guest }
    })
    .filter((line) => line.unit + line.guest > 0)
  const orderedServings = orderedLines.reduce((sum, line) => sum + line.unit + line.guest, 0)
  const orderedTotal = orderedLines.reduce(
    (sum, line) => sum + (line.unit + line.guest) * line.item.price,
    0,
  )
  const lineTotal = canChooseQuantity ? orderedTotal : (selectedFood?.price ?? 0)

  function setCount(foodIdValue: string, field: keyof FoodOrderCounts, next: string) {
    setOrders((current) => ({
      ...current,
      [foodIdValue]: { ...(current[foodIdValue] ?? { unit: '0', guest: '0' }), [field]: next },
    }))
  }
  const toman = t('foodReservations.toman')
  const menuPending = Boolean(selectedRestaurantId && reservedAt && menu.isLoading)
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
    const items: FoodReservePayload['items'] = []
    if (canChooseQuantity) {
      for (const line of orderedLines) {
        if (line.unit > 0) items.push({ foodId: line.item.food.id, quantity: line.unit })
        if (line.guest > 0) {
          items.push({ foodId: line.item.food.id, quantity: line.guest, forGuest: true })
        }
      }
      if (!items.length) {
        toast.error(t('foodReservations.enterQuantity'))
        return
      }
    } else {
      if (!resolvedFoodId) {
        toast.error(t('foodReservations.selectFood'))
        return
      }
      items.push({ foodId: resolvedFoodId, quantity: 1 })
    }
    setSaving(true)
    try {
      await onSubmit({
        reservedAt,
        mealType,
        ...(canManage ? { orgUnitId } : {}),
        restaurantId: selectedRestaurantId,
        items,
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
        <FormSectionTitle icon={CalendarRange}>{t('foodReservations.setupSection')}</FormSectionTitle>
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
        ) : null}
        <FormSectionTitle icon={Utensils}>{t('foodReservations.composeSection')}</FormSectionTitle>
        <FormField icon={Utensils} label={t('foodReservations.mealType')}>
          <SegmentedTwo
            value={mealType}
            onChange={setMealType}
            label={t('foodReservations.mealType')}
            options={[
              { value: foodMealTypes.LUNCH, label: t('foodReservations.lunch'), icon: Sun },
              { value: foodMealTypes.DINNER, label: t('foodReservations.dinner'), icon: Moon },
            ]}
          />
        </FormField>
        <FormField icon={Store} label={t('foodReservations.restaurant')}>
          {canManage && !orgUnitId ? (
            <FormEmptyHint>{t('foodReservations.selectUnit')}</FormEmptyHint>
          ) : unitRestaurants.length === 0 ? (
            <FormEmptyHint>{t('foodReservations.noUnitRestaurants')}</FormEmptyHint>
          ) : (
            <OptionPick
              value={selectedRestaurantId}
              onChange={setRestaurantId}
              label={t('foodReservations.restaurant')}
              columns={4}
              options={unitRestaurants.map((item) => ({
                value: item.id,
                title: item.name,
                imageId: item.logoId,
                icon: Store,
              }))}
            />
          )}
        </FormField>
        {!selectedRestaurantId ? (
          canManage && !orgUnitId || unitRestaurants.length === 0 ? null : (
            <FormEmptyHint>{t('foodReservations.pickRestaurantFirst')}</FormEmptyHint>
          )
        ) : (
          <div className="space-y-4">
            <FormSectionTitle icon={UtensilsCrossed}>{t('foodReservations.orderSection')}</FormSectionTitle>
            {menuPending ? (
              <p className="text-sm text-ink-500">{t('common.loading')}</p>
            ) : foods.length === 0 ? (
              <FormEmptyHint>{t('foodReservations.noActiveFood')}</FormEmptyHint>
            ) : canChooseQuantity ? (
              <div className="space-y-3">
                <p className="text-xs leading-6 text-ink-500">{t('foodReservations.foodsHint')}</p>
                {foods.map((item) => {
                  const counts = countsOf(item.food.id)
                  return (
                    <article
                      key={item.food.id}
                      className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50 to-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <EntityThumb imageId={item.food.photoId} icon={UtensilsCrossed} label={item.food.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900">{item.food.name}</p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            {formatGroupedNumber(item.price, locale)} {toman}
                          </p>
                        </div>
                      </div>
                      <div className={`grid gap-3 ${guestMealsEnabled ? 'sm:grid-cols-2' : ''}`}>
                        <FormField
                          icon={Hash}
                          label={t('foodReservations.unitQuantity')}
                          htmlFor={`reserveUnitQty-${item.food.id}`}
                        >
                          <QtyStepper
                            id={`reserveUnitQty-${item.food.id}`}
                            value={counts.unit}
                            onChange={(next) => setCount(item.food.id, 'unit', next)}
                            max={unitQtyMax}
                            decreaseLabel={t('foodReservations.qtyDecrease')}
                            increaseLabel={t('foodReservations.qtyIncrease')}
                          />
                        </FormField>
                        {guestMealsEnabled ? (
                          <FormField
                            icon={Users}
                            label={t('foodReservations.guestQuantity')}
                            htmlFor={`reserveGuestQty-${item.food.id}`}
                          >
                            <QtyStepper
                              id={`reserveGuestQty-${item.food.id}`}
                              value={counts.guest}
                              onChange={(next) => setCount(item.food.id, 'guest', next)}
                              max={guestQtyMax}
                              decreaseLabel={t('foodReservations.qtyDecrease')}
                              increaseLabel={t('foodReservations.qtyIncrease')}
                            />
                          </FormField>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <FormField icon={UtensilsCrossed} label={t('foodReservations.food')}>
                <OptionPick
                  value={resolvedFoodId}
                  onChange={setFoodId}
                  label={t('foodReservations.food')}
                  options={foods.map((item) => ({
                    value: item.food.id,
                    title: item.food.name,
                    hint: `${formatGroupedNumber(item.price, locale)} ${toman}`,
                    imageId: item.food.photoId,
                    icon: UtensilsCrossed,
                  }))}
                />
              </FormField>
            )}
            {foods.length > 0 ? (
              <>
                <div className="rounded-2xl border border-teal-100 bg-gradient-to-e from-mint-50 via-white to-teal-50 px-4 py-3">
                  <p className="text-xs font-medium text-ink-500">{t('foodReservations.orderSummary')}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink-900">
                    {canChooseQuantity
                      ? orderedLines.length
                        ? orderedLines.map((line) => line.item.food.name).join('، ')
                        : t('foodReservations.selectFood')
                      : selectedFood
                        ? selectedFood.food.name
                        : t('foodReservations.selectFood')}
                    {canChooseQuantity
                      ? ` · ${t('foodReservations.summaryServings', { qty: formatNumber(orderedServings, locale) })}`
                      : ''}
                    {lineTotal > 0 ? ` · ${formatGroupedNumber(lineTotal, locale)} ${toman}` : ''}
                  </p>
                </div>
                <FormActions
                  submitLabel={t('foodReservations.save')}
                  cancelLabel={t('foodReservations.cancel')}
                  submitting={saving || menuPending}
                  onCancel={() => history.back()}
                />
              </>
            ) : null}
          </div>
        )}
      </AppForm>
    </FormCard>
  )
}
