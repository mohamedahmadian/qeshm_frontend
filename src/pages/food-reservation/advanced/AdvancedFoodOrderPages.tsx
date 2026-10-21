import {
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  ChefHat,
  Hash,
  Minus,
  Moon,
  Plus,
  Store,
  Sun,
  UserPlus,
  Users,
  Utensils,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../../components/ui/DateText'
import {
  AppForm,
  DetailActions,
  EntityNameSubtitle,
  FormActions,
  FormField,
  LoadingState,
  PageHeader,
  fieldClassName,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { CheckboxField } from '../../../components/ui/CheckboxField'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../../components/ui/FormLayout'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api, getApiErrorMessage } from '../../../lib/api'
import { formatGroupedNumber, formatNumber, formatWeekday, parseDigitString, toLatinDigits, todayIsoDate } from '../../../lib/datetime'
import type {
  AdvancedFoodOrder,
  AdvancedFoodOrderContext,
  AdvancedFoodOrderDetail,
  AdvancedFoodOrderLine,
  AdvancedFoodOrderSource,
  AdvancedFoodWeekDay,
  FoodMealType,
  Paginated,
} from '../../../types/app'
import { foodMealTypes } from '../../../types/app'
import { foodAdvancedItemPath, foodAdvancedPath } from '../food-paths'
import { FoodMealTypeBadge, FoodReservationStatusBadge } from '../FoodReservationStatusBadge'

const ORDER_WEEKDAYS = [0, 1, 2, 3, 4] as const

function digitsOnly(value: string) {
  return toLatinDigits(value).replace(/\D/g, '')
}

function groupedPrice(value: string, locale: string) {
  if (value === '' || !Number.isFinite(Number(value))) return ''
  return formatGroupedNumber(Number(value), locale)
}

function money(value: number | null, locale: string, unit: string) {
  if (value == null) return '—'
  return `${formatGroupedNumber(value, locale)} ${unit}`
}

function lineAudienceQty(item: AdvancedFoodOrderLine, order: AdvancedFoodOrderDetail) {
  if (item.food.name.startsWith('غذای کارمندی')) {
    return { unit: order.employeeQuantity, guest: order.employeeGuestQuantity }
  }
  if (item.food.name.startsWith('غذای مدیریتی')) {
    return { unit: order.managementQuantity, guest: order.managementGuestQuantity }
  }
  return {
    unit: order.employeeQuantity + order.managementQuantity,
    guest: order.employeeGuestQuantity + order.managementGuestQuantity,
  }
}

function WeekdayBadge({
  value,
  locale,
  className = '',
}: {
  value: string
  locale: string
  className?: string
}) {
  const weekday = formatWeekday(value, locale)
  if (!weekday) return null
  return (
    <span
      className={`inline-flex w-fit rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-100 ${className}`}
    >
      {weekday}
    </span>
  )
}

function DateWithWeekday({ value, locale }: { value: string; locale: string }) {
  return (
    <span className="flex flex-col items-start gap-1">
      <DateText value={value} />
      <WeekdayBadge value={value} locale={locale} />
    </span>
  )
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
  options: { value: T; label: string; icon: typeof Sun }[]
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

function SourcePick<T extends string>({
  value,
  onChange,
  label,
  options,
}: {
  value: T
  onChange: (next: T) => void
  label: string
  options: { value: T; title: string; hint: string; icon: typeof ChefHat }[]
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
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
            className={`flex min-h-[6.25rem] cursor-pointer flex-col items-start gap-2 rounded-2xl border-2 p-4 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
              selected
                ? 'border-teal-500 bg-gradient-to-b from-teal-50 to-white shadow-[0_8px_18px_rgba(46,189,182,0.14)]'
                : 'border-line bg-white hover:border-teal-300'
            }`}
          >
            <span
              className={`flex size-9 items-center justify-center rounded-xl ${
                selected ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-700'
              }`}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-ink-900">{option.title}</span>
            <span className="text-xs leading-5 text-ink-500">{option.hint}</span>
          </button>
        )
      })}
    </div>
  )
}

function bumpQty(current: string, delta: number, zeroValue = '') {
  const next = Math.max(0, (current === '' ? 0 : Number(current)) + delta)
  return next === 0 ? zeroValue : String(next)
}

function QtyStepper({
  id,
  value,
  onChange,
  decreaseLabel,
  increaseLabel,
  zeroValue = '',
}: {
  id: string
  value: string
  onChange: (next: string) => void
  decreaseLabel: string
  increaseLabel: string
  zeroValue?: string
}) {
  return (
    <div dir="ltr" className="flex h-11 w-1/3 min-w-[8.5rem] items-center overflow-hidden rounded-2xl border border-line bg-cream-50">
      <button
        type="button"
        aria-label={decreaseLabel}
        onClick={() => onChange(bumpQty(value, -1, zeroValue))}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center text-teal-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        id={id}
        inputMode="numeric"
        className="digit-field min-w-0 flex-1 border-0 bg-transparent py-2 text-center text-sm text-ink-900 outline-none"
        value={value}
        onChange={(event) => onChange(digitsOnly(event.target.value) || zeroValue)}
      />
      <button
        type="button"
        aria-label={increaseLabel}
        onClick={() => onChange(bumpQty(value, 1, zeroValue))}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center text-teal-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}

function GuestOrderCard({
  tone,
  icon: Icon,
  title,
  subtitle,
  priceId,
  priceLabel,
  price,
  onPriceChange,
  showPrice,
  priceHint,
  qtyId,
  qtyLabel,
  quantity,
  onQuantityChange,
  guestId,
  guestLabel,
  guests,
  onGuestsChange,
  decreaseLabel,
  increaseLabel,
  totalLabel,
  total,
  unit,
  locale,
}: {
  tone: 'teal' | 'mint'
  icon: typeof Users
  title: string
  subtitle: string
  priceId: string
  priceLabel: string
  price: string
  onPriceChange: (next: string) => void
  showPrice: boolean
  priceHint?: string
  qtyId: string
  qtyLabel: string
  quantity: string
  onQuantityChange: (next: string) => void
  guestId: string
  guestLabel: string
  guests: string
  onGuestsChange: (next: string) => void
  decreaseLabel: string
  increaseLabel: string
  totalLabel: string
  total: number
  unit: string
  locale: string
}) {
  const wrap =
    tone === 'teal'
      ? 'border-teal-100 bg-gradient-to-b from-teal-50 to-white'
      : 'border-mint-100 bg-gradient-to-b from-mint-50 to-white'
  const iconWrap = tone === 'teal' ? 'bg-teal-500 text-white' : 'bg-mint-500 text-white'
  return (
    <article className={`flex min-w-0 flex-col gap-4 rounded-2xl border p-4 ${wrap}`}>
      <div className="flex items-start gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-ink-500">{subtitle}</p>
        </div>
      </div>
      {showPrice ? (
        <FormField icon={Wallet} label={priceLabel} htmlFor={priceId}>
          <div className="flex items-center gap-2">
            <input
              id={priceId}
              inputMode="numeric"
              className={`${fieldClassName} digit-field`}
              value={groupedPrice(price, locale)}
              onChange={(event) => onPriceChange(parseDigitString(event.target.value))}
            />
            <span className="shrink-0 text-sm text-ink-500">{unit}</span>
          </div>
        </FormField>
      ) : priceHint ? (
        <p className="rounded-xl bg-white/80 px-3 py-2 text-xs leading-5 text-ink-500">{priceHint}</p>
      ) : null}
      <FormField icon={Hash} label={qtyLabel} htmlFor={qtyId}>
        <QtyStepper
          id={qtyId}
          value={quantity}
          onChange={onQuantityChange}
          decreaseLabel={decreaseLabel}
          increaseLabel={increaseLabel}
        />
      </FormField>
      <FormField icon={UserPlus} label={guestLabel} htmlFor={guestId}>
        <QtyStepper
          id={guestId}
          value={guests}
          onChange={onGuestsChange}
          decreaseLabel={decreaseLabel}
          increaseLabel={increaseLabel}
          zeroValue="0"
        />
      </FormField>
      {showPrice && total > 0 ? (
        <p className="flex items-center justify-between text-sm font-medium text-ink-800">
          <span className="text-ink-500">{totalLabel}</span>
          <span>
            {formatGroupedNumber(total, locale)} {unit}
          </span>
        </p>
      ) : null}
    </article>
  )
}

function SummaryRow({
  icon: Icon,
  label,
  qty,
  guests,
  amount,
  unit,
  locale,
}: {
  icon: typeof Users
  label: string
  qty: number
  guests: number
  amount: number
  unit: string
  locale: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-800">
      <span className="inline-flex items-center gap-2 font-medium">
        <Icon className="size-4 text-teal-600" aria-hidden />
        {label}
      </span>
      <span className={qty > 0 ? '' : 'text-ink-400'}>
        {t('advancedFoodOrders.summaryServings', { qty: formatNumber(qty, locale) })}
        {guests > 0
          ? ` (${t('advancedFoodOrders.summaryGuests', { qty: formatNumber(guests, locale) })})`
          : ''}
        {amount > 0 ? ` · ${formatGroupedNumber(amount, locale)} ${unit}` : ''}
      </span>
    </div>
  )
}

function WeekMenuPreview({
  days,
  weekdays,
  data,
  loading,
  locale,
  unit,
}: {
  days: readonly number[]
  weekdays: number[]
  data?: AdvancedFoodWeekDay[]
  loading: boolean
  locale: string
  unit: string
}) {
  const { t } = useTranslation()
  if (loading) return <LoadingState />
  if (!data) return null
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {days.map((weekday) => {
        const selected = weekdays.includes(weekday)
        const foods = data.find((day) => day.weekday === weekday)?.foods ?? []
        let body: ReactNode
        if (!selected) body = t('advancedFoodOrders.weekdayOff')
        else if (foods.length === 0) body = t('advancedFoodOrders.noDayFood')
        else {
          body = (
            <ul className="space-y-1">
              {foods.map((food) => (
                <li key={food.id}>
                  <span>{food.name}</span>
                  <span className="mt-0.5 block text-[11px] font-medium text-teal-700">
                    {formatGroupedNumber(food.price, locale)} {unit}
                  </span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <div
            key={weekday}
            className={`rounded-2xl border p-3 ${
              selected
                ? 'border-teal-200 bg-gradient-to-b from-teal-50 to-white'
                : 'border-line bg-cream-50 text-ink-400'
            }`}
          >
            <p className="text-xs font-semibold text-ink-800">{t(`restaurantMenuItems.day${weekday}`)}</p>
            <div className="mt-1.5 text-xs leading-5">{body}</div>
          </div>
        )
      })}
    </div>
  )
}

function OrderForm({
  context,
  onCreated,
}: {
  context: AdvancedFoodOrderContext
  onCreated: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [startsOn, setStartsOn] = useState(todayIsoDate)
  const [endsOn, setEndsOn] = useState(todayIsoDate)
  const [weekdays, setWeekdays] = useState<number[]>([...ORDER_WEEKDAYS])
  const [orgUnitId, setOrgUnitId] = useState(context.units.length === 1 ? context.units[0].id : '')
  const [restaurantId, setRestaurantId] = useState('')
  const [source, setSource] = useState<AdvancedFoodOrderSource>('DEFAULT')
  const [mealType, setMealType] = useState<FoodMealType>(foodMealTypes.LUNCH)
  const [employeeQuantity, setEmployeeQuantity] = useState('')
  const [managementQuantity, setManagementQuantity] = useState('')
  const [employeeGuests, setEmployeeGuests] = useState('0')
  const [managementGuests, setManagementGuests] = useState('0')
  const [employeePrice, setEmployeePrice] = useState('')
  const [managementPrice, setManagementPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const restaurants = context.restaurants
  const restaurant = restaurants.find((item) => item.id === restaurantId)
  const toman = t('advancedFoodOrders.toman')
  const employeeGuestQty = employeeGuests === '' ? 0 : Number(employeeGuests)
  const managementGuestQty = managementGuests === '' ? 0 : Number(managementGuests)
  const employeeQty =
    (employeeQuantity === '' ? 0 : Number(employeeQuantity)) + employeeGuestQty
  const managementQty =
    (managementQuantity === '' ? 0 : Number(managementQuantity)) + managementGuestQty
  const employeeLine =
    employeeQty > 0 && employeePrice !== '' ? employeeQty * Number(employeePrice) : 0
  const managementLine =
    managementQty > 0 && managementPrice !== '' ? managementQty * Number(managementPrice) : 0
  const totalQty = employeeQty + managementQty
  const dailyTotal = employeeLine + managementLine

  useEffect(() => {
    if (restaurants.length === 1) {
      setRestaurantId(restaurants[0].id)
      return
    }
    setRestaurantId((current) => (restaurants.some((item) => item.id === current) ? current : ''))
  }, [restaurants])

  useEffect(() => {
    if (!restaurant) {
      setEmployeePrice('')
      setManagementPrice('')
      return
    }
    setEmployeePrice(
      restaurant.employeeMealPrice != null ? String(restaurant.employeeMealPrice) : '',
    )
    setManagementPrice(
      restaurant.managementMealPrice != null ? String(restaurant.managementMealPrice) : '',
    )
  }, [restaurant])

  const weekMenu = useQuery({
    queryKey: ['advanced-food-orders', 'week-menu', restaurantId],
    enabled: source === 'MENU' && Boolean(restaurantId),
    queryFn: async () => {
      const { data } = await api.get<AdvancedFoodWeekDay[]>('/advanced-food-orders/week-menu', {
        params: { restaurantId },
      })
      return data
    },
  })

  function resetOrder() {
    const today = todayIsoDate()
    setStartsOn(today)
    setEndsOn(today)
    setWeekdays([...ORDER_WEEKDAYS])
    setEmployeeQuantity('')
    setManagementQuantity('')
    setEmployeeGuests('0')
    setManagementGuests('0')
  }

  function toggleWeekday(day: number, checked: boolean) {
    setWeekdays((current) => {
      const next = checked ? [...current, day] : current.filter((item) => item !== day)
      return ORDER_WEEKDAYS.filter((item) => next.includes(item))
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!startsOn || !endsOn) {
      toast.error(t('advancedFoodOrders.selectRange'))
      return
    }
    if (endsOn < startsOn) {
      toast.error(t('advancedFoodOrders.rangeOrder'))
      return
    }
    if (!weekdays.length) {
      toast.error(t('advancedFoodOrders.selectWeekdays'))
      return
    }
    if (!orgUnitId) {
      toast.error(t('advancedFoodOrders.selectUnit'))
      return
    }
    if (!restaurantId) {
      toast.error(t('advancedFoodOrders.selectRestaurant'))
      return
    }
    const employeeBase = employeeQuantity === '' ? 0 : Number(employeeQuantity)
    const managementBase = managementQuantity === '' ? 0 : Number(managementQuantity)
    if (employeeQty + managementQty < 1) {
      toast.error(t('advancedFoodOrders.enterQuantity'))
      return
    }
    if (source === 'DEFAULT' && employeeQty > 0 && employeePrice === '') {
      toast.error(t('advancedFoodOrders.enterEmployeePrice'))
      return
    }
    if (source === 'DEFAULT' && managementQty > 0 && managementPrice === '') {
      toast.error(t('advancedFoodOrders.enterManagementPrice'))
      return
    }
    setSaving(true)
    try {
      await api.post('/advanced-food-orders', {
        startsOn,
        endsOn,
        weekdays,
        orgUnitId,
        restaurantId,
        source,
        mealType,
        employeeQuantity: employeeBase,
        managementQuantity: managementBase,
        employeeGuestQuantity: employeeGuestQty,
        managementGuestQuantity: managementGuestQty,
        ...(source === 'DEFAULT'
          ? {
              ...(employeeQty > 0 ? { employeeUnitPrice: Number(employeePrice) } : {}),
              ...(managementQty > 0 ? { managementUnitPrice: Number(managementPrice) } : {}),
            }
          : {}),
      })
      toast.success(t('advancedFoodOrders.created'))
      resetOrder()
      onCreated()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  if (!context.units.length) {
    return (
      <FormCard icon={CalendarRange} title={t('advancedFoodOrders.create')}>
        <div className="p-5 sm:p-6">
          <FormEmptyHint>{t('advancedFoodOrders.noUnits')}</FormEmptyHint>
        </div>
      </FormCard>
    )
  }

  return (
    <FormCard
      icon={CalendarRange}
      title={t('advancedFoodOrders.create')}
      subtitle={t('advancedFoodOrders.createSubtitle')}
    >
      <AppForm onSubmit={submit} autoFocusFirst className={formCardBodyClassName}>
        <FormSectionTitle icon={CalendarRange}>{t('advancedFoodOrders.setupSection')}</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={CalendarRange} label={t('advancedFoodOrders.startsOn')} htmlFor="advancedFrom">
            <PersianDateField
              id="advancedFrom"
              value={startsOn}
              maxDate={endsOn || undefined}
              onChange={(value) => {
                const next = value ?? ''
                setStartsOn(next)
                if (endsOn && next && endsOn < next) setEndsOn('')
              }}
            />
          </FormField>
          <FormField icon={CalendarRange} label={t('advancedFoodOrders.endsOn')} htmlFor="advancedTo">
            <PersianDateField
              id="advancedTo"
              value={endsOn}
              minDate={startsOn || undefined}
              onChange={(value) => setEndsOn(value ?? '')}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField icon={CalendarDays} label={t('advancedFoodOrders.weekdays')}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label={t('advancedFoodOrders.weekdays')}>
                {ORDER_WEEKDAYS.map((day) => (
                  <CheckboxField
                    key={day}
                    id={`advanced-weekday-${day}`}
                    checked={weekdays.includes(day)}
                    onChange={(checked) => toggleWeekday(day, checked)}
                    label={t(`restaurantMenuItems.day${day}`)}
                  />
                ))}
              </div>
              <p className="text-xs leading-6 text-ink-500">{t('advancedFoodOrders.allDaysHint')}</p>
            </FormField>
          </div>
          <FormField icon={Building2} label={t('advancedFoodOrders.orgUnit')} htmlFor="advancedUnit">
            <SearchSelect
              id="advancedUnit"
              value={orgUnitId}
              onChange={setOrgUnitId}
              placeholder={t('advancedFoodOrders.selectUnit')}
              options={context.units.map((unit) => ({
                value: unit.id,
                label: unit.pathLabel || unit.name,
              }))}
            />
          </FormField>
          <FormField icon={Store} label={t('advancedFoodOrders.restaurant')} htmlFor="advancedRestaurant">
            <SearchSelect
              id="advancedRestaurant"
              value={restaurantId}
              onChange={setRestaurantId}
              disabled={restaurants.length === 0}
              placeholder={t('advancedFoodOrders.selectRestaurant')}
              options={restaurants.map((item) => ({ value: item.id, label: item.name }))}
            />
          </FormField>
        </div>
        {restaurants.length === 0 ? (
          <FormEmptyHint>{t('advancedFoodOrders.noRestaurants')}</FormEmptyHint>
        ) : !restaurant ? (
          <FormEmptyHint>{t('advancedFoodOrders.pickRestaurantFirst')}</FormEmptyHint>
        ) : (
          <div className="space-y-4">
            <FormSectionTitle icon={UtensilsCrossed}>{t('advancedFoodOrders.composeSection')}</FormSectionTitle>
            <FormField icon={Utensils} label={t('advancedFoodOrders.mealType')}>
              <SegmentedTwo
                value={mealType}
                onChange={setMealType}
                label={t('advancedFoodOrders.mealType')}
                options={[
                  { value: foodMealTypes.LUNCH, label: t('advancedFoodOrders.lunch'), icon: Sun },
                  { value: foodMealTypes.DINNER, label: t('advancedFoodOrders.dinner'), icon: Moon },
                ]}
              />
            </FormField>
            <FormField icon={ChefHat} label={t('advancedFoodOrders.foodSource')}>
              <SourcePick
                value={source}
                onChange={setSource}
                label={t('advancedFoodOrders.foodSource')}
                options={[
                  {
                    value: 'DEFAULT' as const,
                    title: t('advancedFoodOrders.sourceDefault'),
                    hint: t('advancedFoodOrders.sourceDefaultCard'),
                    icon: ChefHat,
                  },
                  {
                    value: 'MENU' as const,
                    title: t('advancedFoodOrders.sourceMenu'),
                    hint: t('advancedFoodOrders.sourceMenuCard'),
                    icon: CalendarDays,
                  },
                ]}
              />
            </FormField>
            {source === 'MENU' ? (
              <div className="space-y-2">
                <FormSectionTitle icon={CalendarDays} className="mb-0">
                  {t('advancedFoodOrders.weekPreview')}
                </FormSectionTitle>
                <WeekMenuPreview
                  days={ORDER_WEEKDAYS}
                  weekdays={weekdays}
                  data={weekMenu.data}
                  loading={weekMenu.isLoading}
                  locale={locale}
                  unit={toman}
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <GuestOrderCard
                tone="teal"
                icon={Users}
                title={t('advancedFoodOrders.employeeMeal')}
                subtitle={restaurant.name}
                priceId="advancedEmployeePrice"
                priceLabel={t('advancedFoodOrders.unitPrice')}
                price={employeePrice}
                onPriceChange={setEmployeePrice}
                showPrice={source === 'DEFAULT'}
                priceHint={t('advancedFoodOrders.priceFromMenu')}
                qtyId="advancedEmployeeQty"
                qtyLabel={t('advancedFoodOrders.dailyQty')}
                quantity={employeeQuantity}
                onQuantityChange={setEmployeeQuantity}
                guestId="advancedEmployeeGuests"
                guestLabel={t('advancedFoodOrders.guestQty')}
                guests={employeeGuests}
                onGuestsChange={setEmployeeGuests}
                decreaseLabel={t('advancedFoodOrders.qtyDecrease')}
                increaseLabel={t('advancedFoodOrders.qtyIncrease')}
                totalLabel={t('advancedFoodOrders.lineDailyTotal')}
                total={employeeLine}
                unit={toman}
                locale={locale}
              />
              <GuestOrderCard
                tone="mint"
                icon={Briefcase}
                title={t('advancedFoodOrders.managementMeal')}
                subtitle={restaurant.name}
                priceId="advancedManagementPrice"
                priceLabel={t('advancedFoodOrders.unitPrice')}
                price={managementPrice}
                onPriceChange={setManagementPrice}
                showPrice={source === 'DEFAULT'}
                priceHint={t('advancedFoodOrders.priceFromMenu')}
                qtyId="advancedManagementQty"
                qtyLabel={t('advancedFoodOrders.dailyQty')}
                quantity={managementQuantity}
                onQuantityChange={setManagementQuantity}
                guestId="advancedManagementGuests"
                guestLabel={t('advancedFoodOrders.guestQty')}
                guests={managementGuests}
                onGuestsChange={setManagementGuests}
                decreaseLabel={t('advancedFoodOrders.qtyDecrease')}
                increaseLabel={t('advancedFoodOrders.qtyIncrease')}
                totalLabel={t('advancedFoodOrders.lineDailyTotal')}
                total={managementLine}
                unit={toman}
                locale={locale}
              />
            </div>
            <div className="space-y-2 rounded-2xl border border-teal-100 bg-gradient-to-e from-mint-50 via-white to-teal-50 px-4 py-3">
              <p className="text-xs font-medium text-ink-500">{t('advancedFoodOrders.orderSummary')}</p>
              <div className="grid grid-cols-2 gap-3">
                <SummaryRow
                  icon={Users}
                  label={t('advancedFoodOrders.employeeMeal')}
                  qty={employeeQty}
                  guests={employeeGuestQty}
                  amount={source === 'DEFAULT' ? employeeLine : 0}
                  unit={toman}
                  locale={locale}
                />
                <SummaryRow
                  icon={Briefcase}
                  label={t('advancedFoodOrders.managementMeal')}
                  qty={managementQty}
                  guests={managementGuestQty}
                  amount={source === 'DEFAULT' ? managementLine : 0}
                  unit={toman}
                  locale={locale}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-teal-100 pt-2 text-sm font-semibold text-ink-900">
                <span>{t('advancedFoodOrders.summaryTotal')}</span>
                <span>
                  {t('advancedFoodOrders.summaryServings', { qty: formatNumber(totalQty, locale) })}
                  {source === 'DEFAULT' && dailyTotal > 0
                    ? ` · ${formatGroupedNumber(dailyTotal, locale)} ${toman}`
                    : ''}
                </span>
              </div>
            </div>
            <FormActions
              headerIcons={false}
              submitLabel={t('advancedFoodOrders.order')}
              cancelLabel={t('advancedFoodOrders.cancel')}
              submitting={saving}
              onCancel={resetOrder}
            />
          </div>
        )}
      </AppForm>
    </FormCard>
  )
}

export function AdvancedFoodOrderListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const context = useQuery({
    queryKey: ['advanced-food-orders', 'context'],
    queryFn: async () => {
      const { data } = await api.get<AdvancedFoodOrderContext>('/advanced-food-orders/context')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['advanced-food-orders', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdvancedFoodOrder>>('/advanced-food-orders', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []

  return (
    <div className={`${listShellClassName} space-y-6`}>
      <PageHeader
        icon={CalendarRange}
        title={t('menus.foodAdvancedReserve')}
        subtitle={t('advancedFoodOrders.subtitle')}
      />
      {context.isLoading ? <LoadingState /> : context.data ? (
        <OrderForm
          context={context.data}
          onCreated={() => {
            setPage(1)
            void queryClient.invalidateQueries({ queryKey: ['advanced-food-orders'] })
            void queryClient.invalidateQueries({ queryKey: ['food-reservations'] })
            void queryClient.invalidateQueries({ queryKey: ['food-reservation'] })
          }}
        />
      ) : null}
      <SearchBar
        autoFocus={false}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('advancedFoodOrders.search')}
        placeholder={t('advancedFoodOrders.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('advancedFoodOrders.noResults') : t('advancedFoodOrders.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="createdAt" label={t('advancedFoodOrders.registeredAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="orgUnit" label={t('advancedFoodOrders.orgUnit')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="restaurant" label={t('advancedFoodOrders.restaurant')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="mealType" label={t('advancedFoodOrders.mealType')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="startsOn" label={t('advancedFoodOrders.startsOn')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="endsOn" label={t('advancedFoodOrders.endsOn')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="employeeQuantity" label={t('advancedFoodOrders.employeeMeal')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="managementQuantity" label={t('advancedFoodOrders.managementMeal')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="employeeGuestQuantity" label={t('advancedFoodOrders.employeeGuest')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="managementGuestQuantity" label={t('advancedFoodOrders.managementGuest')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3"><DateText value={item.createdAt} withTime /></td>
                <td className="px-4 py-3">{item.orgUnit.name}</td>
                <td className="px-4 py-3">{item.restaurant.name}</td>
                <td className="px-4 py-3"><FoodMealTypeBadge mealType={item.mealType} /></td>
                <td className="px-4 py-3"><DateWithWeekday value={item.startsOn} locale={locale} /></td>
                <td className="px-4 py-3"><DateWithWeekday value={item.endsOn} locale={locale} /></td>
                <td className="px-4 py-3">{formatNumber(item.employeeQuantity, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item.managementQuantity, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item.employeeGuestQuantity, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item.managementGuestQuantity, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    showView={false}
                    viewTo={foodAdvancedItemPath(item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('advancedFoodOrders.confirmDelete'),
                        successMessage: t('advancedFoodOrders.deleted'),
                        path: `/advanced-food-orders/${item.id}`,
                        queryKey: ['advanced-food-orders'],
                        onDeleted: () => {
                          void queryClient.invalidateQueries({ queryKey: ['food-reservations'] })
                          void queryClient.invalidateQueries({ queryKey: ['food-reservation'] })
                        },
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}

export function AdvancedFoodOrderDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const { page, setPage } = useListParams()
  const query = useQuery({
    queryKey: ['advanced-food-orders', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<AdvancedFoodOrderDetail>(`/advanced-food-orders/${id}`)
      return data
    },
  })
  const reservations = useQuery({
    queryKey: ['advanced-food-orders', id, 'reservations', page],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdvancedFoodOrderLine>>(`/advanced-food-orders/${id}/reservations`, {
        params: { page },
      })
      return data
    },
  })
  const order = query.data
  if (!order) return <LoadingState />
  const unit = t('advancedFoodOrders.toman')
  const relatedRows = reservations.data?.items ?? []

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={CalendarRange}
        title={t('advancedFoodOrders.details')}
        subtitle={<EntityNameSubtitle name={order.orgUnit.name} icon={CalendarRange} />}
      />
      <FormCard icon={CalendarRange} title={order.orgUnit.name} subtitle={order.restaurant.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={UtensilsCrossed}>{t('advancedFoodOrders.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={CalendarDays} label={t('advancedFoodOrders.registeredAt')} value={<DateText value={order.createdAt} withTime />} tone="teal" />
            <FormFactTile icon={Building2} label={t('advancedFoodOrders.orgUnit')} value={order.orgUnit.name} tone="mint" />
            <FormFactTile icon={Store} label={t('advancedFoodOrders.restaurant')} value={order.restaurant.name} tone="teal" />
            <FormFactTile
              icon={Utensils}
              label={t('advancedFoodOrders.mealType')}
              value={<FoodMealTypeBadge mealType={order.mealType} />}
              tone="mint"
            />
            <FormFactTile
              icon={UtensilsCrossed}
              label={t('advancedFoodOrders.source')}
              value={order.source === 'DEFAULT' ? t('advancedFoodOrders.sourceDefault') : t('advancedFoodOrders.sourceMenu')}
              tone="mint"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('advancedFoodOrders.startsOn')}
              value={<DateText value={order.startsOn} />}
              extra={<WeekdayBadge value={order.startsOn} locale={locale} className="mt-1" />}
              tone="ink"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('advancedFoodOrders.endsOn')}
              value={<DateText value={order.endsOn} />}
              extra={<WeekdayBadge value={order.endsOn} locale={locale} className="mt-1" />}
              tone="ink"
            />
            <FormFactTile
              icon={CalendarDays}
              label={t('advancedFoodOrders.weekdays')}
              value={
                order.weekdays.length
                  ? ORDER_WEEKDAYS.filter((day) => order.weekdays.includes(day))
                      .map((day) => t(`restaurantMenuItems.day${day}`))
                      .join('، ')
                  : '—'
              }
              className="sm:col-span-2"
            />
            <FormFactTile icon={UtensilsCrossed} label={t('advancedFoodOrders.food')} value={order.foodLabel} className="sm:col-span-2" />
            <FormFactTile icon={Users} label={t('advancedFoodOrders.employeeQuantity')} value={formatNumber(order.employeeQuantity, locale)} tone="teal" />
            <FormFactTile icon={Briefcase} label={t('advancedFoodOrders.managementQuantity')} value={formatNumber(order.managementQuantity, locale)} tone="mint" />
            <FormFactTile icon={UserPlus} label={t('advancedFoodOrders.employeeGuestQuantity')} value={formatNumber(order.employeeGuestQuantity, locale)} tone="teal" />
            <FormFactTile icon={UserPlus} label={t('advancedFoodOrders.managementGuestQuantity')} value={formatNumber(order.managementGuestQuantity, locale)} tone="mint" />
            {order.employeeUnitPrice != null ? (
              <FormFactTile icon={Wallet} label={t('advancedFoodOrders.employeePrice')} value={money(order.employeeUnitPrice, locale, unit)} tone="teal" />
            ) : null}
            {order.managementUnitPrice != null ? (
              <FormFactTile icon={Wallet} label={t('advancedFoodOrders.managementPrice')} value={money(order.managementUnitPrice, locale, unit)} tone="mint" />
            ) : null}
            <FormFactTile icon={Hash} label={t('advancedFoodOrders.dailyOrders')} value={formatNumber(order.reservationCount, locale)} tone="ink" />
          </div>
          <div className="space-y-3">
            <FormSectionTitle icon={CalendarDays}>{t('advancedFoodOrders.relatedOrders')}</FormSectionTitle>
            <TableCard
              rowClick={false}
              loading={reservations.isLoading}
              empty={t('advancedFoodOrders.relatedEmpty')}
              hasRows={relatedRows.length > 0}
            >
              <table className="w-full text-sm">
                <thead className="bg-cream-50 text-ink-700">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium">{t('foodReservations.reservedAt')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('foodReservations.food')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('foodReservations.quantityBreakdown')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('foodReservations.unitPrice')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('foodReservations.totalPrice')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('foodReservations.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedRows.map((item) => (
                    <tr key={item.id} className="border-t border-line">
                      <td className="px-4 py-3"><DateWithWeekday value={item.reservedAt} locale={locale} /></td>
                      <td className="px-4 py-3">{item.food.name}</td>
                      <td className="px-4 py-3">
                        {t('foodReservations.quantitySplit', {
                          unit: formatNumber(lineAudienceQty(item, order).unit, locale),
                          guest: formatNumber(lineAudienceQty(item, order).guest, locale),
                        })}
                      </td>
                      <td className="px-4 py-3">{money(item.unitPrice, locale, unit)}</td>
                      <td className="px-4 py-3">{money(item.totalPrice, locale, unit)}</td>
                      <td className="px-4 py-3"><FoodReservationStatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
            {reservations.data ? (
              <PaginationBar
                page={reservations.data.page}
                pageSize={reservations.data.pageSize}
                total={reservations.data.total}
                onPageChange={setPage}
              />
            ) : null}
          </div>
          <DetailActions
            showEdit={false}
            editTo=""
            editLabel={t('common.edit')}
            deleteLabel={t('advancedFoodOrders.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('advancedFoodOrders.confirmDelete'),
                successMessage: t('advancedFoodOrders.deleted'),
                path: `/advanced-food-orders/${order.id}`,
                queryKey: ['advanced-food-orders'],
                onDeleted: () => {
                  void queryClient.invalidateQueries({ queryKey: ['food-reservations'] })
                  void queryClient.invalidateQueries({ queryKey: ['food-reservation'] })
                  navigate(foodAdvancedPath())
                },
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
