import {
  Building,
  Building2,
  CalendarRange,
  FolderKanban,
  Gauge,
  Globe,
  Hash,
  Landmark,
  Link2,
  MapPin,
  Monitor,
  Percent,
  ScrollText,
  Shield,
  Store,
  Tags,
  ToggleRight,
} from 'lucide-react'
import { type CSSProperties, type FormEvent, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormField, FormActions, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { getApiErrorMessage, api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { QESHM_MAP_BOUNDS, QESHM_MAP_CENTER } from '../../lib/geo'
import {
  projectImportanceOrder,
  projectImportances,
  projectStatusOrder,
  projectStatuses,
  type Project,
  type ProjectImportance,
  type ProjectLookups,
  type ProjectStatus,
} from '../../types/app'
import { withCurrent } from './ProjectShared'

export type ProjectPayload = {
  vicePresidency: string
  management: string
  unit: string
  systemName: string
  code: string
  isActive: boolean
  status: ProjectStatus
  progressPercent: number | null
  startDate: string | null
  endDate: string | null
  latitude: number | null
  longitude: number | null
  companyName: string | null
  systemUrl: string | null
  launchYear: number | null
  isSupportActive: boolean
  replacementProjectId: string | null
  description: string | null
  importance: ProjectImportance
}

function toCoordString(value: number | null | undefined) {
  return value == null ? '' : String(value)
}

function suggestProjectCode(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ').slice(0, 40)
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
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
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [vicePresidency, setVicePresidency] = useState(initial?.vicePresidency ?? '')
  const [management, setManagement] = useState(initial?.management ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [systemName, setSystemName] = useState(initial?.systemName ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [codeTouched, setCodeTouched] = useState(Boolean(initial?.code))
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [status, setStatus] = useState<string>(initial?.status ?? projectStatusOrder[0])
  const [progressPercent, setProgressPercent] = useState<number | null>(
    initial?.progressPercent ?? null,
  )
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [latitude, setLatitude] = useState(toCoordString(initial?.latitude))
  const [longitude, setLongitude] = useState(toCoordString(initial?.longitude))
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

  const hasPin = toOptionalNumber(latitude) != null && toOptionalNumber(longitude) != null
  const focus = useMemo(() => {
    if (hasPin) return null
    return {
      lat: QESHM_MAP_CENTER.lat,
      lng: QESHM_MAP_CENTER.lng,
      zoom: 12,
      bounds: QESHM_MAP_BOUNDS,
    }
  }, [hasPin])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (startDate && endDate && endDate < startDate) {
      toast.error(t('projects.rangeInvalid'))
      return
    }
    const progressChanged =
      Boolean(initial) && progressPercent !== (initial?.progressPercent ?? null)
    const nextStatus = progressChanged
      ? projectStatuses.IN_PROGRESS
      : ((status || projectStatusOrder[0]) as ProjectStatus)
    setSaving(true)
    try {
      await onSubmit({
        vicePresidency: vicePresidency.trim(),
        management: management.trim(),
        unit: unit.trim(),
        systemName: systemName.trim(),
        code: code.trim(),
        isActive,
        status: nextStatus,
        progressPercent,
        startDate: emptyToNull(startDate),
        endDate: emptyToNull(endDate),
        latitude: toOptionalNumber(latitude),
        longitude: toOptionalNumber(longitude),
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>

        <FormSectionTitle icon={Monitor}>{t('projects.systemSection')}</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={Monitor} label={t('projects.systemName')} htmlFor="systemName">
            <input
              id="systemName"
              className={fieldClassName}
              value={systemName}
              onChange={(e) => {
                const next = e.target.value
                setSystemName(next)
                if (!codeTouched) setCode(suggestProjectCode(next))
              }}
              required
              minLength={2}
            />
          </FormField>
          <FormField icon={Hash} label={t('projects.code')} htmlFor="projectCode">
            <input
              id="projectCode"
              className={fieldClassName}
              value={code}
              onChange={(e) => {
                setCodeTouched(true)
                setCode(e.target.value)
              }}
              required
              minLength={1}
              maxLength={40}
              placeholder={t('projects.codeHint')}
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
          <FormField icon={Gauge} label={t('projects.status')} htmlFor="status">
            <SearchSelect
              id="status"
              value={status}
              required
              onChange={setStatus}
              placeholder={t(`projects.statuses.${projectStatusOrder[0]}`)}
              options={projectStatusOrder.map((item) => ({
                value: item,
                label: t(`projects.statuses.${item}`),
              }))}
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
          <div className="sm:col-span-2">
            <FormField icon={ScrollText} label={t('projects.description')} htmlFor="description">
              <textarea
                id="description"
                className={fieldClassName}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <FormSectionTitle icon={CalendarRange}>{t('projects.timelineSection')}</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={CalendarRange} label={t('projects.startDate')} htmlFor="startDate">
            <PersianDateField
              id="startDate"
              value={startDate}
              maxDate={endDate || undefined}
              onChange={(value) => setStartDate(value ?? '')}
            />
          </FormField>
          <FormField icon={CalendarRange} label={t('projects.endDate')} htmlFor="endDate">
            <PersianDateField
              id="endDate"
              value={endDate}
              minDate={startDate || undefined}
              onChange={(value) => setEndDate(value ?? '')}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField icon={Percent} label={t('projects.progress')} htmlFor="progressPercent">
              <div className="space-y-1.5">
                <input
                  id="progressPercent"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  dir="ltr"
                  className="progress-slider"
                  style={{ '--slider-fill': `${progressPercent ?? 0}%` } as CSSProperties}
                  value={progressPercent ?? 0}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setProgressPercent(next)
                    if (initial && next !== (initial.progressPercent ?? 0)) {
                      setStatus(projectStatuses.IN_PROGRESS)
                    }
                  }}
                />
                <p className="text-center text-sm tabular-nums text-ink-700">
                  {progressPercent == null ? '—' : `${formatNumber(progressPercent, locale)}٪`}
                </p>
              </div>
            </FormField>
          </div>
        </div>

        <FormSectionTitle icon={MapPin}>{t('projects.locationSection')}</FormSectionTitle>
        <div className="space-y-2">
          <p className="text-xs leading-6 text-ink-500">{t('projects.mapHint')}</p>
          <OsmMapPicker
            variant="always"
            latitude={latitude}
            longitude={longitude}
            focus={focus}
            heightClass="h-56 sm:h-64"
            onChange={(nextLat, nextLng) => {
              setLatitude(nextLat)
              setLongitude(nextLng)
            }}
          />
        </div>
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
