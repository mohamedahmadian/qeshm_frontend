import { FolderKanban } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
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
        title={t('projects.edit')}
        subtitle={<EntityNameSubtitle name={query.data.systemName} icon={FolderKanban} />}
      />
      <ProjectForm
        excludeId={query.data.id}
        initial={{
          vicePresidency: query.data.vicePresidency,
          management: query.data.management,
          unit: query.data.unit,
          systemName: query.data.systemName,
          code: query.data.code,
          isActive: query.data.isActive,
          status: query.data.status ?? 'NOT_STARTED',
          progressPercent: query.data.progressPercent,
          startDate: query.data.startDate,
          endDate: query.data.endDate,
          latitude: query.data.latitude,
          longitude: query.data.longitude,
          companyName: query.data.companyName,
          systemUrl: query.data.systemUrl,
          launchYear: query.data.launchYear,
          isSupportActive: query.data.isSupportActive,
          replacementProjectId: query.data.replacementProjectId,
          description: query.data.description,
          importance: query.data.importance,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/projects/${id}`, payload)
          toast.success(t('projects.updated'))
          navigate(`/projects/${id}`)
        }}
      />
    </div>
  )
}
