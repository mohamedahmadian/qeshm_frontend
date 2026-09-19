import {
  calendarDaysUntil,
  displayDateParts,
  displayYearNow,
  displayYearRangeIso,
  endOfIranWeekIso,
  todayIsoDate,
} from './datetime'
import { projectStatuses, type Project } from '../types/app'

export type DatedCalendarItem = {
  id: string
  endDate: string | null
  startDate?: string | null
}

export type DeadlineBucket = 'overdue' | 'today' | 'week' | 'month' | 'later'

export const deadlineBucketOrder: DeadlineBucket[] = [
  'overdue',
  'today',
  'week',
  'month',
  'later',
]

export function isOpenProject(project: Project) {
  return project.status !== projectStatuses.COMPLETED
}

export function filterCalendarProjects(
  items: Project[],
  options: { includeCompleted: boolean; includeInactive: boolean },
) {
  return items.filter((item) => {
    if (!options.includeInactive && !item.isActive) return false
    if (!options.includeCompleted && !isOpenProject(item)) return false
    return true
  })
}

export function projectsWithEndDate<T extends DatedCalendarItem>(items: T[]) {
  return items.filter((item) => Boolean(item.endDate))
}

export function deadlineBucket(endDate: string, locale: string, today = todayIsoDate()): DeadlineBucket {
  const days = calendarDaysUntil(endDate, today)
  if (days == null) return 'later'
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (endDate <= endOfIranWeekIso(today)) return 'week'
  const todayParts = displayDateParts(today, locale)
  const endParts = displayDateParts(endDate, locale)
  if (
    todayParts &&
    endParts &&
    todayParts.year === endParts.year &&
    todayParts.month === endParts.month
  ) {
    return 'month'
  }
  return 'later'
}

export function groupByDeadline<T extends DatedCalendarItem>(
  items: T[],
  locale: string,
  today = todayIsoDate(),
) {
  const groups: Record<DeadlineBucket, T[]> = {
    overdue: [],
    today: [],
    week: [],
    month: [],
    later: [],
  }
  for (const item of projectsWithEndDate(items)) {
    groups[deadlineBucket(item.endDate as string, locale, today)].push(item)
  }
  for (const key of deadlineBucketOrder) {
    groups[key].sort((a, b) => (a.endDate ?? '').localeCompare(b.endDate ?? ''))
  }
  return groups
}

export function indexProjectsByEndDate<T extends DatedCalendarItem>(items: T[]) {
  const map = new Map<string, T[]>()
  for (const item of projectsWithEndDate(items)) {
    const key = item.endDate as string
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }
  return map
}

export function calendarYearOptions(items: DatedCalendarItem[], locale: string) {
  const years = new Set<number>([displayYearNow(locale)])
  for (const item of items) {
    const end = displayDateParts(item.endDate, locale)
    const start = displayDateParts(item.startDate, locale)
    if (end) years.add(end.year)
    if (start) years.add(start.year)
  }
  return [...years].sort((a, b) => b - a)
}

export function projectsInDisplayYear<T extends DatedCalendarItem>(
  items: T[],
  year: number,
  locale: string,
) {
  return items.filter((item) => {
    const end = displayDateParts(item.endDate, locale)
    const start = displayDateParts(item.startDate, locale)
    return end?.year === year || start?.year === year
  })
}

export function projectsInDisplayMonth<T extends DatedCalendarItem>(
  items: T[],
  year: number,
  month: number,
  locale: string,
) {
  return projectsWithEndDate(items).filter((item) => {
    const parts = displayDateParts(item.endDate, locale)
    return parts?.year === year && parts.month === month
  })
}

export function monthsWithDeadlines(items: DatedCalendarItem[], year: number, locale: string) {
  const months = new Set<number>()
  for (const item of projectsWithEndDate(items)) {
    const parts = displayDateParts(item.endDate, locale)
    if (parts?.year === year) months.add(parts.month)
  }
  return [...months].sort((a, b) => a - b)
}

export function monthDeadlineCounts(items: DatedCalendarItem[], year: number, locale: string) {
  const counts = Array.from({ length: 12 }, () => 0)
  for (const item of projectsWithEndDate(items)) {
    const parts = displayDateParts(item.endDate, locale)
    if (parts?.year === year) counts[parts.month - 1] += 1
  }
  return counts
}

export function clampIsoToYear(iso: string, year: number, locale: string) {
  const { startIso, endIso } = displayYearRangeIso(year, locale)
  if (iso < startIso) return startIso
  if (iso > endIso) return endIso
  return iso
}

export function yearDaySpan(year: number, locale: string) {
  const { startIso, endIso } = displayYearRangeIso(year, locale)
  return {
    startIso,
    endIso,
    totalDays: (calendarDaysUntil(endIso, startIso) ?? 0) + 1,
  }
}

export function projectYearBar(project: DatedCalendarItem, year: number, locale: string) {
  const { startIso, endIso, totalDays } = yearDaySpan(year, locale)
  const end = project.endDate
  const start = project.startDate ?? project.endDate
  if (!end && !start) return null
  const from = clampIsoToYear(start ?? end ?? startIso, year, locale)
  const to = clampIsoToYear(end ?? start ?? endIso, year, locale)
  const offset = Math.max(0, calendarDaysUntil(from, startIso) ?? 0)
  const span = Math.max(1, (calendarDaysUntil(to, from) ?? 0) + 1)
  return {
    startIso: from,
    endIso: to,
    offsetPercent: (offset / totalDays) * 100,
    widthPercent: (span / totalDays) * 100,
    markerOnly: !project.startDate || project.startDate === project.endDate,
  }
}

export function yearTodayMarker(year: number, locale: string, today = todayIsoDate()) {
  const empty = {
    pastMonths: 0,
    offsetPercent: null as number | null,
    pastPercent: 0,
  }
  const parts = displayDateParts(today, locale)
  if (!parts) return empty
  if (parts.year > year) {
    return { pastMonths: 12, offsetPercent: null as number | null, pastPercent: 100 }
  }
  if (parts.year < year) return empty
  const { startIso, totalDays } = yearDaySpan(year, locale)
  const offset = Math.max(0, calendarDaysUntil(today, startIso) ?? 0)
  const offsetPercent = totalDays > 0 ? (offset / totalDays) * 100 : 0
  return {
    pastMonths: Math.max(0, parts.month - 1),
    offsetPercent,
    pastPercent: offsetPercent,
  }
}
