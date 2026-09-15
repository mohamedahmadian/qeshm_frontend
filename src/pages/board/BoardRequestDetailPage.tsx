import {
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  FileText,
  Gavel,
  History,
  MessageSquare,
  Paperclip,
  Scale,
  ScrollText,
  Stamp,
  Wallet,
  X,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthProvider'
import { canAccessBoardMinutes } from '../../lib/board-access'
import { DateText } from '../../components/ui/DateText'
import {
  AppForm,
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormField,
  LoadingState,
  PageHeader,
  ToggleField,
  fieldClassName,
  formShellClassName,
} from '../../components/ui/Form'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { confirmToast } from '../../components/ui/confirmToast'
import { api, getApiErrorMessage } from '../../lib/api'
import { todayIsoDate } from '../../lib/datetime'
import { isAdmin } from '../../lib/roles'
import {
  boardRequestStatuses,
  boardStages,
  type BoardAccess,
  type BoardAttachment,
  type BoardRequest,
  type BoardRequestStatus,
  type BoardStage,
} from '../../types/app'
import {
  BoardAttachmentsField,
  BoardExistingAttachments,
  emptyPendingBoardFiles,
  type PendingBoardFiles,
} from './BoardAttachmentsField'
import { BoardStagePipeline } from './BoardStagePipeline'
import { BoardStatusBadge } from './BoardStatusBadge'
import { boardMinutesListPath, boardPlansPath, boardRequestEditPath } from './board-paths'

const detailTabs = [
  { id: boardStages.REQUEST, icon: FileText },
  { id: boardStages.MANAGEMENT, icon: Stamp },
  { id: boardStages.LEGAL, icon: Scale },
  { id: boardStages.BUDGET, icon: Wallet },
  { id: boardStages.SECRETARY, icon: Gavel },
] as const

function stageForStatus(status: BoardRequestStatus): BoardStage | null {
  if (status === 'PENDING_REVIEW') return 'MANAGEMENT'
  if (status === 'PENDING_LEGAL') return 'LEGAL'
  if (status === 'PENDING_BUDGET') return 'BUDGET'
  if (status === 'PENDING_SECRETARY') return 'SECRETARY'
  return null
}

function boolLabel(value: boolean | null, t: (key: string) => string) {
  if (value == null) return '—'
  return value ? t('board.has') : t('board.hasNot')
}

export function BoardRequestDetailPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const accessQuery = useQuery({
    queryKey: ['board-access'],
    queryFn: async () => {
      const { data } = await api.get<BoardAccess>('/board/access')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['board-request', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<BoardRequest>(`/board/requests/${id}`)
      return data
    },
  })
  const item = query.data
  const access = accessQuery.data
  const currentStage = item ? stageForStatus(item.status) : null
  const canEdit = item?.status === boardRequestStatuses.PENDING_REVIEW
  const canReview = Boolean(currentStage && access?.stages[currentStage])
  const admin = isAdmin(user)
  const [tab, setTab] = useState<BoardStage>(boardStages.REQUEST)
  const [statusModalOpen, setStatusModalOpen] = useState(false)

  useEffect(() => {
    if (!item) return
    if (currentStage) {
      setTab(currentStage)
      return
    }
    if (item.status === 'REJECTED' && item.rejectedStage && item.rejectedStage !== 'REQUEST') {
      setTab(item.rejectedStage)
      return
    }
    setTab(boardStages.REQUEST)
  }, [currentStage, item?.id, item?.rejectedStage, item?.status])

  if (!item || !id) return <LoadingState />

  const stageAttachments = (stage: BoardStage) => item.attachments.filter((row) => row.stage === stage)
  const reviewOnDone = () => {
    void queryClient.invalidateQueries({ queryKey: ['board-request', id] })
    void queryClient.invalidateQueries({ queryKey: ['board-plans'] })
    void queryClient.invalidateQueries({ queryKey: ['board-requests'] })
  }

  return (
    <div className={`${formShellClassName} space-y-5`}>
      <PageHeader
        icon={FileText}
        title={t('boardRequests.details')}
        subtitle={<EntityNameSubtitle name={item.subject} icon={FileText} />}
        backTo={boardPlansPath()}
      />
      <BoardStagePipeline status={item.status} rejectedStage={item.rejectedStage} />
      <FormCard
        icon={FileText}
        title={item.subject}
        chips={<BoardStatusBadge value={item.status} />}
        editTo={canEdit ? boardRequestEditPath(id) : undefined}
      >
        <nav className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5">
          {detailTabs.map((itemTab) => {
            const Icon = itemTab.icon
            const active = tab === itemTab.id
            return (
              <button
                key={itemTab.id}
                type="button"
                onClick={() => setTab(itemTab.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                    : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
                {t(`board.stages.${itemTab.id}`)}
              </button>
            )
          })}
        </nav>
        <div className="space-y-6 p-5 sm:p-6">
          <div className={tab === 'REQUEST' ? 'space-y-6' : 'hidden'}>
            <FormSectionTitle icon={FileText}>{t('board.stages.REQUEST')}</FormSectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <FormFactTile icon={CalendarDays} label={t('boardRequests.requestedAt')} value={<DateText value={item.requestedAt} />} tone="teal" />
              <FormFactTile icon={Building2} label={t('boardRequests.unit')} value={item.unit.name} tone="mint" />
              <FormFactTile icon={Briefcase} label={t('boardRequests.orgPosition')} value={item.orgPositionText} />
              <FormFactTile icon={FileText} label={t('boardRequests.createdBy')} value={item.createdBy.fullName} />
            </div>
            <div className="grid gap-2 sm:gap-3">
              <FormFactTile icon={MessageSquare} label={t('boardRequests.justification')} value={item.justification || '—'} />
              <FormFactTile icon={History} label={t('boardRequests.topicHistory')} value={item.topicHistory || '—'} />
              <FormFactTile icon={MessageSquare} label={t('boardRequests.description')} value={item.description || '—'} />
            </div>
            <FormSectionTitle icon={Paperclip}>{t('board.attachments')}</FormSectionTitle>
            <BoardExistingAttachments items={stageAttachments('REQUEST')} />
          </div>

          <div className={tab === 'MANAGEMENT' ? 'space-y-6' : 'hidden'}>
            <StageTabBody
              item={item}
              stage="MANAGEMENT"
              currentStage={currentStage}
              canReview={canReview}
              attachments={stageAttachments('MANAGEMENT')}
              facts={
                item.managementAt || item.managementComment ? (
                  <StageFacts
                    icon={Stamp}
                    title={t('board.stages.MANAGEMENT')}
                    date={item.managementAt}
                    comment={item.managementComment}
                    person={item.managementBy?.fullName}
                  />
                ) : null
              }
              requestId={id}
              onChangeStatus={admin ? () => setStatusModalOpen(true) : undefined}
              onReviewDone={reviewOnDone}
            />
          </div>
          <div className={tab === 'LEGAL' ? 'space-y-6' : 'hidden'}>
            <StageTabBody
              item={item}
              stage="LEGAL"
              currentStage={currentStage}
              canReview={canReview}
              attachments={stageAttachments('LEGAL')}
              facts={
                item.legalAt || item.legalComment ? (
                  <StageFacts
                    icon={Scale}
                    title={t('board.stages.LEGAL')}
                    date={item.legalAt}
                    comment={item.legalComment}
                    person={item.legalBy?.fullName}
                    extras={[
                      { label: t('boardReview.legalOrgMatch'), value: boolLabel(item.legalOrgMatch, t) },
                      { label: t('boardReview.legalRegulationsMatch'), value: boolLabel(item.legalRegulationsMatch, t) },
                    ]}
                  />
                ) : null
              }
              requestId={id}
              onChangeStatus={admin ? () => setStatusModalOpen(true) : undefined}
              onReviewDone={reviewOnDone}
            />
          </div>
          <div className={tab === 'BUDGET' ? 'space-y-6' : 'hidden'}>
            <StageTabBody
              item={item}
              stage="BUDGET"
              currentStage={currentStage}
              canReview={canReview}
              attachments={stageAttachments('BUDGET')}
              facts={
                item.budgetAt || item.budgetComment ? (
                  <StageFacts
                    icon={Wallet}
                    title={t('board.stages.BUDGET')}
                    date={item.budgetAt}
                    comment={item.budgetComment}
                    person={item.budgetBy?.fullName}
                    extras={[
                      { label: t('boardReview.budgetProgramHistory'), value: boolLabel(item.budgetProgramHistory, t) },
                      {
                        label: t('boardReview.budgetCurrentYearFunding'),
                        value: boolLabel(item.budgetCurrentYearFunding, t),
                      },
                    ]}
                  />
                ) : null
              }
              requestId={id}
              onChangeStatus={admin ? () => setStatusModalOpen(true) : undefined}
              onReviewDone={reviewOnDone}
            />
          </div>
          <div className={tab === 'SECRETARY' ? 'space-y-6' : 'hidden'}>
            <StageTabBody
              item={item}
              stage="SECRETARY"
              currentStage={currentStage}
              canReview={canReview}
              attachments={stageAttachments('SECRETARY')}
              facts={
                item.secretaryAt || item.secretaryComment ? (
                  <StageFacts
                    icon={Gavel}
                    title={t('board.stages.SECRETARY')}
                    date={item.secretaryAt}
                    comment={item.secretaryComment}
                    person={item.secretaryBy?.fullName}
                  />
                ) : null
              }
              requestId={id}
              onChangeStatus={admin ? () => setStatusModalOpen(true) : undefined}
              onReviewDone={reviewOnDone}
            />
          </div>

          {item.status === boardRequestStatuses.APPROVED &&
          (access?.canManageMinutes || canAccessBoardMinutes(user)) ? (
            <div className="mt-6 flex justify-end">
              <Link to={boardMinutesListPath(id)}>
                <Button type="button" variant="soft">
                  <ScrollText className="size-4" aria-hidden />
                  {t('boardMinutes.manage')}
                </Button>
              </Link>
            </div>
          ) : null}
          {canEdit ? (
            <DetailActions editTo={boardRequestEditPath(id)} editLabel={t('common.edit')} />
          ) : admin && !canReview ? (
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={() => setStatusModalOpen(true)}>
                <Stamp className="size-4" aria-hidden />
                {t('board.changeStatus')}
              </Button>
            </div>
          ) : null}
        </div>
      </FormCard>

      {admin ? (
        <AdminStageModal
          open={statusModalOpen}
          requestId={id}
          status={item.status}
          onClose={() => setStatusModalOpen(false)}
          onDone={() => {
            setStatusModalOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['board-request', id] })
          }}
        />
      ) : null}
    </div>
  )
}

function StageTabBody({
  item,
  stage,
  currentStage,
  canReview,
  attachments,
  facts,
  requestId,
  onChangeStatus,
  onReviewDone,
}: {
  item: BoardRequest
  stage: BoardStage
  currentStage: BoardStage | null
  canReview: boolean
  attachments: BoardAttachment[]
  facts: ReactNode
  requestId: string
  onChangeStatus?: () => void
  onReviewDone: () => void
}) {
  const { t } = useTranslation()
  const rejectedHere = item.status === 'REJECTED' && item.rejectedStage === stage
  const isCurrent = currentStage === stage
  const showReview = isCurrent && canReview
  return (
    <>
      {facts}
      {rejectedHere ? (
        <StageFacts
          icon={X}
          title={t('board.statuses.REJECTED')}
          date={item.rejectedAt}
          comment={item.rejectedComment}
          person={item.rejectedBy?.fullName}
          extras={
            item.rejectedStage
              ? [{ label: t('boardReview.rejectedStage'), value: t(`board.stages.${item.rejectedStage}`) }]
              : []
          }
        />
      ) : null}
      {attachments.length > 0 ? (
        <>
          <FormSectionTitle icon={Paperclip}>{t('board.attachments')}</FormSectionTitle>
          <BoardExistingAttachments items={attachments} />
        </>
      ) : null}
      {showReview ? (
        <BoardReviewForm
          requestId={requestId}
          stage={stage}
          onChangeStatus={onChangeStatus}
          onDone={onReviewDone}
        />
      ) : null}
      {!facts && !rejectedHere && !showReview ? (
        <FormEmptyHint>{isCurrent ? t('board.currentStage') : t('board.stageUpcoming')}</FormEmptyHint>
      ) : null}
    </>
  )
}

function StageFacts({
  icon: Icon,
  title,
  date,
  comment,
  person,
  extras = [],
}: {
  icon: typeof FileText
  title: string
  date: string | null
  comment: string | null
  person?: string
  extras?: { label: string; value: string }[]
}) {
  const { t } = useTranslation()
  return (
    <>
      <FormSectionTitle icon={Icon}>{title}</FormSectionTitle>
      <div className="space-y-2 sm:space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          <FormFactTile icon={CalendarDays} label={t('boardReview.date')} value={date ? <DateText value={date} /> : '—'} tone="teal" />
          <FormFactTile icon={Briefcase} label={t('boardReview.reviewedBy')} value={person || '—'} tone="mint" />
        </div>
        {extras.length ? (
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {extras.map((row) => (
              <FormFactTile key={row.label} icon={Check} label={row.label} value={row.value} />
            ))}
          </div>
        ) : null}
        <FormFactTile icon={MessageSquare} label={t('boardReview.comment')} value={comment || '—'} />
      </div>
    </>
  )
}

function BoardReviewForm({
  requestId,
  stage,
  onChangeStatus,
  onDone,
}: {
  requestId: string
  stage: BoardStage
  onChangeStatus?: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [occurredAt, setOccurredAt] = useState(todayIsoDate())
  const [comment, setComment] = useState('')
  const [legalOrgMatch, setLegalOrgMatch] = useState(false)
  const [legalRegulationsMatch, setLegalRegulationsMatch] = useState(false)
  const [budgetProgramHistory, setBudgetProgramHistory] = useState(false)
  const [budgetCurrentYearFunding, setBudgetCurrentYearFunding] = useState(false)
  const [files, setFiles] = useState<PendingBoardFiles>(emptyPendingBoardFiles)
  const [saving, setSaving] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)

  const payload = useMemo(
    () => ({
      occurredAt,
      comment: comment.trim() || null,
      imageIds: files.imageIds,
      fileIds: files.fileIds,
      legalOrgMatch: stage === 'LEGAL' ? legalOrgMatch : undefined,
      legalRegulationsMatch: stage === 'LEGAL' ? legalRegulationsMatch : undefined,
      budgetProgramHistory: stage === 'BUDGET' ? budgetProgramHistory : undefined,
      budgetCurrentYearFunding: stage === 'BUDGET' ? budgetCurrentYearFunding : undefined,
    }),
    [
      occurredAt,
      comment,
      files,
      stage,
      legalOrgMatch,
      legalRegulationsMatch,
      budgetProgramHistory,
      budgetCurrentYearFunding,
    ],
  )

  async function send(decision: 'APPROVE' | 'REJECT') {
    setSaving(true)
    try {
      await api.post(`/board/requests/${requestId}/review`, { ...payload, decision })
      toast.success(decision === 'APPROVE' ? t('board.approved') : t('board.rejected'))
      onDone()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    confirmToast({
      title: t('board.confirmApprove', { stage: t(`board.stages.${stage}`) }),
      confirmLabel: t('board.approve'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => send('APPROVE'),
    })
  }

  return (
    <AppForm onSubmit={submit} className="space-y-4">
        <FormField icon={CalendarDays} label={t('boardReview.date')}>
          <PersianDateField value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
        </FormField>
        {stage === 'LEGAL' ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <FormField icon={Scale} label={t('boardReview.legalOrgMatch')}>
              <ToggleField
                checked={legalOrgMatch}
                onChange={setLegalOrgMatch}
                onLabel={t('board.has')}
                offLabel={t('board.hasNot')}
              />
            </FormField>
            <FormField icon={Scale} label={t('boardReview.legalRegulationsMatch')}>
              <ToggleField
                checked={legalRegulationsMatch}
                onChange={setLegalRegulationsMatch}
                onLabel={t('board.has')}
                offLabel={t('board.hasNot')}
              />
            </FormField>
          </div>
        ) : null}
        {stage === 'BUDGET' ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <FormField icon={Wallet} label={t('boardReview.budgetProgramHistory')}>
              <ToggleField
                checked={budgetProgramHistory}
                onChange={setBudgetProgramHistory}
                onLabel={t('board.has')}
                offLabel={t('board.hasNot')}
              />
            </FormField>
            <FormField icon={Wallet} label={t('boardReview.budgetCurrentYearFunding')}>
              <ToggleField
                checked={budgetCurrentYearFunding}
                onChange={setBudgetCurrentYearFunding}
                onLabel={t('board.has')}
                offLabel={t('board.hasNot')}
              />
            </FormField>
          </div>
        ) : null}
        <FormField icon={MessageSquare} label={t('boardReview.comment')} htmlFor="boardReviewComment">
          <textarea
            id="boardReviewComment"
            className={`${fieldClassName} min-h-24`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </FormField>
        <BoardAttachmentsField value={files} onChange={setFiles} showToggle={false} open={attachOpen} />
        <div className="mt-2 rounded-2xl border border-teal-100 bg-gradient-to-e from-mint-50/80 via-white to-teal-50/70 px-3 py-4 sm:px-4">
          <div className="flex flex-col gap-3 sm:relative sm:min-h-14 sm:flex-row sm:items-center sm:justify-center">
            <div className="self-start sm:absolute sm:start-0 sm:top-1/2 sm:self-auto sm:-translate-y-1/2">
              <Button
                type="button"
                variant="soft"
                disabled={saving}
                className="shadow-[0_6px_14px_rgba(63,214,190,0.28)]"
                onClick={() => setAttachOpen(true)}
              >
                <Paperclip className="size-4" aria-hidden />
                {t('board.addAttachments')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="min-w-[9.5rem] px-7 py-3.5 text-base font-semibold shadow-[0_10px_22px_rgba(46,189,182,0.32)]"
              >
                <Check className="size-5" aria-hidden />
                {t('board.approve')}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={saving}
                className="min-w-[9.5rem] px-7 py-3.5 text-base font-semibold shadow-[0_10px_22px_rgba(220,38,38,0.28)]"
                onClick={() =>
                  confirmToast({
                    title: t('board.confirmReject'),
                    confirmLabel: t('board.reject'),
                    cancelLabel: t('common.cancel'),
                    confirmVariant: 'danger',
                    onConfirm: () => send('REJECT'),
                  })
                }
              >
                <X className="size-5" aria-hidden />
                {t('board.reject')}
              </Button>
            </div>
            {onChangeStatus ? (
              <div className="self-end sm:absolute sm:end-0 sm:top-1/2 sm:self-auto sm:-translate-y-1/2">
                <Button type="button" variant="ghost" disabled={saving} onClick={onChangeStatus}>
                  <Stamp className="size-4" aria-hidden />
                  {t('board.changeStatus')}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </AppForm>
  )
}

function AdminStageModal({
  open,
  requestId,
  status,
  onClose,
  onDone,
}: {
  open: boolean
  requestId: string
  status: BoardRequestStatus
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [next, setNext] = useState(status)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setNext(status)
  }, [open, status])

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

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/board/requests/${requestId}/status`, { status: next })
      toast.success(t('board.stageUpdated'))
      onDone()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/30 p-4"
      data-nested-dialog
      role="presentation"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-status-modal-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <Gavel className="size-5" aria-hidden />
              </span>
              <h2 id="board-status-modal-title" className="text-sm font-semibold text-ink-900">
                {t('board.changeStatus')}
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
        <AppForm onSubmit={submit} className={formCardBodyClassName} autoFocusFirst={false}>
          <FormField icon={Stamp} label={t('boardRequests.status')}>
            <SearchSelect
              value={next}
              onChange={(value) => setNext(value as BoardRequestStatus)}
              options={Object.values(boardRequestStatuses).map((item) => ({
                value: item,
                label: t(`board.statuses.${item}`),
              }))}
            />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || next === status}>
              <Check className="size-4" aria-hidden />
              {t('common.edit')}
            </Button>
          </div>
        </AppForm>
      </section>
    </div>,
    document.body,
  )
}
