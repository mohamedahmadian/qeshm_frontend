import { swatchColorFromId } from './project-color'
import type { BoardMinutesResolution } from '../types/app'

export type ResolutionCalendarItem = BoardMinutesResolution & {
  color: string
  code: string
  endDate: string | null
  startDate: string | null
  minutes: NonNullable<BoardMinutesResolution['minutes']>
}

export function toResolutionCalendarItem(item: BoardMinutesResolution): ResolutionCalendarItem {
  return {
    ...item,
    color: swatchColorFromId(item.unitId),
    code: resolutionCalendarCode(item.title),
    endDate: item.dueDate,
    startDate: null,
    minutes: item.minutes ?? {
      id: item.minutesId,
      subject: '',
      heldAt: item.createdAt,
      requestId: null,
      request: null,
    },
  }
}

export function resolutionCalendarCode(title: string) {
  const trimmed = title.trim()
  if (trimmed.length <= 14) return trimmed
  return `${trimmed.slice(0, 14)}…`
}
