import { CalendarRange, Flag, Gauge, Percent } from 'lucide-react'
import { type CSSProperties, type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import { projectStatusOrder, type ProjectPhase, type ProjectStatus } from '../../../types/app'

export type ProjectPhasePayload = {
  name: string
  startDate: string | null
  endDate: string | null
  status: ProjectStatus | null
  progressPercent: number | null
}

export function ProjectPhaseForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<ProjectPhase, 'name' | 'startDate' | 'endDate' | 'status' | 'progressPercent'>
  onSubmit: (payload: ProjectPhasePayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [name, setName] = useState(initial?.name ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [status, setStatus] = useState<string>(initial?.status ?? '')
  const [progressPercent, setProgressPercent] = useState<number | null>(
    initial?.progressPercent ?? null,
  )
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (startDate && endDate && endDate < startDate) {
      toast.error(t('projectPhases.rangeInvalid'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        startDate: emptyToNull(startDate),
        endDate: emptyToNull(endDate),
        status: (status || null) as ProjectStatus | null,
        progressPercent,
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
      title={initial ? initial.name || t('projectPhases.edit') : t('projectPhases.create')}
      subtitle={initial ? undefined : t('projectPhases.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Flag} label={t('projectPhases.name')} htmlFor="phaseName">
          <input
            id="phaseName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={CalendarRange} label={t('projectPhases.startDate')} htmlFor="phaseStart">
          <PersianDateField
            id="phaseStart"
            value={startDate}
            maxDate={endDate || undefined}
            onChange={(value) => setStartDate(value ?? '')}
          />
        </FormField>
        <FormField icon={CalendarRange} label={t('projectPhases.endDate')} htmlFor="phaseEnd">
          <PersianDateField
            id="phaseEnd"
            value={endDate}
            minDate={startDate || undefined}
            onChange={(value) => setEndDate(value ?? '')}
          />
        </FormField>
        <FormField icon={Gauge} label={t('projectPhases.status')} htmlFor="phaseStatus">
          <SearchSelect
            id="phaseStatus"
            value={status}
            onChange={setStatus}
            placeholder={t('projectPhases.none')}
            options={[
              { value: '', label: t('projectPhases.none') },
              ...projectStatusOrder.map((item) => ({
                value: item,
                label: t(`projects.statuses.${item}`),
              })),
            ]}
          />
        </FormField>
        <FormField icon={Percent} label={t('projectPhases.progress')} htmlFor="phaseProgress">
          <div className="space-y-1.5">
            <input
              id="phaseProgress"
              type="range"
              min={0}
              max={100}
              step={1}
              dir="ltr"
              className="progress-slider"
              style={{ '--slider-fill': `${progressPercent ?? 0}%` } as CSSProperties}
              value={progressPercent ?? 0}
              onChange={(e) => setProgressPercent(Number(e.target.value))}
            />
            <p className="text-center text-sm tabular-nums text-ink-700">
              {progressPercent == null ? '—' : `${formatNumber(progressPercent, locale)}٪`}
            </p>
          </div>
        </FormField>
        <FormActions
          submitLabel={t('projectPhases.save')}
          cancelLabel={t('projectPhases.cancel')}
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
