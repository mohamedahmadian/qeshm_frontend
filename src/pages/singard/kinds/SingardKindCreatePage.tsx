import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import { singardKindsPath } from '../singard-paths'
import { SingardKindForm } from './SingardKindForm'

export function SingardKindCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={MessageSquare}
        title={t('singardKinds.create')}
        subtitle={t('singardKinds.createSubtitle')}
      />
      <SingardKindForm
        onSubmit={async (payload) => {
          await api.post('/singard/kinds', payload)
          toast.success(t('singardKinds.created'))
          navigate(singardKindsPath())
        }}
      />
    </div>
  )
}
