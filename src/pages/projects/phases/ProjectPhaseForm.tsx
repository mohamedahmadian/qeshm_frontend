import { useQuery } from '@tanstack/react-query'
import { CalendarRange, Flag, Gauge, ListChecks, Percent } from 'lucide-react'
import { type CSSProperties, type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, Button, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import {
  phaseProgressModeOrder,
  phaseProgressModes,
  projectStatusOrder,
  type PhaseProgressMode,
  type ProjectChecklistSummary,
  type ProjectPhase,
  type ProjectStatus,
} from '../../../types/app'
import { useChecklistManage } from '../checklist/ChecklistManageModal'
import { ProjectDetailChecklist } from '../checklist/ProjectChecklistBoard'

export type ProjectPhasePayload = {
  name: string
  startDate: string | null
  endDate: string | null
  status: ProjectStatus | null
  progressMode: PhaseProgressMode
  progressPercent: number | null
}

export function ProjectPhaseForm({
  initial,
  projectId,
  phaseId,
  onSubmit,
}: {
  initial?: Pick<
    ProjectPhase,
    'name' | 'startDate' | 'endDate' | 'status' | 'progressMode' | 'progressPercent'
  >
  projectId?: string
  phaseId?: string
  onSubmit: (payload: ProjectPhasePayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const checklist = useChecklistManage(projectId, phaseId)
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [name, setName] = useState(initial?.name ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [status, setStatus] = useState<string>(initial?.status ?? '')
  const [progressMode, setProgressMode] = useState<PhaseProgressMode>(
    initial?.progressMode ?? phaseProgressModes.MANUAL,
  )
  const [progressPercent, setProgressPercent] = useState<number | null>(
    initial?.progressPercent ?? null,
  )
  const [saving, setSaving] = useState(false)
  const checklistDriven = progressMode === phaseProgressModes.CHECKLIST
  const summaryQuery = useQuery({
    queryKey: ['project-checklist', projectId, phaseId, 'summary'],
    enabled: Boolean(projectId && phaseId && checklistDriven),
    queryFn: async () => {
      const { data } = await api.get<ProjectChecklistSummary>(
        `/projects/${projectId}/phases/${phaseId}/checklist/summary`,
      )
      return data
    },
  })

  useEffect(() => {
    if (!checklistDriven || !summaryQuery.data) return
    setProgressPercent(summaryQuery.data.doneWeight)
  }, [checklistDriven, summaryQuery.data])

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
        progressMode,
        progressPercent,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
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
        <FormField icon={ListChecks} label={t('projectPhases.progressMode')} htmlFor="phaseProgressMode">
          <SearchSelect
            id="phaseProgressMode"
            value={progressMode}
            onChange={(next) => setProgressMode(next as PhaseProgressMode)}
            options={phaseProgressModeOrder.map((item) => ({
              value: item,
              label: t(`projectPhases.progressModes.${item}`),
            }))}
          />
          <p className="text-xs leading-6 text-ink-500">{t('projectPhases.progressModeHint')}</p>
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
              disabled={checklistDriven}
              className="progress-slider disabled:cursor-not-allowed disabled:opacity-60"
              style={{ '--slider-fill': `${progressPercent ?? 0}%` } as CSSProperties}
              value={progressPercent ?? 0}
              onChange={(e) => {
                if (checklistDriven) return
                setProgressPercent(Number(e.target.value))
              }}
            />
            <p className="text-center text-sm tabular-nums text-ink-700">
              {progressPercent == null ? '—' : `${formatNumber(progressPercent, locale)}٪`}
            </p>
            {checklistDriven ? (
              <p className="text-xs leading-6 text-ink-500">
                {phaseId
                  ? t('projectPhases.progressFromChecklist')
                  : t('projectPhases.checklistAfterSave')}
              </p>
            ) : null}
            {projectId && phaseId && checklistDriven ? (
              <Button type="button" variant="ghost" onClick={checklist.openList}>
                <ListChecks className="size-4" aria-hidden />
                {t('projectChecklist.manage')}
              </Button>
            ) : null}
          </div>
        </FormField>
        {projectId && phaseId && checklistDriven ? (
          <ProjectDetailChecklist
            projectId={projectId}
            phaseId={phaseId}
            onEditItem={checklist.openEdit}
          />
        ) : null}
        <FormActions
          submitLabel={t('projectPhases.save')}
          cancelLabel={t('projectPhases.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
    {checklist.modal}
    </>
  )
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}
