import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { RoleForm } from './RoleForm'

export function RoleCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={formShellClassName}>
      <PageHeader title={t('accessRoles.create')} subtitle={t('accessRoles.createSubtitle')} />
      <RoleForm
        onSubmit={async (payload) => {
          await api.post('/roles', payload)
          toast.success(t('accessRoles.created'))
          navigate('/base-info/roles')
        }}
      />
    </div>
  )
}
