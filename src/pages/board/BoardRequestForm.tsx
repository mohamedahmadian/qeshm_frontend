import { Building2, Briefcase, CalendarDays, FileText, History, MessageSquare, Paperclip } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useAuth } from '../../auth/AuthProvider'
import { api, getApiErrorMessage } from '../../lib/api'
import { canPickBoardRequestUnit } from '../../lib/board-access'
import { todayIsoDate } from '../../lib/datetime'
import type { BoardRequest, OrganizationPosition, OrganizationUnit } from '../../types/app'
import {
  BoardAttachmentsField,
  BoardExistingAttachments,
  emptyPendingBoardFiles,
  type PendingBoardFiles,
} from './BoardAttachmentsField'

export type BoardRequestPayload = {
  requestedAt: string
  unitId?: string
  orgPositionText: string
  subject: string
  justification: string | null
  topicHistory: string | null
  description: string | null
  imageIds: string[]
  fileIds: string[]
}

export function BoardRequestForm({
  initial,
  onSubmit,
}: {
  initial?: BoardRequest
  onSubmit: (payload: BoardRequestPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canPickOrg = canPickBoardRequestUnit(user)
  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    enabled: canPickOrg,
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const positions = useQuery({
    queryKey: ['organization-positions', 'lookup'],
    enabled: canPickOrg,
    queryFn: async () => {
      const { data } = await api.get<OrganizationPosition[]>('/organization/positions')
      return data
    },
  })
  const [requestedAt, setRequestedAt] = useState(initial?.requestedAt ?? todayIsoDate())
  const [unitId, setUnitId] = useState(initial?.unitId ?? user?.orgUnitId ?? '')
  const [positionId, setPositionId] = useState(user?.position?.id ?? '')
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [justification, setJustification] = useState(initial?.justification ?? '')
  const [topicHistory, setTopicHistory] = useState(initial?.topicHistory ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [files, setFiles] = useState<PendingBoardFiles>(emptyPendingBoardFiles)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!canPickOrg || !initial?.orgPositionText || !positions.data?.length) return
    const found = positions.data.find((item) => item.name === initial.orgPositionText)
    if (found) setPositionId(found.id)
  }, [canPickOrg, initial?.orgPositionText, positions.data])

  const unitLabel = useMemo(() => {
    if (canPickOrg) return ''
    return initial?.unit.name || user?.orgUnit?.name || ''
  }, [canPickOrg, initial?.unit.name, user?.orgUnit?.name])

  const positionLabel = useMemo(() => {
    if (canPickOrg) return ''
    return initial?.orgPositionText || user?.position?.name || ''
  }, [canPickOrg, initial?.orgPositionText, user?.position?.name])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canPickOrg) {
      if (!user?.orgUnitId && !initial?.unitId) {
        toast.error(t('board.needUnit'))
        return
      }
      if (positionLabel.trim().length < 2) {
        toast.error(t('board.needPosition'))
        return
      }
    } else if (!unitId) {
      toast.error(t('users.selectOrgUnit'))
      return
    }
    const position = canPickOrg
      ? (positions.data ?? []).find((item) => item.id === positionId)
      : undefined
    const orgPositionText = canPickOrg ? position?.name : positionLabel
    if (!orgPositionText || orgPositionText.trim().length < 2) {
      toast.error(t(canPickOrg ? 'boardRequests.selectPosition' : 'board.needPosition'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        requestedAt,
        unitId: canPickOrg ? unitId : undefined,
        orgPositionText: orgPositionText.trim(),
        subject: subject.trim(),
        justification: justification.trim() || null,
        topicHistory: topicHistory.trim() || null,
        description: description.trim() || null,
        imageIds: files.imageIds,
        fileIds: files.fileIds,
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
      title={initial ? initial.subject : t('boardRequests.create')}
      subtitle={initial ? undefined : t('boardRequests.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={CalendarDays} label={t('boardRequests.requestedAt')}>
          <PersianDateField value={requestedAt} onChange={(value) => setRequestedAt(value ?? '')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={Building2} label={t('boardRequests.unit')} htmlFor="boardUnit">
            {canPickOrg ? (
              <SearchSelect
                id="boardUnit"
                value={unitId}
                onChange={setUnitId}
                placeholder={t('users.selectOrgUnit')}
                options={(units.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.pathLabel || item.name,
                }))}
              />
            ) : (
              <input id="boardUnit" className={fieldClassName} value={unitLabel} readOnly />
            )}
          </FormField>
          <FormField icon={Briefcase} label={t('boardRequests.orgPosition')} htmlFor="boardPosition">
            {canPickOrg ? (
              <SearchSelect
                id="boardPosition"
                value={positionId}
                onChange={setPositionId}
                placeholder={t('boardRequests.selectPosition')}
                options={(positions.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            ) : (
              <input id="boardPosition" className={fieldClassName} value={positionLabel} readOnly />
            )}
          </FormField>
        </div>
        <FormField icon={FileText} label={t('boardRequests.subject')} htmlFor="boardSubject">
          <input
            id="boardSubject"
            className={fieldClassName}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={MessageSquare} label={t('boardRequests.justification')} htmlFor="boardJustification">
          <textarea
            id="boardJustification"
            className={`${fieldClassName} min-h-28`}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </FormField>
        <FormField icon={History} label={t('boardRequests.topicHistory')} htmlFor="boardHistory">
          <textarea
            id="boardHistory"
            className={`${fieldClassName} min-h-28`}
            value={topicHistory}
            onChange={(e) => setTopicHistory(e.target.value)}
          />
        </FormField>
        <FormField icon={MessageSquare} label={t('boardRequests.description')} htmlFor="boardDescription">
          <textarea
            id="boardDescription"
            className={`${fieldClassName} min-h-24`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        {initial?.attachments.length ? (
          <FormField icon={Paperclip} label={t('board.attachments')}>
            <BoardExistingAttachments items={initial.attachments} />
          </FormField>
        ) : null}
        <BoardAttachmentsField value={files} onChange={setFiles} />
        <FormActions submitLabel={t('boardRequests.save')} submitting={saving} className="justify-center" />
      </AppForm>
    </FormCard>
  )
}
