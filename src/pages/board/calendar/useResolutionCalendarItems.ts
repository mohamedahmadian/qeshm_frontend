import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { toResolutionCalendarItem } from '../../../lib/resolution-calendar'
import type { BoardMinutesResolution, Paginated } from '../../../types/app'

export function useResolutionCalendarItems() {
  return useQuery({
    queryKey: ['board', 'resolutions', 'calendar'],
    queryFn: async () => {
      const { data } = await api.get<BoardMinutesResolution[] | Paginated<BoardMinutesResolution>>(
        '/board/resolutions',
        { params: { sortBy: 'dueDate', sortDir: 'asc' } },
      )
      const items = Array.isArray(data) ? data : data.items
      return items.map(toResolutionCalendarItem)
    },
  })
}
