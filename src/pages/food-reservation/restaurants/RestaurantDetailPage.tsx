import { CookingPot, ImagePlus, MapPin, Phone, Store, Type, UtensilsCrossed } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type { Restaurant } from '../../../types/app'
import { ImageFact } from '../EntityThumb'
import { restaurantMenuPath, restaurantPath, restaurantsPath } from '../food-paths'

export function RestaurantDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['restaurant', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Restaurant>(`/restaurants/${id}`)
      return data
    },
  })

  const restaurant = query.data
  if (!restaurant || !id) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('restaurants.details')}
        subtitle={<EntityNameSubtitle name={restaurant.name} icon={Store} />}
      />
      <FormCard icon={Store} title={restaurant.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Store}>{t('restaurants.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('restaurants.name')} value={restaurant.name} tone="teal" />
            <FormFactTile icon={Phone} label={t('restaurants.phone')} copyValue={restaurant.phone} tone="mint" />
            <FormFactTile
              icon={UtensilsCrossed}
              label={t('restaurants.menuItemCount')}
              value={formatNumber(restaurant._count?.menuItems ?? 0, locale)}
            />
            <FormFactTile
              icon={MapPin}
              label={t('restaurants.address')}
              value={restaurant.address || '—'}
              className="sm:col-span-2"
            />
            <FormFactTile
              icon={ImagePlus}
              label={t('restaurants.logo')}
              value={<ImageFact imageId={restaurant.logoId} empty="—" />}
              empty={!restaurant.logoId}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`${restaurantPath(restaurant.id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('restaurants.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('restaurants.confirmDelete'),
                successMessage: t('restaurants.deleted'),
                path: `/restaurants/${restaurant.id}`,
                queryKey: ['restaurants'],
                onDeleted: () => navigate(restaurantsPath()),
              })
            }
            extraItems={[
              {
                to: restaurantMenuPath(restaurant.id),
                icon: CookingPot,
                label: t('restaurantMenuItems.manage'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}
