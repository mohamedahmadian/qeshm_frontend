import { Check, FileText, Gavel, Scale, Stamp, Wallet, X, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cardClassName } from '../../components/ui/FormLayout'
import { formatNumber } from '../../lib/datetime'
import { boardStages, type BoardRequestStatus, type BoardStage } from '../../types/app'

const pipelineStages = [
  boardStages.REQUEST,
  boardStages.MANAGEMENT,
  boardStages.LEGAL,
  boardStages.BUDGET,
  boardStages.SECRETARY,
] as const

const stageIcons: Record<BoardStage, LucideIcon> = {
  REQUEST: FileText,
  MANAGEMENT: Stamp,
  LEGAL: Scale,
  BUDGET: Wallet,
  SECRETARY: Gavel,
}

type StageMark = 'done' | 'current' | 'upcoming' | 'rejected'

function currentIndexOf(status: BoardRequestStatus, rejectedStage: BoardStage | null) {
  if (status === 'APPROVED') return -1
  if (status === 'REJECTED') {
    const index = rejectedStage ? pipelineStages.indexOf(rejectedStage) : -1
    return index
  }
  if (status === 'PENDING_REVIEW') return 1
  if (status === 'PENDING_LEGAL') return 2
  if (status === 'PENDING_BUDGET') return 3
  if (status === 'PENDING_SECRETARY') return 4
  return -1
}

function markFor(index: number, status: BoardRequestStatus, currentIndex: number): StageMark {
  if (status === 'APPROVED') return 'done'
  if (status === 'REJECTED') {
    if (currentIndex < 0) return 'upcoming'
    if (index < currentIndex) return 'done'
    if (index === currentIndex) return 'rejected'
    return 'upcoming'
  }
  if (currentIndex < 0) return 'upcoming'
  if (index < currentIndex) return 'done'
  if (index === currentIndex) return 'current'
  return 'upcoming'
}

export function BoardStagePipeline({
  status,
  rejectedStage = null,
  activeStage,
}: {
  status?: BoardRequestStatus
  rejectedStage?: BoardStage | null
  activeStage?: BoardStage
}) {
  const { t, i18n } = useTranslation()
  const resolvedStatus = status ?? 'PENDING_REVIEW'
  const currentIndex =
    activeStage != null ? pipelineStages.indexOf(activeStage) : currentIndexOf(resolvedStatus, rejectedStage)

  return (
    <nav aria-label={t('board.pipeline')} className={`${cardClassName} px-3 py-5 sm:px-6`}>
      <ol className="flex items-start">
        {pipelineStages.map((stage, index) => {
          const mark = markFor(index, resolvedStatus, currentIndex)
          const Icon = stageIcons[stage]
          const label = t(`board.stages.${stage}`)
          const statusLabel =
            mark === 'done'
              ? t('board.stageDone')
              : mark === 'current'
                ? t('board.currentStage')
                : mark === 'rejected'
                  ? t('board.stageRejectedMark')
                  : t('board.stageUpcoming')
          const nextMark =
            index < pipelineStages.length - 1 ? markFor(index + 1, resolvedStatus, currentIndex) : null
          const lineDone = mark === 'done' && nextMark !== 'upcoming'
          const lineCurrent = mark === 'current'
          const lineRejected = mark === 'rejected'

          return (
            <li
              key={stage}
              className={`flex items-start ${index < pipelineStages.length - 1 ? 'min-w-0 flex-1' : ''}`}
            >
              <div className="flex w-[4.5rem] shrink-0 flex-col items-center sm:w-[5.25rem]">
                <span
                  className={`relative flex size-[3.35rem] items-center justify-center sm:size-16 ${
                    mark === 'current' ? 'board-stage-current' : ''
                  }`}
                  aria-current={mark === 'current' ? 'step' : undefined}
                  aria-label={`${label} — ${statusLabel}`}
                >
                  {mark === 'current' ? (
                    <>
                      <span className="board-stage-pulse-ring" aria-hidden />
                      <span className="board-stage-double-ring" aria-hidden />
                    </>
                  ) : null}
                  <span
                    className={`relative z-10 flex size-11 items-center justify-center rounded-full text-white sm:size-12 ${
                      mark === 'done'
                        ? 'bg-emerald-500 shadow-[0_8px_16px_rgba(16,185,129,0.35)]'
                        : mark === 'current'
                          ? 'board-stage-current-core bg-emerald-700'
                          : mark === 'rejected'
                            ? 'bg-rose-600 shadow-[0_8px_16px_rgba(225,29,72,0.28)]'
                            : 'bg-white text-ink-400 ring-2 ring-teal-200'
                    }`}
                  >
                    {mark === 'done' ? (
                      <Check className="size-5 sm:size-6" strokeWidth={2.6} aria-hidden />
                    ) : mark === 'rejected' ? (
                      <X className="size-5 sm:size-6" strokeWidth={2.4} aria-hidden />
                    ) : mark === 'current' ? (
                      <Icon className="size-5 sm:size-6" aria-hidden />
                    ) : (
                      <span className="text-sm font-bold">{formatNumber(index + 1, i18n.language)}</span>
                    )}
                  </span>
                </span>
                <span
                  className={`mt-2 line-clamp-2 text-center text-[10px] leading-4 sm:text-[11px] ${
                    mark === 'done'
                      ? 'font-medium text-emerald-700'
                      : mark === 'current'
                        ? 'font-semibold text-emerald-800'
                        : mark === 'rejected'
                          ? 'font-medium text-rose-700'
                          : 'text-ink-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < pipelineStages.length - 1 ? (
                <span
                  className={`mt-[1.55rem] h-1 min-w-0 flex-1 rounded-full sm:mt-[1.7rem] ${
                    lineDone
                      ? 'bg-emerald-400'
                      : lineCurrent
                        ? 'board-stage-line-current'
                        : lineRejected
                          ? 'bg-rose-200'
                          : 'bg-teal-100'
                  }`}
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
