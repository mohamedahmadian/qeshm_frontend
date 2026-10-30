import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

export function BoardTabFormModal({
  open,
  labelledBy,
  overlayClassName = 'z-[70]',
  onClose,
  children,
}: {
  open: boolean
  labelledBy?: string
  overlayClassName?: string
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      if (document.querySelector('[data-confirm-toast], [role="listbox"], [role="menu"], .rmdp-wrapper')) return
      const dialogs = document.querySelectorAll('[data-nested-dialog]')
      if (dialogs.length && dialogs[dialogs.length - 1] !== overlayRef.current) return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className={`fixed inset-0 ${overlayClassName} flex items-start justify-center overflow-y-auto bg-ink-900/30 p-4 py-8`}
      data-nested-dialog
      role="presentation"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative z-10 w-full max-w-3xl"
      >
        {children}
      </section>
    </div>,
    document.body,
  )
}
