import { Store } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckboxField } from '../../../../components/ui/CheckboxField'
import { AppForm, FormActions, FormField } from '../../../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../../../components/ui/FormLayout'
import { SearchSelect } from '../../../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../../../lib/api'
import type { OrganizationUnitRestaurant, Restaurant } from '../../../../types/app'

export function OrganizationUnitRestaurantCreateForm({
  restaurants,
  takenIds,
  onSubmit,
}: {
  restaurants: Restaurant[]
  takenIds: string[]
  onSubmit: (restaurantIds: string[]) => Promise<void>
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const options = useMemo(
    () => restaurants.filter((item) => !takenIds.includes(item.id)),
    [restaurants, takenIds],
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected.length) {
      toast.error(t('organizationUnitRestaurants.needRestaurants'))
      return
    }
    setSaving(true)
    try {
      await onSubmit(selected)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Store}
      title={t('organizationUnitRestaurants.create')}
      subtitle={t('organizationUnitRestaurants.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Store} label={t('organizationUnitRestaurants.restaurant')}>
          {options.length ? (
            <div className="grid gap-2">
              {options.map((item) => (
                <CheckboxField
                  key={item.id}
                  id={`unit-restaurant-${item.id}`}
                  checked={selected.includes(item.id)}
                  label={item.name}
                  onChange={(checked) =>
                    setSelected((current) =>
                      checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('organizationUnitRestaurants.allAssigned')}</FormEmptyHint>
          )}
        </FormField>
        <FormActions
          submitLabel={t('organizationUnitRestaurants.save')}
          cancelLabel={t('organizationUnitRestaurants.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

export function OrganizationUnitRestaurantEditForm({
  restaurants,
  takenIds,
  initial,
  onSubmit,
}: {
  restaurants: Restaurant[]
  takenIds: string[]
  initial: OrganizationUnitRestaurant
  onSubmit: (restaurantId: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [restaurantId, setRestaurantId] = useState(initial.restaurantId)
  const [saving, setSaving] = useState(false)
  const options = useMemo(
    () =>
      restaurants
        .filter((item) => item.id === initial.restaurantId || !takenIds.includes(item.id))
        .map((item) => ({ value: item.id, label: item.name })),
    [initial.restaurantId, restaurants, takenIds],
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit(restaurantId)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard icon={Store} title={initial.restaurant.name}>
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Store} label={t('organizationUnitRestaurants.restaurant')} htmlFor="unitRestaurant">
          <SearchSelect
            id="unitRestaurant"
            value={restaurantId}
            required
            onChange={setRestaurantId}
            placeholder={t('organizationUnitRestaurants.selectRestaurant')}
            options={options}
          />
        </FormField>
        <FormActions
          submitLabel={t('organizationUnitRestaurants.save')}
          cancelLabel={t('organizationUnitRestaurants.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
