import { useQuery } from '@tanstack/react-query'
import { AuthGuestLayout } from '../../../components/auth/AuthGuestLayout'
import { LoadingState } from '../../../components/ui/LoadingState'
import { api } from '../../../lib/api'
import type { SingardCategory } from '../../../types/app'
import { SingardWizard } from '../wizard/SingardWizard'

export function PublicSingardPage() {
  const query = useQuery({
    queryKey: ['public', 'singard', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<SingardCategory[]>('/public/singard/categories')
      return data
    },
  })

  return (
    <AuthGuestLayout full showHeaderLogin>
      {query.isLoading || !query.data ? <LoadingState /> : <SingardWizard categories={query.data} />}
    </AuthGuestLayout>
  )
}
