import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '../../components/brand/AppLogo'
import { Button } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { localizeDigits } from '../../lib/datetime'
import type { BoardRequest } from '../../types/app'

export function BoardRequestPrintButton({
  item,
  variant = 'icon',
}: {
  item: BoardRequest
  variant?: 'icon' | 'button'
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant={variant === 'icon' ? 'ghost' : 'soft'}
        icon={variant === 'icon'}
        aria-label={t('boardRequests.print')}
        title={t('boardRequests.print')}
        onClick={() => setOpen(true)}
      >
        <Printer className="size-4" aria-hidden />
        {variant === 'button' ? t('boardRequests.print') : null}
      </Button>
      {open ? (
        <BoardRequestPrintSheet item={item} autoPrint onPrinted={() => setOpen(false)} />
      ) : null}
    </>
  )
}

function PrintDate({ value }: { value: string | null }) {
  if (!value) return null
  return <DateText value={value} />
}

function PrintLine({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <p className="board-request-print-line">
      <span className="board-request-print-label">{label}:</span>
      <span className="board-request-print-value">{value || '\u00a0'}</span>
    </p>
  )
}

function PrintYesNo({
  value,
  yes,
  no,
}: {
  value: boolean | null
  yes: string
  no: string
}) {
  return (
    <span className="board-request-print-yn">
      <span className="board-request-print-yn-item">
        <i className={value === true ? 'is-on' : undefined} aria-hidden />
        {yes}
      </span>
      <span className="board-request-print-yn-item">
        <i className={value === false ? 'is-on' : undefined} aria-hidden />
        {no}
      </span>
    </span>
  )
}

function SignBlock({
  title,
  name,
  date,
  dateLabel,
  signLabel,
}: {
  title: string
  name: string | null | undefined
  date: string | null | undefined
  dateLabel: string
  signLabel: string
}) {
  return (
    <div className="board-request-print-signblock">
      <PrintLine label={title} value={name} />
      <p className="board-request-print-line">
        <span className="board-request-print-label">{dateLabel}:</span>
        {date ? (
          <span className="board-request-print-value">
            <PrintDate value={date} />
          </span>
        ) : null}
      </p>
      <p className="board-request-print-line">
        <span className="board-request-print-label">{signLabel}:</span>
      </p>
    </div>
  )
}

export function BoardRequestPrintSheet({
  item,
  autoPrint,
  onPrinted,
}: {
  item: BoardRequest
  autoPrint?: boolean
  onPrinted?: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const topicHistory = item.topicHistory?.trim() || ''

  useEffect(() => {
    if (!autoPrint) return
    const finish = () => onPrinted?.()
    window.addEventListener('afterprint', finish)
    const id = window.setTimeout(() => window.print(), 80)
    return () => {
      window.removeEventListener('afterprint', finish)
      window.clearTimeout(id)
    }
  }, [autoPrint, onPrinted])

  return createPortal(
    <section className="board-request-print-sheet hidden print:flex">
      <table className="board-request-print-table">
        <tbody>
          <tr className="board-request-print-head">
            <th className="board-request-print-logo">
              <AppLogo decorative className="board-request-print-emblem" />
            </th>
            <th className="board-request-print-title-cell">
              <p className="board-request-print-title">{t('boardRequests.printFormTitle')}</p>
            </th>
            <th className="board-request-print-meta">
              <p className="board-request-print-line">
                <span className="board-request-print-label">{t('boardRequests.printNo')}:</span>
                <span className="board-request-print-value">
                  {localizeDigits(item.trackingNo, locale)}
                </span>
              </p>
              <p className="board-request-print-line">
                <span className="board-request-print-label">{t('boardRequests.printDate')}:</span>
                <span className="board-request-print-value">
                  <PrintDate value={item.requestedAt} />
                </span>
              </p>
            </th>
          </tr>
          <tr>
            <td colSpan={3}>
              <PrintLine label={t('boardRequests.printRequester')} value={item.unit.name} />
            </td>
          </tr>
          <tr>
            <td colSpan={3}>
              <PrintLine label={t('boardRequests.printOrgPosition')} value={item.orgPositionText} />
            </td>
          </tr>
          <tr>
            <td colSpan={3}>
              <PrintLine label={t('boardRequests.printSubjectLine')} value={item.subject} />
            </td>
          </tr>
          <tr className="board-request-print-justification">
            <td colSpan={3}>
              <PrintLine label={t('boardRequests.printJustificationLine')} value={item.justification} />
            </td>
          </tr>
          {topicHistory ? (
            <tr className="board-request-print-history">
              <td colSpan={3}>
                <PrintLine label={t('boardRequests.printTopicHistory')} value={topicHistory} />
              </td>
            </tr>
          ) : null}
          <tr className="board-request-print-description">
            <td colSpan={3}>
              <PrintLine label={t('boardRequests.printDescriptionLine')} value={item.description} />
            </td>
          </tr>
          <tr className="board-request-print-pair">
            <td colSpan={3}>
              <table className="board-request-print-split">
                <tbody>
                  <tr>
                    <td>
                      <SignBlock
                        title={t('boardRequests.printRequester')}
                        name={item.createdBy.fullName}
                        date={item.requestedAt}
                        dateLabel={t('boardRequests.printDate')}
                        signLabel={t('boardRequests.printSign')}
                      />
                    </td>
                    <td>
                      <SignBlock
                        title={t('boardRequests.printApprover')}
                        name={item.managementBy?.fullName}
                        date={item.managementAt}
                        dateLabel={t('boardRequests.printDate')}
                        signLabel={t('boardRequests.printSign')}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr className="board-request-print-review">
            <td colSpan={3}>
              <div className="board-request-print-review-grid">
                <div>
                  <p className="board-request-print-review-title">
                    {t('boardRequests.printLegalReview')}:
                  </p>
                  <p className="board-request-print-choice">
                    <span className="board-request-print-label">
                      {t('boardRequests.printLegalHistory')}:
                    </span>
                    <PrintYesNo
                      value={item.legalOrgMatch}
                      yes={t('board.has')}
                      no={t('board.hasNot')}
                    />
                  </p>
                  <p className="board-request-print-choice">
                    <span className="board-request-print-label">
                      {t('boardRequests.printLegalRegs')}:
                    </span>
                    <PrintYesNo
                      value={item.legalRegulationsMatch}
                      yes={t('board.has')}
                      no={t('board.hasNot')}
                    />
                  </p>
                  {item.legalComment ? (
                    <PrintLine label={t('boardReview.comment')} value={item.legalComment} />
                  ) : null}
                </div>
                <p className="board-request-print-office-sign">
                  <span>
                    {t('boardRequests.printSign')}: {t('boardRequests.printLegalSign')}
                  </span>
                  {item.legalBy?.fullName ? <strong>{item.legalBy.fullName}</strong> : null}
                </p>
              </div>
            </td>
          </tr>
          <tr className="board-request-print-review">
            <td colSpan={3}>
              <div className="board-request-print-review-grid">
                <div>
                  <p className="board-request-print-review-title">
                    {t('boardRequests.printBudgetReview')}:
                  </p>
                  <p className="board-request-print-choice">
                    <span className="board-request-print-label">
                      {t('boardRequests.printBudgetHistory')}:
                    </span>
                    <PrintYesNo
                      value={item.budgetProgramHistory}
                      yes={t('board.has')}
                      no={t('board.hasNot')}
                    />
                  </p>
                  <p className="board-request-print-choice">
                    <span className="board-request-print-label">
                      {t('boardRequests.printBudgetFunding')}:
                    </span>
                    <PrintYesNo
                      value={item.budgetCurrentYearFunding}
                      yes={t('board.has')}
                      no={t('board.hasNot')}
                    />
                  </p>
                  <PrintLine
                    label={t('boardRequests.printBudgetNotes')}
                    value={item.budgetComment}
                  />
                </div>
                <p className="board-request-print-office-sign">
                  <span>
                    {t('boardRequests.printSign')}: {t('boardRequests.printBudgetSign')}
                  </span>
                  {item.budgetBy?.fullName ? <strong>{item.budgetBy.fullName}</strong> : null}
                </p>
              </div>
            </td>
          </tr>
          <tr className="board-request-print-footer-sign">
            <td colSpan={3}>
              <p className="board-request-print-office-sign is-center">
                <span>
                  {t('boardRequests.printSign')}: {t('boardRequests.printSecretarySign')}
                </span>
                {item.secretaryBy?.fullName ? <strong>{item.secretaryBy.fullName}</strong> : null}
              </p>
            </td>
          </tr>
          <tr className="board-request-print-ceo">
            <td colSpan={3}>
              <p className="board-request-print-office-sign is-center">
                <span>
                  {t('boardRequests.printSign')}: {t('boardRequests.printCeoSign')}
                </span>
                {item.ceoBy?.fullName ? <strong>{item.ceoBy.fullName}</strong> : null}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </section>,
    document.body,
  )
}
