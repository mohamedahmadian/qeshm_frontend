import { ImagePlus, ScrollText, Store, Type, UtensilsCrossed } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DetailActions, EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type { Food } from '../../../types/app'
import { ImageFact } from '../EntityThumb'
import { foodPath, foodsPath } from '../food-paths'

export function FoodDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['food', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Food>(`/foods/${id}`)
      return data
    },
  })

  const food = query.data
  if (!food) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={UtensilsCrossed}
        title={t('foods.details')}
        subtitle={<EntityNameSubtitle name={food.name} icon={UtensilsCrossed} />}
      />
      <FormCard icon={UtensilsCrossed} title={food.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={UtensilsCrossed}>{t('foods.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('foods.name')} value={food.name} tone="teal" />
            <FormFactTile
              icon={Store}
              label={t('foods.menuItemCount')}
              value={formatNumber(food._count?.menuItems ?? 0, locale)}
              tone="mint"
            />
            <FormFactTile
              icon={ScrollText}
              label={t('foods.description')}
              value={food.description || '—'}
              className="sm:col-span-2"
            />
            <FormFactTile
              icon={ImagePlus}
              label={t('foods.photo')}
              value={<ImageFact imageId={food.photoId} empty="—" />}
              empty={!food.photoId}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`${foodPath(food.id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('foods.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('foods.confirmDelete'),
                successMessage: t('foods.deleted'),
                path: `/foods/${food.id}`,
                queryKey: ['foods'],
                onDeleted: () => navigate(foodsPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
