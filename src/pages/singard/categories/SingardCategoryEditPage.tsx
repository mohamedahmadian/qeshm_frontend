import { FolderTree } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { SingardCategory } from '../../../types/app'
import { singardCategoriesPath } from '../singard-paths'
import { SingardCategoryForm } from './SingardCategoryForm'

export function SingardCategoryEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['singard', 'category', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<SingardCategory>(`/singard/categories/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderTree}
        title={t('singardCategories.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={FolderTree} />}
      />
      <SingardCategoryForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/singard/categories/${id}`, payload)
          toast.success(t('singardCategories.updated'))
          navigate(singardCategoriesPath(id))
        }}
      />
    </div>
  )
}
