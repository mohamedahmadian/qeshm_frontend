import { Landmark } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { LoadingState, PageHeader, userFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { OrganizationForm } from './OrganizationForm'
import { organizationPath } from './organization-paths'
import { useOrganization } from './useOrganization'

export function OrganizationCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useOrganization()

  if (query.isLoading) {
    return <LoadingState />
  }
  if (query.data) {
    return <Navigate to={organizationPath()} replace />
  }

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={Landmark}
        title={t('organization.create')}
        subtitle={t('organization.createSubtitle')}
        backTo="/"
      />
      <OrganizationForm
        onSubmit={async (payload) => {
          await api.post('/organization', payload)
          await queryClient.invalidateQueries({ queryKey: ['organization'] })
          toast.success(t('organization.created'))
          navigate(organizationPath())
        }}
      />
    </div>
  )
}
