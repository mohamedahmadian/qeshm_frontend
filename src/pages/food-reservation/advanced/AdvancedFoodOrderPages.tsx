import { Briefcase, Building2, CalendarDays, CalendarRange, Check, Hash, Store, Users, UtensilsCrossed, Wallet } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
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
import { formatGroupedNumber, formatNumber, formatWeekday, parseDigitString, toLatinDigits } from '../../../lib/datetime'
import type {
  AdvancedFoodOrder,
  AdvancedFoodOrderContext,
  AdvancedFoodOrderDetail,
  AdvancedFoodOrderLine,
  AdvancedFoodOrderSource,
  AdvancedFoodWeekDay,
  Paginated,
} from '../../../types/app'
import { foodAdvancedItemPath, foodAdvancedPath } from '../food-paths'
import { FoodReservationStatusBadge } from '../FoodReservationStatusBadge'

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const
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

function SourceChoice({
  value,
  onChange,
  label,
  defaultLabel,
  menuLabel,
}: {
  value: AdvancedFoodOrderSource
  onChange: (next: AdvancedFoodOrderSource) => void
  label: string
  defaultLabel: string
  menuLabel: string
}) {
  const options: { value: AdvancedFoodOrderSource; label: string }[] = [
    { value: 'DEFAULT', label: defaultLabel },
    { value: 'MENU', label: menuLabel },
  ]
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 bg-white px-3 py-2 text-sm font-medium text-ink-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
              selected ? 'border-teal-500' : 'border-line hover:border-teal-300'
            }`}
          >
            {selected ? <Check className="size-4 shrink-0 text-teal-600" aria-hidden /> : null}
            <span>{option.label}</span>
          </button>
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
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [weekdays, setWeekdays] = useState<number[]>([...ORDER_WEEKDAYS])
  const [orgUnitId, setOrgUnitId] = useState(context.units.length === 1 ? context.units[0].id : '')
  const [restaurantId, setRestaurantId] = useState('')
  const [source, setSource] = useState<AdvancedFoodOrderSource>('DEFAULT')
  const [employeeQuantity, setEmployeeQuantity] = useState('')
  const [managementQuantity, setManagementQuantity] = useState('')
  const [employeePrice, setEmployeePrice] = useState('')
  const [managementPrice, setManagementPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const restaurants = context.restaurants
  const restaurant = restaurants.find((item) => item.id === restaurantId)

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
    setStartsOn('')
    setEndsOn('')
    setWeekdays([...ORDER_WEEKDAYS])
    setEmployeeQuantity('')
    setManagementQuantity('')
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
    const employeeQty = employeeQuantity === '' ? 0 : Number(employeeQuantity)
    const managementQty = managementQuantity === '' ? 0 : Number(managementQuantity)
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
        employeeQuantity: employeeQty,
        managementQuantity: managementQty,
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
        ) : null}
        <FormField icon={UtensilsCrossed} label={t('advancedFoodOrders.foodSource')}>
          <SourceChoice
            value={source}
            onChange={setSource}
            label={t('advancedFoodOrders.foodSource')}
            defaultLabel={t('advancedFoodOrders.sourceDefault')}
            menuLabel={t('advancedFoodOrders.sourceMenu')}
          />
          <p className="text-xs leading-6 text-ink-500">
            {source === 'DEFAULT'
              ? t('advancedFoodOrders.sourceDefaultHint')
              : t('advancedFoodOrders.sourceMenuHint')}
          </p>
        </FormField>
        {source === 'MENU' && restaurantId && weekMenu.data ? (
          <div className="space-y-2">
          <p className="text-xs font-medium text-ink-600">{t('advancedFoodOrders.weekPreview')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {WEEKDAYS.map((weekday) => {
              const weekend = weekday === 5 || weekday === 6
              const selected = weekdays.includes(weekday)
              const foods = weekMenu.data.find((day) => day.weekday === weekday)?.foods ?? []
              const label = weekend
                ? t('advancedFoodOrders.weekendSkip')
                : !selected
                  ? t('advancedFoodOrders.weekdayOff')
                  : foods.length === 0
                  ? t('advancedFoodOrders.noDayFood')
                  : foods
                      .map(
                        (food) =>
                          `${food.name} (${formatGroupedNumber(food.price, locale)} ${t('advancedFoodOrders.toman')})`,
                      )
                      .join('، ')
              return (
                <p key={weekday} className="text-sm text-ink-700">
                  <span className="font-medium">{t(`restaurantMenuItems.day${weekday}`)}: </span>
                  {label}
                </p>
              )
            })}
          </div>
          </div>
        ) : null}
        {source === 'DEFAULT' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField icon={Wallet} label={t('advancedFoodOrders.employeePrice')} htmlFor="advancedEmployeePrice">
              <div className="flex items-center gap-2">
                <input
                  id="advancedEmployeePrice"
                  inputMode="numeric"
                  className={`${fieldClassName} digit-field`}
                  value={groupedPrice(employeePrice, locale)}
                  onChange={(event) => setEmployeePrice(parseDigitString(event.target.value))}
                />
                <span className="shrink-0 text-sm text-ink-500">{t('advancedFoodOrders.toman')}</span>
              </div>
            </FormField>
            <FormField icon={Wallet} label={t('advancedFoodOrders.managementPrice')} htmlFor="advancedManagementPrice">
              <div className="flex items-center gap-2">
                <input
                  id="advancedManagementPrice"
                  inputMode="numeric"
                  className={`${fieldClassName} digit-field`}
                  value={groupedPrice(managementPrice, locale)}
                  onChange={(event) => setManagementPrice(parseDigitString(event.target.value))}
                />
                <span className="shrink-0 text-sm text-ink-500">{t('advancedFoodOrders.toman')}</span>
              </div>
            </FormField>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={Users} label={t('advancedFoodOrders.employeeQuantity')} htmlFor="advancedEmployeeQty">
            <input
              id="advancedEmployeeQty"
              inputMode="numeric"
              className={`${fieldClassName} digit-field`}
              value={employeeQuantity}
              onChange={(event) => setEmployeeQuantity(digitsOnly(event.target.value))}
            />
          </FormField>
          <FormField icon={Briefcase} label={t('advancedFoodOrders.managementQuantity')} htmlFor="advancedManagementQty">
            <input
              id="advancedManagementQty"
              inputMode="numeric"
              className={`${fieldClassName} digit-field`}
              value={managementQuantity}
              onChange={(event) => setManagementQuantity(digitsOnly(event.target.value))}
            />
          </FormField>
        </div>
        <FormActions
          headerIcons={false}
          submitLabel={t('advancedFoodOrders.order')}
          cancelLabel={t('advancedFoodOrders.cancel')}
          submitting={saving}
          onCancel={resetOrder}
        />
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
              <SortableTh column="startsOn" label={t('advancedFoodOrders.startsOn')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="endsOn" label={t('advancedFoodOrders.endsOn')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="food" label={t('advancedFoodOrders.food')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="employeeQuantity" label={t('advancedFoodOrders.employeeQuantity')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="managementQuantity" label={t('advancedFoodOrders.managementQuantity')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3"><DateText value={item.createdAt} withTime /></td>
                <td className="px-4 py-3">{item.orgUnit.name}</td>
                <td className="px-4 py-3">{item.restaurant.name}</td>
                <td className="px-4 py-3"><DateWithWeekday value={item.startsOn} locale={locale} /></td>
                <td className="px-4 py-3"><DateWithWeekday value={item.endsOn} locale={locale} /></td>
                <td className="px-4 py-3">{item.foodLabel}</td>
                <td className="px-4 py-3">{formatNumber(item.employeeQuantity, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item.managementQuantity, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
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
                    <th className="px-4 py-3 text-start font-medium">{t('foodReservations.quantity')}</th>
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
                      <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
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
