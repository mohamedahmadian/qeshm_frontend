import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DateText } from '../../../components/ui/DateText'
import { FormEmptyHint } from '../../../components/ui/FormLayout'
import {
  buildMonthGrid,
  calendarDaysUntil,
  formatNumber,
  todayIsoDate,
  weekDayShortLabels,
} from '../../../lib/datetime'
import { projectColor, projectColorAlpha } from '../../../lib/project-color'
import type { Project } from '../../../types/app'
import { ProjectLifecycleBadge, ProjectNameWithColor, ProjectProgress } from '../ProjectShared'

export function daysUntilLabel(endDate: string | null, locale: string) {
  const days = calendarDaysUntil(endDate)
  if (days == null) return { text: '—', tone: 'later' as const, overdue: false }
  const count = formatNumber(Math.abs(days), locale)
  if (days < 0) return { text: count, tone: 'overdue' as const, overdue: true }
  if (days === 0) return { text: count, tone: 'today' as const, overdue: false }
  return { text: count, tone: 'soon' as const, overdue: false }
}

export function DeadlineDaysBadge({
  endDate,
  locale,
}: {
  endDate: string | null
  locale: string
}) {
  const { t } = useTranslation()
  const info = daysUntilLabel(endDate, locale)
  const toneClass =
    info.tone === 'overdue'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : info.tone === 'today'
        ? 'border-teal-200 bg-teal-50 text-teal-800'
        : 'border-mint-200 bg-mint-50 text-mint-800'
  const caption =
    info.tone === 'overdue'
      ? t('projectCalendar.overdueShort')
      : info.tone === 'today'
        ? t('projectCalendar.todayShort')
        : t('projectCalendar.daysShort')
  return (
    <div
      className={`flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl border text-center ${toneClass}`}
    >
      <span className="text-sm font-bold tabular-nums leading-none">{info.text}</span>
      <span className="mt-0.5 text-[10px] font-medium leading-none">{caption}</span>
    </div>
  )
}

export function DeadlineProjectRow({
  project,
  locale,
  compact,
}: {
  project: Project
  locale: string
  compact?: boolean
}) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-teal-50 bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(20,40,40,0.04)] transition hover:bg-teal-50/60"
    >
      <DeadlineDaysBadge endDate={project.endDate} locale={locale} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">
          <ProjectNameWithColor name={project.systemName} color={project.color} />
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          {project.endDate ? <DateText value={project.endDate} /> : '—'}
          <ProjectLifecycleBadge value={project.status} />
        </div>
      </div>
      {compact ? null : (
        <div className="hidden w-28 shrink-0 sm:block">
          <ProjectProgress value={project.progressPercent} />
        </div>
      )}
    </Link>
  )
}

export function DeadlineGroup({
  title,
  items,
  locale,
  compact,
  empty,
}: {
  title: string
  items: Project[]
  locale: string
  compact?: boolean
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
          <DeadlineProjectRow key={item.id} project={item} locale={locale} compact={compact} />
        ))}
      </div>
    </section>
  )
}

export function ProposalCardNote({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-sm leading-6 text-ink-600">{children}</p>
}

export function MonthCalendarGrid({
  year,
  month,
  locale,
  byDate,
  selectedIso,
  onSelectDay,
  compact,
}: {
  year: number
  month: number
  locale: string
  byDate: Map<string, Project[]>
  selectedIso?: string | null
  onSelectDay?: (iso: string) => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  const grid = useMemo(() => buildMonthGrid(year, month, locale), [year, month, locale])
  const labels = useMemo(() => weekDayShortLabels(locale), [locale])
  const today = todayIsoDate()
  const cell = compact ? 'min-h-7 text-[11px]' : 'min-h-9 text-xs'

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-ink-400">
        {labels.map((label, index) => (
          <div key={`${label}-${index}`} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: grid.leading }, (_, index) => (
          <div key={`pad-${index}`} />
        ))}
        {grid.days.map((day) => {
          const items = byDate.get(day.iso) ?? []
          const hasDeadline = items.length > 0
          const isToday = day.iso === today
          const selected = day.iso === selectedIso
          const first = items[0]
          const style =
            hasDeadline && items.length === 1
              ? {
                  background: projectColorAlpha(first?.color, 0.18),
                  color: projectColor(first?.color),
                  boxShadow: `inset 0 0 0 1px ${projectColorAlpha(first?.color, 0.35)}`,
                }
              : undefined
          const className = `relative flex flex-col items-center justify-center rounded-lg ${cell} ${
            hasDeadline ? 'font-bold' : 'font-medium text-ink-600'
          } ${isToday ? 'ring-1 ring-teal-400' : ''} ${
            selected ? 'ring-2 ring-teal-500' : ''
          } ${hasDeadline && items.length > 1 ? 'bg-teal-50 text-teal-800' : ''} ${
            onSelectDay ? 'cursor-pointer' : ''
          } ${onSelectDay && !hasDeadline ? 'hover:bg-cream-50' : ''}`
          const label = hasDeadline
            ? t('projectCalendar.dayWithCount', {
                day: formatNumber(day.day, locale),
                count: formatNumber(items.length, locale),
              })
            : formatNumber(day.day, locale)
          const content = (
            <>
              <span className="tabular-nums">{formatNumber(day.day, locale)}</span>
              {items.length > 1 ? (
                <span className="mt-0.5 flex gap-0.5">
                  {items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="size-1 rounded-full"
                      style={{ background: projectColor(item.color) }}
                    />
                  ))}
                </span>
              ) : null}
            </>
          )
          return onSelectDay ? (
            <button
              key={day.iso}
              type="button"
              onClick={() => onSelectDay(day.iso)}
              className={className}
              style={style}
              aria-label={label}
            >
              {content}
            </button>
          ) : (
            <div key={day.iso} className={className} style={style} aria-label={label}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
