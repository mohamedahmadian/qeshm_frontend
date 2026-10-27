import { Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { InspectionCategory, InspectionKind } from '../../../types/app'
import { InspectionWizard } from '../wizard/InspectionWizard'

export function InspectionSubmitPage() {
  const { t } = useTranslation()
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
    <div className={formShellClassName}>
      <PageHeader icon={Shield} title={t('menus.inspectionSubmit')} subtitle={t('inspectionWizard.subtitle')} />
      {query.isLoading || !query.data ? (
        <LoadingState />
      ) : (
        <InspectionWizard categories={query.data.categories} kinds={query.data.kinds} variant="panel" />
      )}
    </div>
  )
}
