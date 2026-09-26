import { ListChecks, Percent, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'

export type ProjectChecklistPayload = {
  title: string
  weightPercent: number
  isDone: boolean
}

export function ProjectChecklistForm({
  initial,
  weightHint,
  onSubmit,
  onCancel,
  embedded = false,
}: {
  initial?: ProjectChecklistPayload
  weightHint: string
  onSubmit: (payload: ProjectChecklistPayload) => Promise<void>
  onCancel?: () => void
  embedded?: boolean
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [weight, setWeight] = useState(
    initial ? String(initial.weightPercent) : '',
  )
  const [isDone, setIsDone] = useState(initial?.isDone ?? false)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const weightPercent = Number(weight)
    if (!Number.isInteger(weightPercent) || weightPercent < 1 || weightPercent > 100) {
      toast.error(t('projectChecklist.weightInvalid'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        weightPercent,
        isDone,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const form = (
      <AppForm onSubmit={submit} className={embedded ? 'space-y-4' : formCardBodyClassName}>
        <FormField icon={Type} label={t('projectChecklist.name')} htmlFor="checklistTitle">
          <input
            id="checklistTitle"
            className={fieldClassName}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={Percent} label={t('projectChecklist.weight')} htmlFor="checklistWeight">
          <input
            id="checklistWeight"
            type="number"
            min={1}
            max={100}
            step={1}
            dir="ltr"
            className={fieldClassName}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            required
          />
          <p className="text-xs leading-6 text-ink-500">{weightHint}</p>
        </FormField>
        <FormField icon={ListChecks} label={t('projectChecklist.status')} htmlFor="checklistDone">
          <ToggleField
            id="checklistDone"
            checked={isDone}
            onChange={setIsDone}
            onLabel={t('projectChecklist.done')}
            offLabel={t('projectChecklist.open')}
          />
        </FormField>
        <FormActions
          submitLabel={t('projectChecklist.save')}
          cancelLabel={t('projectChecklist.cancel')}
          submitting={saving}
          headerIcons={embedded ? false : undefined}
          onCancel={onCancel ?? (() => history.back())}
        />
      </AppForm>
  )

  if (embedded) return form

  return (
    <FormCard
      icon={ListChecks}
      title={initial ? initial.title || t('projectChecklist.edit') : t('projectChecklist.create')}
      subtitle={initial ? undefined : t('projectChecklist.createSubtitle')}
    >
      {form}
    </FormCard>
  )
}
