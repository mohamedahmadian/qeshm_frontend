import { CalendarRange, CookingPot, ToggleRight, UtensilsCrossed, Wallet } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../../components/ui/FormLayout'
import { PersianDateField } from '../../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../../../lib/api'
import { todayIsoDate } from '../../../../lib/datetime'
import type { Food, RestaurantMenuItem } from '../../../../types/app'

export type MenuItemPayload = {
  foodId: string
  offeredAt: string
  price: number
  isActive: boolean
}

function toIsoDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function RestaurantMenuForm({
  foods,
  existingItems,
  initial,
  onSubmit,
}: {
  foods: Food[]
  existingItems: Pick<RestaurantMenuItem, 'id' | 'foodId' | 'offeredAt'>[]
  initial?: Pick<RestaurantMenuItem, 'id' | 'foodId' | 'offeredAt' | 'price' | 'isActive' | 'food'>
  onSubmit: (payload: MenuItemPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [offeredAt, setOfferedAt] = useState(toIsoDate(initial?.offeredAt) || todayIsoDate())
  const [foodId, setFoodId] = useState(initial?.foodId ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)

  const takenFoodIds = useMemo(
    () =>
      existingItems
        .filter((item) => item.id !== initial?.id && toIsoDate(item.offeredAt) === offeredAt)
        .map((item) => item.foodId),
    [existingItems, initial?.id, offeredAt],
  )

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
    const amount = Number(price)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error(t('common.error'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({ foodId, offeredAt, price: amount, isActive })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const titleName = initial?.food.name ?? ''

  return (
    <FormCard
      icon={CookingPot}
      title={titleName || (initial ? t('restaurantMenuItems.edit') : t('restaurantMenuItems.create'))}
      subtitle={initial ? undefined : t('restaurantMenuItems.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={CalendarRange} label={t('restaurantMenuItems.date')} htmlFor="menuDate">
          <PersianDateField
            id="menuDate"
            value={offeredAt}
            onChange={(value) => setOfferedAt(value ?? '')}
          />
        </FormField>
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
    </FormCard>
  )
}
