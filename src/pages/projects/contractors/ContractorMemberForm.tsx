import { Briefcase, Phone, ScrollText, UserRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'
import { toLatinDigits } from '../../../lib/datetime'
import { isPhoneReady } from '../../../lib/identity'
import type { ContractorMember } from '../../../types/app'

export type MemberPayload = {
  firstName: string
  lastName: string
  phone: string | null
  role: string | null
  description: string | null
}

export function ContractorMemberForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<ContractorMember, 'firstName' | 'lastName' | 'phone' | 'role' | 'description'>
  onSubmit: (payload: MemberPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [lastName, setLastName] = useState(initial?.lastName ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const digits = toLatinDigits(phone).replace(/\D/g, '')
    const normalized = digits.length === 10 && digits.startsWith('9') ? `0${digits}` : digits
    if (normalized && !isPhoneReady(normalized, true)) {
      toast.error(t('contractorTeam.phoneInvalid'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalized || null,
        role: emptyToNull(role),
        description: emptyToNull(description),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const titleName = initial ? `${initial.firstName} ${initial.lastName}`.trim() : ''

  return (
    <FormCard
      icon={UserRound}
      title={titleName || (initial ? t('contractorTeam.edit') : t('contractorTeam.create'))}
      subtitle={initial ? undefined : t('contractorTeam.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={UserRound} label={t('contractorTeam.firstName')} htmlFor="memberFirstName">
          <input
            id="memberFirstName"
            className={fieldClassName}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={UserRound} label={t('contractorTeam.lastName')} htmlFor="memberLastName">
          <input
            id="memberLastName"
            className={fieldClassName}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={Phone} label={t('contractorTeam.phone')} htmlFor="memberPhone">
          <input
            id="memberPhone"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={phone}
            onChange={(e) => setPhone(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 11))}
          />
        </FormField>
        <FormField icon={Briefcase} label={t('contractorTeam.role')} htmlFor="memberRole">
          <input
            id="memberRole"
            className={fieldClassName}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('contractorTeam.description')} htmlFor="memberDescription">
          <textarea
            id="memberDescription"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={t('contractorTeam.save')}
          cancelLabel={t('contractorTeam.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}
