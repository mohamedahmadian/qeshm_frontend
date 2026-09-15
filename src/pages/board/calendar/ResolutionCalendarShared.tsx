import { Link } from 'react-router-dom'
import { DateText } from '../../../components/ui/DateText'
import { FormEmptyHint } from '../../../components/ui/FormLayout'
import type { ResolutionCalendarItem } from '../../../lib/resolution-calendar'
import { ProjectNameWithColor } from '../../projects/ProjectShared'
import { DeadlineDaysBadge } from '../../projects/calendar/ProjectCalendarShared'
import { boardMinuteResolutionPath } from '../board-paths'

export function resolutionHref(item: ResolutionCalendarItem) {
  return boardMinuteResolutionPath(item.minutesId, item.id, item.minutes.requestId ?? undefined)
}

export function DeadlineResolutionRow({
  item,
  locale,
}: {
  item: ResolutionCalendarItem
  locale: string
}) {
  return (
    <Link
      to={resolutionHref(item)}
      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-teal-50 bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(20,40,40,0.04)] transition hover:bg-teal-50/60"
    >
      <DeadlineDaysBadge endDate={item.endDate} locale={locale} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">
          <ProjectNameWithColor name={item.title} color={item.color} />
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          {item.endDate ? <DateText value={item.endDate} /> : '—'}
          <span>{item.unit.name}</span>
        </div>
      </div>
    </Link>
  )
}

export function DeadlineResolutionGroup({
  title,
  items,
  locale,
  empty,
}: {
  title: string
  items: ResolutionCalendarItem[]
  locale: string
  empty?: string
}) {
  if (!items.length) {
    return empty ? <FormEmptyHint>{empty}</FormEmptyHint> : null
  }
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-ink-500">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <DeadlineResolutionRow key={item.id} item={item} locale={locale} />
        ))}
      </div>
    </section>
  )
}
