import { FolderTree } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { InspectionCategory } from '../../../types/app'
import { inspectionCategoriesPath } from '../inspection-paths'
import { InspectionCategoryForm } from './InspectionCategoryForm'

export function InspectionCategoryEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['inspection', 'category', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<InspectionCategory>(`/inspection/categories/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderTree}
        title={t('inspectionCategories.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={FolderTree} />}
      />
      <InspectionCategoryForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/inspection/categories/${id}`, payload)
          toast.success(t('inspectionCategories.updated'))
          navigate(inspectionCategoriesPath())
        }}
      />
    </div>
  )
}
