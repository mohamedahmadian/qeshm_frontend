import { useQuery } from '@tanstack/react-query'
import { AuthGuestLayout } from '../../../components/auth/AuthGuestLayout'
import { LoadingState } from '../../../components/ui/LoadingState'
import { api } from '../../../lib/api'
import type { InspectionCategory, InspectionKind } from '../../../types/app'
import { InspectionWizard } from '../wizard/InspectionWizard'

export function PublicInspectionPage() {
  const query = useQuery({
    queryKey: ['public', 'inspection', 'wizard'],
    queryFn: async () => {
      const [categories, kinds] = await Promise.all([
        api.get<InspectionCategory[]>('/public/inspection/categories'),
        api.get<InspectionKind[]>('/public/inspection/kinds'),
      ])
      return { categories: categories.data, kinds: kinds.data }
    },
  })

  return (
    <AuthGuestLayout fill showHeaderLogin>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-8 sm:py-5">
        {query.isLoading || !query.data ? (
          <LoadingState />
        ) : (
          <InspectionWizard categories={query.data.categories} kinds={query.data.kinds} />
        )}
      </div>
    </AuthGuestLayout>
  )
}
