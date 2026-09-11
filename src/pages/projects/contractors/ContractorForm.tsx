import { Building2, CalendarClock, FolderKanban, IdCard, ScrollText, UserRound, Wallet } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import { toLatinDigits } from '../../../lib/datetime'
import { isValidIranianLegalNationalId, normalizeLegalNationalId } from '../../../lib/national-id'
import type { Project, ProjectContractor } from '../../../types/app'

export type ContractorPayload = {
  projectId?: string
  name: string
  nationalId: string | null
  description: string | null
  ceoName: string | null
  timeEstimate: string | null
  costEstimate: number | null
}

export function ContractorForm({
  initial,
  onSubmit,
  requireProject = false,
}: {
  initial?: Pick<
    ProjectContractor,
    'name' | 'nationalId' | 'description' | 'ceoName' | 'timeEstimate' | 'costEstimate'
  >
  onSubmit: (payload: ContractorPayload) => Promise<void>
  requireProject?: boolean
}) {
  const { t } = useTranslation()
  const [projectId, setProjectId] = useState('')
  const [name, setName] = useState(initial?.name ?? '')
  const [nationalId, setNationalId] = useState(initial?.nationalId ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [ceoName, setCeoName] = useState(initial?.ceoName ?? '')
  const [timeEstimate, setTimeEstimate] = useState(initial?.timeEstimate ?? '')
  const [costEstimate, setCostEstimate] = useState(
    initial?.costEstimate != null ? String(initial.costEstimate) : '',
  )
  const [saving, setSaving] = useState(false)

  const projects = useQuery({
    queryKey: ['projects', 'lookup'],
    enabled: requireProject,
    queryFn: async () => {
      const { data } = await api.get<Project[]>('/projects')
      return data
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (requireProject && !projectId) {
      toast.error(t('contractors.projectRequired'))
      return
    }
    const idDigits = normalizeLegalNationalId(nationalId)
    if (idDigits && !isValidIranianLegalNationalId(idDigits)) {
      toast.error(t('contractors.nationalIdInvalid'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        ...(requireProject ? { projectId } : {}),
        name: name.trim(),
        nationalId: idDigits || null,
        description: emptyToNull(description),
        ceoName: emptyToNull(ceoName),
        timeEstimate: emptyToNull(timeEstimate),
        costEstimate: toOptionalAmount(costEstimate),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Building2}
      title={initial ? initial.name || t('contractors.edit') : t('contractors.create')}
      subtitle={initial ? undefined : t('contractors.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        {requireProject ? (
          <FormField icon={FolderKanban} label={t('contractors.project')} htmlFor="contractorProject">
            <SearchSelect
              id="contractorProject"
              value={projectId}
              onChange={setProjectId}
              required
              placeholder={t('contractors.selectProject')}
              options={(projects.data ?? []).map((project) => ({
                value: project.id,
                label: project.systemName,
              }))}
            />
          </FormField>
        ) : null}
        <FormField icon={Building2} label={t('contractors.name')} htmlFor="contractorName">
          <input
            id="contractorName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={IdCard} label={t('contractors.nationalId')} htmlFor="contractorNationalId">
          <input
            id="contractorNationalId"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={nationalId}
            onChange={(e) => setNationalId(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 11))}
          />
        </FormField>
        <FormField icon={UserRound} label={t('contractors.ceoName')} htmlFor="ceoName">
          <input
            id="ceoName"
            className={fieldClassName}
            value={ceoName}
            onChange={(e) => setCeoName(e.target.value)}
          />
        </FormField>
        <FormField icon={CalendarClock} label={t('contractors.timeEstimate')} htmlFor="timeEstimate">
          <input
            id="timeEstimate"
            className={fieldClassName}
            value={timeEstimate}
            onChange={(e) => setTimeEstimate(e.target.value)}
          />
        </FormField>
        <FormField icon={Wallet} label={t('contractors.costEstimate')} htmlFor="costEstimate">
          <input
            id="costEstimate"
            type="number"
            min={0}
            className={fieldClassName}
            value={costEstimate}
            onChange={(e) => setCostEstimate(e.target.value)}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('contractors.description')} htmlFor="contractorDescription">
          <textarea
            id="contractorDescription"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={t('contractors.save')}
          cancelLabel={t('contractors.cancel')}
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

function toOptionalAmount(value: string) {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
