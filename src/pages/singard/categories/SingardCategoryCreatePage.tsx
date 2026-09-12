import { FolderTree } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import { singardCategoriesPath } from '../singard-paths'
import { SingardCategoryForm } from './SingardCategoryForm'

export function SingardCategoryCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderTree}
        title={t('singardCategories.create')}
        subtitle={t('singardCategories.createSubtitle')}
      />
      <SingardCategoryForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/singard/categories', payload)
          toast.success(t('singardCategories.created'))
          navigate(singardCategoriesPath(data.id))
        }}
      />
    </div>
  )
}
