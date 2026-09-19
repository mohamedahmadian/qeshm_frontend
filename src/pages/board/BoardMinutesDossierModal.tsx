import {
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  History,
  MessageSquare,
  Paperclip,
  Scale,
  ScanSearch,
  ScrollText,
  Stamp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../components/ui/DateText'
import { Button, LoadingState } from '../../components/ui/Form'
import { FileAudio } from '../../components/ui/FileMedia'
import {
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
} from '../../components/ui/FormLayout'
import { api, getImageUrl } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import {
  boardMinutesAttendances,
  type BoardMinutesDossier,
  type BoardRequest,
} from '../../types/app'
import { BoardExistingAttachments } from './BoardAttachmentsField'
import { BoardStatusBadge } from './BoardStatusBadge'

function boolLabel(value: boolean | null, t: (key: string) => string) {
  if (value == null) return '—'
  return value ? t('board.has') : t('board.hasNot')
}

function hasReview(item: BoardRequest) {
  return Boolean(
    item.managementAt ||
      item.managementComment ||
      item.legalAt ||
      item.legalComment ||
      item.budgetAt ||
      item.budgetComment ||
      item.secretaryAt ||
      item.secretaryComment ||
      item.rejectedAt,
  )
}

export function BoardMinutesDossierModal({
  minutesId,
  focusResolutionId,
  locale,
  onClose,
}: {
  minutesId: string | null
  focusResolutionId?: string | null
  locale: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const open = Boolean(minutesId)
  const query = useQuery({
    queryKey: ['board-minutes-dossier', minutesId],
    enabled: Boolean(minutesId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutesDossier>(`/board/search/${minutesId}`)
      return data
    },
  })
  const focusRef = useRef<HTMLLIElement | null>(null)

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

  useEffect(() => {
    if (!open || !query.data || !focusResolutionId) return
    focusRef.current?.scrollIntoView({ block: 'nearest' })
  }, [focusResolutionId, open, query.data])

  if (!open) return null

  const dossier = query.data
  const minutes = dossier?.minutes
  const request = dossier?.request ?? null
  const resolutions = dossier?.resolutions ?? []
  const images = minutes?.attachments.filter((row) => row.kind === 'IMAGE' && row.imageId) ?? []
  const audios = minutes?.attachments.filter((row) => row.kind === 'AUDIO' && row.fileId) ?? []

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/30 p-4"
      data-nested-dialog
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-dossier-title"
        className="relative z-10 flex max-h-[min(88vh,52rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div
            className="pointer-events-none absolute -start-8 -top-10 size-32 rounded-full bg-teal-200/30"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <ScanSearch className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="board-dossier-title" className="text-sm font-semibold text-ink-900">
                  {t('boardSmartSearch.dossierTitle')}
                </h2>
                <p className="mt-0.5 truncate text-xs text-ink-500">
                  {minutes?.subject || t('boardSmartSearch.title')}
                </p>
              </div>
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
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-5">
          {query.isLoading || !minutes ? (
            <LoadingState />
          ) : (
            <>
              {request ? (
                <section className="space-y-3">
                  <FormSectionTitle icon={FileText}>{t('boardSmartSearch.requestSection')}</FormSectionTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <BoardStatusBadge value={request.status} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                    <FormFactTile
                      icon={CalendarDays}
                      label={t('boardRequests.requestedAt')}
                      value={<DateText value={request.requestedAt} />}
                      tone="teal"
                    />
                    <FormFactTile icon={Building2} label={t('boardRequests.unit')} value={request.unit.name} tone="mint" />
                    <FormFactTile icon={Briefcase} label={t('boardRequests.orgPosition')} value={request.orgPositionText} />
                    <FormFactTile icon={Users} label={t('boardRequests.createdBy')} value={request.createdBy.fullName} />
                  </div>
                  <div className="grid gap-2">
                    <FormFactTile
                      icon={MessageSquare}
                      label={t('boardRequests.justification')}
                      value={request.justification || '—'}
                    />
                    <FormFactTile
                      icon={History}
                      label={t('boardRequests.topicHistory')}
                      value={request.topicHistory || '—'}
                    />
                    <FormFactTile
                      icon={MessageSquare}
                      label={t('boardRequests.description')}
                      value={request.description || '—'}
                    />
                  </div>
                  {hasReview(request) ? (
                    <>
                      <FormSectionTitle icon={Stamp}>{t('boardSmartSearch.reviewSection')}</FormSectionTitle>
                      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                        {request.managementComment || request.managementAt ? (
                          <FormFactTile
                            icon={Stamp}
                            label={t('board.stages.MANAGEMENT')}
                            value={request.managementComment || <DateText value={request.managementAt} />}
                          />
                        ) : null}
                        {request.legalAt || request.legalComment ? (
                          <FormFactTile
                            icon={Scale}
                            label={t('board.stages.LEGAL')}
                            value={[
                              request.legalComment,
                              `${t('boardReview.legalOrgMatch')}: ${boolLabel(request.legalOrgMatch, t)}`,
                              `${t('boardReview.legalRegulationsMatch')}: ${boolLabel(request.legalRegulationsMatch, t)}`,
                            ]
                              .filter(Boolean)
                              .join(' — ')}
                          />
                        ) : null}
                        {request.budgetAt || request.budgetComment ? (
                          <FormFactTile
                            icon={Wallet}
                            label={t('board.stages.BUDGET')}
                            value={[
                              request.budgetComment,
                              `${t('boardReview.budgetProgramHistory')}: ${boolLabel(request.budgetProgramHistory, t)}`,
                              `${t('boardReview.budgetCurrentYearFunding')}: ${boolLabel(request.budgetCurrentYearFunding, t)}`,
                            ]
                              .filter(Boolean)
                              .join(' — ')}
                          />
                        ) : null}
                        {request.secretaryAt || request.secretaryComment ? (
                          <FormFactTile
                            icon={Stamp}
                            label={t('board.stages.SECRETARY')}
                            value={request.secretaryComment || <DateText value={request.secretaryAt} />}
                          />
                        ) : null}
                        {request.rejectedAt ? (
                          <FormFactTile
                            icon={FileText}
                            label={t('board.statuses.REJECTED')}
                            value={request.rejectedComment || <DateText value={request.rejectedAt} />}
                          />
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  <FormSectionTitle icon={Paperclip}>{t('board.attachments')}</FormSectionTitle>
                  <BoardExistingAttachments items={request.attachments} />
                </section>
              ) : null}

              <section className="space-y-3">
                <FormSectionTitle icon={ScrollText}>{t('boardSmartSearch.minutesSection')}</FormSectionTitle>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <FormFactTile
                    icon={CalendarDays}
                    label={t('boardMinutes.heldAt')}
                    value={<DateText value={minutes.heldAt} />}
                    tone="teal"
                  />
                  <FormFactTile icon={FileText} label={t('boardMinutes.subject')} value={minutes.subject} tone="mint" />
                  <FormFactTile icon={Users} label={t('boardMinutes.createdBy')} value={minutes.createdBy.fullName} />
                  <FormFactTile
                    icon={FileText}
                    label={t('boardMinutes.resolutionCount')}
                    value={formatNumber(resolutions.length, locale)}
                    tone="teal"
                  />
                </div>
                {minutes.body ? (
                  <p className="whitespace-pre-wrap rounded-2xl border border-line bg-cream-50/80 p-4 text-sm leading-7 text-ink-800">
                    {minutes.body}
                  </p>
                ) : (
                  <FormEmptyHint>{t('boardMinutes.bodyPlaceholder')}</FormEmptyHint>
                )}
                <FormSectionTitle icon={Users}>{t('boardMinutes.members')}</FormSectionTitle>
                {minutes.members.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {minutes.members.map((row) => (
                      <FormFactTile
                        key={row.id}
                        icon={Users}
                        label={row.user.fullName}
                        value={
                          row.attendance === boardMinutesAttendances.PRESENT
                            ? t('boardMinutes.present')
                            : t('boardMinutes.absent')
                        }
                        tone={row.attendance === boardMinutesAttendances.PRESENT ? 'teal' : undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <FormEmptyHint>{t('boardMinutes.noMembers')}</FormEmptyHint>
                )}
                {images.length || audios.length ? (
                  <>
                    <FormSectionTitle icon={Paperclip}>{t('boardMinutes.attachments')}</FormSectionTitle>
                    {images.length ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {images.map((row) => (
                          <img
                            key={row.id}
                            src={getImageUrl(row.imageId!)}
                            alt={row.originalName || ''}
                            className="h-28 w-full rounded-2xl object-cover ring-1 ring-teal-100"
                          />
                        ))}
                      </div>
                    ) : null}
                    {audios.length ? (
                      <ul className="space-y-2">
                        {audios.map((row) => (
                          <li key={row.id} className="rounded-2xl border border-line p-3">
                            <p className="mb-2 text-sm text-ink-700">{row.originalName}</p>
                            <FileAudio fileId={row.fileId!} className="w-full" />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : null}
              </section>

              <section className="space-y-3">
                <FormSectionTitle icon={FileText}>{t('boardSmartSearch.resolutionsSection')}</FormSectionTitle>
                {resolutions.length ? (
                  <ol className="space-y-3">
                    {resolutions.map((item, index) => {
                      const focused = item.id === focusResolutionId
                      return (
                        <li
                          key={item.id}
                          ref={focused ? focusRef : undefined}
                          data-dossier-resolution={item.id}
                          className={`space-y-3 rounded-2xl border p-3 sm:p-4 ${
                            focused
                              ? 'border-teal-300 bg-teal-50/70 shadow-[0_8px_16px_rgba(46,189,182,0.12)]'
                              : 'border-teal-50 bg-white shadow-[0_4px_14px_rgba(20,40,40,0.04)]'
                          }`}
                        >
                          <p className="text-xs font-semibold text-teal-700">
                            {t('boardSmartSearch.resolutionN', { n: formatNumber(index + 1, locale) })}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <FormFactTile
                              icon={FileText}
                              label={t('boardResolutions.titleField')}
                              value={item.title}
                              compact
                              tone="mint"
                            />
                            <FormFactTile
                              icon={Building2}
                              label={t('boardResolutions.unit')}
                              value={item.unit?.name || t('boardResolutions.withoutUnit')}
                              compact
                            />
                            <FormFactTile
                              icon={CalendarDays}
                              label={t('boardResolutions.dueDate')}
                              value={item.dueDate ? <DateText value={item.dueDate} /> : '—'}
                              empty={!item.dueDate}
                              compact
                            />
                            <FormFactTile
                              icon={ScrollText}
                              label={t('boardResolutions.description')}
                              value={item.description || '—'}
                              compact
                            />
                            <FormFactTile
                              icon={ScrollText}
                              label={t('boardResolutions.notes')}
                              value={item.notes || '—'}
                              compact
                              className="sm:col-span-2"
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <FormEmptyHint>{t('boardSmartSearch.noResolutions')}</FormEmptyHint>
                )}
              </section>
            </>
          )}
        </div>
        <footer className="shrink-0 border-t border-line bg-white px-4 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            <X className="size-4" aria-hidden />
            {t('common.close')}
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
