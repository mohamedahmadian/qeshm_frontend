import { UserRound } from 'lucide-react'
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
import { isOrganizationEmployeePath, organizationEmployeePath } from '../organization/organization-paths'
import { UserForm } from './UserForm'

export function UserEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const employeeView = isOrganizationEmployeePath(pathname)
  const detailPath = employeeView && id ? organizationEmployeePath(id) : `/users/${id}`
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
        title={employeeView ? t('employees.edit') : t('users.edit')}
        subtitle={<EntityNameSubtitle name={query.data.fullName} icon={UserRound} />}
      />
      <UserForm
        initial={query.data}
        requirePassword={false}
        onCancel={() => navigate(detailPath)}
        onSubmit={async (payload) => {
          await api.patch(`/users/${query.data.id}`, payload)
          toast.success(t('users.updated'))
          navigate(detailPath)
        }}
      />
    </div>
  )
}
