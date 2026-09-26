import { UserRound, UserRoundCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  userFormShellClassName,
} from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { ManagedUser } from '../../types/app'
import { isOrganizationEmployeePath, organizationEmployeePath, organizationEmployeesPath } from '../organization/organization-paths'
import { isQeshmondiPath, qeshmondiCitizenPath, qeshmondiPath } from '../qeshmondi/qeshmondi-paths'
import { UserForm } from './UserForm'

export function UserEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const employeeView = isOrganizationEmployeePath(pathname)
  const qeshmondiView = isQeshmondiPath(pathname)
  const listPath = employeeView
    ? organizationEmployeesPath()
    : qeshmondiView
      ? qeshmondiPath()
      : '/users'
  const detailPath =
    employeeView && id
      ? organizationEmployeePath(id)
      : qeshmondiView && id
        ? qeshmondiCitizenPath(id)
        : `/users/${id}`
  const headerIcon = qeshmondiView ? UserRoundCheck : UserRound
  const title = employeeView
    ? t('employees.edit')
    : qeshmondiView
      ? t('qeshmondi.edit')
      : t('users.edit')
  const query = useQuery({
    queryKey: ['user', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ManagedUser>(`/users/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={headerIcon}
        title={title}
        subtitle={<EntityNameSubtitle name={query.data.fullName} icon={headerIcon} />}
      />
      <UserForm
        initial={query.data}
        requirePassword={false}
        qeshmondiMode={qeshmondiView}
        onCancel={() => navigate(detailPath)}
        onSubmit={async (payload) => {
          await api.patch(`/users/${query.data.id}`, payload)
          toast.success(qeshmondiView ? t('qeshmondi.updated') : t('users.updated'))
          navigate(listPath)
        }}
      />
    </div>
  )
}
