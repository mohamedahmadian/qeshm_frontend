import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, userFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { UserForm } from './UserForm'

export function UserCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={userFormShellClassName}>
      <PageHeader title={t('users.create')} subtitle={t('users.createSubtitle')} />
      <UserForm
        onCancel={() => navigate('/users')}
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/users', payload)
          toast.success(t('users.created'))
          navigate(`/users/${data.id}`)
        }}
      />
    </div>
  )
}
