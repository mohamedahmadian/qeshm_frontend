import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '../../lib/api'
import type { Organization } from '../../types/app'

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Organization>('/organization')
        return data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null
        }
        throw error
      }
    },
  })
}
