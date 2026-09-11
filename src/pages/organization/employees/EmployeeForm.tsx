import { Briefcase, Building2, KeyRound, Phone, UserRound } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import { toLatinDigits } from '../../../lib/datetime'
import { isPhoneReady } from '../../../lib/identity'
import type { OrganizationPosition, OrganizationUnit } from '../../../types/app'

export type EmployeeCreatePayload = {
  firstName: string
  lastName: string
  phone: string
  password: string
  username: string
  orgUnitId: string
  positionId: string
}

export function EmployeeForm({
  onSubmit,
}: {
  onSubmit: (payload: EmployeeCreatePayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [orgUnitId, setOrgUnitId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [saving, setSaving] = useState(false)
  const passwordTouched = useRef(false)

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const positions = useQuery({
    queryKey: ['organization-positions', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationPosition[]>('/organization/positions')
      return data
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    const digits = toLatinDigits(phone).replace(/\D/g, '')
    const normalized = digits.length === 10 && digits.startsWith('9') ? `0${digits}` : digits
    if (!isPhoneReady(normalized, true)) {
      toast.error(t('users.phoneRequired'))
      return
    }
    const resolvedPassword = passwordTouched.current
      ? toLatinDigits(password)
      : normalized
    if (resolvedPassword.length < 8) {
      toast.error(t('users.passwordMin'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalized,
        password: resolvedPassword,
        username: normalized,
        orgUnitId,
        positionId,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard icon={UserRound} title={t('employees.create')} subtitle={t('employees.createSubtitle')}>
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={UserRound} label={t('users.firstName')} htmlFor="employeeFirstName">
            <input
              id="employeeFirstName"
              className={fieldClassName}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              minLength={1}
            />
          </FormField>
          <FormField icon={UserRound} label={t('users.lastName')} htmlFor="employeeLastName">
            <input
              id="employeeLastName"
              className={fieldClassName}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              minLength={1}
            />
          </FormField>
          <FormField icon={Phone} label={t('users.phone')} htmlFor="employeePhone">
            <input
              id="employeePhone"
              inputMode="numeric"
              className={`${fieldClassName} digit-field`}
              value={phone}
              onChange={(e) => {
                const next = toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 11)
                setPhone(next)
                if (!passwordTouched.current) setPassword(next)
              }}
              required
            />
          </FormField>
          <FormField icon={KeyRound} label={t('employees.password')} htmlFor="employeePassword">
            <input
              id="employeePassword"
              type="password"
              className={`${fieldClassName} latin-field`}
              dir="ltr"
              value={password}
              onChange={(e) => {
                passwordTouched.current = true
                setPassword(e.target.value)
              }}
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-ink-500">{t('employees.passwordHint')}</p>
          </FormField>
          <FormField icon={Building2} label={t('users.orgUnit')} htmlFor="employeeUnit">
            <SearchSelect
              id="employeeUnit"
              value={orgUnitId}
              required
              onChange={setOrgUnitId}
              placeholder={t('users.selectOrgUnit')}
              options={(units.data ?? []).map((unit) => ({
              value: unit.id,
              label: unit.pathLabel || unit.name,
            }))}
            />
          </FormField>
          <FormField icon={Briefcase} label={t('users.position')} htmlFor="employeePosition">
            <SearchSelect
              id="employeePosition"
              value={positionId}
              required
              onChange={setPositionId}
              placeholder={t('users.selectPosition')}
              options={(positions.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
            />
          </FormField>
        </div>
        <FormActions
          submitLabel={t('employees.save')}
          cancelLabel={t('employees.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
