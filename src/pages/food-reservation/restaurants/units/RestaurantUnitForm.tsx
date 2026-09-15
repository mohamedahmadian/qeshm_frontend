import { Building2 } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckboxField } from '../../../../components/ui/CheckboxField'
import { AppForm, FormActions, FormField } from '../../../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../../../components/ui/FormLayout'
import { SearchSelect } from '../../../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../../../lib/api'
import type { OrganizationUnit, RestaurantUnit } from '../../../../types/app'

function unitLabel(item: OrganizationUnit) {
  return item.pathLabel || item.name
}

export function RestaurantUnitCreateForm({
  units,
  takenIds,
  onSubmit,
}: {
  units: OrganizationUnit[]
  takenIds: string[]
  onSubmit: (unitIds: string[]) => Promise<void>
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const options = useMemo(
    () => units.filter((item) => !takenIds.includes(item.id)),
    [takenIds, units],
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected.length) {
      toast.error(t('restaurantUnits.needUnits'))
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
      icon={Building2}
      title={t('restaurantUnits.create')}
      subtitle={t('restaurantUnits.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Building2} label={t('restaurantUnits.unit')}>
          {options.length ? (
            <div className="grid gap-2">
              {options.map((item) => (
                <CheckboxField
                  key={item.id}
                  id={`restaurant-unit-${item.id}`}
                  checked={selected.includes(item.id)}
                  label={unitLabel(item)}
                  onChange={(checked) =>
                    setSelected((current) =>
                      checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('restaurantUnits.allAssigned')}</FormEmptyHint>
          )}
        </FormField>
        <FormActions
          submitLabel={t('restaurantUnits.save')}
          cancelLabel={t('restaurantUnits.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

export function RestaurantUnitEditForm({
  units,
  takenIds,
  initial,
  onSubmit,
}: {
  units: OrganizationUnit[]
  takenIds: string[]
  initial: RestaurantUnit
  onSubmit: (unitId: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [unitId, setUnitId] = useState(initial.unitId)
  const [saving, setSaving] = useState(false)
  const options = useMemo(
    () =>
      units
        .filter((item) => item.id === initial.unitId || !takenIds.includes(item.id))
        .map((item) => ({ value: item.id, label: unitLabel(item) })),
    [initial.unitId, takenIds, units],
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit(unitId)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard icon={Building2} title={initial.unit.name}>
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Building2} label={t('restaurantUnits.unit')} htmlFor="restaurantUnit">
          <SearchSelect
            id="restaurantUnit"
            value={unitId}
            required
            onChange={setUnitId}
            placeholder={t('restaurantUnits.selectUnit')}
            options={options}
          />
        </FormField>
        <FormActions
          submitLabel={t('restaurantUnits.save')}
          cancelLabel={t('restaurantUnits.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
