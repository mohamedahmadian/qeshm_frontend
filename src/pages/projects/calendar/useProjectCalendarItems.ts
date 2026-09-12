import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { Paginated, Project } from '../../../types/app'

export function useProjectCalendarItems() {
  return useQuery({
    queryKey: ['projects', 'calendar'],
    queryFn: async () => {
      const { data } = await api.get<Project[] | Paginated<Project>>('/projects', {
        params: { sortBy: 'endDate', sortDir: 'asc' },
      })
      return Array.isArray(data) ? data : data.items
    },
  })
}
