import { Briefcase, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'
import type { OrganizationPosition } from '../../../types/app'

export function OrganizationPositionForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<OrganizationPosition, 'name'>
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
      icon={Briefcase}
      title={initial ? initial.name || t('organizationPositions.edit') : t('organizationPositions.create')}
      subtitle={initial ? undefined : t('organizationPositions.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('organizationPositions.name')} htmlFor="positionName">
          <input
            id="positionName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormActions
          submitLabel={t('organizationPositions.save')}
          cancelLabel={t('organizationPositions.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
