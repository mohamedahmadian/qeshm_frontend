import { MessageCircleHeart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { SingardCategory } from '../../../types/app'
import { SingardWizard } from '../wizard/SingardWizard'

export function SingardSubmitPage() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['public', 'singard', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<SingardCategory[]>('/public/singard/categories')
      return data
    },
  })

  return (
    <div className={formShellClassName}>
      <PageHeader icon={MessageCircleHeart} title={t('menus.singardSubmit')} subtitle={t('singardWizard.subtitle')} />
      {query.isLoading || !query.data ? <LoadingState /> : <SingardWizard categories={query.data} variant="panel" />}
    </div>
  )
}
