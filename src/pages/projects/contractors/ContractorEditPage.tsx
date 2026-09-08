import { Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { ProjectContractor } from '../../../types/app'
import { ContractorForm } from './ContractorForm'
import { contractorPath } from './contractor-paths'

export function ContractorEditPage() {
  const { t } = useTranslation()
  const { id: projectId, contractorId } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['contractor', projectId, contractorId],
    enabled: Boolean(projectId && contractorId),
    queryFn: async () => {
      const { data } = await api.get<ProjectContractor>(
        `/projects/${projectId}/contractors/${contractorId}`,
      )
      return data
    },
  })

  if (!query.data || !projectId || !contractorId) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('contractors.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Building2} />}
      />
      <ContractorForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/projects/${projectId}/contractors/${contractorId}`, payload)
          toast.success(t('contractors.updated'))
          navigate(contractorPath(projectId, contractorId))
        }}
      />
    </div>
  )
}
