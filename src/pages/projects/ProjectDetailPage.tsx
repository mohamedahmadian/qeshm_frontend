import {
  Building,
  Building2,
  CalendarRange,
  FolderKanban,
  Globe,
  Handshake,
  Landmark,
  Link2,
  Monitor,
  ScrollText,
  Shield,
  Store,
  Tags,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, DetailActions, EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { formatNumber } from '../../lib/datetime'
import { api } from '../../lib/api'
import type { Project } from '../../types/app'
import { ProjectImportanceBadge, ProjectStatus, ProjectUrl } from './ProjectShared'

export function ProjectDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['project', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${id}`)
      return data
    },
  })

  const project = query.data
  if (!project) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('projects.details')}
        subtitle={<EntityNameSubtitle name={project.systemName} icon={FolderKanban} />}
      />
      <FormCard icon={FolderKanban} title={project.systemName}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Landmark}>{t('projects.orgSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Landmark}
              label={t('projects.vicePresidency')}
              value={project.vicePresidency}
              tone="teal"
            />
            <FormFactTile
              icon={Building}
              label={t('projects.management')}
              value={project.management}
              tone="mint"
            />
            <FormFactTile icon={Building2} label={t('projects.unit')} value={project.unit} />
          </div>
          <FormSectionTitle icon={Monitor}>{t('projects.systemSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Monitor}
              label={t('projects.systemName')}
              value={project.systemName}
              tone="teal"
            />
            <FormFactTile
              icon={Store}
              label={t('projects.companyName')}
              value={project.companyName || '—'}
              tone="mint"
            />
            <FormFactTile
              icon={Globe}
              label={t('projects.systemUrl')}
              value={<ProjectUrl value={project.systemUrl} />}
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('projects.launchYear')}
              value={project.launchYear != null ? formatNumber(project.launchYear, locale) : '—'}
            />
            <FormFactTile
              icon={Monitor}
              label={t('projects.isActive')}
              value={<ProjectStatus active={project.isActive} />}
            />
            <FormFactTile
              icon={Shield}
              label={t('projects.isSupportActive')}
              value={<ProjectStatus active={project.isSupportActive} />}
            />
            <FormFactTile
              icon={Link2}
              label={t('projects.replacement')}
              value={
                project.replacementProject ? (
                  <Link
                    to={`/projects/${project.replacementProject.id}`}
                    className="text-teal-700 hover:underline"
                  >
                    {project.replacementProject.systemName}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            <FormFactTile
              icon={Tags}
              label={t('projects.importance')}
              value={<ProjectImportanceBadge value={project.importance} />}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('projects.description')}
              value={project.description || '—'}
            />
          </div>
          <DetailActions
            editTo={`/projects/${project.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('projects.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('projects.confirmDelete'),
                successMessage: t('projects.deleted'),
                path: `/projects/${project.id}`,
                queryKey: ['projects'],
                onDeleted: () => navigate('/projects'),
              })
            }
            extra={
              <Link to={`/projects/${project.id}/contractors`}>
                <Button type="button" variant="soft">
                  <Handshake className="size-4" aria-hidden />
                  {t('contractors.manage')}
                </Button>
              </Link>
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
