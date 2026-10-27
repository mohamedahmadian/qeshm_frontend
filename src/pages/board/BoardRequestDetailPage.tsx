import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  FileText,
  Hash,
  Gavel,
  History,
  MessageSquare,
  Paperclip,
  Scale,
  Printer,
  ScrollText,
  Send,
  Stamp,
  Trash2,
  Timer,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthProvider'
import { canAccessBoardMinutes, canDeleteBoardRequests, canEditBoardRequest } from '../../lib/board-access'
import { DateText } from '../../components/ui/DateText'
import {
  AppForm,
  Button,
  DetailActions,
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
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api, getApiErrorMessage } from '../../lib/api'
import { elapsedDurationParts, formatNumber, instantMs, isoHasClock, todayIsoDate } from '../../lib/datetime'
import { isAdmin } from '../../lib/roles'
import {
  boardPipelineStages,
  boardRequestStatuses,
  boardStages,
  type BoardAccess,
  type BoardAttachment,
  type BoardRequest,
  type BoardRequestStatus,
  type BoardStage,
} from '../../types/app'
import { stageTimingOf } from './board-request-timing'
import {
  BoardAttachmentsField,
  BoardExistingAttachments,
  emptyPendingBoardFiles,
  type PendingBoardFiles,
} from './BoardAttachmentsField'
import { BoardRequestHeaderBadges } from './BoardRequestHeaderBadges'
import { BoardStagePipeline } from './BoardStagePipeline'
import { BoardStatusBadge } from './BoardStatusBadge'
import { BoardRequestPrintSheet } from './BoardRequestPrintSheet'
import { boardMinutesListPath, boardPlansPath, boardRequestEditPath } from './board-paths'

const detailTabs = [
  { id: boardStages.REQUEST, icon: FileText },
  { id: boardStages.MANAGEMENT, icon: Stamp },
  { id: boardStages.LEGAL, icon: Scale },
  { id: boardStages.BUDGET, icon: Wallet },
  { id: boardStages.SECRETARY, icon: Gavel },
  { id: boardStages.CEO, icon: BadgeCheck },
] as const

function stageForStatus(status: BoardRequestStatus): BoardStage | null {
  if (status === 'PENDING_REVIEW') return 'MANAGEMENT'
  if (status === 'PENDING_LEGAL') return 'LEGAL'
  if (status === 'PENDING_BUDGET') return 'BUDGET'
  if (status === 'PENDING_SECRETARY') return 'SECRETARY'
  if (status === 'PENDING_CEO') return 'CEO'
  return null
}

function boolLabel(value: boolean | null, t: (key: string) => string) {
  if (value == null) return '—'
  return value ? t('board.has') : t('board.hasNot')
}

function formatStageElapsed(
  fromIso: string,
  toMs: number,
  t: (key: string, options?: { count: string }) => string,
  locale: string,
) {
  const parts = elapsedDurationParts(fromIso, toMs)
  if (!parts) return '—'
  const count = (value: number) => formatNumber(value, locale)
  const bits: string[] = []
  if (parts.days) bits.push(t('boardReview.elapsedDay', { count: count(parts.days) }))
  if (parts.hours) bits.push(t('boardReview.elapsedHour', { count: count(parts.hours) }))
  if (parts.minutes && bits.length < 2) {
    bits.push(t('boardReview.elapsedMinute', { count: count(parts.minutes) }))
  }
  if (parts.seconds && bits.length < 2) {
    bits.push(t('boardReview.elapsedSecond', { count: count(parts.seconds) }))
  }
  if (!bits.length) return t('boardReview.elapsedLessThanMinute')
  return bits.join(t('boardReview.elapsedJoin'))
}

function TimingDate({ value }: { value: string | null }) {
  if (!value) return '—'
  return <DateText value={value} withTime={isoHasClock(value)} />
}

function StageTimingRow({ item, stage }: { item: BoardRequest; stage: BoardStage }) {
  const { t, i18n } = useTranslation()
  const timing = stageTimingOf(item, stage)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!timing.live) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [timing.live])

  const toMs = timing.handledAt ? (instantMs(timing.handledAt) ?? now) : now
  const elapsed = timing.referredAt
    ? formatStageElapsed(timing.referredAt, toMs, t, i18n.language)
    : '—'

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <FormFactTile
          icon={Send}
          label={t('boardReview.referredAt')}
          value={<TimingDate value={timing.referredAt} />}
          tone="teal"
        />
        <FormFactTile
          icon={CalendarClock}
          label={t('boardReview.handledAt')}
          value={<TimingDate value={timing.handledAt} />}
          tone="mint"
        />
        <FormFactTile icon={Timer} label={t('boardReview.elapsed')} value={elapsed} />
      </div>
      <StageResponsibleRow item={item} stage={stage} />
    </div>
  )
}

function StageResponsibleRow({ item, stage }: { item: BoardRequest; stage: BoardStage }) {
  const { t } = useTranslation()
  const row = item.stageResponsibles?.find((entry) => entry.stage === stage)
  if (!row?.title) return null
  const people = row.people
    .map((person) => person.fullName)
    .filter(Boolean)
    .join(t('boardReview.peopleJoin'))
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <FormFactTile
        icon={Briefcase}
        label={t('boardReview.responsible')}
        value={row.title}
        tone="teal"
      />
      <FormFactTile
        icon={Users}
        label={t('boardReview.responsibleBy')}
        value={people || '—'}
        tone="mint"
      />
    </div>
  )
}

export function BoardRequestDetailPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
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
  const canEdit = item ? canEditBoardRequest(item) : false
  const canDelete = canDeleteBoardRequests(user) || Boolean(access?.canDeleteRequests)
  const canReview = Boolean(item?.canReview ?? (currentStage && access?.stages[currentStage]))
  const admin = isAdmin(user)
  const [tab, setTab] = useState<BoardStage>(boardStages.REQUEST)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)

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

  useEffect(() => {
    setAttachOpen(false)
  }, [id, currentStage])

  if (!item || !id) return <LoadingState />

  const stageAttachments = (stage: BoardStage) => item.attachments.filter((row) => row.stage === stage)
  const deleteRequest = canDelete
    ? () =>
        confirmDelete({
          message: t('boardRequests.confirmDelete'),
          successMessage: t('boardRequests.deleted'),
          path: `/board/requests/${id}`,
          queryKey: ['board-plans'],
          onDeleted: () => {
            void queryClient.invalidateQueries({ queryKey: ['board-plans-stats'] })
            void queryClient.invalidateQueries({ queryKey: ['board-requests'] })
            navigate(boardPlansPath())
          },
        })
    : undefined
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
        chips={
          <BoardRequestHeaderBadges
            trackingNo={item.trackingNo}
            unitName={item.unit.name}
            subject={item.subject}
          />
        }
        backTo={boardPlansPath()}
        className="mb-6 print:hidden"
      />
      <div className="print:hidden">
        <BoardStagePipeline kind={item.kind} status={item.status} rejectedStage={item.rejectedStage} />
      </div>
      <FormCard
        className="print:hidden"
        icon={FileText}
        title={item.subject}
        chips={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
              {t(`boardRequests.kinds.${item.kind}`)}
            </span>
            <BoardStatusBadge value={item.status} />
          </div>
        }
        editTo={canEdit ? boardRequestEditPath(id) : undefined}
      >
        <nav className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5 print:hidden">
          {detailTabs.filter((itemTab) => boardPipelineStages(item.kind).includes(itemTab.id)).map((itemTab) => {
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
            <StageTimingRow item={item} stage="REQUEST" />
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              <FormFactTile icon={CalendarDays} label={t('boardRequests.requestedAt')} value={<DateText value={item.requestedAt} />} tone="teal" />
              <FormFactTile icon={Building2} label={t('boardRequests.requestingUnit')} value={item.unit.name} tone="mint" />
              <FormFactTile icon={Briefcase} label={t('boardRequests.orgPosition')} value={item.orgPositionText} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <FormFactTile
                icon={Hash}
                label={t('boardRequests.trackingNo')}
                copyValue={item.trackingNo}
                tone="teal"
              />
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

          <div className={tab === 'MANAGEMENT' ? 'space-y-6 print:hidden' : 'hidden'}>
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
              attachOpen={attachOpen}
              onReviewDone={reviewOnDone}
            />
          </div>
          <div className={tab === 'LEGAL' ? 'space-y-6 print:hidden' : 'hidden'}>
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
              attachOpen={attachOpen}
              onReviewDone={reviewOnDone}
            />
          </div>
          <div className={tab === 'BUDGET' ? 'space-y-6 print:hidden' : 'hidden'}>
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
              attachOpen={attachOpen}
              onReviewDone={reviewOnDone}
            />
          </div>
          <div className={tab === 'SECRETARY' ? 'space-y-6 print:hidden' : 'hidden'}>
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
              attachOpen={attachOpen}
              onReviewDone={reviewOnDone}
            />
          </div>
          <div className={tab === 'CEO' ? 'space-y-6 print:hidden' : 'hidden'}>
            <StageTabBody
              item={item}
              stage="CEO"
              currentStage={currentStage}
              canReview={canReview}
              attachments={stageAttachments('CEO')}
              facts={
                item.ceoAt || item.ceoComment ? (
                  <StageFacts
                    icon={BadgeCheck}
                    title={t('board.stages.CEO')}
                    date={item.ceoAt}
                    comment={item.ceoComment}
                    person={item.ceoBy?.fullName}
                  />
                ) : null
              }
              requestId={id}
              attachOpen={attachOpen}
              onReviewDone={reviewOnDone}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/70 to-white p-4 print:hidden sm:p-5">
            {canReview ? (
              <Button
                type="button"
                variant="soft"
                className="me-auto shadow-[0_6px_14px_rgba(63,214,190,0.28)]"
                onClick={() => {
                  if (currentStage) setTab(currentStage)
                  setAttachOpen(true)
                }}
              >
                <Paperclip className="size-4" aria-hidden />
                {t('board.addAttachments')}
              </Button>
            ) : null}
            {admin ? (
              <Button type="button" variant="ghost" onClick={() => setStatusModalOpen(true)}>
                <Stamp className="size-4" aria-hidden />
                {t('board.changeStatus')}
              </Button>
            ) : null}
            <Button type="button" variant="soft" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              {t('boardRequests.print')}
            </Button>
            {canDelete ? (
              <Button type="button" variant="danger" onClick={deleteRequest}>
                <Trash2 className="size-4" aria-hidden />
                {t('boardRequests.delete')}
              </Button>
            ) : null}
            {item.status === boardRequestStatuses.APPROVED &&
            (access?.canManageMinutes || canAccessBoardMinutes(user)) ? (
              <Link to={boardMinutesListPath(id)}>
                <Button type="button" variant="soft">
                  <ScrollText className="size-4" aria-hidden />
                  {t('boardMinutes.manage')}
                </Button>
              </Link>
            ) : null}
          </div>
          {canEdit || canDelete ? (
            <DetailActions
              footer={false}
              editTo={boardRequestEditPath(id)}
              editLabel={t('common.edit')}
              showEdit={canEdit}
              deleteLabel={canDelete ? t('boardRequests.delete') : undefined}
              onDelete={deleteRequest}
            />
          ) : null}
        </div>
      </FormCard>

      <BoardRequestPrintSheet item={item} />

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
  attachOpen,
  onReviewDone,
}: {
  item: BoardRequest
  stage: BoardStage
  currentStage: BoardStage | null
  canReview: boolean
  attachments: BoardAttachment[]
  facts: ReactNode
  requestId: string
  attachOpen: boolean
  onReviewDone: () => void
}) {
  const { t } = useTranslation()
  const rejectedHere = item.status === 'REJECTED' && item.rejectedStage === stage
  const isCurrent = currentStage === stage
  const showReview = isCurrent && canReview
  return (
    <>
      <StageTimingRow item={item} stage={stage} />
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
          attachOpen={attachOpen}
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
        {extras.length ? (
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            <FormFactTile icon={CalendarDays} label={t('boardReview.date')} value={date ? <DateText value={date} /> : '—'} tone="teal" />
            {extras.map((row) => (
              <FormFactTile key={row.label} icon={Check} label={row.label} value={row.value} />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={CalendarDays} label={t('boardReview.date')} value={date ? <DateText value={date} /> : '—'} tone="teal" />
            <FormFactTile icon={Briefcase} label={t('boardReview.reviewedBy')} value={person || '—'} tone="mint" />
          </div>
        )}
        {extras.length ? (
          <FormFactTile icon={Briefcase} label={t('boardReview.reviewedBy')} value={person || '—'} tone="mint" />
        ) : null}
        <FormFactTile icon={MessageSquare} label={t('boardReview.comment')} value={comment || '—'} />
      </div>
    </>
  )
}

function BoardReviewForm({
  requestId,
  stage,
  attachOpen,
  onDone,
}: {
  requestId: string
  stage: BoardStage
  attachOpen: boolean
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
      confirmLabel: t(`board.approveStages.${stage}`),
      cancelLabel: t('common.cancel'),
      onConfirm: () => send('APPROVE'),
    })
  }

  return (
    <AppForm onSubmit={submit} className="space-y-4">
        {stage === 'LEGAL' ? (
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <FormField icon={CalendarDays} label={t('boardReview.date')}>
              <PersianDateField value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
            </FormField>
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
        ) : stage === 'BUDGET' ? (
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <FormField icon={CalendarDays} label={t('boardReview.date')}>
              <PersianDateField value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
            </FormField>
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
        ) : (
          <FormField icon={CalendarDays} label={t('boardReview.date')}>
            <PersianDateField value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
          </FormField>
        )}
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
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="min-w-[9.5rem] px-7 py-3.5 text-base font-semibold shadow-[0_10px_22px_rgba(46,189,182,0.32)]"
            >
              <Check className="size-5" aria-hidden />
              {t(`board.approveStages.${stage}`)}
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
