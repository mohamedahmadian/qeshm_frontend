import {
  Building2,
  CalendarDays,
  Check,
  FileText,
  Paperclip,
  ScrollText,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { localizeDigits, toLatinDigits, todayIsoDate } from '../../lib/datetime'
import {
  boardMinutesAttendances,
  type BoardMinutes,
  type BoardMinutesAttendance,
  type ManagedUser,
} from '../../types/app'
import {
  BoardMinutesAttachmentsField,
  emptyPendingMinutesFiles,
  pendingFilesFromAttachments,
} from './BoardMinutesAttachmentsField'
import { MinutesDictation } from './MinutesDictation'
import { boardMinuteResolutionsPath } from './board-paths'

export type BoardMinutesPayload = {
  heldAt: string
  subject: string
  body: string | null
  requestId: string | null
  members: { userId: string; attendance: BoardMinutesAttendance }[]
  imageIds: string[]
  audioIds: string[]
}

type ApprovedRequest = { id: string; subject: string; requestedAt: string }
type MinutesMember = { userId: string; name: string; attendance: BoardMinutesAttendance }

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
  const { t } = useTranslation()
  const [heldAt, setHeldAt] = useState(initial?.heldAt ?? todayIsoDate())
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [requestId, setRequestId] = useState(lockedRequestId ?? initial?.requestId ?? '')
  const [members, setMembers] = useState<MinutesMember[]>(
    () =>
      initial?.members.map((row) => ({
        userId: row.userId,
        name: row.user.fullName,
        attendance: row.attendance,
      })) ?? [],
  )
  const [files, setFiles] = useState(() =>
    initial ? pendingFilesFromAttachments(initial.attachments) : emptyPendingMinutesFiles(),
  )
  const [attachmentsOpen, setAttachmentsOpen] = useState(false)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const employees = useQuery({
    queryKey: ['users', 'employees', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<ManagedUser[]>('/users', { params: { employeesOnly: true } })
      return data
    },
  })
  const requests = useQuery({
    queryKey: ['board-minutes-approved-requests'],
    enabled: !lockedRequestId,
    queryFn: async () => {
      const { data } = await api.get<ApprovedRequest[]>('/board/minutes/approved-requests')
      return data
    },
  })

  const requestOptions = useMemo(
    () => [
      { value: '', label: t('boardMinutes.withoutRequest') },
      ...(requests.data ?? []).map((item) => ({ value: item.id, label: item.subject })),
    ],
    [requests.data, t],
  )

  function addMember(user: ManagedUser) {
    if (members.some((row) => row.userId === user.id)) return
    setMembers((current) => [
      ...current,
      { userId: user.id, name: user.fullName, attendance: boardMinutesAttendances.PRESENT },
    ])
    setMembersModalOpen(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!heldAt) {
      toast.error(t('boardMinutes.dateRequired'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        heldAt,
        subject,
        body: body.trim() || null,
        requestId: lockedRequestId || requestId || null,
        members: members.map((row) => ({ userId: row.userId, attendance: row.attendance })),
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
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={CalendarDays} label={t('boardMinutes.heldAt')}>
          <PersianDateField value={heldAt} onChange={(value) => setHeldAt(value ?? '')} />
        </FormField>
        <FormField icon={FileText} label={t('boardMinutes.subject')} htmlFor="minutesSubject">
          <input
            id="minutesSubject"
            required
            className={fieldClassName}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </FormField>
        {lockedRequestId ? null : (
          <FormField icon={Building2} label={t('boardMinutes.requestOptional')}>
            <SearchSelect
              value={requestId}
              onChange={setRequestId}
              options={requestOptions}
              placeholder={t('boardMinutes.selectRequest')}
            />
          </FormField>
        )}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormSectionTitle icon={Users} className="mb-0">
            {t('boardMinutes.members')}
          </FormSectionTitle>
          <Button type="button" variant="soft" onClick={() => setMembersModalOpen(true)}>
            <Users className="size-4" aria-hidden />
            {t('boardMinutes.manageMembers')}
          </Button>
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
                  <tr key={row.userId} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3 font-medium text-ink-800">{row.name}</td>
                    <td className="px-4 py-3">
                      <ToggleField
                        checked={row.attendance === boardMinutesAttendances.PRESENT}
                        onChange={(checked) =>
                          setMembers((current) =>
                            current.map((item) =>
                              item.userId === row.userId
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
                        onClick={() => setMembers((current) => current.filter((item) => item.userId !== row.userId))}
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
        <FormActions
          submitLabel={initial ? t('boardMinutes.save') : t('boardMinutes.create')}
          cancelLabel={t('common.cancel')}
          onCancel={onCancel}
          submitting={saving}
          extraItems={
            initial
              ? [
                  {
                    to: boardMinuteResolutionsPath(initial.id, lockedRequestId),
                    icon: FileText,
                    label: t('boardResolutions.title'),
                  },
                ]
              : undefined
          }
        />
      </AppForm>
      <MinutesMembersPickerModal
        open={membersModalOpen}
        employees={employees.data ?? []}
        selectedIds={members.map((row) => row.userId)}
        onClose={() => setMembersModalOpen(false)}
        onPick={addMember}
      />
    </FormCard>
  )
}

function MinutesMembersPickerModal({
  open,
  employees,
  selectedIds,
  onClose,
  onPick,
}: {
  open: boolean
  employees: ManagedUser[]
  selectedIds: string[]
  onClose: () => void
  onPick: (user: ManagedUser) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [term, setTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTerm('')
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

  const items = useMemo(() => {
    const needle = toLatinDigits(term).trim().toLowerCase()
    return employees.filter((user) => {
      if (selectedIds.includes(user.id)) return false
      if (!needle) return true
      const haystack = [
        user.fullName,
        user.username,
        user.nationalId,
        user.phone,
        user.orgUnit?.name,
        user.position?.name,
      ]
        .filter(Boolean)
        .map((value) => toLatinDigits(String(value)).toLowerCase())
      return haystack.some((value) => value.includes(needle))
    })
  }, [employees, selectedIds, term])

  if (!open) return null

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
        className="relative z-10 flex max-h-[min(88vh,36rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="pointer-events-none absolute -start-8 -top-10 size-32 rounded-full bg-teal-200/30" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <Users className="size-5" aria-hidden />
              </span>
              <h2 id="minutes-members-modal-title" className="text-sm font-semibold text-ink-900">
                {t('boardMinutes.manageMembers')}
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
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
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
                <Button type="button" variant="soft" onClick={() => onPick(item)}>
                  <Check className="size-4" aria-hidden />
                  {t('boardMinutes.pickMember')}
                </Button>
              </li>
            ))}
            {!items.length ? (
              <li className="px-3 py-6 text-center text-sm text-ink-400">
                {term.trim() ? t('users.noResults') : t('boardMinutes.noMembers')}
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>,
    document.body,
  )
}
