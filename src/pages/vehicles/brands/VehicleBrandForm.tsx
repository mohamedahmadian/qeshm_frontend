import { Tags, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'
import type { VehicleBrand } from '../../../types/app'

export function VehicleBrandForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<VehicleBrand, 'name'>
  onSubmit: (payload: { name: string }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({ name: name.trim() })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Tags}
      title={initial ? initial.name || t('vehicleBrands.edit') : t('vehicleBrands.create')}
      subtitle={initial ? undefined : t('vehicleBrands.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('vehicleBrands.name')} htmlFor="vehicleBrandName">
          <input
            id="vehicleBrandName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormActions
          submitLabel={t('vehicleBrands.save')}
          cancelLabel={t('vehicleBrands.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
