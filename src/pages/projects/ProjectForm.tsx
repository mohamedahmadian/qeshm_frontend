import {
  Building,
  Building2,
  CalendarRange,
  FolderKanban,
  Globe,
  Landmark,
  Link2,
  Monitor,
  ScrollText,
  Shield,
  Store,
  Tags,
  ToggleRight,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormField, FormActions, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { getApiErrorMessage, api } from '../../lib/api'
import {
  projectImportanceOrder,
  projectImportances,
  type Project,
  type ProjectImportance,
  type ProjectLookups,
} from '../../types/app'
import { withCurrent } from './ProjectShared'

export type ProjectPayload = {
  vicePresidency: string
  management: string
  unit: string
  systemName: string
  isActive: boolean
  companyName: string | null
  systemUrl: string | null
  launchYear: number | null
  isSupportActive: boolean
  replacementProjectId: string | null
  description: string | null
  importance: ProjectImportance
}

export function ProjectForm({
  initial,
  excludeId,
  onSubmit,
}: {
  initial?: ProjectPayload
  excludeId?: string
  onSubmit: (payload: ProjectPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [vicePresidency, setVicePresidency] = useState(initial?.vicePresidency ?? '')
  const [management, setManagement] = useState(initial?.management ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [systemName, setSystemName] = useState(initial?.systemName ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '')
  const [systemUrl, setSystemUrl] = useState(initial?.systemUrl ?? '')
  const [launchYear, setLaunchYear] = useState(
    initial?.launchYear != null ? String(initial.launchYear) : '',
  )
  const [isSupportActive, setIsSupportActive] = useState(initial?.isSupportActive ?? true)
  const [replacementProjectId, setReplacementProjectId] = useState(
    initial?.replacementProjectId ?? '',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [importance, setImportance] = useState<ProjectImportance>(
    initial?.importance ?? projectImportances.HIGH,
  )
  const [saving, setSaving] = useState(false)

  const lookups = useQuery({
    queryKey: ['projects', 'lookups', vicePresidency, management],
    queryFn: async () => {
      const { data } = await api.get<ProjectLookups>('/projects/lookups', {
        params: {
          ...(vicePresidency ? { vicePresidency } : {}),
          ...(management ? { management } : {}),
        },
      })
      return data
    },
  })

  const replacements = useQuery({
    queryKey: ['projects', 'replacement-options', excludeId],
    queryFn: async () => {
      const { data } = await api.get<Project[]>('/projects', {
        params: excludeId ? { excludeId } : {},
      })
      return data
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        vicePresidency: vicePresidency.trim(),
        management: management.trim(),
        unit: unit.trim(),
        systemName: systemName.trim(),
        isActive,
        companyName: emptyToNull(companyName),
        systemUrl: emptyToNull(systemUrl),
        launchYear: toOptionalYear(launchYear),
        isSupportActive,
        replacementProjectId: replacementProjectId || null,
        description: emptyToNull(description),
        importance,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const viceOptions = withCurrent(lookups.data?.vicePresidencies, vicePresidency)
  const managementOptions = withCurrent(lookups.data?.managements, management)
  const unitOptions = withCurrent(lookups.data?.units, unit)

  return (
    <FormCard
      icon={FolderKanban}
      title={initial ? initial.systemName || t('projects.edit') : t('projects.create')}
      subtitle={initial ? undefined : t('projects.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormSectionTitle icon={Landmark}>{t('projects.orgSection')}</FormSectionTitle>
        <FormField icon={Landmark} label={t('projects.vicePresidency')} htmlFor="vicePresidency">
          <SearchSelect
            id="vicePresidency"
            value={vicePresidency}
            required
            onChange={setVicePresidency}
            onCreate={setVicePresidency}
            createLabel={(name) => t('projects.addNamed', { name })}
            placeholder={t('projects.vicePresidency')}
            options={viceOptions.map((item) => ({ value: item, label: item }))}
          />
        </FormField>
        <FormField icon={Building} label={t('projects.management')} htmlFor="management">
          <SearchSelect
            id="management"
            value={management}
            required
            onChange={setManagement}
            onCreate={setManagement}
            createLabel={(name) => t('projects.addNamed', { name })}
            placeholder={t('projects.management')}
            options={managementOptions.map((item) => ({ value: item, label: item }))}
          />
        </FormField>
        <FormField icon={Building2} label={t('projects.unit')} htmlFor="unit">
          <SearchSelect
            id="unit"
            value={unit}
            required
            onChange={setUnit}
            onCreate={setUnit}
            createLabel={(name) => t('projects.addNamed', { name })}
            placeholder={t('projects.unit')}
            options={unitOptions.map((item) => ({ value: item, label: item }))}
          />
        </FormField>

        <FormSectionTitle icon={Monitor}>{t('projects.systemSection')}</FormSectionTitle>
        <FormField icon={Monitor} label={t('projects.systemName')} htmlFor="systemName">
          <input
            id="systemName"
            className={fieldClassName}
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={ToggleRight} label={t('projects.isActive')} htmlFor="isActive">
          <ToggleField
            id="isActive"
            checked={isActive}
            onChange={setIsActive}
            onLabel={t('geo.active')}
            offLabel={t('geo.inactive')}
          />
        </FormField>
        <FormField icon={Store} label={t('projects.companyName')} htmlFor="companyName">
          <input
            id="companyName"
            className={fieldClassName}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </FormField>
        <FormField icon={Globe} label={t('projects.systemUrl')} htmlFor="systemUrl">
          <input
            id="systemUrl"
            dir="ltr"
            className={`${fieldClassName} text-start`}
            value={systemUrl}
            onChange={(e) => setSystemUrl(e.target.value)}
          />
        </FormField>
        <FormField icon={CalendarRange} label={t('projects.launchYear')} htmlFor="launchYear">
          <input
            id="launchYear"
            type="number"
            min={1300}
            max={1600}
            className={fieldClassName}
            value={launchYear}
            onChange={(e) => setLaunchYear(e.target.value)}
          />
        </FormField>
        <FormField icon={Shield} label={t('projects.isSupportActive')} htmlFor="isSupportActive">
          <ToggleField
            id="isSupportActive"
            checked={isSupportActive}
            onChange={setIsSupportActive}
            onLabel={t('geo.active')}
            offLabel={t('geo.inactive')}
          />
        </FormField>
        <FormField icon={Link2} label={t('projects.replacement')} htmlFor="replacementProjectId">
          <SearchSelect
            id="replacementProjectId"
            value={replacementProjectId}
            onChange={setReplacementProjectId}
            placeholder={t('projects.none')}
            options={[
              { value: '', label: t('projects.none') },
              ...(replacements.data ?? []).map((item) => ({
                value: item.id,
                label: item.systemName,
              })),
            ]}
          />
        </FormField>
        <FormField icon={Tags} label={t('projects.importance')} htmlFor="importance">
          <SearchSelect
            id="importance"
            value={importance}
            required
            onChange={(next) => setImportance(next as ProjectImportance)}
            options={projectImportanceOrder.map((item) => ({
              value: item,
              label: t(`projects.importances.${item}`),
            }))}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('projects.description')} htmlFor="description">
          <textarea
            id="description"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={t('projects.save')}
          cancelLabel={t('projects.cancel')}
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

function toOptionalYear(value: string) {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}
