import { UtensilsCrossed } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import { foodPath } from '../food-paths'
import { FoodForm } from './FoodForm'

export function FoodCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={formShellClassName}>
      <PageHeader icon={UtensilsCrossed} title={t('foods.create')} subtitle={t('foods.createSubtitle')} />
      <FoodForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/foods', payload)
          toast.success(t('foods.created'))
          navigate(foodPath(data.id))
        }}
      />
    </div>
  )
}
