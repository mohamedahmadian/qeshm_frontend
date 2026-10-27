import { swatchColorFromId } from './project-color'
import type { BoardMinutesResolution } from '../types/app'

export type ResolutionCalendarItem = BoardMinutesResolution & {
  color: string
  code: string
  endDate: string | null
  startDate: string | null
  minutes: NonNullable<BoardMinutesResolution['minutes']>
}

export function resolutionExecutors(item: {
  units?: { id: string; name: string }[]
  unit?: { id: string; name: string } | null
}) {
  if (item.units?.length) return item.units
  return item.unit ? [item.unit] : []
}

export function resolutionExecutorNames(
  item: {
    units?: { id: string; name: string }[]
    unit?: { id: string; name: string } | null
  },
  empty: string,
) {
  const names = resolutionExecutors(item).map((row) => row.name)
  return names.length ? names.join('، ') : empty
}

export function toResolutionCalendarItem(item: BoardMinutesResolution): ResolutionCalendarItem {
  return {
    ...item,
    color: swatchColorFromId(resolutionExecutors(item)[0]?.id ?? item.unitId ?? item.id),
    code: resolutionCalendarCode(item.title),
    endDate: item.dueDate,
    startDate: null,
    minutes: item.minutes ?? {
      id: item.minutesId,
      subject: '',
      heldAt: item.createdAt,
      requestId: null,
      request: null,
      requests: [],
    },
  }
}

export function resolutionCalendarCode(title: string) {
  const trimmed = title.trim()
  if (trimmed.length <= 14) return trimmed
  return `${trimmed.slice(0, 14)}…`
}
