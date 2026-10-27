import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import { inspectionKindsPath } from '../inspection-paths'
import { InspectionKindForm } from './InspectionKindForm'

export function InspectionKindCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={MessageSquare}
        title={t('inspectionKinds.create')}
        subtitle={t('inspectionKinds.createSubtitle')}
      />
      <InspectionKindForm
        onSubmit={async (payload) => {
          await api.post('/inspection/kinds', payload)
          toast.success(t('inspectionKinds.created'))
          navigate(inspectionKindsPath())
        }}
      />
    </div>
  )
}
