import { FolderKanban } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { DEFAULT_PROJECT_COLOR } from '../../lib/project-color'
import type { Project } from '../../types/app'
import { ProjectForm } from './ProjectForm'

export function ProjectEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['project', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('projects.edit')}
        subtitle={<EntityNameSubtitle name={query.data.systemName} icon={FolderKanban} />}
      />
      <ProjectForm
        excludeId={query.data.id}
        initial={{
          operatorIds: (query.data.operators ?? []).map((item) => item.id),
          systemName: query.data.systemName,
          code: query.data.code,
          isActive: query.data.isActive,
          status: query.data.status ?? 'NOT_STARTED',
          progressPercent: query.data.progressPercent,
          startDate: query.data.startDate,
          endDate: query.data.endDate,
          latitude: query.data.latitude,
          longitude: query.data.longitude,
          address: query.data.address,
          companyName: query.data.companyName,
          systemUrl: query.data.systemUrl,
          launchYear: query.data.launchYear,
          isSupportActive: query.data.isSupportActive,
          replacementProjectId: query.data.replacementProjectId,
          description: query.data.description,
          color: query.data.color ?? DEFAULT_PROJECT_COLOR,
          showOnLiveBoard: query.data.showOnLiveBoard ?? true,
          importance: query.data.importance,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/projects/${id}`, payload)
          toast.success(t('projects.updated'))
          navigate('/projects')
        }}
      />
    </div>
  )
}
