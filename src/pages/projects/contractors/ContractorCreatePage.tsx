import { FolderKanban, Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { Project } from '../../../types/app'
import { ContractorForm } from './ContractorForm'
import { contractorPath } from './contractor-paths'

export function ContractorCreatePage() {
  const { t } = useTranslation()
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const project = useQuery({
    queryKey: ['project', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${projectId}`)
      return data
    },
  })

  if (!project.data || !projectId) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('contractors.create')}
        subtitle={<EntityNameSubtitle name={project.data.systemName} icon={FolderKanban} />}
      />
      <ContractorForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>(
            `/projects/${projectId}/contractors`,
            payload,
          )
          toast.success(t('contractors.created'))
          navigate(contractorPath(projectId, data.id))
        }}
      />
    </div>
  )
}
