import { Building2, CalendarDays, FileText, ScrollText, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DateText } from '../../../components/ui/DateText'
import { Button } from '../../../components/ui/Form'
import { FormEmptyHint, FormFactTile } from '../../../components/ui/FormLayout'
import type { ResolutionCalendarItem } from '../../../lib/resolution-calendar'
import { ProjectNameWithColor } from '../../projects/ProjectShared'
import { DeadlineDaysBadge } from '../../projects/calendar/ProjectCalendarShared'
import { resolutionHref } from './ResolutionCalendarShared'

export function CalendarResolutionsModal({
  open,
  title,
  subtitle,
  items,
  locale,
  onClose,
}: {
  open: boolean
  title: string
  subtitle?: string
  items: ResolutionCalendarItem[]
  locale: string
  onClose: () => void
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
        aria-labelledby="calendar-resolutions-modal-title"
        className="relative z-10 flex max-h-[min(88vh,44rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div
            className="pointer-events-none absolute -start-8 -top-10 size-32 rounded-full bg-teal-200/30"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2
                  id="calendar-resolutions-modal-title"
                  className="text-sm font-semibold text-ink-900"
                >
                  {title}
                </h2>
                {subtitle ? <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p> : null}
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
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {!items.length ? <FormEmptyHint>{t('boardCalendar.noDeadlineOnDay')}</FormEmptyHint> : null}
          {items.map((item) => (
            <article
              key={item.id}
              className="space-y-3 rounded-2xl border border-teal-50 bg-white p-3 shadow-[0_4px_14px_rgba(20,40,40,0.04)] sm:p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    <ProjectNameWithColor name={item.title} color={item.color} />
                  </p>
                  <p className="mt-1 text-xs font-medium text-teal-700">{item.unit.name}</p>
                </div>
                <DeadlineDaysBadge endDate={item.endDate} locale={locale} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <FormFactTile
                  icon={FileText}
                  label={t('boardResolutions.titleField')}
                  value={item.title}
                  compact
                  tone="mint"
                />
                <FormFactTile
                  icon={CalendarDays}
                  label={t('boardResolutions.dueDate')}
                  value={item.endDate ? <DateText value={item.endDate} /> : '—'}
                  empty={!item.endDate}
                  compact
                />
                <FormFactTile
                  icon={Building2}
                  label={t('boardResolutions.unit')}
                  value={item.unit.name}
                  compact
                />
                <FormFactTile
                  icon={ScrollText}
                  label={t('boardCalendar.minutes')}
                  value={item.minutes.subject}
                  compact
                  tone="mint"
                />
              </div>
              <Link to={resolutionHref(item)} onClick={onClose}>
                <Button type="button" variant="ghost">
                  <FileText className="size-4" aria-hidden />
                  {t('common.view')}
                </Button>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>,
    document.body,
  )
}
