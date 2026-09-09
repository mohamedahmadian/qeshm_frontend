import { Landmark } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, userFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { OrganizationForm } from './OrganizationForm'
import { organizationNewPath, organizationPath } from './organization-paths'
import { useOrganization } from './useOrganization'

export function OrganizationEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useOrganization()

  if (query.isLoading) {
    return <LoadingState />
  }
  if (!query.data) {
    return <Navigate to={organizationNewPath()} replace />
  }

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        title={t('organization.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Landmark} />}
      />
      <OrganizationForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch('/organization', payload)
          await queryClient.invalidateQueries({ queryKey: ['organization'] })
          toast.success(t('organization.updated'))
          navigate(organizationPath())
        }}
      />
    </div>
  )
}
