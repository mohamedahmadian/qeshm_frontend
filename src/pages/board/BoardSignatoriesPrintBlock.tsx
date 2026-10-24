import { ImagePlus, PenLine, Printer, SquareDashed, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FormSectionTitle } from '../../components/ui/FormLayout'
import { api, getImageUrl } from '../../lib/api'
import type { BoardSignatory } from '../../types/app'
import { boardSignatoryFullName } from './board-paths'

export function useBoardRequestPrint() {
  const [open, setOpen] = useState(false)
  const [showSignaturePhoto, setShowSignaturePhoto] = useState(true)
  const [printAfterClose, setPrintAfterClose] = useState(false)

  useEffect(() => {
    if (!printAfterClose) return
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print()
        setPrintAfterClose(false)
      })
    })
    return () => window.cancelAnimationFrame(id)
  }, [printAfterClose, showSignaturePhoto])

  function pick(showPhoto: boolean) {
    setShowSignaturePhoto(showPhoto)
    setOpen(false)
    setPrintAfterClose(true)
  }

  return {
    showSignaturePhoto,
    modalOpen: open,
    openModal: () => setOpen(true),
    closeModal: () => setOpen(false),
    pick,
  }
}

export function BoardSignatoriesPrintModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (showPhoto: boolean) => void
}) {
  const { t } = useTranslation()

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
        aria-labelledby="board-print-modal-title"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <Printer className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="board-print-modal-title" className="text-sm font-semibold text-ink-900">
                  {t('boardSignatories.printTitle')}
                </h2>
                <p className="mt-1 text-xs leading-5 text-ink-600">{t('boardSignatories.printHint')}</p>
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
        <div className="space-y-3 p-5 sm:p-6">
          <button
            type="button"
            className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-teal-200 bg-white px-4 py-4 text-start shadow-[0_6px_14px_rgba(46,189,182,0.12)] hover:bg-cream-50"
            onClick={() => onPick(true)}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white">
              <ImagePlus className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 space-y-1">
              <span className="block text-sm font-semibold text-ink-900">{t('boardSignatories.printPhoto')}</span>
              <span className="block text-xs leading-5 text-ink-600">{t('boardSignatories.printPhotoHint')}</span>
            </span>
          </button>
          <button
            type="button"
            className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-teal-200 bg-white px-4 py-4 text-start shadow-[0_6px_14px_rgba(46,189,182,0.12)] hover:bg-cream-50"
            onClick={() => onPick(false)}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-mint-500 text-white">
              <SquareDashed className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 space-y-1">
              <span className="block text-sm font-semibold text-ink-900">{t('boardSignatories.printBox')}</span>
              <span className="block text-xs leading-5 text-ink-600">{t('boardSignatories.printBoxHint')}</span>
            </span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

const PRINT_COLS = 3

function signatoryPrintRows(items: BoardSignatory[]) {
  const rows: BoardSignatory[][] = []
  for (let i = 0; i < items.length; i += PRINT_COLS) {
    rows.push(items.slice(i, i + PRINT_COLS))
  }
  return rows
}

export function BoardSignatoriesPrintBlock({ showSignaturePhoto }: { showSignaturePhoto: boolean }) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['board-signatories', 'print'],
    queryFn: async () => {
      const { data } = await api.get<BoardSignatory[]>('/board/signatories')
      return data
    },
  })
  const items = query.data ?? []
  if (!items.length) return null

  return (
    <section className="board-signatories-print hidden space-y-4 print:block">
      <FormSectionTitle icon={PenLine} className="board-signatories-print-heading mb-2.5">
        {t('boardSignatories.printSection')}
      </FormSectionTitle>
      <div className="board-signatories-print-list">
        {signatoryPrintRows(items).map((row) => (
          <div key={row.map((item) => item.id).join('-')} className="board-signatories-print-row">
            {row.map((item) => (
              <article key={item.id} className="board-signatory-print-card">
                <p className="board-signatory-print-name">{boardSignatoryFullName(item)}</p>
                <p className="board-signatory-print-title">{item.title}</p>
                {showSignaturePhoto ? (
                  <img
                    src={getImageUrl(item.signatureImageId)}
                    alt=""
                    className="board-signatory-print-mark"
                  />
                ) : (
                  <div className="board-signatory-print-box" />
                )}
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
