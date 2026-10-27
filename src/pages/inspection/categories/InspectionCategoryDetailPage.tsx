import { FolderTree, Hash, Network, ScrollText, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DetailActions, EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type { InspectionCategory } from '../../../types/app'
import { inspectionCategoriesPath } from '../inspection-paths'

export function InspectionCategoryDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['inspection', 'category', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<InspectionCategory>(`/inspection/categories/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item) return <LoadingState />

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderTree}
        title={t('inspectionCategories.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={FolderTree} />}
      />
      <FormCard icon={FolderTree} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={FolderTree}>{t('inspectionCategories.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('inspectionCategories.name')} value={item.name} tone="teal" />
            <FormFactTile
              icon={Network}
              label={t('inspectionCategories.parent')}
              value={item.parent?.name || t('inspectionCategories.noParent')}
              tone="mint"
            />
            <FormFactTile icon={FolderTree} label={t('inspectionCategories.path')} value={item.path || item.name} />
            <FormFactTile
              icon={Hash}
              label={t('inspectionCategories.childCount')}
              value={formatNumber(item._count.children, locale)}
            />
            <FormFactTile
              icon={Hash}
              label={t('inspectionCategories.feedbackCount')}
              value={formatNumber(item._count.feedbacks, locale)}
            />
            <FormFactTile
              icon={FolderTree}
              label={t('geo.isActive')}
              value={item.isActive ? t('geo.active') : t('geo.inactive')}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('inspectionCategories.description')}
              value={item.description || '—'}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`${inspectionCategoriesPath(item.id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('inspectionCategories.confirmDelete'),
                successMessage: t('inspectionCategories.deleted'),
                path: `/inspection/categories/${item.id}`,
                queryKey: ['inspection', 'categories'],
                onDeleted: () => navigate(inspectionCategoriesPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}