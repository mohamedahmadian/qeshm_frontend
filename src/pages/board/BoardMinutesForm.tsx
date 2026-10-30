import {
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  FileText,
  Hash,
  MessageSquare,
  Paperclip,
  PenLine,
  Plus,
  ScrollText,
  Search,
  Stamp,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { ActionsTh, actionsColClassName } from '../../components/ui/ListControls'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { localizeDigits, todayIsoDate } from '../../lib/datetime'
import {
  boardMinutesAttendances,
  boardMinutesMemberKinds,
  boardMinutesStatuses,
  type BoardMinutes,
  type BoardMinutesAttendance,
  type BoardMinutesMemberKind,
  type BoardMinutesStatus,
  type BoardSignatory,
  type ManagedUser,
  type Paginated,
} from '../../types/app'
import { boardMinuteSmsPath, boardMinutesMemberName, boardSignatoryFullName } from './board-paths'
import {
  BoardMinutesAttachmentsField,
  emptyPendingMinutesFiles,
  pendingFilesFromAttachments,
} from './BoardMinutesAttachmentsField'
import { BoardMinutesResolutionListPage } from './BoardMinutesResolutionPages'
import { MinutesDictation } from './MinutesDictation'

const minutesEditTabs = ['info', 'resolutions'] as const
type MinutesEditTab = (typeof minutesEditTabs)[number]

const minutesTabIcons = {
  info: ScrollText,
  resolutions: FileText,
} as const

export type BoardMinutesPayload = {
  heldAt: string
  subject: string
  body: string | null
  status: BoardMinutesStatus
  requestIds: string[]
  members: {
    kind: BoardMinutesMemberKind
    userId: string | null
    signatoryId: string | null
    firstName: string
    lastName: string
    title: string | null
    attendance: BoardMinutesAttendance
  }[]
  imageIds: string[]
  audioIds: string[]
}

type ApprovedRequest = { id: string; subject: string; requestedAt: string; trackingNo?: string }
type MinutesMember = {
  key: string
  kind: BoardMinutesMemberKind
  userId: string | null
  signatoryId: string | null
  firstName: string
  lastName: string
  title: string
  attendance: BoardMinutesAttendance
}

function memberKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `member-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function draftFromSaved(row: BoardMinutes['members'][number]): MinutesMember {
  return {
    key: row.id,
    kind: row.kind ?? (row.signatoryId ? boardMinutesMemberKinds.SIGNATORY : boardMinutesMemberKinds.USER),
    userId: row.userId,
    signatoryId: row.signatoryId,
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    title: row.title || '',
    attendance: row.attendance,
  }
}

function draftFromSignatory(row: BoardSignatory): MinutesMember {
  return {
    key: row.id,
    kind: boardMinutesMemberKinds.SIGNATORY,
    userId: row.userId,
    signatoryId: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    title: row.title,
    attendance: boardMinutesAttendances.PRESENT,
  }
}

function draftFromUser(user: ManagedUser): MinutesMember {
  return {
    key: user.id,
    kind: boardMinutesMemberKinds.USER,
    userId: user.id,
    signatoryId: null,
    firstName: user.firstName,
    lastName: user.lastName,
    title: user.position?.name ?? '',
    attendance: boardMinutesAttendances.PRESENT,
  }
}

export function BoardMinutesForm({
  initial,
  lockedRequestId,
  onSubmit,
  onCancel,
}: {
  initial?: BoardMinutes
  lockedRequestId?: string
  onSubmit: (payload: BoardMinutesPayload) => Promise<void>
  onCancel: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [heldAt, setHeldAt] = useState(initial?.heldAt ?? todayIsoDate())
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [status, setStatus] = useState<BoardMinutesStatus>(
    initial?.status ?? boardMinutesStatuses.NOT_HELD,
  )
  const [requestIds, setRequestIds] = useState<string[]>(
    () =>
      initial?.requests?.map((row) => row.id) ??
      (initial?.requestId ? [initial.requestId] : lockedRequestId ? [lockedRequestId] : []),
  )
  const membersSeeded = useRef(false)
  const [members, setMembers] = useState<MinutesMember[]>(
    () => initial?.members.map(draftFromSaved) ?? [],
  )
  const [files, setFiles] = useState(() =>
    initial ? pendingFilesFromAttachments(initial.attachments) : emptyPendingMinutesFiles(),
  )
  const [attachmentsOpen, setAttachmentsOpen] = useState(false)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<MinutesEditTab>('info')
  const manage = Boolean(initial)

  const requests = useQuery({
    queryKey: ['board-minutes-approved-requests'],
    queryFn: async () => {
      const { data } = await api.get<ApprovedRequest[]>('/board/minutes/approved-requests')
      return data
    },
  })
  const signatories = useQuery({
    queryKey: ['board-signatories', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<BoardSignatory[]>('/board/signatories')
      return data
    },
  })

  const requestChoices = useMemo(() => {
    const items = [...(requests.data ?? [])]
    const extra = (initial?.requests ?? []).filter((row) => !items.some((item) => item.id === row.id))
    for (const row of extra) {
      items.push({
        id: row.id,
        subject: row.subject,
        requestedAt: '',
        trackingNo: row.trackingNo,
      })
    }
    if (lockedRequestId && !items.some((item) => item.id === lockedRequestId)) {
      items.unshift({ id: lockedRequestId, subject: '', requestedAt: '' })
    }
    return items
  }, [initial?.requests, lockedRequestId, requests.data])

  useEffect(() => {
    if (initial) {
      membersSeeded.current = true
      return
    }
    if (membersSeeded.current || !signatories.data) return
    membersSeeded.current = true
    const extras = signatories.data.map(draftFromSignatory)
    if (!extras.length) return
    setMembers((current) => {
      const seenUsers = new Set(current.map((row) => row.userId).filter(Boolean))
      const seenSignatories = new Set(current.map((row) => row.signatoryId).filter(Boolean))
      const next = extras.filter((row) => {
        if (row.signatoryId && seenSignatories.has(row.signatoryId)) return false
        if (row.userId && seenUsers.has(row.userId)) return false
        return true
      })
      return next.length ? [...current, ...next] : current
    })
  }, [initial, signatories.data])

  function memberAlreadyAdded(next: Pick<MinutesMember, 'userId' | 'signatoryId'>) {
    return members.some(
      (row) =>
        (next.signatoryId && row.signatoryId === next.signatoryId) ||
        (next.userId && row.userId === next.userId),
    )
  }

  function addMember(user: ManagedUser) {
    if (memberAlreadyAdded({ userId: user.id, signatoryId: null })) return
    setMembers((current) => [...current, draftFromUser(user)])
    setMembersModalOpen(false)
  }

  function addSignatory(row: BoardSignatory) {
    const draft = draftFromSignatory(row)
    if (memberAlreadyAdded(draft)) return
    setMembers((current) => [...current, draft])
    setMembersModalOpen(false)
  }

  function addGuest(guest: { firstName: string; lastName: string; title: string }) {
    setMembers((current) => [
      ...current,
      {
        key: memberKey(),
        kind: boardMinutesMemberKinds.GUEST,
        userId: null,
        signatoryId: null,
        firstName: guest.firstName,
        lastName: guest.lastName,
        title: guest.title,
        attendance: boardMinutesAttendances.PRESENT,
      },
    ])
    setMembersModalOpen(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!heldAt) {
      toast.error(t('boardMinutes.dateRequired'))
      return
    }
    if (subject.trim().length < 2) {
      toast.error(t('boardMinutes.subjectRequired'))
      document.getElementById('minutesSubject')?.focus()
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        heldAt,
        subject: subject.trim(),
        body: body.trim() || null,
        status,
        requestIds,
        members: members.map((row) => ({
          kind: row.kind,
          userId: row.userId,
          signatoryId: row.signatoryId,
          firstName: row.firstName,
          lastName: row.lastName,
          title: row.title.trim() || null,
          attendance: row.attendance,
        })),
        imageIds: files.imageIds,
        audioIds: files.audioIds,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={ScrollText}
      title={initial ? initial.subject : t('boardMinutes.create')}
      subtitle={initial ? undefined : t('boardMinutes.createSubtitle')}
    >
      {manage ? (
        <nav
          className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5"
          role="tablist"
        >
          {minutesEditTabs.map((item) => {
            const Icon = minutesTabIcons[item]
            const active = tab === item
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
                  active
                    ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                    : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
                {t(`boardMinutes.tabs.${item}`)}
              </button>
            )
          })}
        </nav>
      ) : null}
      {manage && tab === 'resolutions' ? (
        <div className="p-5 sm:p-6">
          <BoardMinutesResolutionListPage embedded />
        </div>
      ) : null}
      <AppForm
        noValidate
        onSubmit={submit}
        className={`${formCardBodyClassName}${manage && tab !== 'info' ? ' hidden' : ''}`}
      >
        <div className={`grid gap-4 ${initial?.minutesNo ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {initial?.minutesNo ? (
            <FormField icon={Hash} label={t('boardMinutes.number')}>
              <p className="rounded-2xl border border-line bg-cream-50 px-3 py-2.5 text-sm text-ink-800">
                {localizeDigits(initial.minutesNo, locale)}
              </p>
            </FormField>
          ) : null}
          <FormField icon={CalendarDays} label={t('boardMinutes.heldAt')}>
            <PersianDateField value={heldAt} onChange={(value) => setHeldAt(value ?? '')} />
          </FormField>
          <FormField icon={Stamp} label={t('boardMinutes.status')}>
            <SearchSelect
              value={status}
              onChange={(next) => setStatus((next || boardMinutesStatuses.NOT_HELD) as BoardMinutesStatus)}
              options={Object.values(boardMinutesStatuses).map((value) => ({
                value,
                label: t(`boardMinutes.statuses.${value}`),
              }))}
              placeholder={t('boardMinutes.status')}
            />
          </FormField>
        </div>
        <FormField icon={FileText} label={t('boardMinutes.subject')} htmlFor="minutesSubject">
          <input
            id="minutesSubject"
            required
            className={fieldClassName}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </FormField>
        <FormField icon={Building2} label={t('boardMinutes.requests')}>
          <div className="space-y-3">
            {requestChoices.length ? (
              <>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRequestIds(requestChoices.map((item) => item.id))}
                  >
                    {t('boardMinutes.selectAllRequests')}
                  </Button>
                  {requestIds.length ? (
                    <Button type="button" variant="ghost" onClick={() => setRequestIds([])}>
                      {t('boardMinutes.clearRequests')}
                    </Button>
                  ) : null}
                </div>
                <div className="grid max-h-72 gap-2 overflow-y-auto pe-1">
                  {requestChoices.map((item) => (
                    <CheckboxField
                      key={item.id}
                      id={`minutes-request-${item.id}`}
                      checked={requestIds.includes(item.id)}
                      label={
                        item.trackingNo
                          ? `${localizeDigits(item.trackingNo, locale)} — ${item.subject}`
                          : item.subject || t('boardMinutes.request')
                      }
                      onChange={(checked) =>
                        setRequestIds((current) =>
                          checked
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id),
                        )
                      }
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-500">
                {requests.isLoading ? t('common.loading') : t('boardMinutes.noApprovedRequests')}
              </p>
            )}
          </div>
        </FormField>
        <FormField icon={ScrollText} label={t('boardMinutes.body')} htmlFor="minutesBody">
          <div className="space-y-2">
            <div className="flex justify-end">
              <MinutesDictation value={body} disabled={saving} onChange={setBody} />
            </div>
            <textarea
              id="minutesBody"
              className={`${fieldClassName} min-h-36`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t('boardMinutes.bodyPlaceholder')}
            />
          </div>
        </FormField>
        <div className="space-y-8 pt-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FormSectionTitle icon={Users} className="mb-0">
                {t('boardMinutes.members')}
              </FormSectionTitle>
              <div className="flex flex-wrap gap-2">
                {initial ? (
                  <Link to={boardMinuteSmsPath(initial.id, lockedRequestId)}>
                    <Button type="button" variant="soft">
                      <MessageSquare className="size-4" aria-hidden />
                      {t('boardMinutes.sms')}
                    </Button>
                  </Link>
                ) : null}
                <Button type="button" variant="soft" onClick={() => setMembersModalOpen(true)}>
                  <Plus className="size-4" aria-hidden />
                  {t('boardMinutes.manageMembers')}
                </Button>
              </div>
            </div>
            {members.length ? (
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-cream-50">
                      <th className="px-4 py-3 text-start font-medium text-ink-700">{t('users.fullName')}</th>
                      <th className="px-4 py-3 text-start font-medium text-ink-700">{t('boardMinutes.present')}</th>
                      <ActionsTh />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((row) => (
                      <tr key={row.key} className="border-b border-line last:border-b-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink-800">{boardMinutesMemberName(row)}</p>
                          <p className="text-xs text-ink-400">
                            {[row.title, t(`boardMinutes.memberKinds.${row.kind}`)]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <ToggleField
                            checked={row.attendance === boardMinutesAttendances.PRESENT}
                            onChange={(checked) =>
                              setMembers((current) =>
                                current.map((item) =>
                                  item.key === row.key
                                    ? {
                                        ...item,
                                        attendance: checked
                                          ? boardMinutesAttendances.PRESENT
                                          : boardMinutesAttendances.ABSENT,
                                      }
                                    : item,
                                ),
                              )
                            }
                            onLabel={t('boardMinutes.present')}
                            offLabel={t('boardMinutes.absent')}
                          />
                        </td>
                        <td className={actionsColClassName}>
                          <Button
                            type="button"
                            variant="danger"
                            icon
                            aria-label={t('boardMinutes.removeMember')}
                            title={t('boardMinutes.removeMember')}
                            onClick={() => setMembers((current) => current.filter((item) => item.key !== row.key))}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-ink-500">{t('boardMinutes.noMembers')}</p>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FormSectionTitle icon={Paperclip} className="mb-0">
                {t('boardMinutes.attachments')}
              </FormSectionTitle>
              <Button
                type="button"
                variant="soft"
                aria-expanded={attachmentsOpen}
                onClick={() => setAttachmentsOpen((open) => !open)}
              >
                <Paperclip className="size-4" aria-hidden />
                {t('boardMinutes.manageAttachments')}
              </Button>
            </div>
            {attachmentsOpen ? (
              <BoardMinutesAttachmentsField value={files} onChange={setFiles} disabled={saving} />
            ) : null}
          </div>
          <FormActions
            submitLabel={initial ? t('boardMinutes.save') : t('boardMinutes.create')}
            cancelLabel={t('common.cancel')}
            onCancel={manage && tab !== 'info' ? undefined : onCancel}
            submitting={saving}
            headerIcons={!manage || tab === 'info'}
          />
        </div>
      </AppForm>
      <MinutesMembersPickerModal
        open={membersModalOpen}
        selectedUserIds={members.map((row) => row.userId).filter((id): id is string => Boolean(id))}
        selectedSignatoryIds={members
          .map((row) => row.signatoryId)
          .filter((id): id is string => Boolean(id))}
        signatories={signatories.data ?? []}
        onClose={() => setMembersModalOpen(false)}
        onPickUser={addMember}
        onPickSignatory={addSignatory}
        onAddGuest={addGuest}
      />
    </FormCard>
  )
}

const MEMBER_SEARCH_MIN_CHARS = 3
const pickerTabs = ['employee', 'signatory', 'guest'] as const
type PickerTab = (typeof pickerTabs)[number]

function MinutesMembersPickerModal({
  open,
  selectedUserIds,
  selectedSignatoryIds,
  signatories,
  onClose,
  onPickUser,
  onPickSignatory,
  onAddGuest,
}: {
  open: boolean
  selectedUserIds: string[]
  selectedSignatoryIds: string[]
  signatories: BoardSignatory[]
  onClose: () => void
  onPickUser: (user: ManagedUser) => void
  onPickSignatory: (row: BoardSignatory) => void
  onAddGuest: (guest: { firstName: string; lastName: string; title: string }) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [tab, setTab] = useState<PickerTab>('employee')
  const [term, setTerm] = useState('')
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [guestTitle, setGuestTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const needle = term.trim()
  const canSearch = needle.length >= MEMBER_SEARCH_MIN_CHARS

  const query = useQuery({
    queryKey: ['users', 'employees', 'minutes-member-search', needle],
    enabled: open && tab === 'employee' && canSearch,
    queryFn: async () => {
      const { data } = await api.get<Paginated<ManagedUser>>('/users', {
        params: {
          q: needle,
          employeesOnly: true,
          page: 1,
          pageSize: 20,
          sortBy: 'fullName',
          sortDir: 'asc',
        },
      })
      return data
    },
  })

  const items = useMemo(
    () =>
      canSearch
        ? (query.data?.items ?? []).filter((user) => !selectedUserIds.includes(user.id))
        : [],
    [canSearch, query.data?.items, selectedUserIds],
  )
  const leftoverSignatories = useMemo(
    () =>
      signatories.filter(
        (row) =>
          !selectedSignatoryIds.includes(row.id) &&
          !(row.userId && selectedUserIds.includes(row.userId)),
      ),
    [selectedSignatoryIds, selectedUserIds, signatories],
  )

  useEffect(() => {
    if (!open) return
    setTerm('')
    setGuestFirstName('')
    setGuestLastName('')
    setGuestTitle('')
    setTab('employee')
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, open])

  function submitGuest(event: FormEvent) {
    event.preventDefault()
    const firstName = guestFirstName.trim()
    const lastName = guestLastName.trim()
    if (!firstName || !lastName) {
      toast.error(t('boardMinutes.guestNameRequired'))
      return
    }
    onAddGuest({ firstName, lastName, title: guestTitle.trim() })
  }

  if (!open) return null

  const tabIcons = {
    employee: Users,
    signatory: PenLine,
    guest: UserPlus,
  } as const

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-ink-900/30 p-4 pt-[12vh]"
      data-nested-dialog
      data-enter-ignore
      role="presentation"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="minutes-members-modal-title"
        className="relative z-10 flex max-h-[min(88vh,40rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="pointer-events-none absolute -start-8 -top-10 size-32 rounded-full bg-teal-200/30" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <Users className="size-5" aria-hidden />
              </span>
              <h2 id="minutes-members-modal-title" className="text-sm font-semibold text-ink-900">
                {t('boardMinutes.addMember')}
              </h2>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" />
            </button>
          </div>
        </header>
        <nav className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3" role="tablist">
          {pickerTabs.map((item) => {
            const Icon = tabIcons[item]
            const active = tab === item
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
                  active
                    ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                    : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
                {t(`boardMinutes.pickerTabs.${item}`)}
              </button>
            )
          })}
        </nav>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          {tab === 'employee' ? (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-teal-600" aria-hidden />
                <input
                  id="minutes-member-search"
                  ref={inputRef}
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  className={`${fieldClassName} ps-10`}
                  placeholder={t('boardMinutes.searchMembersPlaceholder')}
                  aria-label={t('boardMinutes.searchMembers')}
                  autoComplete="off"
                />
              </div>
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-cream-50"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                      <UserRound className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">{item.fullName}</span>
                      <span className="block truncate text-xs text-ink-400">
                        {[
                          item.position?.name,
                          item.orgUnit?.name,
                          item.nationalId ? localizeDigits(item.nationalId, locale) : null,
                          item.phone ? localizeDigits(item.phone, locale) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <Button type="button" variant="soft" onClick={() => onPickUser(item)}>
                      <Check className="size-4" aria-hidden />
                      {t('boardMinutes.pickMember')}
                    </Button>
                  </li>
                ))}
                {!items.length ? (
                  <li className="px-3 py-6 text-center text-sm text-ink-400">
                    {!canSearch
                      ? t('boardMinutes.searchMembersHint')
                      : query.isFetching
                        ? t('common.loading')
                        : t('users.noResults')}
                  </li>
                ) : null}
              </ul>
            </>
          ) : null}
          {tab === 'signatory' ? (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {leftoverSignatories.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-cream-50"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                    <PenLine className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900">
                      {boardSignatoryFullName(item)}
                    </span>
                    <span className="block truncate text-xs text-ink-400">{item.title}</span>
                  </span>
                  <Button type="button" variant="soft" onClick={() => onPickSignatory(item)}>
                    <Check className="size-4" aria-hidden />
                    {t('boardMinutes.pickMember')}
                  </Button>
                </li>
              ))}
              {!leftoverSignatories.length ? (
                <li className="px-3 py-6 text-center text-sm text-ink-400">
                  {t('boardMinutes.allSignatoriesAdded')}
                </li>
              ) : null}
            </ul>
          ) : null}
          {tab === 'guest' ? (
            <AppForm onSubmit={submitGuest} autoFocusFirst className="space-y-4">
              <FormField icon={UserRound} label={t('boardMinutes.guestFirstName')} htmlFor="minutes-guest-first">
                <input
                  id="minutes-guest-first"
                  required
                  className={fieldClassName}
                  value={guestFirstName}
                  onChange={(event) => setGuestFirstName(event.target.value)}
                />
              </FormField>
              <FormField icon={UserRound} label={t('boardMinutes.guestLastName')} htmlFor="minutes-guest-last">
                <input
                  id="minutes-guest-last"
                  required
                  className={fieldClassName}
                  value={guestLastName}
                  onChange={(event) => setGuestLastName(event.target.value)}
                />
              </FormField>
              <FormField icon={Briefcase} label={t('boardMinutes.guestTitle')} htmlFor="minutes-guest-title">
                <input
                  id="minutes-guest-title"
                  className={fieldClassName}
                  value={guestTitle}
                  onChange={(event) => setGuestTitle(event.target.value)}
                  placeholder={t('boardMinutes.guestTitlePlaceholder')}
                />
              </FormField>
              <FormActions
                submitLabel={t('boardMinutes.addGuest')}
                cancelLabel={t('common.cancel')}
                onCancel={onClose}
                headerIcons={false}
              />
            </AppForm>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  )
}
