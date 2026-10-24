import { useTranslation } from 'react-i18next'
import { DateText } from '../../components/ui/DateText'
import { isoHasClock, localizeDigits } from '../../lib/datetime'
import {
  boardPipelineStages,
  boardStages,
  type BoardRequest,
  type BoardStage,
} from '../../types/app'
import { stageTimingOf } from './board-request-timing'

function approvalStagesOf(item: BoardRequest) {
  return boardPipelineStages(item.kind).filter((stage) => stage !== boardStages.REQUEST)
}

function stageReviewerName(item: BoardRequest, stage: BoardStage) {
  if (stage === 'MANAGEMENT') return item.managementBy?.fullName ?? null
  if (stage === 'LEGAL') return item.legalBy?.fullName ?? null
  if (stage === 'BUDGET') return item.budgetBy?.fullName ?? null
  if (stage === 'SECRETARY') return item.secretaryBy?.fullName ?? null
  if (stage === 'CEO') return item.ceoBy?.fullName ?? null
  return null
}

function PrintDate({ value }: { value: string | null }) {
  if (!value) return '—'
  return <DateText value={value} withTime={isoHasClock(value)} />
}

function PrintField({
  label,
  value,
  lines,
}: {
  label: string
  value: string | null
  lines: number
}) {
  return (
    <tr>
      <td colSpan={3}>
        <p className="board-request-print-label">{label}</p>
        <p className={`board-request-print-text is-lines-${lines}`}>{value || '\u00a0'}</p>
      </td>
    </tr>
  )
}

export function BoardRequestPrintSheet({ item }: { item: BoardRequest }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const stages = approvalStagesOf(item)

  return (
    <section className="board-request-print-sheet hidden print:block">
      <table className="board-request-print-table">
        <thead>
          <tr>
            <th>
              <span>{t('boardRequests.printTrackingNo')}</span>
              <strong>{localizeDigits(item.trackingNo, locale)}</strong>
            </th>
            <th>
              <span>{t('boardRequests.requestingUnit')}</span>
              <strong>{item.unit.name}</strong>
            </th>
            <th>
              <span>{t('boardRequests.requestedAt')}</span>
              <strong>
                <DateText value={item.requestedAt} />
              </strong>
            </th>
          </tr>
        </thead>
        <tbody>
          <PrintField label={t('boardRequests.printSubject')} value={item.subject} lines={2} />
          <PrintField
            label={t('boardRequests.printJustification')}
            value={item.justification}
            lines={3}
          />
          <PrintField
            label={t('boardRequests.printTopicHistory')}
            value={item.topicHistory}
            lines={2}
          />
          <PrintField
            label={t('boardRequests.description')}
            value={item.description}
            lines={7}
          />
          <tr className="board-request-print-stage-head">
            <th>{t('boardRequests.printStage')}</th>
            <th>{t('boardRequests.printDates')}</th>
            <th>{t('boardRequests.printSignature')}</th>
          </tr>
          {stages.map((stage) => {
            const timing = stageTimingOf(item, stage)
            const reviewer = stageReviewerName(item, stage)
            return (
              <tr key={stage} className="board-request-print-stage">
                <td>
                  <p className="board-request-print-stage-name">{t(`board.stages.${stage}`)}</p>
                </td>
                <td>
                  <p className="board-request-print-date-line">
                    <span>{t('boardRequests.printReferredAt')}</span>
                    <strong>
                      <PrintDate value={timing.referredAt} />
                    </strong>
                  </p>
                  <p className="board-request-print-date-line">
                    <span>{t('boardRequests.printHandledAt')}</span>
                    <strong>
                      <PrintDate value={timing.handledAt} />
                    </strong>
                  </p>
                </td>
                <td>
                  <div className="board-request-print-sign">
                    {reviewer ? <p className="board-request-print-signer">{reviewer}</p> : null}
                    <div className="board-request-print-sign-box" />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
