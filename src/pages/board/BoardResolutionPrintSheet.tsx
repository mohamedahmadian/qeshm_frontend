import { Printer } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Form'
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

export type ResolutionPrintMinutes = Pick<BoardMinutes, 'id' | 'heldAt'> & {
  minutesNo?: string | null
}

export function resolutionPrintMinutes(
  item: BoardMinutesResolution,
  minutes?: ResolutionPrintMinutes | null,
): ResolutionPrintMinutes | null {
  if (minutes) {
    return { id: minutes.id, heldAt: minutes.heldAt, minutesNo: minutes.minutesNo }
  }
  if (item.minutes) {
    return { id: item.minutes.id, heldAt: item.minutes.heldAt, minutesNo: item.minutes.minutesNo }
  }
  return null
}

export function BoardResolutionPrintButton({
  item,
  minutes,
  variant = 'icon',
}: {
  item: BoardMinutesResolution
  minutes?: ResolutionPrintMinutes | null
  variant?: 'icon' | 'button'
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const source = resolutionPrintMinutes(item, minutes)
  if (!source) return null
  return (
    <>
      <Button
        type="button"
        variant={variant === 'icon' ? 'ghost' : 'soft'}
        icon={variant === 'icon'}
        aria-label={t('boardResolutions.print')}
        title={t('boardResolutions.print')}
        onClick={() => setOpen(true)}
      >
        <Printer className="size-4" aria-hidden />
        {variant === 'button' ? t('boardResolutions.print') : null}
      </Button>
      {open ? (
        <BoardResolutionPrintSheet
          item={item}
          minutes={source}
          autoPrint
          onPrinted={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

export function BoardResolutionsPrintAllButton({
  minutes,
}: {
  minutes: ResolutionPrintMinutes
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="soft" onClick={() => setOpen(true)}>
        <Printer className="size-4" aria-hidden />
        {t('boardResolutions.printAll')}
      </Button>
      {open ? <BoardResolutionsPrintAllSheet minutes={minutes} onPrinted={() => setOpen(false)} /> : null}
    </>
  )
}

function BoardResolutionsPrintAllSheet({
  minutes,
  onPrinted,
}: {
  minutes: ResolutionPrintMinutes
  onPrinted: () => void
}) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['board-minutes-resolutions', minutes.id, 'print-clause'],
    queryFn: async () => {
      const { data } = await api.get<BoardMinutesResolution[]>(`/board/minutes/${minutes.id}/resolutions`)
      return data
    },
  })
  const items = query.data ?? []
  const needsCatalog = items.some((item) => !item.signatories?.length)
  const catalogQuery = useQuery({
    queryKey: ['board-signatories', 'print'],
    enabled: needsCatalog,
    queryFn: async () => {
      const { data } = await api.get<BoardSignatory[]>('/board/signatories')
      return data
    },
  })
  const listReady = query.isSuccess || query.isError
  const catalogReady = !needsCatalog || catalogQuery.isSuccess || catalogQuery.isError
  const onPrintedRef = useRef(onPrinted)
  onPrintedRef.current = onPrinted

  useEffect(() => {
    if (!listReady) return
    if (query.isError) {
      toast.error(t('common.error'))
      onPrintedRef.current()
      return
    }
    if (!items.length) {
      toast.info(t('boardResolutions.printAllEmpty'))
      onPrintedRef.current()
      return
    }
    if (!catalogReady) return
    const finish = () => onPrintedRef.current()
    window.addEventListener('afterprint', finish)
    const id = window.setTimeout(() => window.print(), 80)
    return () => {
      window.removeEventListener('afterprint', finish)
      window.clearTimeout(id)
    }
  }, [catalogReady, items.length, listReady, query.isError, t])

  if (!items.length) return null

  const catalog = (catalogQuery.data ?? []).map(toPrintSigner)

  return createPortal(
    <div className="board-resolution-print-batch hidden print:block">
      {items.map((item, index) => (
        <ResolutionPrintView
          key={item.id}
          item={item}
          minutes={minutes}
          clauseIndex={index + 1}
          catalog={catalog}
        />
      ))}
    </div>,
    document.body,
  )
}

function clauseName(index: number, t: (key: string) => string, locale: string) {
  const key = `boardResolutions.printClauseNames.${index}`
  const named = t(key)
  return named === key ? formatNumber(index, locale) : named
}

function toPrintSigner(row: Pick<PrintSigner, 'id' | 'firstName' | 'lastName' | 'title'>): PrintSigner {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    title: row.title,
  }
}

function signerRows(items: PrintSigner[]) {
  const rows: PrintSigner[][] = []
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3))
  }
  return rows
}

function printSignersForItem(item: BoardMinutesResolution, catalog: PrintSigner[]) {
  const attached = (item.signatories ?? []).map(toPrintSigner)
  if (attached.length) return attached
  if (catalog.length) return catalog
  return Array.from({ length: EMPTY_SIGNER_COUNT }, (_, index) => ({
    id: `empty-${index}`,
    firstName: '',
    lastName: '',
    title: '',
  }))
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
    <div className={['board-resolution-print-row', className].filter(Boolean).join(' ')}>
      <div className="board-resolution-print-label">{label}</div>
      <div className="board-resolution-print-value">{value || '\u00a0'}</div>
    </div>
  )
}

export function BoardResolutionPrintSheet({
  item,
  minutes,
  clauseIndex: clauseIndexProp,
  autoPrint,
  onPrinted,
}: {
  item: BoardMinutesResolution
  minutes: ResolutionPrintMinutes
  clauseIndex?: number
  autoPrint?: boolean
  onPrinted?: () => void
}) {
  const clauseQuery = useQuery({
    queryKey: ['board-minutes-resolutions', minutes.id, 'print-clause'],
    enabled: clauseIndexProp == null,
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
  const needsCatalog = !item.signatories?.length
  const ready =
    (clauseIndexProp != null || clauseQuery.isSuccess || clauseQuery.isError) &&
    (!needsCatalog || catalogQuery.isSuccess || catalogQuery.isError)

  useEffect(() => {
    if (!autoPrint || !ready) return
    const finish = () => onPrinted?.()
    window.addEventListener('afterprint', finish)
    const id = window.setTimeout(() => window.print(), 80)
    return () => {
      window.removeEventListener('afterprint', finish)
      window.clearTimeout(id)
    }
  }, [autoPrint, onPrinted, ready])

  const clauseIndex = clauseIndexProp ?? (clauseQuery.data?.findIndex((row) => row.id === item.id) ?? 0) + 1
  const catalog = (catalogQuery.data ?? []).map(toPrintSigner)

  return createPortal(
    <ResolutionPrintView
      item={item}
      minutes={minutes}
      clauseIndex={clauseIndex}
      catalog={catalog}
    />,
    document.body,
  )
}

function ResolutionPrintView({
  item,
  minutes,
  clauseIndex,
  catalog,
}: {
  item: BoardMinutesResolution
  minutes: ResolutionPrintMinutes
  clauseIndex: number
  catalog: PrintSigner[]
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const rows = signerRows(printSignersForItem(item, catalog))
  const minutesNo = minutes.minutesNo
    ? localizeDigits(minutes.minutesNo, locale)
    : t('boardResolutions.printBlank')
  const heldAt = minutes.heldAt ? formatDate(minutes.heldAt, locale) : t('boardResolutions.printBlank')

  return (
    <section className="board-resolution-print-sheet hidden print:block">
      <header className="board-resolution-print-head">
        <p className="board-resolution-print-office">{t('boardResolutions.printSecretariat')}</p>
        <p className="board-resolution-print-minutes">
          <Trans
            i18nKey="boardResolutions.printMinutesLine"
            values={{ number: minutesNo, date: heldAt }}
            components={{ bold: <strong /> }}
          />
        </p>
        <p className="board-resolution-print-clause">
          {t('boardResolutions.printClause', { name: clauseName(clauseIndex, t, locale) })}
        </p>
      </header>
      <div className="board-resolution-print-table">
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
        <div className="board-resolution-print-row board-resolution-print-signs">
          <div className="board-resolution-print-label">{t('boardResolutions.printSignPlace')}</div>
          <div className="board-resolution-print-signs-cell">
            <div className="board-resolution-print-sign-grid">
              {rows.map((row) => (
                <SignRow key={row.map((signer) => signer.id).join('-')} items={row} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SignRow({ items }: { items: PrintSigner[] }) {
  return (
    <div
      className="board-resolution-print-sign-row"
      style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
    >
      {items.map((signer) => (
        <div key={signer.id} className="board-resolution-print-sign-card">
          <div className="board-resolution-print-signer">
            <span>{resolutionSignatoryName(signer) || '\u00a0'}</span>
            <span>{signer.title || '\u00a0'}</span>
          </div>
          <div className="board-resolution-print-mark">{'\u00a0'}</div>
        </div>
      ))}
    </div>
  )
}
