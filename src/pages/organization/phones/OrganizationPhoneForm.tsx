import { Phone, ScrollText, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'
import { toLatinDigits } from '../../../lib/datetime'
import type { OrganizationPhone } from '../../../types/app'

export type OrganizationPhonePayload = {
  title: string
  phone: string
  description: string | null
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function OrganizationPhoneForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<OrganizationPhone, 'title' | 'phone' | 'description'>
  onSubmit: (payload: OrganizationPhonePayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const digits = toLatinDigits(phone).replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) {
      toast.error(t('organizationPhones.phoneInvalid'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        phone: digits,
        description: emptyToNull(description),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Phone}
      title={initial ? initial.title || t('organizationPhones.edit') : t('organizationPhones.create')}
      subtitle={initial ? undefined : t('organizationPhones.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('organizationPhones.titleField')} htmlFor="orgPhoneTitle">
          <input
            id="orgPhoneTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={Phone} label={t('organizationPhones.phone')} htmlFor="orgPhoneNumber">
          <input
            id="orgPhoneNumber"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={phone}
            onChange={(e) => setPhone(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 15))}
            required
          />
        </FormField>
        <FormField icon={ScrollText} label={t('organizationPhones.description')} htmlFor="orgPhoneDescription">
          <textarea
            id="orgPhoneDescription"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={t('organizationPhones.save')}
          cancelLabel={t('organizationPhones.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
