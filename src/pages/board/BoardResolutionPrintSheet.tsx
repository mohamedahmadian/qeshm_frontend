import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { formatDate, formatNumber, localizeDigits } from '../../lib/datetime'
import { resolutionExecutorNames } from '../../lib/resolution-calendar'
import type { BoardMinutes, BoardMinutesResolution, BoardSignatory } from '../../types/app'
import { BoardResolutionDueValue, resolutionProposerLabel, resolutionSignatoryName } from './BoardResolutionDisplay'

type PrintSigner = {
  id: string
  firstName: string
  lastName: string
  title: string
}

const EMPTY_SIGNER_COUNT = 5

function clauseName(index: number, t: (key: string) => string, locale: string) {
  const key = `boardResolutions.printClauseNames.${index}`
  const named = t(key)
  return named === key ? formatNumber(index, locale) : named
}

function signerRows(items: PrintSigner[]) {
  if (items.length <= 3) return [items]
  const rows = [items.slice(0, 3)]
  for (let i = 3; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2))
  }
  return rows
}

function FieldRow({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <tr className={className}>
      <th className="board-resolution-print-label">{label}</th>
      <td className="board-resolution-print-value">{value || '\u00a0'}</td>
    </tr>
  )
}

export function BoardResolutionPrintSheet({
  item,
  minutes,
}: {
  item: BoardMinutesResolution
  minutes: BoardMinutes
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const clauseQuery = useQuery({
    queryKey: ['board-minutes-resolutions', minutes.id, 'print-clause'],
    queryFn: async () => {
      const { data } = await api.get<BoardMinutesResolution[]>(`/board/minutes/${minutes.id}/resolutions`)
      return data
    },
  })
  const catalogQuery = useQuery({
    queryKey: ['board-signatories', 'print'],
    enabled: !item.signatories?.length,
    queryFn: async () => {
      const { data } = await api.get<BoardSignatory[]>('/board/signatories')
      return data
    },
  })

  const attached = (item.signatories ?? []).map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    title: row.title,
  }))
  const catalog = (catalogQuery.data ?? []).map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    title: row.title,
  }))
  const signers =
    attached.length > 0
      ? attached
      : catalog.length > 0
        ? catalog
        : Array.from({ length: EMPTY_SIGNER_COUNT }, (_, index) => ({
            id: `empty-${index}`,
            firstName: '',
            lastName: '',
            title: '',
          }))
  const rows = signerRows(signers)
  const clauseIndex = (clauseQuery.data?.findIndex((row) => row.id === item.id) ?? 0) + 1
  const minutesNo = minutes.minutesNo
    ? localizeDigits(minutes.minutesNo, locale)
    : t('boardResolutions.printBlank')
  const heldAt = minutes.heldAt ? formatDate(minutes.heldAt, locale) : t('boardResolutions.printBlank')

  return (
    <section className="board-resolution-print-sheet hidden print:flex">
      <header className="board-resolution-print-head">
        <p className="board-resolution-print-office">{t('boardResolutions.printSecretariat')}</p>
        <p className="board-resolution-print-minutes">
          {t('boardResolutions.printMinutesLine', { number: minutesNo, date: heldAt })}
        </p>
        <p className="board-resolution-print-clause">
          {t('boardResolutions.printClause', { name: clauseName(clauseIndex, t, locale) })}
        </p>
      </header>
      <table className="board-resolution-print-table">
        <colgroup>
          <col className="board-resolution-print-label-col" />
          <col />
        </colgroup>
        <tbody>
          <FieldRow label={t('boardResolutions.printSubject')} value={item.title} />
          <FieldRow
            label={t('boardResolutions.status')}
            value={t(`boardResolutions.statuses.${item.status}`)}
          />
          <FieldRow label={t('boardResolutions.proposer')} value={resolutionProposerLabel(item)} />
          <FieldRow label={t('boardResolutions.legalBasis')} value={item.legalBasis} />
          <FieldRow
            label={t('boardResolutions.hasTopicHistory')}
            value={
              item.hasTopicHistory
                ? t('boardResolutions.topicHistoryYes')
                : t('boardResolutions.topicHistoryNo')
            }
          />
          <FieldRow
            className="board-resolution-print-notes"
            label={t('boardResolutions.notes')}
            value={item.notes}
          />
          <FieldRow
            className="board-resolution-print-body"
            label={t('boardResolutions.printBody')}
            value={item.description}
          />
          <FieldRow
            label={t('boardResolutions.printExecutor')}
            value={resolutionExecutorNames(item, '')}
          />
          <FieldRow
            label={t('boardResolutions.printDue')}
            value={<BoardResolutionDueValue dueKind={item.dueKind} dueDate={item.dueDate} />}
          />
          <tr className="board-resolution-print-signs">
            <th className="board-resolution-print-label">{t('boardResolutions.printSignPlace')}</th>
            <td className="board-resolution-print-signs-cell">
              <table className="board-resolution-print-sign-grid">
                <tbody>
                  {rows.map((row) => (
                    <SignRow key={row.map((signer) => signer.id).join('-')} items={row} />
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

function SignRow({ items }: { items: PrintSigner[] }) {
  return (
    <>
      <tr>
        {items.map((signer) => (
          <th key={`${signer.id}-name`} className="board-resolution-print-signer">
            <span>{resolutionSignatoryName(signer) || '\u00a0'}</span>
            <span>{signer.title || '\u00a0'}</span>
          </th>
        ))}
      </tr>
      <tr>
        {items.map((signer) => (
          <td key={`${signer.id}-mark`} className="board-resolution-print-mark">
            {'\u00a0'}
          </td>
        ))}
      </tr>
    </>
  )
}
