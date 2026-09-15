import {
  CalendarRange,
  FolderKanban,
  Gauge,
  Globe,
  Handshake,
  Hash,
  Landmark,
  Layers,
  Link2,
  MapPin,
  Monitor,
  Palette,
  Percent,
  Radio,
  ScrollText,
  Shield,
  Tags,
  ToggleRight,
} from 'lucide-react'
import { type CSSProperties, type FormEvent, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthProvider'
import { AppForm, FormField, FormActions, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { OrgUnitTreeSelect } from '../../components/ui/OrgUnitTreeSelect'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { getApiErrorMessage, api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { QESHM_MAP_BOUNDS, QESHM_MAP_CENTER } from '../../lib/geo'
import { DEFAULT_PROJECT_COLOR, PROJECT_COLOR_SWATCHES, projectColor } from '../../lib/project-color'
import {
  projectImportanceOrder,
  projectImportances,
  projectStatusOrder,
  projectStatuses,
  type OrganizationUnit,
  type Project,
  type ProjectGroup,
  type ProjectImportance,
  type ProjectStatus,
} from '../../types/app'

const tabs = ['info', 'details', 'timeline', 'location'] as const
type ProjectFormTab = (typeof tabs)[number]

export type ProjectPayload = {
  operatorIds: string[]
  orgUnitId: string | null
  groupId: string | null
  systemName: string
  code: string
  isActive: boolean
  status: ProjectStatus
  progressPercent: number | null
  startDate: string | null
  endDate: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
  companyName: string | null
  systemUrl: string | null
  launchYear: number | null
  isSupportActive: boolean
  replacementProjectId: string | null
  description: string | null
  color: string
  showOnLiveBoard: boolean
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
  const { user } = useAuth()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [tab, setTab] = useState<ProjectFormTab>('info')
  const [operatorIds, setOperatorIds] = useState(initial?.operatorIds ?? [])
  const [orgUnitId, setOrgUnitId] = useState(
    initial ? (initial.orgUnitId ?? '') : (user?.orgUnitId ?? ''),
  )
  const [groupId, setGroupId] = useState(initial?.groupId ?? '')
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
  const [address, setAddress] = useState(initial?.address ?? '')
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
  const [color, setColor] = useState(projectColor(initial?.color ?? DEFAULT_PROJECT_COLOR))
  const [showOnLiveBoard, setShowOnLiveBoard] = useState(initial?.showOnLiveBoard ?? true)
  const [importance, setImportance] = useState<ProjectImportance>(
    initial?.importance ?? projectImportances.HIGH,
  )
  const [saving, setSaving] = useState(false)

  const orgUnits = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })

  const groups = useQuery({
    queryKey: ['project-groups', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<ProjectGroup[]>('/projects/groups')
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

  function goTab(next: ProjectFormTab) {
    if (tab !== next) setTab(next)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!operatorIds.length) {
      goTab('info')
      toast.error(t('projects.operatorRequired'))
      return
    }
    if (systemName.trim().length < 2) {
      goTab('info')
      toast.error(t('projects.systemNameRequired'))
      return
    }
    if (!code.trim()) {
      goTab('info')
      toast.error(t('projects.codeRequired'))
      return
    }
    if (startDate && endDate && endDate < startDate) {
      goTab('timeline')
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
        operatorIds,
        orgUnitId: orgUnitId || null,
        groupId: groupId || null,
        systemName: systemName.trim(),
        code: code.trim(),
        isActive,
        status: nextStatus,
        progressPercent,
        startDate: emptyToNull(startDate),
        endDate: emptyToNull(endDate),
        latitude: toOptionalNumber(latitude),
        longitude: toOptionalNumber(longitude),
        address: emptyToNull(address),
        companyName: emptyToNull(companyName),
        systemUrl: emptyToNull(systemUrl),
        launchYear: toOptionalYear(launchYear),
        isSupportActive,
        replacementProjectId: replacementProjectId || null,
        description: emptyToNull(description),
        color,
        showOnLiveBoard,
        importance,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={FolderKanban}
      title={initial ? initial.systemName || t('projects.edit') : t('projects.create')}
      subtitle={initial ? undefined : t('projects.createSubtitle')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <nav className="flex flex-wrap gap-2 rounded-2xl border border-line bg-cream-50/80 p-3">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                tab === item
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-white text-ink-700 hover:bg-cream-100'
              }`}
            >
              {t(`projects.tabs.${item}`)}
            </button>
          ))}
        </nav>

        <AppForm noValidate onSubmit={submit} className="space-y-4">
          <div className={`space-y-4 ${tab === 'info' ? '' : 'hidden'}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={Landmark} label={t('projects.orgUnit')} htmlFor="projectOrgUnit">
                <p className="mb-2 text-xs leading-6 text-ink-500">{t('projects.orgUnitHint')}</p>
                <SearchSelect
                  id="projectOrgUnit"
                  value={orgUnitId}
                  onChange={setOrgUnitId}
                  placeholder={t('projects.unspecified')}
                  options={[
                    { value: '', label: t('projects.unspecified') },
                    ...[
                      ...(user?.orgUnitId &&
                      !(orgUnits.data ?? []).some((item) => item.id === user.orgUnitId)
                        ? [
                            {
                              id: user.orgUnitId,
                              pathLabel: user.orgUnit?.name || user.orgUnitId,
                              name: user.orgUnit?.name || user.orgUnitId,
                            },
                          ]
                        : []),
                      ...(orgUnits.data ?? []),
                    ].map((item) => ({
                      value: item.id,
                      label: item.pathLabel || item.name,
                    })),
                  ]}
                />
              </FormField>
              <FormField icon={Layers} label={t('projects.group')} htmlFor="projectGroup">
                <SearchSelect
                  id="projectGroup"
                  value={groupId}
                  onChange={setGroupId}
                  placeholder={t('projects.unspecified')}
                  options={[
                    { value: '', label: t('projects.unspecified') },
                    ...(groups.data ?? []).map((item) => ({
                      value: item.id,
                      label: item.name,
                    })),
                  ]}
                />
              </FormField>
            </div>
            <FormField icon={Landmark} label={t('projects.operators')} htmlFor="projectOperators-search">
              <p className="mb-2 text-xs leading-6 text-ink-500">{t('projects.operatorHint')}</p>
              <OrgUnitTreeSelect
                id="projectOperators"
                value={operatorIds}
                onChange={setOperatorIds}
                units={orgUnits.data ?? []}
                loading={orgUnits.isLoading}
                required
              />
            </FormField>
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
              <FormField icon={Handshake} label={t('projects.companyName')} htmlFor="companyName">
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
              <div className="sm:col-span-2">
                <FormField icon={Palette} label={t('projects.color')} htmlFor="projectColor">
                  <p className="mb-2 text-xs leading-6 text-ink-500">{t('projects.colorHint')}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {PROJECT_COLOR_SWATCHES.map((swatch) => {
                      const selected = color === swatch
                      return (
                        <button
                          key={swatch}
                          type="button"
                          aria-pressed={selected}
                          aria-label={swatch}
                          className={`size-8 cursor-pointer rounded-full border-2 transition ${
                            selected
                              ? 'border-ink-800 shadow-[0_0_0_3px_rgba(46,189,182,0.28)]'
                              : 'border-white shadow-[0_2px_8px_rgba(20,40,40,0.12)] hover:scale-105'
                          }`}
                          style={{ background: swatch }}
                          onClick={() => setColor(swatch)}
                        />
                      )
                    })}
                    <label
                      className="relative inline-flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-teal-400 bg-white text-[10px] font-bold text-teal-700 shadow-[0_2px_8px_rgba(46,189,182,0.16)]"
                      title={t('projects.pickColor')}
                    >
                      <span aria-hidden>+</span>
                      <input
                        id="projectColor"
                        type="color"
                        value={color}
                        aria-label={t('projects.pickColor')}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(e) => setColor(projectColor(e.target.value))}
                      />
                    </label>
                  </div>
                </FormField>
              </div>
            </div>
          </div>

          <div className={`space-y-4 ${tab === 'details' ? '' : 'hidden'}`}>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <FormField icon={Radio} label={t('projects.showOnLiveBoard')} htmlFor="showOnLiveBoard">
                <ToggleField
                  id="showOnLiveBoard"
                  checked={showOnLiveBoard}
                  onChange={setShowOnLiveBoard}
                  onLabel={t('projects.showOnLiveBoardOn')}
                  offLabel={t('projects.showOnLiveBoardOff')}
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
          </div>

          <div className={`space-y-4 ${tab === 'timeline' ? '' : 'hidden'}`}>
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
          </div>

          <div className={`space-y-4 ${tab === 'location' ? '' : 'hidden'}`}>
            <FormField icon={MapPin} label={t('projects.address')} htmlFor="projectAddress">
              <textarea
                id="projectAddress"
                className={fieldClassName}
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </FormField>
            <div className="space-y-2">
              <p className="text-xs leading-6 text-ink-500">{t('projects.mapHint')}</p>
              <OsmMapPicker
                variant="always"
                active={tab === 'location'}
                latitude={latitude}
                longitude={longitude}
                focus={focus}
                look="tablet"
                pinZoom={13}
                heightClass="h-[22rem] sm:h-[28rem] lg:h-[34rem]"
                onChange={(nextLat, nextLng) => {
                  setLatitude(nextLat)
                  setLongitude(nextLng)
                }}
              />
            </div>
          </div>

          <FormActions
            submitLabel={t('projects.save')}
            cancelLabel={t('projects.cancel')}
            submitting={saving}
            onCancel={() => history.back()}
          />
        </AppForm>
      </div>
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
