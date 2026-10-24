import { FileText, Stamp, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { boardRequestKinds, type BoardRequestKind } from '../../types/app'

export function BoardRequestKindModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (kind: BoardRequestKind) => void
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
        aria-labelledby="board-kind-modal-title"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <FileText className="size-5" aria-hidden />
              </span>
              <h2 id="board-kind-modal-title" className="text-sm font-semibold text-ink-900">
                {t('boardRequests.kindTitle')}
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
        <div className="space-y-3 p-5 sm:p-6">
          <button
            type="button"
            className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-teal-200 bg-white px-4 py-4 text-start shadow-[0_6px_14px_rgba(46,189,182,0.12)] hover:bg-cream-50"
            onClick={() => onPick(boardRequestKinds.NORMAL)}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white">
              <FileText className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink-900">{t('boardRequests.kinds.NORMAL')}</span>
            </span>
          </button>
          <button
            type="button"
            className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-teal-200 bg-white px-4 py-4 text-start shadow-[0_6px_14px_rgba(46,189,182,0.12)] hover:bg-cream-50"
            onClick={() => onPick(boardRequestKinds.MANAGEMENT)}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-mint-500 text-white">
              <Stamp className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 space-y-1">
              <span className="block text-sm font-semibold text-ink-900">{t('boardRequests.kinds.MANAGEMENT')}</span>
              <span className="block text-xs leading-5 text-ink-600">{t('boardRequests.kindManagementHint')}</span>
            </span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
