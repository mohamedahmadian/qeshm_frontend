import { CalendarRange, Flag, Target } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { getApiErrorMessage } from '../../../lib/api'
import type { ContractorPhase } from '../../../types/app'

export type PhasePayload = {
  name: string
  startDate: string
  endDate: string
  goals: string | null
}

export function ContractorPhaseForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<ContractorPhase, 'name' | 'startDate' | 'endDate' | 'goals'>
  onSubmit: (payload: PhasePayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [goals, setGoals] = useState(initial?.goals ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!startDate || !endDate) {
      toast.error(t('contractorPhases.dateRequired'))
      return
    }
    if (endDate < startDate) {
      toast.error(t('contractorPhases.rangeInvalid'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        startDate,
        endDate,
        goals: emptyToNull(goals),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Flag}
      title={initial ? initial.name || t('contractorPhases.edit') : t('contractorPhases.create')}
      subtitle={initial ? undefined : t('contractorPhases.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Flag} label={t('contractorPhases.name')} htmlFor="phaseName">
          <input
            id="phaseName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={CalendarRange} label={t('contractorPhases.startDate')} htmlFor="phaseStart">
          <PersianDateField id="phaseStart" value={startDate} onChange={(value) => setStartDate(value ?? '')} />
        </FormField>
        <FormField icon={CalendarRange} label={t('contractorPhases.endDate')} htmlFor="phaseEnd">
          <PersianDateField
            id="phaseEnd"
            value={endDate}
            minDate={startDate || undefined}
            onChange={(value) => setEndDate(value ?? '')}
          />
        </FormField>
        <FormField icon={Target} label={t('contractorPhases.goals')} htmlFor="phaseGoals">
          <textarea
            id="phaseGoals"
            className={fieldClassName}
            rows={3}
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={t('contractorPhases.save')}
          cancelLabel={t('contractorPhases.cancel')}
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
