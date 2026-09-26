import { UserRound, UserRoundCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, userFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { isQeshmondiPath, qeshmondiPath } from '../qeshmondi/qeshmondi-paths'
import { UserForm } from './UserForm'

export function UserCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const qeshmondiView = isQeshmondiPath(pathname)
  const listPath = qeshmondiView ? qeshmondiPath() : '/users'

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={qeshmondiView ? UserRoundCheck : UserRound}
        title={qeshmondiView ? t('qeshmondi.create') : t('users.create')}
        subtitle={qeshmondiView ? t('qeshmondi.createSubtitle') : t('users.createSubtitle')}
      />
      <UserForm
        qeshmondiMode={qeshmondiView}
        onCancel={() => navigate(listPath)}
        onSubmit={async (payload) => {
          await api.post('/users', payload)
          toast.success(qeshmondiView ? t('qeshmondi.created') : t('users.created'))
          navigate(listPath)
        }}
      />
    </div>
  )
}
