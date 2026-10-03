import { Check, Store, UtensilsCrossed, Wallet, X } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AppForm,
  Button,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  fieldClassName,
  listShellClassName,
} from '../../../../components/ui/Form'
import {
  FormCardHeaderDecor,
  FormEmptyHint,
  cardClassName,
} from '../../../../components/ui/FormLayout'
import { SearchSelect } from '../../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../../lib/api'
import { formatNumber } from '../../../../lib/datetime'
import type { Food, Restaurant, RestaurantMenuItem } from '../../../../types/app'
import { EntityThumb } from '../../EntityThumb'

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const

type DraftFood = {
  key: string
  foodId: string
  price: string
}

function emptyWeek(): DraftFood[][] {
  return WEEKDAYS.map(() => [])
}

function fromItems(items: RestaurantMenuItem[]): DraftFood[][] {
  const days = emptyWeek()
  for (const item of items) {
    if (item.weekday < 0 || item.weekday > 6) continue
    days[item.weekday].push({
      key: item.id,
      foodId: item.foodId,
      price: item.price > 0 ? String(item.price) : '',
    })
  }
  return days
}

function WeeklyMenuEditor({
  restaurantId,
  foods,
  items,
}: {
  restaurantId: string
  foods: Food[]
  items: RestaurantMenuItem[]
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [days, setDays] = useState(() => fromItems(items))
  const [saving, setSaving] = useState(false)
  const foodById = useMemo(() => {
    const map = new Map<string, Pick<Food, 'id' | 'name' | 'photoId'>>()
    for (const food of foods) map.set(food.id, food)
    for (const item of items) map.set(item.food.id, item.food)
    return map
  }, [foods, items])

  function updateDay(weekday: number, next: DraftFood[]) {
    setDays((current) => current.map((list, index) => (index === weekday ? next : list)))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const payloadDays: { weekday: number; items: { foodId: string; price: number }[] }[] = []
    for (const weekday of WEEKDAYS) {
      const itemsForDay: { foodId: string; price: number }[] = []
      for (const item of days[weekday]) {
        const trimmed = item.price.trim()
        const amount = trimmed === '' ? 0 : Number(trimmed)
        if (!Number.isFinite(amount) || amount < 0) {
          toast.error(t('common.error'))
          return
        }
        itemsForDay.push({ foodId: item.foodId, price: amount })
      }
      payloadDays.push({ weekday, items: itemsForDay })
    }
    setSaving(true)
    try {
      const { data } = await api.put<RestaurantMenuItem[]>(
        `/restaurants/${restaurantId}/menu-items`,
        { days: payloadDays },
      )
      setDays(fromItems(data))
      queryClient.setQueryData(['restaurant-menu', restaurantId, 'weekly'], data)
      toast.success(t('restaurantMenuItems.saved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppForm onSubmit={submit} className="space-y-4">
      <p className="rounded-2xl border border-teal-100 bg-gradient-to-e from-teal-50 via-white to-mint-50 px-4 py-3 text-sm leading-6 text-ink-700">
        {t('restaurantMenuItems.weekHint')}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {WEEKDAYS.map((weekday) => {
          const list = days[weekday]
          const taken = new Set(list.map((item) => item.foodId))
          const options = foods
            .filter((food) => !taken.has(food.id))
            .map((food) => ({ value: food.id, label: food.name }))
          const mint = weekday % 2 === 1
          return (
            <section
              key={weekday}
              aria-label={t(`restaurantMenuItems.day${weekday}`)}
              className={`${cardClassName} overflow-hidden`}
            >
              <header className="relative overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-4 py-3">
                <FormCardHeaderDecor />
                <div className="relative flex items-center gap-3">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white ${
                      mint
                        ? 'bg-mint-500 shadow-[0_8px_16px_rgba(63,214,190,0.32)]'
                        : 'bg-teal-500 shadow-[0_8px_16px_rgba(46,189,182,0.32)]'
                    }`}
                  >
                    {formatNumber(weekday + 1, locale)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-ink-900">
                      {t(`restaurantMenuItems.day${weekday}`)}
                    </h3>
                    <p className="text-xs text-ink-500">
                      {t('restaurantMenuItems.foodCount', {
                        count: formatNumber(list.length, locale),
                      })}
                    </p>
                  </div>
                </div>
              </header>
              <div className="space-y-3 p-4">
                {list.length === 0 ? (
                  <FormEmptyHint>{t('restaurantMenuItems.dayEmpty')}</FormEmptyHint>
                ) : (
                  <ul className="space-y-2">
                    {list.map((item) => {
                      const food = foodById.get(item.foodId)
                      const name = food?.name ?? ''
                      return (
                        <li
                          key={item.key}
                          className="flex items-center gap-2.5 rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/70 to-white px-3 py-2.5"
                        >
                          <EntityThumb imageId={food?.photoId} icon={UtensilsCrossed} label={name} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink-900">{name}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                                <Wallet className="size-3.5" aria-hidden />
                              </span>
                              <label className="sr-only" htmlFor={`menu-price-${item.key}`}>
                                {t('restaurantMenuItems.price')}
                              </label>
                              <input
                                id={`menu-price-${item.key}`}
                                type="number"
                                min={0}
                                inputMode="numeric"
                                placeholder={t('restaurantMenuItems.pricePlaceholder')}
                                className={`${fieldClassName} h-9 w-28 py-1`}
                                value={item.price}
                                onChange={(event) =>
                                  updateDay(
                                    weekday,
                                    list.map((row) =>
                                      row.key === item.key ? { ...row, price: event.target.value } : row,
                                    ),
                                  )
                                }
                              />
                              <span className="text-xs text-ink-500">{t('restaurantMenuItems.toman')}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            icon
                            aria-label={t('restaurantMenuItems.removeFood')}
                            onClick={() =>
                              updateDay(
                                weekday,
                                list.filter((row) => row.key !== item.key),
                              )
                            }
                          >
                            <X className="size-4" aria-hidden />
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div data-enter-ignore>
                  <SearchSelect
                    id={`menu-food-${weekday}`}
                    value=""
                    disabled={options.length === 0}
                    placeholder={
                      foods.length === 0
                        ? t('restaurantMenuItems.noFoods')
                        : t('restaurantMenuItems.addFood')
                    }
                    onChange={(foodId) => {
                      if (!foodId || taken.has(foodId)) return
                      updateDay(weekday, [
                        ...list,
                        { key: crypto.randomUUID(), foodId, price: '' },
                      ])
                    }}
                    options={options}
                  />
                </div>
              </div>
            </section>
          )
        })}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Check className="size-4" aria-hidden />
          {t('restaurantMenuItems.save')}
        </Button>
      </div>
    </AppForm>
  )
}

export function RestaurantMenuListPage({
  embedded = false,
  restaurantId: restaurantIdProp,
}: {
  embedded?: boolean
  restaurantId?: string
} = {}) {
  const { t } = useTranslation()
  const params = useParams()
  const restaurantId = restaurantIdProp ?? params.id
  const restaurantQuery = useQuery({
    queryKey: ['restaurant', restaurantId],
    enabled: Boolean(restaurantId) && !embedded,
    queryFn: async () => {
      const { data } = await api.get<Restaurant>(`/restaurants/${restaurantId}`)
      return data
    },
  })
  const foods = useQuery({
    queryKey: ['foods', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Food[]>('/foods')
      return data
    },
  })
  const menu = useQuery({
    queryKey: ['restaurant-menu', restaurantId, 'weekly'],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const { data } = await api.get<RestaurantMenuItem[]>(
        `/restaurants/${restaurantId}/menu-items`,
      )
      return data
    },
  })

  if (!restaurantId || !foods.data || !menu.data || (!embedded && !restaurantQuery.data)) {
    return <LoadingState />
  }

  const board = (
    <WeeklyMenuEditor
      key={restaurantId}
      restaurantId={restaurantId}
      foods={foods.data}
      items={menu.data}
    />
  )
  if (embedded) return board

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={UtensilsCrossed}
        title={t('restaurantMenuItems.title')}
        subtitle={
          <EntityNameSubtitle name={restaurantQuery.data?.name ?? ''} icon={Store} />
        }
      />
      {board}
    </div>
  )
}
