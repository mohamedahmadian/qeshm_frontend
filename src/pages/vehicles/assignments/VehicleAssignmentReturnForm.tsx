import { CalendarRange, Undo2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { getApiErrorMessage } from '../../../lib/api'
import { todayIsoDate } from '../../../lib/datetime'
import type { VehicleAssignment } from '../../../types/app'

function toIsoDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function VehicleAssignmentReturnForm({
  assignment,
  onSubmit,
}: {
  assignment: VehicleAssignment
  onSubmit: (payload: { returnedAt: string }) => Promise<void>
}) {
  const { t } = useTranslation()
  const startDate = toIsoDate(assignment.startDate)
  const today = todayIsoDate()
  const [returnedAt, setReturnedAt] = useState(today < startDate ? startDate : today)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!returnedAt) {
      toast.error(t('vehicleAssignments.returnedAtRequired'))
      return
    }
    if (startDate && returnedAt < startDate) {
      toast.error(t('vehicleAssignments.returnRangeInvalid'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({ returnedAt })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Undo2}
      title={t('vehicleAssignments.return')}
      subtitle={t('vehicleAssignments.returnSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={CalendarRange} label={t('vehicleAssignments.returnedAt')} htmlFor="assignmentReturnedAt">
          <PersianDateField
            id="assignmentReturnedAt"
            value={returnedAt}
            minDate={startDate || undefined}
            onChange={(value) => setReturnedAt(value ?? '')}
          />
        </FormField>
        <FormActions
          submitLabel={t('vehicleAssignments.returnSave')}
          cancelLabel={t('vehicleAssignments.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
