import { Hash, Tags, Type } from 'lucide-react'
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
  initial?: Pick<OrganizationUnitKind, 'name' | 'code' | 'isSystem'>
  onSubmit: (payload: { name: string; code: string | null }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [saving, setSaving] = useState(false)
  const systemLocked = Boolean(initial?.isSystem)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        code: systemLocked ? (initial?.code ?? null) : code.trim() || null,
      })
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
        <FormField icon={Hash} label={t('organizationUnitKinds.code')} htmlFor="unitKindCode">
          <input
            id="unitKindCode"
            className={`${fieldClassName} latin-field ${systemLocked ? 'cursor-default bg-cream-50' : ''}`}
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            readOnly={systemLocked}
            maxLength={40}
          />
          <p className="text-xs text-ink-500">
            {systemLocked ? t('organizationUnitKinds.systemLocked') : t('organizationUnitKinds.codeHint')}
          </p>
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
