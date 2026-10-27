import {
  Building2,
  CalendarRange,
  ClipboardList,
  FileText,
  History,
  MessageSquare,
  PenLine,
  Scale,
  ScrollText,
  Stamp,
  Trash2,
  UserRound,
} from 'lucide-react'
import { type FormEvent, type LucideIcon, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AppForm,
  Button,
  FormActions,
  FormField,
  ToggleField,
  fieldClassName,
} from '../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { OrgUnitTreeSelect } from '../../components/ui/OrgUnitTreeSelect'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { todayIsoDate } from '../../lib/datetime'
import {
  boardResolutionStatuses,
  type BoardMinutesResolution,
  type BoardResolutionDueKind,
  type BoardResolutionProposerKind,
  type BoardResolutionStatus,
  type BoardSignatory,
  type OrganizationUnit,
} from '../../types/app'
import { MinutesDictation } from './MinutesDictation'
import { BoardResolutionProgressTab } from './BoardResolutionProgressTab'
import { BoardSignatorySignedBadge } from './BoardStatusBadge'
import { boardSignatoryFullName } from './board-paths'

export type BoardResolutionSignatoryPayload = {
  sourceSignatoryId: string | null
  firstName: string
  lastName: string
  title: string
  signatureImageId: string
  signedAt: string | null
}

export type BoardResolutionPayload = {
  title: string
  description: string | null
  status: BoardResolutionStatus
  unitIds: string[]
  dueKind: BoardResolutionDueKind
  dueDate: string | null
  hasTopicHistory: boolean
  legalBasis: string | null
  proposerKind: BoardResolutionProposerKind
  proposerText: string | null
  proposerUnitId: string | null
  notes: string | null
  signatories: BoardResolutionSignatoryPayload[]
}

type SignatoryDraft = BoardResolutionSignatoryPayload & { key: string }

const resolutionMainTabs = ['info', 'progress'] as const
type ResolutionMainTab = (typeof resolutionMainTabs)[number]

const resolutionPeopleTabs = ['signatories', 'executors'] as const
type ResolutionPeopleTab = (typeof resolutionPeopleTabs)[number]

const mainTabIcons: Record<ResolutionMainTab, LucideIcon> = {
  info: FileText,
  progress: ClipboardList,
}

const peopleTabIcons: Record<ResolutionPeopleTab, LucideIcon> = {
  signatories: PenLine,
  executors: Building2,
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function draftFromCatalog(source: BoardSignatory): SignatoryDraft {
  return {
    key: source.id,
    sourceSignatoryId: source.id,
    firstName: source.firstName,
    lastName: source.lastName,
    title: source.title,
    signatureImageId: source.signatureImageId,
    signedAt: null,
  }
}

function draftsFromInitial(initial?: BoardMinutesResolution): SignatoryDraft[] {
  return (initial?.signatories ?? []).map((row) => ({
    key: row.sourceSignatoryId || row.id,
    sourceSignatoryId: row.sourceSignatoryId,
    firstName: row.firstName,
    lastName: row.lastName,
    title: row.title,
    signatureImageId: row.signatureImageId,
    signedAt: row.signedAt,
  }))
}

function PeopleTabButton({
  active,
  icon: Icon,
  children,
  onClick,
}: {
  active: boolean
  icon?: LucideIcon
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
        active
          ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
          : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
      }`}
    >
      {Icon ? <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden /> : null}
      {children}
    </button>
  )
}

function toSignatoryPayloads(rows: SignatoryDraft[]): BoardResolutionSignatoryPayload[] {
  return rows.map((row) => ({
    sourceSignatoryId: row.sourceSignatoryId,
    firstName: row.firstName.trim(),
    lastName: row.lastName.trim(),
    title: row.title.trim(),
    signatureImageId: row.signatureImageId,
    signedAt: row.signedAt || null,
  }))
}

export function BoardMinutesResolutionForm({
  initial,
  minutesTitle,
  onSubmit,
  onSaveSignatories,
  onCancel,
  headerAction,
  headerIcons,
  autoFocusFirst,
  smsTo,
}: {
  initial?: BoardMinutesResolution
  minutesTitle: string
  onSubmit: (payload: BoardResolutionPayload) => Promise<void>
  onSaveSignatories?: (signatories: BoardResolutionSignatoryPayload[]) => Promise<void>
  onCancel: () => void
  headerAction?: ReactNode
  headerIcons?: boolean
  autoFocusFirst?: boolean
  smsTo?: string
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<BoardResolutionStatus>(
    initial?.status ?? boardResolutionStatuses.NOT_NOTIFIED,
  )
  const [unitIds, setUnitIds] = useState<string[]>(
    () => initial?.units?.map((row) => row.id) ?? (initial?.unitId ? [initial.unitId] : []),
  )
  const [dueKind, setDueKind] = useState<BoardResolutionDueKind>(initial?.dueKind ?? 'DATE')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [hasTopicHistory, setHasTopicHistory] = useState(initial?.hasTopicHistory ?? false)
  const [legalBasis, setLegalBasis] = useState(initial?.legalBasis ?? '')
  const [proposerKind, setProposerKind] = useState<BoardResolutionProposerKind>(
    initial?.proposerKind ?? 'UNIT',
  )
  const [proposerText, setProposerText] = useState(initial?.proposerText ?? '')
  const [proposerUnitId, setProposerUnitId] = useState(initial?.proposerUnitId ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [signatories, setSignatories] = useState<SignatoryDraft[]>(() => draftsFromInitial(initial))
  const [mainTab, setMainTab] = useState<ResolutionMainTab>('info')
  const [peopleTab, setPeopleTab] = useState<ResolutionPeopleTab>('signatories')
  const [activeSignatoryKey, setActiveSignatoryKey] = useState(
    () => draftsFromInitial(initial)[0]?.key ?? '',
  )
  const [addSignatoryId, setAddSignatoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const seededDefaults = useRef(Boolean(initial))
  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const catalog = useQuery({
    queryKey: ['board-signatories', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<BoardSignatory[]>('/board/signatories')
      return data
    },
  })
  const addedIds = useMemo(
    () => new Set(signatories.map((row) => row.sourceSignatoryId).filter(Boolean)),
    [signatories],
  )
  const availableSignatories = (catalog.data ?? []).filter((item) => !addedIds.has(item.id))

  useEffect(() => {
    if (seededDefaults.current || !catalog.data) return
    seededDefaults.current = true
    setSignatories(catalog.data.map(draftFromCatalog))
  }, [catalog.data])

  useEffect(() => {
    if (signatories.some((row) => row.key === activeSignatoryKey)) return
    setActiveSignatoryKey(signatories[0]?.key ?? '')
  }, [signatories, activeSignatoryKey])

  function addSignatory(id: string) {
    setAddSignatoryId('')
    const source = (catalog.data ?? []).find((item) => item.id === id)
    if (!source || addedIds.has(source.id)) return
    const draft = draftFromCatalog(source)
    setSignatories((current) => [...current, draft])
    setActiveSignatoryKey(draft.key)
    setPeopleTab('signatories')
  }

  function signatoryTabLabel(row: SignatoryDraft, index: number) {
    return boardSignatoryFullName(row) || row.title.trim() || t('boardResolutions.signatoryTab', { n: index + 1 })
  }

  function patchSignatory(key: string, patch: Partial<SignatoryDraft>) {
    setSignatories((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  async function signSignatory(key: string) {
    if (saving) return
    const previous = signatories
    const next = signatories.map((row) => (row.key === key ? { ...row, signedAt: todayIsoDate() } : row))
    setSignatories(next)
    if (!onSaveSignatories) return
    setSaving(true)
    try {
      await onSaveSignatories(toSignatoryPayloads(next))
    } catch (error) {
      setSignatories(previous)
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (dueKind === 'DATE' && !dueDate) {
      toast.error(t('boardResolutions.dueDate'))
      return
    }
    if (proposerKind === 'TEXT' && !proposerText.trim()) {
      toast.error(t('boardResolutions.proposerText'))
      return
    }
    if (proposerKind === 'UNIT' && !proposerUnitId) {
      toast.error(t('boardResolutions.selectProposerUnit'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        title,
        description: emptyToNull(description),
        status,
        unitIds,
        dueKind,
        dueDate: dueKind === 'DATE' ? dueDate || null : null,
        hasTopicHistory,
        legalBasis: emptyToNull(legalBasis),
        proposerKind,
        proposerText: proposerKind === 'TEXT' ? emptyToNull(proposerText) : null,
        proposerUnitId: proposerKind === 'UNIT' ? proposerUnitId || null : null,
        notes: emptyToNull(notes),
        signatories: toSignatoryPayloads(signatories),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={FileText}
      title={initial ? initial.title : t('boardResolutions.create')}
      subtitle={initial ? minutesTitle : t('boardResolutions.createSubtitle')}
      action={headerAction}
    >
      {initial ? (
        <div className="flex flex-wrap items-center gap-2 px-5 pt-5 sm:px-6">
          <nav className="flex flex-wrap gap-2" role="tablist" aria-label={t('boardResolutions.edit')}>
            {resolutionMainTabs.map((item) => (
              <PeopleTabButton
                key={item}
                active={mainTab === item}
                icon={mainTabIcons[item]}
                onClick={() => setMainTab(item)}
              >
                {t(`boardResolutions.mainTabs.${item}`)}
              </PeopleTabButton>
            ))}
          </nav>
        </div>
      ) : null}
      <AppForm
        onSubmit={submit}
        onInvalidCapture={(event) => {
          const target = event.target
          if (!(target instanceof HTMLElement)) return
          setMainTab('info')
          const match = /^signatory(?:First|Last|Title)-(.+)$/.exec(target.id)
          if (!match) return
          setPeopleTab('signatories')
          setActiveSignatoryKey(match[1])
        }}
        className={`${formCardBodyClassName} ${initial && mainTab !== 'info' ? 'hidden' : ''}`}
        autoFocusFirst={autoFocusFirst}
      >
        <FormField icon={FileText} label={t('boardResolutions.titleField')} htmlFor="resolutionTitle">
          <input
            id="resolutionTitle"
            required
            className={fieldClassName}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('boardResolutions.description')} htmlFor="resolutionDescription">
          <div className="space-y-2">
            <div className="flex justify-end">
              <MinutesDictation value={description} disabled={saving} onChange={setDescription} />
            </div>
            <textarea
              id="resolutionDescription"
              className={`${fieldClassName} min-h-24`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={UserRound} label={t('boardResolutions.proposerKind')}>
            <SearchSelect
              value={proposerKind}
              onChange={(value) => setProposerKind(value === 'UNIT' ? 'UNIT' : 'TEXT')}
              placeholder={t('boardResolutions.selectProposerKind')}
              options={[
                { value: 'UNIT', label: t('boardResolutions.proposerAsUnit') },
                { value: 'TEXT', label: t('boardResolutions.proposerAsText') },
              ]}
            />
          </FormField>
          {proposerKind === 'UNIT' ? (
            <FormField icon={Building2} label={t('boardResolutions.proposerUnit')}>
              <SearchSelect
                value={proposerUnitId}
                onChange={setProposerUnitId}
                placeholder={t('boardResolutions.selectProposerUnit')}
                options={(units.data ?? []).map((unit) => ({ value: unit.id, label: unit.name }))}
              />
            </FormField>
          ) : (
            <FormField icon={UserRound} label={t('boardResolutions.proposerText')} htmlFor="resolutionProposer">
              <input
                id="resolutionProposer"
                required
                className={fieldClassName}
                value={proposerText}
                onChange={(event) => setProposerText(event.target.value)}
              />
            </FormField>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField icon={CalendarRange} label={t('boardResolutions.dueKind')}>
            <SearchSelect
              value={dueKind}
              onChange={(value) => {
                const next = value === 'ASAP' ? 'ASAP' : 'DATE'
                setDueKind(next)
                if (next === 'ASAP') setDueDate('')
              }}
              placeholder={t('boardResolutions.selectDueKind')}
              options={[
                { value: 'DATE', label: t('boardResolutions.dueDated') },
                { value: 'ASAP', label: t('boardResolutions.dueAsap') },
              ]}
            />
          </FormField>
          <FormField icon={CalendarRange} label={t('boardResolutions.dueDate')}>
            <PersianDateField
              value={dueDate}
              onChange={(value) => {
                const next = value ?? ''
                setDueDate(next)
                if (next) setDueKind('DATE')
              }}
            />
          </FormField>
          <FormField icon={History} label={t('boardResolutions.hasTopicHistory')}>
            <ToggleField
              checked={hasTopicHistory}
              onChange={setHasTopicHistory}
              onLabel={t('boardResolutions.topicHistoryYes')}
              offLabel={t('boardResolutions.topicHistoryNo')}
            />
          </FormField>
        </div>
        <FormField icon={Scale} label={t('boardResolutions.legalBasis')} htmlFor="resolutionLegalBasis">
          <textarea
            id="resolutionLegalBasis"
            className={fieldClassName}
            value={legalBasis}
            onChange={(event) => setLegalBasis(event.target.value)}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('boardResolutions.notes')} htmlFor="resolutionNotes">
          <textarea
            id="resolutionNotes"
            className={`${fieldClassName} min-h-24`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </FormField>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2" role="tablist" aria-label={t('boardResolutions.section')}>
            {resolutionPeopleTabs.map((item) => (
              <PeopleTabButton
                key={item}
                active={peopleTab === item}
                icon={peopleTabIcons[item]}
                onClick={() => setPeopleTab(item)}
              >
                {t(`boardResolutions.tabs.${item}`)}
              </PeopleTabButton>
            ))}
          </nav>
          {smsTo ? (
            <Link to={smsTo}>
              <Button type="button" variant="soft">
                <MessageSquare className="size-4" aria-hidden />
                {t('boardResolutions.sms')}
              </Button>
            </Link>
          ) : null}
        </div>
        <div className={`space-y-4 ${peopleTab === 'signatories' ? '' : 'hidden'}`}>
          <FormField icon={PenLine} label={t('boardResolutions.addSignatory')}>
            <SearchSelect
              value={addSignatoryId}
              onChange={addSignatory}
              placeholder={
                availableSignatories.length
                  ? t('boardResolutions.selectSignatory')
                  : t('boardResolutions.allSignatoriesAdded')
              }
              options={availableSignatories.map((item) => ({
                value: item.id,
                label: `${boardSignatoryFullName(item)} — ${item.title}`,
              }))}
            />
          </FormField>
          {signatories.length ? (
            <div className="space-y-3">
              <nav className="flex flex-wrap gap-2" role="tablist" aria-label={t('boardResolutions.signatories')}>
                {signatories.map((row, index) => (
                  <PeopleTabButton
                    key={row.key}
                    active={activeSignatoryKey === row.key}
                    icon={UserRound}
                    onClick={() => setActiveSignatoryKey(row.key)}
                  >
                    {signatoryTabLabel(row, index)}
                    <BoardSignatorySignedBadge signed={Boolean(row.signedAt)} />
                  </PeopleTabButton>
                ))}
              </nav>
              {signatories.map((row) => (
                <div
                  key={row.key}
                  className={`grid gap-3 rounded-2xl border border-teal-100 bg-cream-50/70 p-3 sm:grid-cols-2 ${
                    activeSignatoryKey === row.key ? '' : 'hidden'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                    <BoardSignatorySignedBadge signed={Boolean(row.signedAt)} />
                    {!row.signedAt ? (
                      <Button
                        type="button"
                        variant="soft"
                        disabled={saving}
                        onClick={() => void signSignatory(row.key)}
                      >
                        <PenLine className="size-4" aria-hidden />
                        {t('boardResolutions.signAction')}
                      </Button>
                    ) : null}
                  </div>
                  <FormField icon={UserRound} label={t('boardSignatories.firstName')} htmlFor={`signatoryFirst-${row.key}`}>
                    <input
                      id={`signatoryFirst-${row.key}`}
                      required
                      className={fieldClassName}
                      value={row.firstName}
                      onChange={(event) => patchSignatory(row.key, { firstName: event.target.value })}
                    />
                  </FormField>
                  <FormField icon={UserRound} label={t('boardSignatories.lastName')} htmlFor={`signatoryLast-${row.key}`}>
                    <input
                      id={`signatoryLast-${row.key}`}
                      required
                      className={fieldClassName}
                      value={row.lastName}
                      onChange={(event) => patchSignatory(row.key, { lastName: event.target.value })}
                    />
                  </FormField>
                  <FormField icon={PenLine} label={t('boardResolutions.signatoryTitle')} htmlFor={`signatoryTitle-${row.key}`}>
                    <input
                      id={`signatoryTitle-${row.key}`}
                      required
                      className={fieldClassName}
                      value={row.title}
                      onChange={(event) => patchSignatory(row.key, { title: event.target.value })}
                    />
                  </FormField>
                  <FormField icon={CalendarRange} label={t('boardResolutions.signedAt')}>
                    <PersianDateField
                      value={row.signedAt ?? ''}
                      onChange={(value) => patchSignatory(row.key, { signedAt: value ?? null })}
                    />
                  </FormField>
                  <div className="flex items-end justify-between gap-3 sm:col-span-2">
                    {row.signatureImageId ? (
                      <img
                        src={getImageUrl(row.signatureImageId)}
                        alt={boardSignatoryFullName(row)}
                        className="h-14 max-w-40 rounded-xl border border-line bg-white object-contain p-1"
                      />
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSignatories((current) => current.filter((item) => item.key !== row.key))}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t('boardResolutions.removeSignatory')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('boardResolutions.noSignatories')}</FormEmptyHint>
          )}
        </div>
        <div className={peopleTab === 'executors' ? '' : 'hidden'}>
          <FormField icon={Building2} label={t('boardResolutions.unit')} htmlFor="resolutionExecutors-search">
            <OrgUnitTreeSelect
              id="resolutionExecutors"
              value={unitIds}
              onChange={setUnitIds}
              units={units.data ?? []}
              loading={units.isLoading}
            />
          </FormField>
        </div>
        <FormField icon={Stamp} label={t('boardResolutions.status')}>
          <ToggleField
            checked={status === boardResolutionStatuses.NOTIFIED}
            onChange={(checked) =>
              setStatus(checked ? boardResolutionStatuses.NOTIFIED : boardResolutionStatuses.NOT_NOTIFIED)
            }
            onLabel={t('boardResolutions.statuses.NOTIFIED')}
            offLabel={t('boardResolutions.statuses.NOT_NOTIFIED')}
          />
        </FormField>
        <FormActions
          submitLabel={initial ? t('boardResolutions.save') : t('boardResolutions.create')}
          cancelLabel={t('common.cancel')}
          onCancel={onCancel}
          submitting={saving}
          headerIcons={headerIcons}
          extraItems={
            smsTo
              ? [{ to: smsTo, icon: MessageSquare, label: t('boardResolutions.sms') }]
              : undefined
          }
        />
      </AppForm>
      {initial ? (
        <div className={mainTab === 'progress' ? '' : 'hidden'}>
          <BoardResolutionProgressTab minutesId={initial.minutesId} resolutionId={initial.id} />
        </div>
      ) : null}
    </FormCard>
  )
}
