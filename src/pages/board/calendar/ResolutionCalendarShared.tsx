import { Building2, CalendarDays, ScrollText } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../../components/ui/DateText'
import { FormEmptyHint } from '../../../components/ui/FormLayout'
import { HoverTooltip } from '../../../components/ui/HoverTooltip'
import type { ResolutionCalendarItem } from '../../../lib/resolution-calendar'
import { ProjectNameWithColor } from '../../projects/ProjectShared'
import { DeadlineDaysBadge } from '../../projects/calendar/ProjectCalendarShared'
import { boardMinuteResolutionPath } from '../board-paths'

export type OpenResolutionDossier = (item: ResolutionCalendarItem) => void

export function resolutionHref(item: ResolutionCalendarItem) {
  return boardMinuteResolutionPath(item.minutesId, item.id, item.minutes.requestId ?? undefined)
}

function minutesSubject(item: ResolutionCalendarItem, untitled: string) {
  const subject = item.minutes.subject?.trim()
  return subject || untitled
}

export function ResolutionMinutesBadges({ item }: { item: ResolutionCalendarItem }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="inline-flex min-w-0 max-w-[16rem] items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
        <ScrollText className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{minutesSubject(item, t('boardCalendar.untitledMinutes'))}</span>
      </span>
      {item.minutes.heldAt ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-[11px] font-medium text-mint-800">
          <CalendarDays className="size-3 shrink-0" aria-hidden />
          <DateText value={item.minutes.heldAt} />
        </span>
      ) : null}
    </span>
  )
}

export function ResolutionMinutesHoverCard({ item }: { item: ResolutionCalendarItem }) {
  const { t } = useTranslation()
  return (
    <div className="w-64 space-y-2.5 p-3">
      <p className="text-[11px] font-semibold text-teal-700">{t('boardCalendar.minutes')}</p>
      <p className="text-sm font-semibold leading-5 text-ink-900">
        {minutesSubject(item, t('boardCalendar.untitledMinutes'))}
      </p>
      <div className="space-y-1.5 text-xs text-ink-600">
        <p className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0 text-teal-600" aria-hidden />
          <span>{t('boardMinutes.heldAt')}</span>
          {item.minutes.heldAt ? <DateText value={item.minutes.heldAt} /> : '—'}
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <Building2 className="size-3.5 shrink-0 text-teal-600" aria-hidden />
          <span className="shrink-0">{t('boardResolutions.unit')}</span>
          <span className="min-w-0 truncate">
            {item.unit?.name || t('boardResolutions.withoutUnit')}
          </span>
        </p>
      </div>
    </div>
  )
}

export function ResolutionNameHover({
  item,
  children,
  className,
}: {
  item: ResolutionCalendarItem
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <HoverTooltip
      className={className}
      label={minutesSubject(item, t('boardCalendar.minutes'))}
      content={<ResolutionMinutesHoverCard item={item} />}
    >
      {children}
    </HoverTooltip>
  )
}

export function DeadlineResolutionRow({
  item,
  locale,
  onOpen,
}: {
  item: ResolutionCalendarItem
  locale: string
  onOpen: OpenResolutionDossier
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-teal-50 bg-white px-3 py-2.5 text-start shadow-[0_4px_14px_rgba(20,40,40,0.04)] transition hover:bg-teal-50/60"
    >
      <DeadlineDaysBadge endDate={item.endDate} locale={locale} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 max-w-full truncate text-sm font-semibold text-ink-900">
            <ProjectNameWithColor name={item.title} color={item.color} />
          </p>
          <ResolutionMinutesBadges item={item} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          {item.endDate ? <DateText value={item.endDate} /> : '—'}
          <span>{item.unit?.name || t('boardResolutions.withoutUnit')}</span>
        </div>
      </div>
    </button>
  )
}

export function DeadlineResolutionGroup({
  title,
  items,
  locale,
  empty,
  onOpen,
}: {
  title: string
  items: ResolutionCalendarItem[]
  locale: string
  empty?: string
  onOpen: OpenResolutionDossier
}) {
  if (!items.length) {
    return empty ? <FormEmptyHint>{empty}</FormEmptyHint> : null
  }
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-ink-500">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <DeadlineResolutionRow key={item.id} item={item} locale={locale} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}
