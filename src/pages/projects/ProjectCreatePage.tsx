import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { ProjectForm } from './ProjectForm'

export function ProjectCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={formShellClassName}>
      <PageHeader title={t('projects.create')} subtitle={t('projects.createSubtitle')} />
      <ProjectForm
        onSubmit={async (payload) => {
          await api.post('/projects', payload)
          toast.success(t('projects.created'))
          navigate('/projects')
        }}
      />
    </div>
  )
}
