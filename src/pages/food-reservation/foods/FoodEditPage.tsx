import { UtensilsCrossed } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { Food } from '../../../types/app'
import { foodsPath } from '../food-paths'
import { FoodForm } from './FoodForm'

export function FoodEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['food', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Food>(`/foods/${id}`)
      return data
    },
  })

  if (!query.data || !id) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={UtensilsCrossed}
        title={t('foods.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={UtensilsCrossed} />}
      />
      <FoodForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/foods/${id}`, payload)
          toast.success(t('foods.updated'))
          navigate(foodsPath())
        }}
      />
    </div>
  )
}
