import { Building2, IdCard, Phone, UserPlus, UserRound, UserRoundCheck, X } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import { toLatinDigits } from '../../../lib/datetime'
import { isPhoneReady } from '../../../lib/identity'
import { isValidIranianNationalId, normalizeNationalId } from '../../../lib/national-id'
import { organizationUnitPathLabel } from '../../organization/organization-unit-label'
import type { ManagedUser, OrganizationUnit, UnitRepresentative } from '../../../types/app'

export type UnitRepPayload = {
  unitId: string
  nutritionRepId: string
}

export function UnitRepForm({
  units,
  initial,
  onSubmit,
}: {
  units?: OrganizationUnit[]
  initial?: UnitRepresentative
  onSubmit: (payload: UnitRepPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [unitId, setUnitId] = useState(initial?.id ?? '')
  const [nutritionRepId, setNutritionRepId] = useState(initial?.nutritionRepId ?? '')
  const [saving, setSaving] = useState(false)
  const [personOpen, setPersonOpen] = useState(false)
  const queryClient = useQueryClient()
  const employees = useQuery({
    queryKey: ['users', 'unit', unitId, 'reps'],
    enabled: Boolean(unitId),
    queryFn: async () => {
      const { data } = await api.get<ManagedUser[]>('/users', {
        params: { orgUnitId: unitId },
      })
      return data
    },
  })

  const people = [...(employees.data ?? [])].sort((a, b) => a.fullName.localeCompare(b.fullName, 'fa'))
  const unitLabel = initial ? initial.pathLabel || initial.name : ''

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!unitId) {
      toast.error(t('unitReps.selectUnit'))
      return
    }
    if (!nutritionRepId) {
      toast.error(t('unitReps.selectRepresentative'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({ unitId, nutritionRepId })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <FormCard
      icon={UserRoundCheck}
      title={initial ? unitLabel : t('unitReps.create')}
      subtitle={initial ? undefined : t('unitReps.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        {initial ? (
          <FormField icon={Building2} label={t('unitReps.unit')} htmlFor="unitRepUnit">
            <input id="unitRepUnit" className={fieldClassName} value={unitLabel} readOnly />
          </FormField>
        ) : (
          <FormField icon={Building2} label={t('unitReps.unit')} htmlFor="unitRepUnit">
            <SearchSelect
              id="unitRepUnit"
              value={unitId}
              onChange={(next) => {
                setUnitId(next)
                setNutritionRepId('')
              }}
              placeholder={t('unitReps.selectUnit')}
              required
              options={(units ?? []).map((unit) => ({
                value: unit.id,
                label: organizationUnitPathLabel(unit),
              }))}
            />
          </FormField>
        )}
        <FormField icon={UserRoundCheck} label={t('unitReps.representative')} htmlFor="unitRepPerson">
          <SearchSelect
            id="unitRepPerson"
            value={nutritionRepId}
            onChange={setNutritionRepId}
            placeholder={t('unitReps.selectRepresentative')}
            required
            disabled={!unitId || employees.isLoading}
            options={people.map((user) => ({
              value: user.id,
              label: user.fullName,
            }))}
          />
        </FormField>
        {unitId && !employees.isLoading && people.length === 0 ? (
          <p className="text-xs leading-6 text-ink-500">{t('unitReps.noEmployees')}</p>
        ) : null}
        <FormActions
          submitting={saving}
          submitLabel={t('unitReps.save')}
          cancelLabel={t('unitReps.cancel')}
          onCancel={() => history.back()}
          extraItems={
            initial
              ? [
                  {
                    label: t('unitReps.createPerson'),
                    icon: UserPlus,
                    variant: 'soft',
                    onClick: () => setPersonOpen(true),
                  },
                ]
              : undefined
          }
        />
      </AppForm>
    </FormCard>
    {initial && personOpen ? (
      <UnitRepPersonModal
        unitId={initial.id}
        onClose={() => setPersonOpen(false)}
        onCreated={async (personId) => {
          setNutritionRepId(personId)
          await queryClient.invalidateQueries({ queryKey: ['users', 'unit', initial.id, 'reps'] })
          await queryClient.invalidateQueries({ queryKey: ['unit-reps'] })
          await queryClient.invalidateQueries({ queryKey: ['unit-rep'] })
          await queryClient.invalidateQueries({ queryKey: ['organization-units'] })
          toast.success(t('unitReps.created'))
          setPersonOpen(false)
        }}
      />
    ) : null}
    </>
  )
}

function UnitRepPersonModal({
  unitId,
  onClose,
  onCreated,
}: {
  unitId: string
  onClose: () => void
  onCreated: (personId: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const id = normalizeNationalId(nationalId)
    if (!isValidIranianNationalId(id)) {
      toast.error(t('users.nationalIdInvalid'))
      return
    }
    const digits = toLatinDigits(phone).replace(/\D/g, '')
    const normalized = digits.length === 10 && digits.startsWith('9') ? `0${digits}` : digits
    if (!isPhoneReady(normalized, true)) {
      toast.error(t('users.phoneRequired'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post<UnitRepresentative>(`/food-reservation/unit-reps/${unitId}/person`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nationalId: id,
        phone: normalized,
      })
      await onCreated(data.nutritionRep?.id ?? data.nutritionRepId ?? '')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-ink-900/30 p-4 pt-[10vh]"
      data-nested-dialog
      role="presentation"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-rep-person-title"
        className="relative z-10 flex max-h-[min(88vh,40rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="pointer-events-none absolute -start-8 -top-10 size-32 rounded-full bg-teal-200/30" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <UserPlus className="size-5" aria-hidden />
              </span>
              <div>
                <h2 id="unit-rep-person-title" className="text-sm font-semibold text-ink-900">
                  {t('unitReps.createPerson')}
                </h2>
                <p className="text-[11px] leading-5 text-ink-500">{t('unitReps.createPersonSubtitle')}</p>
              </div>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" />
            </button>
          </div>
        </header>
        <AppForm onSubmit={submit} autoFocusFirst className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField icon={UserRound} label={t('users.firstName')} htmlFor="repFirstName">
              <input
                id="repFirstName"
                className={fieldClassName}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={1}
              />
            </FormField>
            <FormField icon={UserRound} label={t('users.lastName')} htmlFor="repLastName">
              <input
                id="repLastName"
                className={fieldClassName}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={1}
              />
            </FormField>
            <FormField icon={IdCard} label={t('users.nationalId')} htmlFor="repNationalId">
              <input
                id="repNationalId"
                inputMode="numeric"
                className={`${fieldClassName} digit-field`}
                value={nationalId}
                onChange={(e) => setNationalId(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 10))}
                required
                minLength={10}
                maxLength={10}
              />
            </FormField>
            <FormField icon={Phone} label={t('users.phone')} htmlFor="repPhone">
              <input
                id="repPhone"
                inputMode="numeric"
                className={`${fieldClassName} digit-field`}
                value={phone}
                onChange={(e) => setPhone(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 11))}
                required
              />
            </FormField>
          </div>
          <p className="text-xs leading-6 text-ink-500">{t('unitReps.loginHint')}</p>
          <FormActions
            headerIcons={false}
            submitting={saving}
            submitLabel={t('unitReps.save')}
            cancelLabel={t('unitReps.cancel')}
            onCancel={onClose}
          />
        </AppForm>
      </section>
    </div>,
    document.body,
  )
}
