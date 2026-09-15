import { Building2, CalendarDays, FileText, Mic, Paperclip, Plus, ScrollText, Trash2, Users } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
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
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { todayIsoDate } from '../../lib/datetime'
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
  const [memberId, setMemberId] = useState('')
  const [members, setMembers] = useState<{ userId: string; name: string; attendance: BoardMinutesAttendance }[]>(
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

  const employeeOptions = useMemo(
    () =>
      (employees.data ?? [])
        .filter((user) => !members.some((row) => row.userId === user.id))
        .map((user) => ({ value: user.id, label: user.fullName })),
    [employees.data, members],
  )
  const requestOptions = useMemo(
    () => [
      { value: '', label: t('boardMinutes.regular') },
      ...(requests.data ?? []).map((item) => ({ value: item.id, label: item.subject })),
    ],
    [requests.data, t],
  )

  function addMember(userId: string) {
    if (!userId) return
    const user = employees.data?.find((item) => item.id === userId)
    if (!user || members.some((row) => row.userId === userId)) return
    setMembers((current) => [
      ...current,
      { userId, name: user.fullName, attendance: boardMinutesAttendances.PRESENT },
    ])
    setMemberId('')
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
            <MinutesDictation value={body} disabled={saving} onChange={setBody} />
            <textarea
              id="minutesBody"
              className={`${fieldClassName} min-h-36`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t('boardMinutes.bodyPlaceholder')}
            />
          </div>
        </FormField>
        <FormSectionTitle icon={Users}>{t('boardMinutes.members')}</FormSectionTitle>
        <FormField icon={Users} label={t('boardMinutes.addMember')}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchSelect
                value={memberId}
                onChange={setMemberId}
                options={employeeOptions}
                placeholder={t('boardMinutes.selectEmployee')}
              />
            </div>
            <Button type="button" variant="soft" disabled={!memberId} onClick={() => addMember(memberId)}>
              <Plus className="size-4" aria-hidden />
              {t('boardMinutes.addMember')}
            </Button>
          </div>
        </FormField>
        {members.length ? (
          <ul className="space-y-2">
            {members.map((row) => (
              <li key={row.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2">
                <span className="text-sm font-medium text-ink-800">{row.name}</span>
                <div className="flex items-center gap-2">
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
                  <Button
                    type="button"
                    variant="ghost"
                    className="size-8"
                    onClick={() => setMembers((current) => current.filter((item) => item.userId !== row.userId))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">{t('boardMinutes.noMembers')}</p>
        )}
        <FormSectionTitle icon={Paperclip}>{t('boardMinutes.attachments')}</FormSectionTitle>
        <FormField icon={Mic} label={t('boardMinutes.attachments')}>
          <BoardMinutesAttachmentsField value={files} onChange={setFiles} disabled={saving} />
        </FormField>
        <FormActions
          submitLabel={initial ? t('boardMinutes.save') : t('boardMinutes.create')}
          cancelLabel={t('common.cancel')}
          onCancel={onCancel}
          submitting={saving}
        />
      </AppForm>
    </FormCard>
  )
}
