import { CalendarRange, CookingPot, ToggleRight, UtensilsCrossed, Wallet } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { confirmToast } from '../../../../components/ui/confirmToast'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../../components/ui/FormLayout'
import { PersianDateField } from '../../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../../../lib/api'
import { eachWorkingIsoDatesInclusive, todayIsoDate } from '../../../../lib/datetime'
import type { Food, RestaurantMenuItem } from '../../../../types/app'

export type MenuItemPayload = {
  foodId: string
  offeredAt: string
  offeredUntil?: string
  price: number
  isActive: boolean
}

export type MenuCancelPayload = {
  foodId: string
  offeredAt: string
  offeredUntil?: string
}

function toIsoDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function RestaurantMenuForm({
  foods,
  existingItems,
  initial,
  embedded = false,
  onSubmit,
}: {
  foods: Food[]
  existingItems: Pick<RestaurantMenuItem, 'id' | 'foodId' | 'offeredAt'>[]
  initial?: Pick<RestaurantMenuItem, 'id' | 'foodId' | 'offeredAt' | 'price' | 'isActive' | 'food'>
  embedded?: boolean
  onSubmit: (payload: MenuItemPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const isEdit = Boolean(initial)
  const [offeredAt, setOfferedAt] = useState(toIsoDate(initial?.offeredAt) || todayIsoDate())
  const [offeredUntil, setOfferedUntil] = useState('')
  const [foodId, setFoodId] = useState(initial?.foodId ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)

  const takenFoodIds = useMemo(() => {
    if (!isEdit && offeredUntil) return []
    return existingItems
      .filter((item) => item.id !== initial?.id && toIsoDate(item.offeredAt) === offeredAt)
      .map((item) => item.foodId)
  }, [existingItems, initial?.id, isEdit, offeredAt, offeredUntil])

  const options = useMemo(
    () =>
      foods
        .filter((food) => food.id === foodId || !takenFoodIds.includes(food.id))
        .map((food) => ({ value: food.id, label: food.name })),
    [foods, foodId, takenFoodIds],
  )

  useEffect(() => {
    if (foodId && takenFoodIds.includes(foodId)) {
      setFoodId('')
    }
  }, [foodId, takenFoodIds])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!offeredAt) {
      toast.error(t('restaurantMenuItems.dateRequired'))
      return
    }
    if (offeredUntil && offeredUntil < offeredAt) {
      toast.error(t('restaurantMenuItems.rangeInvalid'))
      return
    }
    const workDays = eachWorkingIsoDatesInclusive(offeredAt, offeredUntil || offeredAt)
    if (!workDays.length) {
      toast.error(t('restaurantMenuItems.weekendEmpty'))
      return
    }
    const amount = Number(price)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error(t('common.error'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        foodId,
        offeredAt,
        offeredUntil: !isEdit && offeredUntil ? offeredUntil : undefined,
        price: amount,
        isActive,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const titleName = initial?.food.name ?? ''
  const form = (
    <AppForm onSubmit={submit} className={formCardBodyClassName}>
      <FormField
        icon={CalendarRange}
        label={isEdit ? t('restaurantMenuItems.date') : t('restaurantMenuItems.startDate')}
        htmlFor="menuDate"
      >
        <PersianDateField
          id="menuDate"
          value={offeredAt}
          maxDate={!isEdit && offeredUntil ? offeredUntil : undefined}
          onChange={(value) => {
            const next = value ?? ''
            setOfferedAt(next)
            if (offeredUntil && next && offeredUntil < next) {
              setOfferedUntil('')
            }
          }}
        />
      </FormField>
      {isEdit ? null : (
        <FormField icon={CalendarRange} label={t('restaurantMenuItems.endDate')} htmlFor="menuUntil">
          <PersianDateField
            id="menuUntil"
            value={offeredUntil}
            minDate={offeredAt || undefined}
            onChange={(value) => setOfferedUntil(value ?? '')}
          />
          <p className="mt-1.5 text-xs text-ink-500">{t('restaurantMenuItems.rangeHint')}</p>
        </FormField>
      )}
      <FormField icon={UtensilsCrossed} label={t('restaurantMenuItems.food')} htmlFor="menuFood">
        <SearchSelect
          id="menuFood"
          value={foodId}
          required
          onChange={setFoodId}
          placeholder={t('restaurantMenuItems.selectFood')}
          options={options}
        />
      </FormField>
      <FormField icon={Wallet} label={t('restaurantMenuItems.price')} htmlFor="menuPrice">
        <input
          id="menuPrice"
          type="number"
          min={0}
          className={fieldClassName}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </FormField>
      <FormField icon={ToggleRight} label={t('restaurantMenuItems.isActive')} htmlFor="menuActive">
        <ToggleField
          id="menuActive"
          checked={isActive}
          onChange={setIsActive}
          onLabel={t('geo.active')}
          offLabel={t('geo.inactive')}
        />
      </FormField>
      <FormActions
        submitLabel={t('restaurantMenuItems.save')}
        cancelLabel={t('restaurantMenuItems.cancel')}
        submitting={saving}
        onCancel={() => history.back()}
      />
    </AppForm>
  )

  if (embedded) return form

  return (
    <FormCard
      icon={CookingPot}
      title={titleName || (initial ? t('restaurantMenuItems.edit') : t('restaurantMenuItems.create'))}
      subtitle={initial ? undefined : t('restaurantMenuItems.createSubtitle')}
    >
      {form}
    </FormCard>
  )
}

export function RestaurantMenuCancelForm({
  foods,
  onSubmit,
}: {
  foods: Food[]
  onSubmit: (payload: MenuCancelPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [offeredAt, setOfferedAt] = useState(todayIsoDate())
  const [offeredUntil, setOfferedUntil] = useState('')
  const [foodId, setFoodId] = useState('')
  const [saving, setSaving] = useState(false)

  const options = useMemo(
    () => foods.map((food) => ({ value: food.id, label: food.name })),
    [foods],
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!offeredAt) {
      toast.error(t('restaurantMenuItems.dateRequired'))
      return
    }
    if (offeredUntil && offeredUntil < offeredAt) {
      toast.error(t('restaurantMenuItems.rangeInvalid'))
      return
    }
    if (!foodId) {
      toast.error(t('restaurantMenuItems.selectFood'))
      return
    }
    confirmToast({
      title: t('restaurantMenuItems.cancelPlanConfirm'),
      confirmLabel: t('restaurantMenuItems.cancelPlanYes'),
      cancelLabel: t('restaurantMenuItems.cancel'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        setSaving(true)
        try {
          await onSubmit({
            foodId,
            offeredAt,
            offeredUntil: offeredUntil || undefined,
          })
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
        } finally {
          setSaving(false)
        }
      },
    })
  }

  return (
    <AppForm onSubmit={submit} className={formCardBodyClassName}>
      <FormField icon={CalendarRange} label={t('restaurantMenuItems.startDate')} htmlFor="cancelMenuDate">
        <PersianDateField
          id="cancelMenuDate"
          value={offeredAt}
          maxDate={offeredUntil || undefined}
          onChange={(value) => {
            const next = value ?? ''
            setOfferedAt(next)
            if (offeredUntil && next && offeredUntil < next) {
              setOfferedUntil('')
            }
          }}
        />
      </FormField>
      <FormField icon={CalendarRange} label={t('restaurantMenuItems.endDate')} htmlFor="cancelMenuUntil">
        <PersianDateField
          id="cancelMenuUntil"
          value={offeredUntil}
          minDate={offeredAt || undefined}
          onChange={(value) => setOfferedUntil(value ?? '')}
        />
        <p className="mt-1.5 text-xs text-ink-500">{t('restaurantMenuItems.cancelPlanHint')}</p>
      </FormField>
      <FormField icon={UtensilsCrossed} label={t('restaurantMenuItems.food')} htmlFor="cancelMenuFood">
        <SearchSelect
          id="cancelMenuFood"
          value={foodId}
          required
          onChange={setFoodId}
          placeholder={t('restaurantMenuItems.selectFood')}
          options={options}
        />
      </FormField>
      <FormActions
        submitLabel={t('restaurantMenuItems.cancelPlanSubmit')}
        cancelLabel={t('restaurantMenuItems.cancel')}
        submitting={saving}
        headerIcons={false}
        onCancel={() => history.back()}
      />
    </AppForm>
  )
}
