import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import { restaurantPath } from '../food-paths'
import { RestaurantForm } from './RestaurantForm'

export function RestaurantCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={formShellClassName}>
      <PageHeader title={t('restaurants.create')} subtitle={t('restaurants.createSubtitle')} />
      <RestaurantForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/restaurants', payload)
          toast.success(t('restaurants.created'))
          navigate(restaurantPath(data.id))
        }}
      />
    </div>
  )
}
