import { Tags, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'
import type { OrganizationUnitKind } from '../../../types/app'

export function OrganizationUnitKindForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<OrganizationUnitKind, 'name'>
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
      title={initial ? initial.name || t('organizationUnitKinds.edit') : t('organizationUnitKinds.create')}
      subtitle={initial ? undefined : t('organizationUnitKinds.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('organizationUnitKinds.name')} htmlFor="unitKindName">
          <input
            id="unitKindName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormActions
          submitLabel={t('organizationUnitKinds.save')}
          cancelLabel={t('organizationUnitKinds.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
