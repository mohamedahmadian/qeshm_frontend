import { FolderTree } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import { inspectionCategoriesPath } from '../inspection-paths'
import { InspectionCategoryForm } from './InspectionCategoryForm'

export function InspectionCategoryCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderTree}
        title={t('inspectionCategories.create')}
        subtitle={t('inspectionCategories.createSubtitle')}
      />
      <InspectionCategoryForm
        onSubmit={async (payload) => {
          await api.post('/inspection/categories', payload)
          toast.success(t('inspectionCategories.created'))
          navigate(inspectionCategoriesPath())
        }}
      />
    </div>
  )
}
