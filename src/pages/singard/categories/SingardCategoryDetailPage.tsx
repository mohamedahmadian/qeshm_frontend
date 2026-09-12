import { FolderTree, Hash, Network, ScrollText, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DetailActions, EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type { SingardCategory } from '../../../types/app'
import { singardCategoriesPath } from '../singard-paths'

export function SingardCategoryDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['singard', 'category', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<SingardCategory>(`/singard/categories/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item) return <LoadingState />

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderTree}
        title={t('singardCategories.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={FolderTree} />}
      />
      <FormCard icon={FolderTree} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={FolderTree}>{t('singardCategories.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('singardCategories.name')} value={item.name} tone="teal" />
            <FormFactTile
              icon={Network}
              label={t('singardCategories.parent')}
              value={item.parent?.name || t('singardCategories.noParent')}
              tone="mint"
            />
            <FormFactTile icon={FolderTree} label={t('singardCategories.path')} value={item.path || item.name} />
            <FormFactTile
              icon={Hash}
              label={t('singardCategories.childCount')}
              value={formatNumber(item._count.children, locale)}
            />
            <FormFactTile
              icon={Hash}
              label={t('singardCategories.feedbackCount')}
              value={formatNumber(item._count.feedbacks, locale)}
            />
            <FormFactTile
              icon={FolderTree}
              label={t('geo.isActive')}
              value={item.isActive ? t('geo.active') : t('geo.inactive')}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('singardCategories.description')}
              value={item.description || '—'}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`${singardCategoriesPath(item.id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('singardCategories.confirmDelete'),
                successMessage: t('singardCategories.deleted'),
                path: `/singard/categories/${item.id}`,
                queryKey: ['singard', 'categories'],
                onDeleted: () => navigate(singardCategoriesPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}