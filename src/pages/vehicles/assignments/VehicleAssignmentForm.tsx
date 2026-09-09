import { Building2, CalendarRange, Handshake, ScrollText, UserRound } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import type {
  ManagedUser,
  OrganizationUnit,
  VehicleAssignment,
  VehicleAssignmentType,
} from '../../../types/app'
import { vehicleAssignmentTypes } from '../../../types/app'

export type VehicleAssignmentPayload = {
  type: VehicleAssignmentType
  organizationUnitId: string | null
  personId: string | null
  startDate: string
  endDate: string | null
  description: string | null
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function toIsoDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function VehicleAssignmentForm({
  initial,
  onSubmit,
}: {
  initial?: VehicleAssignment
  onSubmit: (payload: VehicleAssignmentPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [type, setType] = useState<VehicleAssignmentType>(initial?.type ?? vehicleAssignmentTypes.UNIT)
  const [organizationUnitId, setOrganizationUnitId] = useState(initial?.organizationUnitId ?? '')
  const [personId, setPersonId] = useState(initial?.personId ?? '')
  const [startDate, setStartDate] = useState(toIsoDate(initial?.startDate))
  const [endDate, setEndDate] = useState(toIsoDate(initial?.endDate))
  const [description, setDescription] = useState(initial?.description ?? '')
  const [saving, setSaving] = useState(false)

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const employees = useQuery({
    queryKey: ['users', 'employees', 'lookup'],
    enabled: type === vehicleAssignmentTypes.PERSON,
    queryFn: async () => {
      const { data } = await api.get<ManagedUser[]>('/users', {
        params: { employeesOnly: true },
      })
      return data
    },
  })
  const members = useQuery({
    queryKey: ['users', 'unit', organizationUnitId],
    enabled: type === vehicleAssignmentTypes.UNIT && Boolean(organizationUnitId),
    queryFn: async () => {
      const { data } = await api.get<ManagedUser[]>('/users', {
        params: { orgUnitId: organizationUnitId },
      })
      return data
    },
  })

  useEffect(() => {
    if (type !== vehicleAssignmentTypes.UNIT || !organizationUnitId || !personId) return
    const ids = (members.data ?? []).map((user) => user.id)
    if (members.data && !ids.includes(personId)) {
      setPersonId('')
    }
  }, [members.data, organizationUnitId, personId, type])

  function changeType(next: string) {
    const value = next as VehicleAssignmentType
    setType(value)
    setPersonId('')
    if (value === vehicleAssignmentTypes.UNIT) {
      return
    }
    setOrganizationUnitId('')
  }

  function changePerson(next: string) {
    setPersonId(next)
    const person = (employees.data ?? []).find((user) => user.id === next)
    setOrganizationUnitId(person?.orgUnitId ?? '')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!startDate) {
      toast.error(t('vehicleAssignments.startDateRequired'))
      return
    }
    if (endDate && endDate < startDate) {
      toast.error(t('vehicleAssignments.rangeInvalid'))
      return
    }
    if (type === vehicleAssignmentTypes.UNIT && !organizationUnitId) {
      toast.error(t('vehicleAssignments.unitRequired'))
      return
    }
    if (type === vehicleAssignmentTypes.PERSON && !personId) {
      toast.error(t('vehicleAssignments.personRequired'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        type,
        organizationUnitId: emptyToNull(organizationUnitId),
        personId: emptyToNull(personId),
        startDate,
        endDate: emptyToNull(endDate),
        description: emptyToNull(description),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const personOptions =
    type === vehicleAssignmentTypes.UNIT
      ? (members.data ?? []).map((user) => ({ value: user.id, label: user.fullName }))
      : (employees.data ?? []).map((user) => ({ value: user.id, label: user.fullName }))

  return (
    <FormCard
      icon={Handshake}
      title={initial ? t('vehicleAssignments.edit') : t('vehicleAssignments.create')}
      subtitle={initial ? undefined : t('vehicleAssignments.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Handshake} label={t('vehicleAssignments.type')} htmlFor="assignmentType">
          <SearchSelect
            id="assignmentType"
            value={type}
            required
            onChange={changeType}
            placeholder={t('vehicleAssignments.selectType')}
            options={[
              { value: vehicleAssignmentTypes.UNIT, label: t('vehicleAssignments.types.UNIT') },
              { value: vehicleAssignmentTypes.PERSON, label: t('vehicleAssignments.types.PERSON') },
            ]}
          />
        </FormField>
        {type === vehicleAssignmentTypes.UNIT ? (
          <>
            <FormField icon={Building2} label={t('vehicleAssignments.organizationUnit')} htmlFor="assignmentUnit">
              <SearchSelect
                id="assignmentUnit"
                value={organizationUnitId}
                required
                onChange={(next) => {
                  setOrganizationUnitId(next)
                  setPersonId('')
                }}
                placeholder={t('vehicleAssignments.selectUnit')}
                options={(units.data ?? []).map((unit) => ({ value: unit.id, label: unit.name }))}
              />
            </FormField>
            <FormField icon={UserRound} label={t('vehicleAssignments.person')} htmlFor="assignmentMember">
              <SearchSelect
                id="assignmentMember"
                value={personId}
                onChange={setPersonId}
                placeholder={
                  organizationUnitId
                    ? t('vehicleAssignments.selectMember')
                    : t('vehicleAssignments.selectUnitFirst')
                }
                options={[
                  { value: '', label: t('vehicleAssignments.noPerson') },
                  ...personOptions,
                ]}
              />
            </FormField>
          </>
        ) : (
          <FormField icon={UserRound} label={t('vehicleAssignments.person')} htmlFor="assignmentPerson">
            <SearchSelect
              id="assignmentPerson"
              value={personId}
              required
              onChange={changePerson}
              placeholder={t('vehicleAssignments.selectPerson')}
              options={personOptions}
            />
          </FormField>
        )}
        {type === vehicleAssignmentTypes.PERSON && organizationUnitId ? (
          <p className="text-xs leading-6 text-ink-500">
            {t('vehicleAssignments.personUnitHint', {
              unit: units.data?.find((unit) => unit.id === organizationUnitId)?.name ?? '',
            })}
          </p>
        ) : null}
        <FormField icon={CalendarRange} label={t('vehicleAssignments.startDate')} htmlFor="assignmentStart">
          <PersianDateField
            id="assignmentStart"
            value={startDate}
            onChange={(value) => setStartDate(value ?? '')}
          />
        </FormField>
        <FormField icon={CalendarRange} label={t('vehicleAssignments.endDate')} htmlFor="assignmentEnd">
          <PersianDateField
            id="assignmentEnd"
            value={endDate}
            minDate={startDate || undefined}
            onChange={(value) => setEndDate(value ?? '')}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('vehicleAssignments.description')} htmlFor="assignmentDescription">
          <textarea
            id="assignmentDescription"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={t('vehicleAssignments.save')}
          cancelLabel={t('vehicleAssignments.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
